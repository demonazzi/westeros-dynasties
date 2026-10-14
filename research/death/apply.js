/* Годы смерти и «жив на конец книг» по A Wiki of Ice and Fire для людей, у которых года смерти не было.
   Вычитка: research/death/done/part_*.json (агенты по BRIEF.md), сверка умерших — verify/out_*.json (VERIFY.md).
   Поля: d — поле Died со страницы в нашей записи («не ранее 101», «136–176», «279/280»);
         alive: 1 — жив на конец вышедших книг; ls — последний год, когда человек точно жив (по событиям на странице).
   Запуск: node research/death/apply.js [--dry] */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'tools', 'data.js'));
const dry = process.argv.includes('--dry');
const all = JSON.parse(fs.readFileSync(path.join(__dirname, 'all.json'), 'utf8'));
const ver = new Map();
fs.readdirSync(path.join(__dirname, 'verify')).filter(f => /^out_/.test(f))
  .forEach(f => JSON.parse(fs.readFileSync(path.join(__dirname, 'verify', f), 'utf8')).forEach(v => ver.set(v.id, v)));

// разбор по сверке — после чтения страниц второй раз
const OVERRIDE = {
  savage_sam: { status: 'unknown', last_alive: null },          // взята страница другого Сэмвелла (сына Рендилла)
  hgt_lord9: { status: 'unknown', last_alive: null },           // взята страница Ормунда — это его сын, он в древе отдельно
  benjen: { status: 'unknown', last_alive: 298 },              // «presumed dead», пропал за Стеной
  ormond_y: { status: 'alive', last_alive: 300 },               // Died — расчёт вики, в «Пире» жив
  // у безымянных отцов агенты взяли страницу сына или дочери (там год смерти ребёнка)
  tul_lord17: { status: 'unknown', last_alive: null }, gry_lord17: { status: 'unknown', last_alive: null },
  tyr_lord17: { status: 'unknown', last_alive: null }, wes_lord43: { status: 'unknown', last_alive: null },
  stw_lord129: { status: 'dead', died: '', year: null, last_alive: null },  // казнён Рейнирой, год на странице не назван
  // турнир 212 г. и правление 101–103 гг. — о сыне, а не об этом человеке
  fr_lord14: { last_alive: null }, hgt_lord8: { last_alive: null },
  jon: { status: 'alive', last_alive: 300 }, stannis: { status: 'alive', last_alive: 300 }, cersei: { status: 'alive', last_alive: 300 }
};
// умерли, но год на странице не назван: только граница, где она есть в тексте
const NOYEAR = { bae_lord: 'не позднее 298',   // «умер за несколько лет до 298 г.»
  cor_lord17: 'после 283' };                    // ранен на Трезубце и позже умер

const Y = (n, era) => (era === 'BC' ? -n : n);
function parseDied(s) {
  s = String(s || '').replace(/~/g, '').replace(/\([^)]*\)/g, '').trim();
  let m;
  if ((m = /(\d+)\s*(BC|AC)?\s*[–-]\s*(\d+)\s*(BC|AC)/.exec(s))) {
    const a = Y(+m[1], m[2] || m[4]), b = Y(+m[3], m[4]);
    return { d: a + '–' + b, lo: a, hi: b };
  }
  if ((m = /(?:^|In )or after (\d+)\s*(BC|AC)/i.exec(s)) || (m = /^(\d+)\s*(BC|AC)\s+or after/i.exec(s))) {
    const a = Y(+m[1], m[2]);
    return { d: 'не ранее ' + a, lo: a, hi: null };
  }
  if ((m = /or before (\d+)\s*(BC|AC)/i.exec(s))) { const b = Y(+m[1], m[2]); return { d: 'не позднее ' + b, lo: null, hi: b }; }
  if ((m = /^(?:In )?(\d+)\s*(BC|AC)?\s+or\s+(\d+)\s*(BC|AC)/i.exec(s))) {
    const a = Y(+m[1], m[2] || m[4]), b = Y(+m[3], m[4]);
    return { d: a + '/' + b, lo: a, hi: b };
  }
  if ((m = /^(?:In )?(\d+)\s*(BC|AC)\b/i.exec(s))) { const a = Y(+m[1], m[2]); return { d: String(a), lo: a, hi: a }; }
  return null;
}
function fromKind(r) {
  if (r.year == null) return null;
  if (r.kind === 'after') return { d: 'после ' + r.year, lo: r.year, hi: null };
  if (r.kind === 'before') return { d: 'не позднее ' + r.year, lo: null, hi: r.year };
  if (r.kind === 'or' && r.year2 != null) return { d: r.year + '/' + r.year2, lo: r.year, hi: r.year2 };
  if (r.kind === 'exact') return { d: String(r.year), lo: r.year, hi: r.year };
  return null;
}

const plan = new Map(), report = [];
all.forEach(r0 => {
  const r = Object.assign({}, r0, OVERRIDE[r0.id] || {});
  const v = ver.get(r.id);
  const set = {};
  if (r.status === 'alive') set.alive = 1;
  else if (r.status === 'dead') {
    if (v && v.ok === false && !OVERRIDE[r.id]) { report.push('не прошло сверку: ' + r.id + ' — ' + v.note); return; }
    const x = parseDied(r.died) || fromKind(r);
    if (x) set.d = x.d;
    else if (NOYEAR[r.id]) set.d = NOYEAR[r.id];
    if (r.last_alive != null && (!x || x.lo == null || r.last_alive < x.lo) && (!x || x.hi == null || r.last_alive <= x.hi)) set.ls = r.last_alive;
  } else if (r.last_alive != null) set.ls = r.last_alive;
  if (Object.keys(set).length) plan.set(r.id, set);
  report.push([r.id.padEnd(16), r.status.padEnd(7), (r.died || '').padEnd(28), JSON.stringify(set)].join(' '));
});

let n = 0;
for (const f of fs.readdirSync(path.join(D.DATA, 'people'))) {
  const j = JSON.parse(fs.readFileSync(path.join(D.DATA, 'people', f), 'utf8'));
  let ch = false;
  j.groups.forEach(g => g.people.forEach((p, i) => {
    const s = plan.get(p.id);
    if (!s) return;
    if (p.d) throw new Error('уже есть год смерти: ' + p.id);
    g.people[i] = D.orderKeys(Object.assign({}, p, s), D.PERSON_KEYS);
    plan.delete(p.id); ch = true; n++;
  }));
  if (ch && !dry) D.writeJson('people/' + f, j);
}
if (plan.size) throw new Error('не найдены: ' + [...plan.keys()].join(', '));
fs.writeFileSync(path.join(__dirname, 'applied.txt'), report.join('\n') + '\n');
console.log((dry ? '[dry] ' : '') + 'людей изменено:', n);
