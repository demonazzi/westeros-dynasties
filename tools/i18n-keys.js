/* Ключи перевода интерфейса: собирает русские строки и дописывает новые в src/i18n/<язык>.json с пустым переводом
   (готовые переводы не трогает, пропавшие из исходников — убирает). Откуда берутся строки:
   · src/body.html — текст элементов и атрибуты title, placeholder, aria-label;
   · src/*.js — App.t('…') (в том числе шаблоны с {n}), формы числа plural(n, 'дом', 'дома', 'домов') → «дом|дома|домов»,
     подписи row('…');
   · обход собранной страницы (dist/targaryen-tree.html; сначала python3 tools/build.py): все вкладки, легенды,
     меню, карточки человека и дракона — целые подписи, которые там видны.
   Строки данных (имена, дома, заметки) и тексты сюда не попадают: они в texts/en/data.json и texts/en/*.md.
   Подписи, где русский склеен с именем или годом и потому не переводится целиком, печатаются списком «составные» —
   их надо собрать в коде через App.t с подстановками.
   node tools/i18n-keys.js [язык=en] [--no-crawl] */
const fs = require('fs'), path = require('path');
const { JSDOM } = require(path.join(__dirname, 'node_modules', 'jsdom'));
const D = require('./data.js');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src');
const args = process.argv.slice(2), lang = args.find(a => !a.startsWith('--')) || 'en', crawl = !args.includes('--no-crawl');
const CYR = /[А-Яа-яЁё]/;
const norm = s => (s || '').replace(/\s+/g, ' ').trim();
const keys = new Set();
const add = s => { s = norm(s); if (s && CYR.test(s) && !/' \+|\+ '/.test(s) && s.length < 400) keys.add(s); };

// разметка
const doc = new JSDOM(fs.readFileSync(path.join(SRC, 'body.html'), 'utf8')).window.document;
const w = doc.createTreeWalker(doc.body, 4 /* SHOW_TEXT */);
for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest('script,style')) add(n.nodeValue);
doc.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el => ['title', 'placeholder', 'aria-label'].forEach(a => add(el.getAttribute(a))));

