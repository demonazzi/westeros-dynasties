/* Данные страницы: строение — data/*.json, тексты — texts/ (Markdown). Описание полей — data/README.md.
   node tools/data.js --emit   → JS с глобальными переменными для страницы (так собирает build.py)
   node tools/data.js --sync   → texts/*.md по data/*.json: порядок и группы, имена в заголовках, пустые разделы для новых;
                                 то же для английских текстов в texts/en/ (заголовки — английские имена)
   node tools/data.js --check  → загрузить и показать, что не сходится между data/ и texts/
   Из других скриптов: const D = require('./data'); D.load() → { PEOPLE, BANDS, …, problems }. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DATA = path.join(ROOT, 'data'), TEXTS = path.join(ROOT, 'texts'), TEXTS_EN = path.join(TEXTS, 'en');
const readJson = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const C = JSON.stringify;

/* ——— Тексты в Markdown
   # Заголовок файла · ## Группа · ### id · Имя ✎ — раздел; текст — строки под заголовком до следующего заголовка.
   ✎ в конце заголовка — текст написал Claude (черновик). Имя в заголовке только для чтения: его обновляет --sync. */
const ENTRY = /^###\s+([a-z0-9_]+)(.*)$/;
const AI_MARK = '✎';
function parseMd(file) {
  const res = { entries: new Map(), dup: [], file };
  if (!fs.existsSync(file)) return res;
  let cur = null, comment = false;
  const close = () => { if (cur) { cur.text = cur.lines.join(' ').replace(/\s+/g, ' ').trim(); delete cur.lines; } cur = null; };
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (comment || /^\s*<!--/.test(l)) { comment = !/-->/.test(l); close(); return; }
    const m = l.match(ENTRY);
    if (m) {
      close();
      cur = { id: m[1], ai: new RegExp(AI_MARK + '\\s*$').test(m[2]), line: i + 1, lines: [] };
      if (res.entries.has(cur.id)) res.dup.push(cur.id);
      res.entries.set(cur.id, cur);
      return;
    }
    if (/^#{1,6}\s/.test(l)) { close(); return; }
    if (cur) cur.lines.push(l);
  });
  close();
  return res;
}
const MD_NOTE = '<!-- Тексты для страницы. Заголовок «### id · Имя» служебный: id не менять, имя подставляется само. ' +
  AI_MARK + ' в конце заголовка — черновик Claude: поправили текст — сотрите ' + AI_MARK + '. Текст — строки под заголовком. -->';
const MD_NOTE_EN = '<!-- English texts for the page. The «### id · Name» heading is technical: never change the id, the name is filled in ' +
  'automatically. Text goes on the lines under the heading; an empty section means the Russian text is shown. ' + AI_MARK +
  ' at the end of the heading marks an AI-written draft. See texts/en/README.md. -->';
/* groups: [{ title, items: [{ id, name, text, ai }] }] */
function renderMd(title, groups, note) {
  const out = ['# ' + title, '', note || MD_NOTE, ''];
  groups.forEach(g => {
    if (g.title) out.push('## ' + g.title, '');
    g.items.forEach(it => {
      out.push('### ' + it.id + ' · ' + it.name + (it.ai ? ' ' + AI_MARK : ''));
      if (it.text) out.push(it.text);
      out.push('');
    });
  });
  return out.join('\n').replace(/\n+$/, '\n');
}

/* ——— JSON: контейнеры раскрыты, записи (человек, дракон, полоса…) — по одной на строку */
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const CONTAINER_KEYS = ['groups', 'people', 'dragons', 'items'];
function fmt(v, ind) {
  ind = ind || '';
  const ni = ind + '  ';
  if (Array.isArray(v)) {
    if (!v.some(x => x && typeof x === 'object')) return C(v);
    return '[\n' + v.map(x => ni + (isObj(x) && CONTAINER_KEYS.some(k => k in x) ? fmt(x, ni) : C(x))).join(',\n') + '\n' + ind + ']';
  }
  if (isObj(v)) {
    const keys = Object.keys(v);
    if (!keys.length) return '{}';
    const open = !ind || CONTAINER_KEYS.some(k => k in v);
    if (!open && !keys.every(k => isObj(v[k]))) return C(v);
    return '{\n' + keys.map(k => ni + C(k) + ': ' + (open && v[k] && typeof v[k] === 'object' ? fmt(v[k], ni) : C(v[k]))).join(',\n') + '\n' + ind + '}';
  }
  return C(v);
}
const writeJson = (f, v) => fs.writeFileSync(path.join(DATA, f), fmt(v) + '\n');

/* Порядок полей человека в data/people/*.json (остальные — в конце, как есть). t и ai живут в texts/. */
const PERSON_KEYS = ['id', 'name', 'full', 'en', 'al', 'fem', 'group', 'hs', 'h', 'alt', 'k', 'pre', 'n', 'r', 'rm', 'cl', 'su',
  'p', 'par', 'rp', 'unc', 'b', 'd', 'dr', 'kl', 'sp', 'wd', 'pr', 'ev', 'wiki'];
