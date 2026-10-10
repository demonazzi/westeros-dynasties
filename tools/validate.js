/* Проверка данных: ссылки, корни, дубликаты, пол, драконы. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const files = ['data-meta.js', 'data-people.js']
  .concat(fs.readdirSync(SRC).filter(f => f.startsWith('data-house-')).sort())
  .concat(fs.readdirSync(SRC).filter(f => f.startsWith('data-extra-')).sort());
const ctx = {}; vm.createContext(ctx);
let code = files.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
code += '\n;this.PEOPLE=PEOPLE;this.BANDS=BANDS;this.HOUSES=HOUSES;this.FEMALE=FEMALE;this.GROUPS=GROUPS;this.WIKI=WIKI;' +
  'this.DRAGON_SCREEN=typeof DRAGON_SCREEN!=="undefined"?DRAGON_SCREEN:undefined;this.DRAGONS=typeof DRAGONS!=="undefined"?DRAGONS:[];this.EXTRA=typeof EXTRA!=="undefined"?EXTRA:{};';
vm.runInContext(code, ctx);
const { PEOPLE: P, BANDS, HOUSES, FEMALE, GROUPS, WIKI, DRAGONS, EXTRA } = ctx;
const errs = [], warn = [];
const ids = new Set();
P.forEach(p => { if (ids.has(p.id)) errs.push('дубликат id ' + p.id); ids.add(p.id); });
const isId = r => /^[a-z_0-9]+$/.test(r);
P.forEach(p => {
  if (p.p && !ids.has(p.p)) errs.push('нет родителя ' + p.p + ' у ' + p.id);
  (p.par || []).forEach(r => { const id = r.split(' ')[0]; if (isId(id) && !ids.has(id)) errs.push('ссылка par ' + r + ' у ' + p.id); });
  (p.sp || []).forEach(s => { if (isId(s[0]) && !ids.has(s[0])) errs.push('супруг ' + s[0] + ' у ' + p.id); });
  (p.wd || []).forEach(w => { if (isId(w) && !ids.has(w)) errs.push('воспитанник ' + w + ' у ' + p.id); });
  if (p.rp && !ids.has(p.rp)) errs.push('rp ' + p.rp + ' у ' + p.id);
  const h = p.hs || (p.k === 'B' ? 'bf' : 'targ');
  if (!HOUSES[h]) errs.push('нет дома ' + h + ' у ' + p.id);
  if (h === 'oth' && !p.h) errs.push('у другого дома нет h: ' + p.id);
  if (!p.t) warn.push('нет описания ' + p.id);
});
const roots = new Set(BANDS.flatMap(b => b.roots.map(r => r[0])));
roots.forEach(r => { if (!ids.has(r)) errs.push('корень не найден ' + r); });
P.filter(p => !p.p).forEach(p => { if (!roots.has(p.id)) errs.push('сирота не в полосах ' + p.id); });
const kids = {}; P.forEach(p => { if (p.p) (kids[p.p] = kids[p.p] || []).push(p.id); });
const seen = new Set(); const walk = i => { seen.add(i); (kids[i] || []).forEach(walk); }; roots.forEach(walk);
P.forEach(p => { if (!seen.has(p.id)) errs.push('недостижим ' + p.id); });
const fulls = {}; P.forEach(p => { const f = p.full || p.name; if (fulls[f]) errs.push('одинаковое полное имя: ' + f); fulls[f] = 1; });
FEMALE.forEach(f => { if (!ids.has(f)) errs.push('FEMALE: нет id ' + f); });
GROUPS.forEach(f => { if (!ids.has(f)) errs.push('GROUPS: нет id ' + f); });
Object.keys(WIKI).forEach(f => { if (!ids.has(f)) errs.push('WIKI: нет id ' + f); });
BANDS.forEach(b => { if (!HOUSES[b.house] || !HOUSES[b.house].band) errs.push('полоса без описания дома ' + b.house); });
const dids = new Set();
(DRAGONS || []).forEach(d => {
  if (dids.has(d.id)) errs.push('дубликат дракона ' + d.id); dids.add(d.id);
  (d.riders || []).forEach(r => { if (isId(r[0]) && !ids.has(r[0])) errs.push('наездник ' + r[0] + ' у дракона ' + d.id); });
});
(DRAGONS || []).forEach(d => (d.parents || []).forEach(x => { if (!dids.has(x)) errs.push('родитель дракона ' + x + ' у ' + d.id); }));
if (typeof ctx.DRAGON_SCREEN !== 'undefined') Object.keys(ctx.DRAGON_SCREEN).forEach(id => { if (!dids.has(id)) errs.push('DRAGON_SCREEN: нет дракона ' + id); });
Object.keys(EXTRA).forEach(k => Object.keys(EXTRA[k] || {}).forEach(id => { if (!ids.has(id)) errs.push('EXTRA.' + k + ': нет id ' + id); }));
console.log('людей:', P.length, '· драконов:', (DRAGONS || []).length, '· полос:', BANDS.length);
if (warn.length) console.log('предупреждения:', warn.length, warn.slice(0, 5).join('; '));
if (errs.length) { console.log('ОШИБКИ:\n' + errs.join('\n')); process.exit(1); }
console.log('данные в порядке');
