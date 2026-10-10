/* Переносит тексты из присланного файла в исходники: описания людей и драконов (t), отличия от книг (df, DRAGON_SCREEN). */
const fs = require('fs'), path = require('path');
const acorn = require('/opt/npm-tools/node_modules/acorn');
const S = process.argv[2], SRC = path.join(__dirname, '..', 'src');
const E = JSON.parse(fs.readFileSync(S + '/edited.json'));
const ePeople = new Map(E.PEOPLE.map(p => [p.id, p])), eDragons = new Map(E.DRAGONS.map(d => [d.id, d]));
const eScreen = (E.EXTRA || {}).screen || {}, eDS = E.DRAGON_SCREEN || {};
const lit = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n') + "'";
const keyName = p => p.key.type === 'Identifier' ? p.key.name : p.key.value;
const stats = {};
function walk(node, fn, parents = []) {
  if (!node || typeof node.type !== 'string') return;
  fn(node, parents);
  for (const k in node) { const v = node[k]; if (k === 'loc') continue; if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, fn, parents.concat(node))); else if (v && typeof v.type === 'string') walk(v, fn, parents.concat(node)); }
}
const declName = parents => { for (let i = parents.length - 1; i >= 0; i--) { const p = parents[i]; if (p.type === 'VariableDeclarator') return p.id.name; if (p.type === 'AssignmentExpression' && p.left.type === 'MemberExpression') return (p.left.object.name || '') + '.' + (p.left.property.name || ''); } return ''; };
const touched = { people: new Set(), dragons: new Set(), screen: new Set(), ds: new Set() };
// автор поправил текст — пометка «черновик Claude» (ai: 1) снимается
function dropAi(prop, code, reps) {
  if (!prop) return;
  let s = prop.start, e = prop.end;
  const after = code.slice(e).match(/^\s*,\s*/);
  if (after) e += after[0].length; else { const before = code.slice(0, s).match(/,\s*$/); if (before) s -= before[0].length; }
  reps.push([s, e, '']);
}
fs.readdirSync(SRC).filter(f => /^data-.*\.js$/.test(f)).forEach(f => {
  const file = path.join(SRC, f), code = fs.readFileSync(file, 'utf8');
  const ast = acorn.parse(code, { ecmaVersion: 'latest' });
  const reps = [];
  walk(ast, (n, parents) => {
    if (n.type !== 'ObjectExpression') return;
    const props = n.properties.filter(p => p.type === 'Property');
    const get = k => props.find(p => keyName(p) === k);
    const where = declName(parents);
    const idP = get('id'), tP = get('t');
    // люди и драконы: { id: '…', …, t: '…' }
    if (idP && idP.value.type === 'Literal' && tP && tP.value.type === 'Literal') {
      const id = idP.value.value;
      const src = where === 'DRAGONS' ? eDragons : (/PEOPLE/.test(where) || f.startsWith('data-house') || f === 'data-people.js') ? ePeople : null;
      if (src && src.has(id) && typeof src.get(id).t === 'string' && src.get(id).t !== tP.value.value) {
        reps.push([tP.value.start, tP.value.end, lit(src.get(id).t)]);
        dropAi(get('ai'), code, reps);
        touched[src === eDragons ? 'dragons' : 'people'].add(id);
      }
    }
    // отличия от книг у людей: EXTRA.screen = { id: { a, df } }
    if (where === 'EXTRA.screen') {
      const parent = parents[parents.length - 1];
      if (parent && parent.type === 'Property' && parent.value === n) {
        const id = keyName(parent), dfP = get('df');
        if (dfP && dfP.value.type === 'Literal' && eScreen[id] && typeof eScreen[id].df === 'string' && eScreen[id].df !== dfP.value.value) { reps.push([dfP.value.start, dfP.value.end, lit(eScreen[id].df)]); dropAi(get('ai'), code, reps); touched.screen.add(id); }
      }
    }
    // отличия от книг у драконов: DRAGON_SCREEN = { id: '…' }
    if (where === 'DRAGON_SCREEN' && parents[parents.length - 1].type === 'VariableDeclarator') {
      props.forEach(p => { const id = keyName(p); if (p.value.type === 'Literal' && typeof eDS[id] === 'string' && eDS[id] !== p.value.value) { reps.push([p.value.start, p.value.end, lit(eDS[id])]); touched.ds.add(id); } });
    }
  });
  if (!reps.length) return;
  reps.sort((a, b) => b[0] - a[0]);
  let out = code; reps.forEach(([s, e, r]) => { out = out.slice(0, s) + r + out.slice(e); });
  acorn.parse(out, { ecmaVersion: 'latest' });
  fs.writeFileSync(file, out);
  stats[f] = reps.length;
});
console.log('замен по файлам', stats);
console.log('людей', touched.people.size, 'драконов', touched.dragons.size, 'отличий у людей', touched.screen.size, 'отличий у драконов', touched.ds.size);
const missP = E.PEOPLE.filter(p => !touched.people.has(p.id)).map(p => p.id);
const missS = Object.keys(eScreen).filter(id => eScreen[id].df && !touched.screen.has(id));
console.log('не перенесено (люди):', missP.join(', ') || '—', '| (отличия):', missS.join(', ') || '—');