const orderKeys = (o, keys) => { const r = {}; keys.forEach(k => { if (k in o) r[k] = o[k]; }); Object.keys(o).forEach(k => { if (!(k in r)) r[k] = o[k]; }); return r; };

/* Что откуда: файлы с текстами и их разделы */
function sources() {
  const meta = readJson('meta.json');
  const people = meta.people_files.map(f => ({ f, json: readJson('people/' + f + '.json'), md: path.join(TEXTS, 'people', f + '.md'), mdEn: path.join(TEXTS_EN, 'people', f + '.md') }));
  return {
    meta, people,
    dragons: readJson('dragons.json'), dragonsMd: path.join(TEXTS, 'dragons.md'), dragonsMdEn: path.join(TEXTS_EN, 'dragons.md'),
    screen: readJson('screen.json'), screenMd: path.join(TEXTS, 'screen.md'), screenDragonsMd: path.join(TEXTS, 'screen-dragons.md'),
    screenMdEn: path.join(TEXTS_EN, 'screen.md'), screenDragonsMdEn: path.join(TEXTS_EN, 'screen-dragons.md'),
    vassals: readJson('vassals.json'), vassalsMd: path.join(TEXTS, 'vassals.md'), vassalsMdEn: path.join(TEXTS_EN, 'vassals.md')
  };
}

function load() {
  const S = sources(), problems = [];
  const useMd = (md, ids, what) => {
    md.dup.forEach(id => problems.push(path.relative(ROOT, md.file) + ': раздел ' + id + ' повторяется'));
    md.entries.forEach((e, id) => { if (!ids.has(id)) problems.push(path.relative(ROOT, md.file) + ':' + e.line + ': ' + id + ' нет в ' + what); });
    return md;
  };
  // люди
  const PEOPLE = [];
  // английский текст — в t_en (ai_en — черновик нейросети); пустой раздел — на странице русский текст
  const en = (x, e, k) => { if (e && e.text) { x[k || 't_en'] = e.text; if (e.ai) x.ai_en = 1; } };
  S.people.forEach(({ f, json, md: mdFile, mdEn }) => {
    const list = json.groups.flatMap(g => g.people);
    const ids = new Set(list.map(p => p.id));
    const md = useMd(parseMd(mdFile), ids, 'data/people/' + f + '.json');
    const mdE = useMd(parseMd(mdEn), ids, 'data/people/' + f + '.json');
    list.forEach(p => {
      const q = Object.assign({}, p), e = md.entries.get(p.id);
      if (e && e.text) q.t = e.text;
      if (e && e.ai) q.ai = 1;
      en(q, mdE.entries.get(p.id));
      if (!e) problems.push('texts/people/' + f + '.md: нет раздела ' + p.id);
      PEOPLE.push(q);
    });
  });
  // драконы
  const D = S.dragons;
  const DRAGONS = D.groups.flatMap(g => g.dragons).map(d => Object.assign({}, d));
  const DRAGON_ORIGINS = D.origins.map(o => Object.assign({}, o));
  const dIds = new Set(DRAGONS.concat(DRAGON_ORIGINS).map(x => x.id));
  const dmd = useMd(parseMd(S.dragonsMd), dIds, 'data/dragons.json'), dmdE = useMd(parseMd(S.dragonsMdEn), dIds, 'data/dragons.json');
  DRAGONS.concat(DRAGON_ORIGINS).forEach(x => { const e = dmd.entries.get(x.id); if (e && e.text) x.t = e.text; if (e && e.ai) x.ai = 1; en(x, dmdE.entries.get(x.id)); });
  // экранизации
  const screen = {};
  const items = S.screen.groups.flatMap(g => g.items);
  const sIds = new Set(items.map(x => x.id));
  const smd = useMd(parseMd(S.screenMd), sIds, 'data/screen.json'), smdE = useMd(parseMd(S.screenMdEn), sIds, 'data/screen.json');
  items.forEach(it => {
    const o = Object.assign({}, it); delete o.id;
    const e = smd.entries.get(it.id);
    if (e && e.text) o.df = e.text;
    if (e && e.ai) o.ai = 1;
    en(o, smdE.entries.get(it.id), 'df_en');
    screen[it.id] = o;
  });
  const DRAGON_SCREEN = {}, DRAGON_SCREEN_EN = {};
  const drIds = new Set(DRAGONS.map(d => d.id));
  const dsmd = useMd(parseMd(S.screenDragonsMd), drIds, 'data/dragons.json'), dsmdE = useMd(parseMd(S.screenDragonsMdEn), drIds, 'data/dragons.json');
  dsmd.entries.forEach((e, id) => { if (e.text) DRAGON_SCREEN[id] = e.text; });
  dsmdE.entries.forEach((e, id) => { if (e.text) DRAGON_SCREEN_EN[id] = e.text; });
  // текст о доме — один на вкладку «Вассалитет» и карточку дома на древе: texts/vassals.md (английский — texts/en/vassals.md)
  const V = S.vassals;
  const V_HOUSES = V.houses.map(h => Object.assign({}, h));
  const vIds = new Set(V_HOUSES.map(h => h.id));
  const vmd = useMd(parseMd(S.vassalsMd), vIds, 'data/vassals.json'), vmdE = useMd(parseMd(S.vassalsMdEn), vIds, 'data/vassals.json');
  V_HOUSES.forEach(h => {
    const e = vmd.entries.get(h.id);
    if (e && e.text) h.t = e.text;
    if (e && e.ai) h.ai = 1;
    en(h, vmdE.entries.get(h.id));
    if (!e) problems.push('texts/vassals.md: нет раздела ' + h.id);
  });
  const HOUSES = S.meta.houses;
  return {
    NOW_YEAR: S.meta.now_year, BANDS: S.meta.bands, HOUSES, GAPS: S.meta.gaps, PEOPLE,
    DRAGON_ORIGINS, DRAGONS, DRAGON_FIGHTS: D.fights, SERIES: S.screen.series, EXTRA: { screen }, DRAGON_SCREEN, DRAGON_SCREEN_EN,
    V_REGIONS: V.regions, V_PRE: V.pre, V_CLAIMANTS: V.claimants, V_MILESTONES: V.milestones, V_HOUSES,
    problems
  };
}

