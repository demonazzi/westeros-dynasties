/* Переносит тексты из присланного файла в texts/: описания людей и драконов (t), отличия от книг (df, DRAGON_SCREEN).
   node tools/texts-extract.js /путь/к/правленому.html /папка/edited.json
   node tools/texts-merge.js /папка          (берёт /папка/edited.json)
   Изменённый текст теряет пометку ✎ (черновик Claude). */
const fs = require('fs'), path = require('path');
const D = require('./data');
const E = JSON.parse(fs.readFileSync(path.join(process.argv[2], 'edited.json'), 'utf8'));
const cur = D.load();
const changed = { people: new Map(), dragons: new Map(), screen: new Map(), screenDragons: new Map() };
const take = (kind, id, was, now) => { if (typeof now === 'string' && now.trim() && now.trim() !== (was || '').trim()) changed[kind].set(id, { text: now.trim().replace(/\s+/g, ' '), ai: false }); };
const curP = new Map(cur.PEOPLE.map(p => [p.id, p]));
(E.PEOPLE || []).forEach(p => { if (curP.has(p.id)) take('people', p.id, curP.get(p.id).t, p.t); });
const curD = new Map(cur.DRAGONS.concat(cur.DRAGON_ORIGINS).map(d => [d.id, d]));
(E.DRAGONS || []).concat(E.DRAGON_ORIGINS || []).forEach(d => { if (curD.has(d.id)) take('dragons', d.id, curD.get(d.id).t, d.t); });
const eS = (E.EXTRA || {}).screen || {};
Object.keys(eS).forEach(id => { if (cur.EXTRA.screen[id]) take('screen', id, cur.EXTRA.screen[id].df, eS[id].df); });
const eDS = E.DRAGON_SCREEN || {};
Object.keys(eDS).forEach(id => { if (curD.has(id)) take('screenDragons', id, cur.DRAGON_SCREEN[id], eDS[id]); });
const written = D.sync(changed);
console.log('изменено: людей', changed.people.size, '· драконов', changed.dragons.size, '· отличий у людей', changed.screen.size, '· отличий у драконов', changed.screenDragons.size);
console.log('файлы:', written.join(', ') || '—');
const unknown = (E.PEOPLE || []).filter(p => !curP.has(p.id)).map(p => p.id);
if (unknown.length) console.log('нет в данных (пропущено):', unknown.join(', '));
