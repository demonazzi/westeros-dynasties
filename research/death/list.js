/* Список людей без года смерти для вычитки по AWOIAF (поле «Died», жив ли в конце книг).
   node research/death/list.js → research/death/todo/part_NN.json (по домам, куски ≤ 55 человек) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'tools', 'data.js'));
const d = D.load();
const byId = new Map(d.PEOPLE.map(p => [p.id, p]));
const idOf = r => (/^[a-z_0-9]+/.exec(r) || [''])[0];
const nm = id => { const q = byId.get(id); return q ? (q.en || q.name) : id; };
const rows = d.PEOPLE.filter(p => !p.group && (p.d == null || p.d === '')).map(p => {
  const r = { id: p.id, house: p.hs || 'targ', ru: p.name, en: p.en || '', page: p.wiki || p.en || '' };
  if (p.b) r.born = p.b;
  const par = (p.par || []).map(idOf).filter(x => byId.has(x)).map(nm);
  if (!par.length && p.p && byId.has(p.p)) par.push(nm(p.p));
  if (par.length) r.parents = par;
  const sp = (p.sp || []).map(s => byId.has(s[0]) ? nm(s[0]) : s[0]);
  if (sp.length) r.spouses = sp;
  if (p.r) r.reign = p.r;
  if (p.t_en) r.about = p.t_en.slice(0, 220);
  return r;
});
const out = path.join(__dirname, 'todo');
fs.mkdirSync(out, { recursive: true });
const byH = new Map();
rows.forEach(r => { if (!byH.has(r.house)) byH.set(r.house, []); byH.get(r.house).push(r); });
const parts = []; let cur = [];
[...byH.values()].sort((a, b) => b.length - a.length).forEach(g => {
  for (let i = 0; i < g.length; i += 55) {
    const s = g.slice(i, i + 55);
    if (cur.length + s.length > 55) { parts.push(cur); cur = []; }
    cur.push(...s);
  }
});
if (cur.length) parts.push(cur);
parts.forEach((p, i) => fs.writeFileSync(path.join(out, 'part_' + String(i + 1).padStart(2, '0') + '.json'), JSON.stringify(p, null, 1)));
console.log(rows.length, 'человек,', parts.length, 'кусков:', parts.map(p => p.length + ' [' + [...new Set(p.map(r => r.house))].join(',') + ']').join('; '));