/* JS для страницы: те же глобальные имена, что ждёт приложение */
function emit(d) {
  d = d || load();
  const arr = a => '[\n' + a.map(x => C(x)).join(',\n') + '\n]';
  const map = o => '{\n' + Object.keys(o).map(k => C(k) + ': ' + C(o[k])).join(',\n') + '\n}';
  return [
    '/* Данные собраны из data/ и texts/ (node tools/data.js --emit). Поля — data/README.md. */',
    'const NOW_YEAR = ' + C(d.NOW_YEAR) + ';',
    'const BANDS = ' + arr(d.BANDS) + ';',
    'const HOUSES = ' + map(d.HOUSES) + ';',
    'const GAPS = ' + arr(d.GAPS) + ';',
    'const PEOPLE = ' + arr(d.PEOPLE) + ';',
    'const DRAGON_ORIGINS = ' + arr(d.DRAGON_ORIGINS) + ';',
    'const DRAGONS = ' + arr(d.DRAGONS) + ';',
    'const DRAGON_FIGHTS = ' + arr(d.DRAGON_FIGHTS) + ';',
    'const SERIES = ' + C(d.SERIES) + ';',
    'const EXTRA = { screen: ' + map(d.EXTRA.screen) + ' };',
    'const DRAGON_SCREEN = ' + map(d.DRAGON_SCREEN) + ';',
    'const DRAGON_SCREEN_EN = ' + map(d.DRAGON_SCREEN_EN) + ';',
    'const V_REGIONS = ' + C(d.V_REGIONS) + ';',
    'const V_PRE = ' + C(d.V_PRE) + ';',
    'const V_CLAIMANTS = ' + C(d.V_CLAIMANTS) + ';',
    'const V_MILESTONES = ' + C(d.V_MILESTONES) + ';',
    'const V_HOUSES = ' + arr(d.V_HOUSES) + ';',
    ''
  ].join('\n');
}

/* Раскладка текстов по data/: порядок и группы как в JSON, имена в заголовках свежие, тексты и ✎ сохраняются.
   texts — необязательная замена текстов: { people: Map(id → {text, ai}), dragons, screen, screenDragons, vassals } */