// код
const unq = s => s.replace(/\\'/g, "'").replace(/\\n/g, '\n');
const Q = "'((?:[^'\\\\]|\\\\.)*)'";
fs.readdirSync(SRC).filter(f => f.endsWith('.js')).forEach(f => {
  const js = fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  // App.t(…) и t(…) (const t = App.t): все строки в первом аргументе, в том числе в выборе «условие ? 'а' : 'б'»
  for (const m of js.matchAll(/\b(?:App\.)?t\(((?:'(?:[^'\\]|\\.)*'|[^'(){},])*)/g)) for (const q of m[1].matchAll(new RegExp(Q, 'g'))) add(unq(q[1]));
  for (const m of js.matchAll(new RegExp('\\brow\\(\\s*' + Q, 'g'))) add(unq(m[1]));
  for (const m of js.matchAll(new RegExp('plural\\([^,]+,\\s*' + Q + ',\\s*' + Q + ',\\s*' + Q, 'g'))) add([m[1], m[2], m[3]].map(unq).join('|'));
  for (const m of js.matchAll(/>([^<>'"+\n;{}=&|!]*[А-Яа-яЁё][^<>'"+\n;{}=&|!]*)</g)) add(m[1]);
  for (const m of js.matchAll(/\b(?:title|placeholder|aria-label)="([^"<>]*[А-Яа-яЁё][^"<>]*)"/g)) add(m[1]);
});

// строки данных — чтобы не принять их за подписи интерфейса
const data = new Set(), names = new Set();
const d = D.load();
const walkData = v => { if (typeof v === 'string') { if (CYR.test(v)) data.add(norm(v)); } else if (Array.isArray(v)) v.forEach(walkData); else if (v && typeof v === 'object') Object.values(v).forEach(walkData); };
['HOUSES', 'GAPS', 'PEOPLE', 'DRAGONS', 'DRAGON_ORIGINS', 'DRAGON_FIGHTS', 'SERIES', 'EXTRA', 'DRAGON_SCREEN', 'V_REGIONS', 'V_PRE', 'V_CLAIMANTS', 'V_MILESTONES', 'V_HOUSES'].forEach(k => walkData(d[k]));
d.PEOPLE.forEach(p => [p.name, p.full].concat(p.al || []).forEach(n => n && names.add(n)));
d.DRAGONS.forEach(x => [x.name, x.full].forEach(n => n && names.add(n)));
Object.values(d.HOUSES).forEach(h => [h.name, h.band].forEach(n => n && names.add(n)));
d.V_HOUSES.forEach(h => names.add(h.ru));
const nameList = [...names].filter(n => n.length >= 4);
// \b в JS не видит границ кириллических слов — поэтому границы через соседние буквы
const yearOnly = s => !s.replace(/[\d\s–—≈.,:;·()+\-†×№]+/g, ' ').replace(/(^|[^А-Яа-яЁё])(г|до|З|р|гг|лет|год|года)(?![А-Яа-яЁё])/g, '$1').trim();
// карточка дома показывает замок и девиз по отдельности, а в «Бастард · дом …» название дома строчное
// (только для точного совпадения: «Пламя и кровь» внутри подписи — ещё не данные)
const dataPart = new Set();
Object.values(d.HOUSES).forEach(h => { String(h.motto || '').split(' · ').forEach(x => x && dataPart.add(norm(x))); if (h.name) dataPart.add(h.name.replace('Дом ', 'дом ')); });

const finish = composite => {
  const file = path.join(SRC, 'i18n', lang + '.json');
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  // ключи, которые код передаёт в App.t не литералом, а из таблицы (формы дат, стороны в войне, подписи драконов…):
  // извлечение их не видит, но строка есть в исходниках — переведённые такие ключи сохраняются
  // (и значения данных, которые страница переводит через App.t: «при рождении», «в детстве»…) — переведённый ключ
  // сохраняется, пока строка есть в исходниках или в собранной странице
  const SRC_ALL = fs.readdirSync(SRC).filter(f => /\.(js|html)$/.test(f)).map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
  const DIST = path.join(ROOT, 'dist', 'targaryen-tree.html'), PAGE = fs.existsSync(DIST) ? fs.readFileSync(DIST, 'utf8') : '';
  const q = k => JSON.stringify(k);
  Object.keys(old).forEach(k => { if (old[k] && !keys.has(k) && !/[{}]/.test(k.replace(/\{\w+\}/g, '')) && (SRC_ALL.includes("'" + k + "'") || SRC_ALL.includes('>' + k + '<') || PAGE.includes(q(k)))) keys.add(k); });
  const out = {};
  [...keys].sort((a, b) => a.localeCompare(b, 'ru')).forEach(k => { out[k] = old[k] || ''; });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  const done = Object.values(out).filter(Boolean).length, gone = Object.keys(old).filter(k => !(k in out)).length;
  console.log(lang + ': ключей ' + keys.size + ', переведено ' + done + (gone ? ', убрано устаревших ' + gone : '') + ' → ' + path.relative(ROOT, file));
  if (composite && composite.size) {
    console.log('составные (русский склеен с данными — нужен шаблон App.t): ' + composite.size);
    // сводка по образцам: имена → {X}, данные → {D}, числа → {N}
    const byLen = nameList.slice().sort((a, b) => b.length - a.length), dataLong = [...data].filter(x => x.length > 12).sort((a, b) => b.length - a.length);
    const pat = new Map();
    composite.forEach(s => { let t = s; dataLong.forEach(x => { if (t.includes(x)) t = t.split(x).join('{D}'); }); byLen.forEach(n => { if (t.includes(n)) t = t.split(n).join('{X}'); }); t = t.replace(/\d+/g, '{N}'); pat.set(t, (pat.get(t) || 0) + 1); });
    // образец «покрыт», если после вычёркивания известных ключей (шаблоны — как регулярки) кириллицы не осталось:
    // такая строка склеена из уже переводимых частей и имён
    const esc = x => x.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    const parts = [...keys].flatMap(k => (k.includes('|') ? k.split('|') : [k])).concat(['дом']); // формы числа; «дом» — строчный в «Бастард · дом …» (только по-русски)
    const krx = [...new Set(parts)].sort((a, b) => b.length - a.length).map(k => new RegExp(esc(k).replace(/\{(\w+)\}/g, '.*?'), 'g'));
    const open = [...pat].filter(([t]) => { let r = t.replace(/\{[XDN]\}/g, ' '); krx.forEach(rx => { r = r.replace(rx, ' '); }); return /[А-Яа-яЁё]/.test(r); });
    console.log('  из них образцов ' + pat.size + ', не покрыто ключами: ' + open.length);
    open.sort((a, b) => b[1] - a[1]).slice(0, args.includes('--all') ? 1e9 : 60).forEach(([t, n]) => console.log('  ' + String(n).padStart(5) + ' · ' + t.slice(0, 150)));
  }
};

if (!crawl) { finish(); return; }
(async () => {
  const { chromium } = require('/opt/npm-tools/node_modules/playwright');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
  await p.goto('file://' + path.join(ROOT, 'dist', 'targaryen-tree.html') + '?lang=ru'); await p.waitForTimeout(900);
  const seen = new Set();
  const grab = async () => (await p.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest('script,style')) out.push(n.nodeValue);
    document.querySelectorAll('[title],[placeholder],[aria-label],[aria-valuetext]').forEach(el => ['title', 'placeholder', 'aria-label', 'aria-valuetext'].forEach(a => el.hasAttribute(a) && out.push(el.getAttribute(a))));
    return out;
  })).forEach(s => seen.add(norm(s)));
  const step = async js => { await p.evaluate(js).catch(() => {}); await p.waitForTimeout(250); await grab(); };
  await grab();
  await step(() => { document.querySelectorAll('details.legend').forEach(x => { x.open = true; }); });
  for (const id of ['aegon1', 'rhaenyra', 'joy_hill', 'robb', 'daemon_bf', 'jon']) await step(`App.select(${JSON.stringify(id)})`);
  await step(() => document.getElementById('lens-btn').click());
  await step(() => document.getElementById('lens-btn').click());
  await step(() => document.getElementById('filter-btn').click());
  await step(() => { document.querySelector('[data-fall="none"]').click(); });
  await step(() => { document.querySelector('[data-fall="1"]').click(); document.getElementById('filter-btn').click(); });
  await step(() => document.getElementById('toggle-screen').click());
  await step(() => App.select('rhaenyra'));
  await step(() => document.getElementById('toggle-screen').click());
  for (const v of ['dragons', 'time', 'kin', 'list', 'vassal']) {
    await step(`App.setView(${JSON.stringify(v)})`);
    await step(() => { document.querySelectorAll('details.legend').forEach(x => { x.open = true; }); });
  }
  await step(() => { App.setView('dragons'); App.openDragon && App.openDragon('balerion', { center: true }); });
  await step(() => { App.setView('kin'); App.select('daenerys'); });
  await step(() => { App.setView('vassal'); App.vOpenAll && App.vOpenAll(true); });
  await step(() => { App.vOpenHouse && App.vOpenHouse('stark', true); });
  await step(() => { App.setView('people'); });
  for (const h of ['stk', 'fry', 'bw', 'plm']) await step(`App.openHouse(${JSON.stringify(h)})`);
  await b.close();
  const composite = new Set();
  // уже покрытое ключами: шаблон с подстановками («0 из 12» ← «{n} из {all}») или число с формой числа («108 человек»)
  const rxEsc = x => x.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  // шаблоны с короткой русской частью («с {y}») не берём — под них подойдёт что угодно
  const tmpl = [...keys].filter(k => /\{\w+\}/.test(k) && (k.replace(/\{\w+\}/g, '').match(/[А-Яа-яЁё]/g) || []).length >= 5).map(k => new RegExp('^' + rxEsc(k).replace(/\{\w+\}/g, '.+?') + '$'));
  const forms = new Set([...keys].filter(k => k.includes('|')).flatMap(k => k.split('|')));
  const coveredOne = s => keys.has(s) || data.has(s) || dataPart.has(s) || yearOnly(s) || tmpl.some(rx => rx.test(s)) || (m => !!m && forms.has(m[1]))(s.match(/^\d+\s+(.+)$/));
  // подпись из уже переводимых кусков через « · » («Ренли — король · 298 г.»); «дом Хэев» — строчное название дома
  // в «Бастард · дом …», только по-русски (по-английски это «House …» из шаблона «Дом {h}»)
  const covered = s => coveredOne(s) || (s.includes(' · ') && s.split(' · ').every(coveredOne)) || /^дом [А-ЯЁ]/.test(s);
  seen.forEach(s => {
    s = s.replace(/^[\s·]+|[\s·]+$/g, '');   // куски вокруг ссылки: «Бастард ·», «· Король Севера»
    if (!s || !CYR.test(s) || data.has(s) || dataPart.has(s) || keys.has(s) || yearOnly(s) || covered(s)) return;
    if (nameList.some(n => s.includes(n)) || [...data].some(x => x.length > 12 && s.includes(x))) { if (!keys.has(s)) composite.add(s); return; }
    add(s);
  });
  finish(composite);
})();
