/* Дом Фреев: research/houses/fry/part_*.json (сбор по A Wiki of Ice and Fire, русские имена — 7kingdoms.ru; бриф —
   fry/FREY_BRIEF.md) → data/people/fry.json, texts/people/fry.md, полоса и герб в data/meta.json, роли в data/screen.json.
   Одноразовый: после него файлы правятся руками. Все тексты — черновики Claude (✎).
   node research/houses/gen_fry.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'tools', 'data.js'));
const SRC = path.join(__dirname, 'fry');
const P = [];
[1, 2, 3, 4].forEach(i => JSON.parse(fs.readFileSync(path.join(SRC, 'part_' + i + '.json'), 'utf8')).people.forEach(p => P.push(p)));
const by = new Map(P.map(p => [p.id, p]));
const readJson = f => JSON.parse(fs.readFileSync(path.join(D.DATA, f), 'utf8'));

/* ——— Правки по сверке с вики и по устройству древа ——— */
// Годы, которые вики даёт только диапазоном: показываем диапазон, а не середину
const YEARS = {
  aegon_fr_aenys: { b: '250–273' }, aenys_fr: { b: '238–248' }, alesander_fr: { b: '263–281' }, arwood_fr: { b: '260–282' },
  benfrey_fr: { b: '270–279' }, bryan_fr: { b: '281–291' }, cleos_fr: { b: '257–276' }, danwell_fr: { b: '252–261' },
  edwyn_fr: { b: '257–279' }, hosteen_fr: { b: '248–258' }, jammos_fr: { b: '265–267' }, kyra_fr: { b: '261–278' },
  lothar_fr: { b: '264–266' }, luceon_fr: { b: '248–258' }, lyonel_fr: { b: '258–283' }, lythene_fr: { b: '249–259' },
  maegelle_fr: { b: '250–268', d: 'не позднее 299' }, perriane_fr: { b: '239–249' }, perwyn_fr: { b: '269–278' },
  rhaegar_fr: { b: '269–274' }, ryman_fr: { b: '245–249' }, steffon_fr: { b: '260–280' }, symond_fr: { b: '252–260' },
  tytos_fr: { b: '260–273' }, walder_fr_ryman: { b: '258–280' }, walton_fr: { b: '250–268' }, willamen_fr: { b: '272–280' },
  alys_fr: { d: '261–298' }, fr_lord: { d: '212–252' }, geremy_fr: { d: '289–299' }, tion_fr: { b: 'не позднее 284' }
};
// Безымянное звено: общий отец лорда Фрея (отца Уолдера) и сира Франклина
const PLACEHOLDER = {
  id: 'fr_lord14', name: 'Лорд Фрей', full: 'Лорд Фрей, отец лорда Фрея и сира Франклина', en: 'House Frey', hs: 'fry', k: 'T',
  t: 'Безымянный лорд Переправы, отец лорда Фрея — отца Уолдера — и сира Франклина Фрея. Через него идёт линия от Фреев времён Эйриса I к лорду Уолдеру и его огромному потомству. О нём самом в книгах ничего не сказано.'
};
const TREE_P = { fr_lord: 'fr_lord14', franklyn_fr: 'fr_lord14', addam_fr: 'franklyn_fr' };
const PAR = {
  fr_lord: ['fr_lord14'], franklyn_fr: ['fr_lord14'], addam_fr: ['franklyn_fr (возможно)', 'племянник лорда Фрея, отца Уолдера'],
  alys_fr: ['из младшей ветви дома Фреев; родители не названы'], jyanna_fr: ['кузина мужа; родители не названы'],
  theo_fr: ['вероятно, внук лорда Уолдера; родители не названы'], forrest_fr: ['родители не названы'],
  sabitha_fr: ['урождённая Випрен; родители не названы']
};
// корни полосы: [id, колонка поколения] (колонка ≈ год рождения: 10 ≈ 88, 14 ≈ 172, 15 ≈ 184, 16 ≈ 198, 17 ≈ 226, 18 ≈ 245)
const ROOTS = [['forrest_fr', 10], ['sabitha_fr', 10], ['fr_lord14', 14], ['alys_fr', 17], ['jyanna_fr', 17], ['theo_fr', 18]];
const GAPS = [{ house: 'fry', from: 'forrest_fr', to: 'fr_lord14', years: '≈ 60 лет', note: 'лорды Переправы между Форрестом и дедом Уолдера в книгах не названы' }];
// дети лорда Уолдера, которых по слухам прижил Чёрный Уолдер (официальный отец остаётся на древе)
const RUMOR_BW = ['arwyn_fr', 'wendel_fr', 'colmar_fr', 'waltyr_fr', 'elmar_fr', 'shirei_fr', 'walda_fr_edwyn', 'perra_fr'];
const OTH = { sabitha_fr: { name: 'Сабита Випрен', h: 'Випренов', al: ['Сабита Фрей', 'леди Фрей'] } };
const DROP_SCREEN = new Set(['sarra_fr', 'serra_fr']); // в сериале без названной актрисы
const SPELL = [[/Меррет(?!т)/g, 'Мерретт'], [/Танц([а-я]*) Драконов/g, 'Танц$1 драконов'], [/Озерн/g, 'Озёрн']];
const fix = s => SPELL.reduce((t, [a, b]) => t.replace(a, b), s || '');

