/* Строки данных для английского: собирает русские строки из data/ (кроме длинных текстов — они в texts/en/*.md)
   и дописывает новые в texts/en/data.json как { "русская строка": { "en": "", "ctx": "где встречается" } }.
   Готовые переводы сохраняются; строки, которых больше нет в данных, убираются.
   Что сюда не попадает: имена людей и драконов с полем en, актёры с английским именем, годы рождения и смерти
   (их переводят шаблоны интерфейса: «не позднее {n}» и т. п.), приписки «N г.» у браков (шаблон «{n} г.»).
   Правила обхода — те же, что у страницы (src/app-i18n.js, walk): поменяли там — поменяйте здесь.
   node tools/i18n-data.js */
const fs = require('fs'), path = require('path');
const D = require('./data.js');
const d = D.load();
const CYR = /[А-Яа-яЁё]/, NOTE_REF = /^([a-z0-9_]+) \((.+)\)$/, YEAR_NOTE = /^\d+ г\.$/;
const SKIP = new Set(['t', 'df', 'id', 'b', 'd', 'sp', 'par']);
const found = new Map(); // ru → ctx (первое место) и сколько раз
const add = (s, ctx) => {
  if (typeof s !== 'string' || !CYR.test(s) || YEAR_NOTE.test(s.trim())) return;
  const k = s.trim();
  if (!found.has(k)) found.set(k, { ctx, n: 0 });
  found.get(k).n++;
};
const walk = (v, ctx) => {
  if (Array.isArray(v)) { v.forEach(x => (typeof x === 'string' ? add(x, ctx) : walk(x, ctx))); return; }
  if (v && typeof v === 'object') Object.keys(v).forEach(k => { if (SKIP.has(k)) return; const x = v[k]; if (typeof x === 'string') add(x, ctx + '.' + k); else walk(x, ctx + '.' + k); });
};
const ids = new Set(d.PEOPLE.map(p => p.id));
const ref = (r, ctx) => { if (ids.has(r)) return; const m = NOTE_REF.exec(r); if (m && ids.has(m[1])) add(m[2], ctx + ' (приписка к ссылке)'); else add(r, ctx); };

d.PEOPLE.forEach(p => {
  const who = 'человек ' + p.id + ' «' + (p.full || p.name) + '»';
  const q = Object.assign({}, p);
  if (q.en) { delete q.name; delete q.full; }
  walk(q, who);
  (p.par || []).forEach(r => ref(r, who + '.par'));
  (p.sp || []).forEach(s => { ref(s[0], who + '.sp (супруг без карточки)'); if (s[1]) add(s[1], who + '.sp (приписка к браку)'); });
});
d.DRAGONS.concat(d.DRAGON_ORIGINS).forEach(x => { const q = Object.assign({}, x); if (q.en) { delete q.name; delete q.full; } walk(q, 'дракон ' + x.id); });
Object.keys(d.HOUSES).forEach(h => walk(d.HOUSES[h], 'дом ' + h));
d.GAPS.forEach(g => walk(g, 'пропуск ' + g.house + ' ' + g.from + '→' + g.to));
d.DRAGON_FIGHTS.forEach((f, i) => walk(f, 'схватка драконов ' + f.a + '/' + f.b));
walk(d.SERIES, 'сериалы');
Object.keys(d.EXTRA.screen).forEach(id => {
  const o = Object.assign({}, d.EXTRA.screen[id]);
  o.a = (o.a || []).map(a => (a[2] ? [a[0]] : a)); // у актёра есть английское имя — русское не нужно
  walk(o, 'экранизация ' + id);
});
walk(d.V_REGIONS, 'вассалитет: край');
walk(d.V_PRE, 'вассалитет: до Завоевания');
d.V_CLAIMANTS.forEach(c => walk(c, 'вассалитет: сторона ' + c.id));
walk(d.V_MILESTONES, 'вассалитет: событие на шкале');
d.V_HOUSES.forEach(h => walk(h, 'вассалитет: дом ' + h.id));

const file = path.join(D.TEXTS_EN, 'data.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const out = {};
[...found.entries()].sort((a, b) => a[1].ctx.localeCompare(b[1].ctx, 'ru') || a[0].localeCompare(b[0], 'ru')).forEach(([ru, f]) => {
  out[ru] = { en: (old[ru] && old[ru].en) || '', ctx: f.ctx + (f.n > 1 ? ' (и ещё ' + (f.n - 1) + ')' : '') };
});
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
const done = Object.values(out).filter(x => x.en).length;
console.log('строк данных ' + Object.keys(out).length + ', переведено ' + done + ' → ' + path.relative(D.ROOT, file));