function sync(override) {
  const S = sources(), o = override || {};
  const pick = (md, kind, id) => {
    const x = o[kind] && o[kind].get(id);
    if (x) return x;
    const e = md.entries.get(id);
    return e ? { text: e.text, ai: e.ai } : { text: '', ai: false };
  };
  const written = [];
  const put = (file, s) => { fs.mkdirSync(path.dirname(file), { recursive: true }); const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; if (old !== s) { fs.writeFileSync(file, s); written.push(path.relative(ROOT, file)); } };
  // английские тексты: те же разделы, в заголовке — английское имя (поле en), тексты и ✎ сохраняются
  const keep = (md, id) => { const e = md.entries.get(id); return e ? { text: e.text, ai: e.ai } : { text: '', ai: false }; };
  const enName = x => x.en || x.full || x.name;
  S.people.forEach(({ json, md: mdFile, mdEn }) => {
    const md = parseMd(mdFile), mdE = parseMd(mdEn);
    put(mdFile, renderMd(json.title, json.groups.map(g => ({ title: g.title, items: g.people.map(p => Object.assign({ id: p.id, name: p.full || p.name }, pick(md, 'people', p.id))) }))));
    put(mdEn, renderMd(json.title, json.groups.map(g => ({ title: g.title, items: g.people.map(p => Object.assign({ id: p.id, name: enName(p) }, keep(mdE, p.id))) })), MD_NOTE_EN));
  });
  const D = S.dragons, dmd = parseMd(S.dragonsMd), dmdE = parseMd(S.dragonsMdEn);
  put(S.dragonsMd, renderMd('Драконы', [{ title: 'Откуда драконы (ветви)', items: D.origins.map(x => Object.assign({ id: x.id, name: x.name }, pick(dmd, 'dragons', x.id))) }]
    .concat(D.groups.map(g => ({ title: g.title, items: g.dragons.map(x => Object.assign({ id: x.id, name: x.full || x.name }, pick(dmd, 'dragons', x.id))) })))));
  put(S.dragonsMdEn, renderMd('Dragons', [{ title: 'Откуда драконы (ветви)', items: D.origins.map(x => Object.assign({ id: x.id, name: enName(x) }, keep(dmdE, x.id))) }]
    .concat(D.groups.map(g => ({ title: g.title, items: g.dragons.map(x => Object.assign({ id: x.id, name: enName(x) }, keep(dmdE, x.id))) }))), MD_NOTE_EN));
  const names = new Map(), namesEn = new Map();
  S.people.forEach(({ json }) => json.groups.forEach(g => g.people.forEach(p => { names.set(p.id, p.full || p.name); namesEn.set(p.id, enName(p)); })));
  const smd = parseMd(S.screenMd), smdE = parseMd(S.screenMdEn);
  put(S.screenMd, renderMd('Экранизации: чем сериал отличается от книг', S.screen.groups.map(g => ({ title: g.title, items: g.items.map(x => Object.assign({ id: x.id, name: names.get(x.id) || x.id }, pick(smd, 'screen', x.id))) }))));
  put(S.screenMdEn, renderMd('Adaptations: how the shows differ from the books', S.screen.groups.map(g => ({ title: g.title, items: g.items.map(x => Object.assign({ id: x.id, name: namesEn.get(x.id) || x.id }, keep(smdE, x.id))) })), MD_NOTE_EN));
  const dsmd = parseMd(S.screenDragonsMd), dsmdE = parseMd(S.screenDragonsMdEn);
  put(S.screenDragonsMd, renderMd('Драконы на экране: чем сериал отличается от книг', D.groups.map(g => ({ title: g.title, items: g.dragons.map(x => Object.assign({ id: x.id, name: x.full || x.name }, pick(dsmd, 'screenDragons', x.id))) }))));
  put(S.screenDragonsMdEn, renderMd('Dragons on screen: how the shows differ from the books', D.groups.map(g => ({ title: g.title, items: g.dragons.map(x => Object.assign({ id: x.id, name: enName(x) }, keep(dsmdE, x.id))) })), MD_NOTE_EN));
  // дома (вкладка «Вассалитет» и карточка дома): по краям, как в data/vassals.json; в заголовке — название дома
  const V = S.vassals, vmd = parseMd(S.vassalsMd), vmdE = parseMd(S.vassalsMdEn);
  const vGroups = V.regions.map(r => ({ r, hs: V.houses.filter(h => h.region === r.id) }));
  put(S.vassalsMd, renderMd('Дома Вестероса', vGroups.map(({ r, hs }) => ({ title: r.ru, items: hs.map(h => Object.assign({ id: h.id, name: h.ru }, pick(vmd, 'vassals', h.id))) }))));
  put(S.vassalsMdEn, renderMd('Houses of Westeros', vGroups.map(({ r, hs }) => ({ title: r.ru, items: hs.map(h => Object.assign({ id: h.id, name: 'House ' + h.en }, keep(vmdE, h.id))) })), MD_NOTE_EN));
  return written;
}

module.exports = { load, emit, sync, parseMd, renderMd, fmt, writeJson, orderKeys, PERSON_KEYS, ROOT, DATA, TEXTS, TEXTS_EN };

if (require.main === module) {
  const a = process.argv[2];
  if (a === '--emit') process.stdout.write(emit());
  else if (a === '--sync') { const w = sync(); console.log(w.length ? 'обновлено: ' + w.join(', ') : 'тексты уже в порядке'); }
  else if (a === '--check') { const d = load(); console.log('людей', d.PEOPLE.length, '· драконов', d.DRAGONS.length); if (d.problems.length) { console.log(d.problems.join('\n')); process.exit(1); } console.log('data/ и texts/ сходятся'); }
  else { console.log('node tools/data.js --emit | --sync | --check'); process.exit(2); }
}