const ids = new Set(P.map(p => p.id).concat(PLACEHOLDER.id));
const existing = new Set(readJson('meta.json').people_files.flatMap(f => readJson('people/' + f + '.json').groups.flatMap(g => g.people.map(p => p.id))));
const ref = x => x == null ? null : String(x).trim() || null;
const years = s => { s = ref(s); return s ? s.replace(/^(\d+) или (\d+)$/, '$1/$2') : null; };
const enOf = p => (p.page || p.en).replace(/_/g, ' ').replace(/ \(.*\)$/, '');

function person(p) {
  const o = { id: p.id };
  const ot = OTH[p.id];
  o.name = ot ? ot.name : p.ru;
  const full = (p.full || '').trim();
  if (full && full !== o.name) o.full = full;
  o.en = enOf(p);
  const al = (ot ? ot.al : []).concat((p.al || []).filter(a => a && a !== o.name && !(ot && a === ot.name)));
  if (al.length) o.al = [...new Set(al)];
  if (p.fem) o.fem = 1;
  if (ot) { o.hs = 'oth'; o.h = ot.h; } else o.hs = 'fry';
  o.k = p.k === 'R' ? 'R' : 'T';
  const father = ref(p.father), mother = ref(p.mother);
  const isId = x => x && (ids.has(x) || existing.has(x));
  const tp = TREE_P[p.id] || (father && ids.has(father) ? father : null) || (mother && ids.has(mother) ? mother : null);
  if (tp && !ROOTS.some(r => r[0] === p.id)) o.p = tp;
  let par = PAR[p.id] || [father, mother].filter(Boolean).map(x => isId(x) ? x : x);
  if (RUMOR_BW.includes(p.id)) { par = par.concat(['walder_fr_ryman (по слухам)']); o.rp = 'walder_fr_ryman'; }
  if (par.length) o.par = par;
  if ((p.unc || RUMOR_BW.includes(p.id)) && o.p) o.unc = 1;
  const y = YEARS[p.id] || {};
  const b = y.b || years(p.b), d = y.d || years(p.d);
  if (b) o.b = b;
  if (d) o.d = d;
  const sp = [];
  (p.spouses || []).forEach(s => {
    let who = ref(s.who);
    if (!who) return;
    if (/^неизвестная жена$/i.test(who)) who = 'жена, имя не названо';
    const item = [who], note = (s.note || '').trim(), typ = s.type || 'm';
    if (note || typ !== 'm') item.push(note);
    if (typ !== 'm') item.push(typ);
    sp.push(item);
  });
  if (sp.length) o.sp = sp;
  const page = (p.page || '').replace(/_/g, ' ');
  if (page && page !== o.en) o.wiki = page;
  return D.orderKeys(o, D.PERSON_KEYS);
}

/* порядок: обход в глубину от корней, дети — в порядке «issue» на странице родителя */
const kidsOf = new Map();
const recs = new Map(P.map(p => [p.id, person(p)]));
const { t: _phText, ...phRest } = PLACEHOLDER;
const ph = D.orderKeys(phRest, D.PERSON_KEYS);
recs.set(ph.id, ph);
recs.forEach(o => { if (o.p) { if (!kidsOf.has(o.p)) kidsOf.set(o.p, []); kidsOf.get(o.p).push(o.id); } });
const num = s => { const m = String(s || '').match(/\d+/g); return m ? m.map(Number).reduce((a, b) => a + b, 0) / m.length : 9999; };
kidsOf.forEach((ks, pid) => {
  const issue = (by.get(pid) || {}).issue || [];
  ks.sort((a, b) => {
    const ia = issue.indexOf(a), ib = issue.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0 !== ib >= 0) return ia >= 0 ? -1 : 1;
    return num(recs.get(a).b) - num(recs.get(b).b);
  });
});
const walk = (id, out) => { out.push(id); (kidsOf.get(id) || []).forEach(k => walk(k, out)); return out; };
const W = by.get('walder_fr');
const wifeOf = id => (by.get(id) || {}).mother;
const GROUPS = [
  { title: 'Танец драконов', ids: ['forrest_fr', 'sabitha_fr'] },
  { title: 'Лорды Переправы до Уолдера', ids: ['fr_lord14', 'fr_lord', 'franklyn_fr', 'addam_fr', 'lady_butterwell', 'walder_fr'], flat: true }
];
const wives = ['Перра Ройс', 'Сиренна Сванн', 'Амарея Крейкхолл', 'Алисса Блэквуд', 'Бетани Росби', 'Аннара Фарринг'];
const RU_GEN = { 'Перра Ройс': 'Перры Ройс', 'Сиренна Сванн': 'Сиренны Сванн', 'Амарея Крейкхолл': 'Амареи Крейкхолл', 'Алисса Блэквуд': 'Алиссы Блэквуд', 'Бетани Росби': 'Бетани Росби', 'Аннара Фарринг': 'Аннары Фарринг' };
wives.forEach(w => GROUPS.push({ title: 'Дети лорда Уолдера и ' + RU_GEN[w] + ' с потомками', ids: (kidsOf.get('walder_fr') || []).filter(k => wifeOf(k) === w).flatMap(k => walk(k, [])) }));
GROUPS.push({ title: 'Бастарды лорда Уолдера с потомками', ids: (kidsOf.get('walder_fr') || []).filter(k => recs.get(k).k === 'R').flatMap(k => walk(k, [])) });
GROUPS.push({ title: 'Родство не прослежено', ids: ['alys_fr', 'jyanna_fr', 'theo_fr'] });
const placed = GROUPS.flatMap(g => g.ids);
const lost = [...recs.keys()].filter(id => !placed.includes(id));
const dup = placed.filter((id, i) => placed.indexOf(id) !== i);
if (lost.length || dup.length) throw new Error('не разложены: ' + lost.join(', ') + ' · дважды: ' + dup.join(', '));
// дети лорда Уолдера в группах идут в порядке его страницы — проверка
const wk = GROUPS.slice(2, 9).flatMap(g => g.ids).filter(id => recs.get(id).p === 'walder_fr');
if (wk.join() !== (kidsOf.get('walder_fr') || []).join()) throw new Error('порядок детей Уолдера разошёлся: ' + wk.join(' '));

D.writeJson('people/fry.json', {
  title: 'Фреи',
  about: 'Дом Фреев (Близнецы), малый дом под Талли. Собрано по A Wiki of Ice and Fire, русские имена — 7kingdoms.ru (research/houses/gen_fry.js).',
  groups: GROUPS.map(g => ({ title: g.title, people: g.ids.map(id => recs.get(id)) }))
});

/* полоса, дом с гербом, пропуск */
const meta = readJson('meta.json');
if (!meta.people_files.includes('fry')) meta.people_files.push('fry');
meta.bands = meta.bands.filter(b => b.house !== 'fry');
meta.bands.splice(meta.bands.findIndex(b => b.house === 'tul') + 1, 0, { house: 'fry', sub: 'tul', roots: ROOTS });
meta.houses.fry = { name: 'Дом Фреев', band: 'Фреи', motto: 'Близнецы', sigil: { field: '#C9CDD3', charge: '#2C4A86' } };
meta.gaps = meta.gaps.filter(g => g.house !== 'fry').concat(GAPS);
D.writeJson('meta.json', meta);

/* связи с людьми, которые уже на древе */
const patch = (file, id, fn) => { const j = readJson('people/' + file + '.json'); j.groups.forEach(g => g.people.forEach(p => { if (p.id === id) fn(p); })); D.writeJson('people/' + file + '.json', j); };
patch('lan', 'genna', p => { p.sp = (p.sp || []).map(s => s[0] === 'Эммон Фрей' ? ['emmon_fr'].concat(s.slice(1)) : s); });
patch('tul', 'edmure', p => { p.sp = (p.sp || []).map(s => s[0] === 'Рослин Фрей' ? ['roslin_fr'].concat(s.slice(1)) : s); });

/* экранизации */
const screen = readJson('screen.json');
screen.groups = screen.groups.filter(g => g.title !== 'Фреи');
const scr = P.filter(p => p.screen && !DROP_SCREEN.has(p.id) && (p.screen.a || []).length);
screen.groups.push({ title: 'Фреи', items: scr.map(p => ({ id: p.id, a: p.screen.a })) });
D.writeJson('screen.json', screen);

/* тексты: всё — черновики Claude */
const texts = new Map(P.map(p => [p.id, { text: fix(p.t).trim(), ai: true }]));
texts.set(PLACEHOLDER.id, { text: PLACEHOLDER.t, ai: true });
const sdf = new Map(scr.map(p => [p.id, { text: fix(p.screen.df || '').trim(), ai: !!(p.screen.df || '').trim() }]));
const written = D.sync({ people: texts, screen: sdf });
console.log('людей', recs.size, '· на экране', scr.length, '· файлы:', written.join(', '));
