/* Сборка данных вкладки «Вассалитет»: research/vassal/*.json (сбор по A Wiki of Ice and Fire и 7kingdoms.ru) → data/vassals.json (поля описаны в data/README.md).
   Текст о доме сюда не входит: он в texts/vassals.md (и texts/en/vassals.md).
   Сводит дубли, разрешает ссылки на сюзеренов, переводит годы в точные интервалы (дробная часть — момент внутри года). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), RES = path.join(ROOT, 'research', 'vassal');
const REGIONS = [
  ['north', 'Север', 'stark'], ['riverlands', 'Речные земли', 'tully'], ['vale', 'Долина Аррен', 'arryn'],
  ['westerlands', 'Западные земли', 'lannister'], ['reach', 'Простор', 'tyrell'], ['stormlands', 'Штормовые земли', 'baratheon'],
  ['dorne', 'Дорн', 'martell'], ['ironislands', 'Железные острова', 'greyjoy'], ['crownlands', 'Королевские земли', null]
];
// где оставить дом, попавший в два региона
const PREFER = { House_Manderly: 'north', House_Baelish: 'vale', House_Hoare: 'ironislands', House_Slynt: 'riverlands', House_Sweet: 'stormlands', House_Targaryen: 'crownlands' };
const SPECIAL = new Set(['throne', 'blacks', 'greens', 'blackfyre', 'rebels', 'robb', 'renly', 'stannis', 'balon', 'euron', 'aegon_young', 'neutral', 'independent']);
const CLAIMANT = new Set(['blacks', 'greens', 'blackfyre', 'rebels', 'robb', 'renly', 'stannis', 'balon', 'euron', 'aegon_young']);
const problems = [];
const idOf = page => page.replace(/^House_/, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const r2 = x => Math.round(x * 1000) / 1000;

const top = JSON.parse(fs.readFileSync(path.join(RES, 'top.json'), 'utf8'));
// Претенденты и войны: интервалы [s, e)
const CL = {};
top.claimants.forEach(c => { (CL[c.id] = CL[c.id] || []).push({ s: c.from + (c.from_frac || 0), e: c.to + (c.to_frac != null ? c.to_frac : 1), ru: c.ru, why: c.why }); });

// ——— Дома ———
const houses = new Map();
REGIONS.forEach(([rid]) => {
  const d = JSON.parse(fs.readFileSync(path.join(RES, rid + '.json'), 'utf8'));
  d.houses.forEach(h => {
    const id = idOf(h.page);
    const prev = houses.get(id);
    if (prev) {
      // дубль: оставить запись предпочтительного региона, сегменты объединить
      const keepNew = PREFER[h.page] === rid;
      const base = keepNew ? Object.assign({}, h, { region: rid }) : prev;
      const other = keepNew ? prev : h;
      const seen = new Set((base.allegiance || []).map(g => g.from + '|' + g.to + '|' + g.liege));
      (other.allegiance || []).forEach(g => { if (!seen.has(g.from + '|' + g.to + '|' + g.liege)) (base.allegiance = base.allegiance || []).push(g); });
      houses.set(id, base);
      return;
    }
    houses.set(id, Object.assign({}, h, { region: rid }));
  });
});

// ссылка «по имени» → id (при совпадении имён — дом того же региона)
const byEn = new Map();
houses.forEach((h, id) => { (byEn.get(h.en) || byEn.set(h.en, []).get(h.en)).push(id); });
function ref(name, fromRegion, where) {
  if (name == null) return null;
  if (SPECIAL.has(name)) return name;
  const ids = byEn.get(name) || byEn.get(name.replace(/^House /, ''));
  if (!ids) { problems.push('нет дома «' + name + '» (' + where + ')'); return null; }
  if (ids.length === 1) return ids[0];
  return ids.find(i => houses.get(i).region === fromRegion) || ids[0];
}

// ——— Великие дома и временные верховные лорды: дробные сегменты из top.json ———
const TOPSEG = {};
Object.entries(top.great).forEach(([en, segs]) => {
  const id = ref(en, null, 'top.great');
  if (!id) return;
  TOPSEG[id] = segs.map(g => ({ s: g.from + (g.from_frac || 0), e: g.to + (g.to_frac != null ? g.to_frac : 1), liege: ref(g.liege, houses.get(id).region, 'top.great.' + en), why: g.why || '' }));
});

// ——— Сегменты малых домов: целые годы → точные интервалы ———
const RIVER_299 = 299.65, BLACKWATER = 299.45, RENLY_DIES = 299.3, WAR_298 = 298.55, HARRENHAL = -1.65, KINGSMOOT = 300.2;
function clampTo(g, list) {
  const inst = list.filter(c => c.s < g.e && g.s < c.e);
  if (!inst.length) return false;
  g.s = Math.max(g.s, Math.min(...inst.map(c => c.s)));
  g.e = Math.min(g.e, Math.max(...inst.map(c => c.e)));
  return true;
}
function normSegs(h) {
  const segs = (h.allegiance || []).map((g, i) => ({ i, from: g.from, to: g.to, liegeName: g.liege, why: g.why || '', s: g.from != null ? g.from : -10, e: (g.to != null ? g.to : 300) + 1 }));
  segs.forEach(g => {
    g.liege = ref(g.liegeName, h.region, h.en);
    if (CLAIMANT.has(g.liege)) g.fixedS = g.fixedE = clampTo(g, CL[g.liege] || []);
    else if (g.liege === 'throne' || g.liege === 'neutral') {
      // верность королю в мятеже — на время мятежа
      // (мятеж Бейлона 299 г. сюда не входит: в Войне пяти королей «трон» — это сторона Джоффри, её начала ставятся ниже по событиям)
      const reb = ['rebels', 'blackfyre', 'balon'].flatMap(k => CL[k] || []).filter(c => c.s < 298 && c.s < g.e && g.s < c.e && g.e - g.s <= 3);
      if (reb.length && clampTo(g, reb)) g.fixedS = g.fixedE = true;
    }
    // начала внутри 299–300 года — по известным событиям
    if (!g.fixedS && g.from === 299) {
      if (g.liege === 'throne') { g.s = h.region === 'riverlands' ? RIVER_299 : BLACKWATER; g.fixedS = true; }
      else if (g.liege === 'bolton' || g.liege === 'baelish' || g.liege === 'frey') { g.s = RIVER_299; g.fixedS = true; }
    }
    // Железные острова: распри начались с гибели Хоаров в Харренхолле (2 г. до З.), отказ признать Эурона — с вече (300)
    if (h.region === 'ironislands' && g.liege === 'independent' && g.from === -1 && !g.fixedS) { g.s = HARRENHAL; g.fixedS = true; }
    if (h.region === 'ironislands' && g.liege === 'neutral' && g.from === 300 && !g.fixedS) { g.s = KINGSMOOT; g.fixedS = true; }
    // нейтралитет в Войне пяти королей — с начала войны (арест Эддарда), а не с начала 298 г.
    if (g.liege === 'neutral' && g.from === 298 && !g.fixedS) { g.s = Math.max(g.s, WAR_298); g.fixedS = true; }
    if (g.liege === 'stannis' && g.from === 299 && (h.region === 'stormlands' || h.region === 'reach')) { g.s = Math.max(g.s, RENLY_DIES); g.fixedS = true; }
    if (g.liege === 'stannis' && g.to === 299 && h.region === 'reach') { g.e = Math.min(g.e, BLACKWATER); g.fixedE = true; }
  });
  segs.sort((a, b) => a.from - b.from || a.i - b.i);
  // смена стороны внутри одного года
  for (let k = 1; k < segs.length; k++) {
    const A = segs[k - 1], B = segs[k];
    if (B.s >= A.e) continue;
    const Y = B.from;
    let t;
    if (A.fixedE && A.e > Y && A.e < Y + 1) t = A.e;
    else if (B.fixedS && B.s > Y && B.s < Y + 1) t = B.s;
    else if (B.fixedS && B.s > A.s && B.s < Y) t = B.s;        // событие раньше начала года по вики (Харренхолл — 2 г. до З.)
    else if (A.liege === 'stannis' && B.liege === 'throne' && Y === 299) t = BLACKWATER;
    else if (A.liege === 'renly' && Y === 299) t = RENLY_DIES;
    else t = Math.max(B.s, Y + 0.5);
    if (t <= A.s) t = Math.max(B.s, A.s + 0.01);
    A.e = Math.min(A.e, t); B.s = Math.max(B.s, t);
  }
  return segs.filter(g => g.e > g.s && g.liege).map(g => ({ s: g.s, e: g.e, liege: g.liege, why: g.why }));
}

// ——— Итог ———
const out = [];
houses.forEach((h, id) => {
  let segs;
  if (TOPSEG[id]) {
    segs = TOPSEG[id].map(g => Object.assign({}, g));
    // у дома из top.json добавить военные стороны из региональных данных (например, Фреи за «чёрных»)
    if (!h.great) normSegs(h).filter(g => CLAIMANT.has(g.liege) && !segs.some(t => CLAIMANT.has(t.liege) && t.s < g.e && g.s < t.e)).forEach(g => segs.push(g));
  } else segs = normSegs(h);
  segs.sort((a, b) => a.s - b.s);
  // сторона в войне — не раньше, чем претендент объявил себя (за «чёрных» — с коронации Рейениры, а не со смерти
  // Визериса I): до того дом служит прежнему сюзерену. Иначе в эти дни у дома «сюзерен не указан»
  segs.forEach((g, k) => {
    const c = CLAIMANT.has(g.liege) && (CL[g.liege] || []).find(c => c.s < g.e && g.s < c.e);
    if (!c || g.s >= c.s) return;
    const prev = segs[k - 1];
    if (prev && prev.e >= g.s - 1e-9) prev.e = c.s;
    g.s = c.s;
  });

  let s = h.from != null ? h.from : -Infinity, e = h.to != null ? h.to + 1 : Infinity;
  if (h.from != null && h.from >= 298) s = h.from + 0.5;
  if (TOPSEG[id] && h.to != null) e = Math.max(...TOPSEG[id].map(g => g.e));
  // дом, основанный внутри года (Баратеоны — после Последнего Шторма), начинается с первой присяги, а не с начала года
  if (TOPSEG[id] && h.from != null && TOPSEG[id].length) s = Math.max(s, Math.min(...TOPSEG[id].map(g => g.s)));
  const liege = h.great ? null : ref(h.liege, h.region, h.en + ' (liege)');
  out.push({
    id, en: h.en, ru: h.ru, region: h.region, seat: h.seat_ru || null, great: !!h.great,
    ex: [isFinite(s) ? r2(s) : null, isFinite(e) ? r2(e) : null], liege,
    al: segs.map(g => [r2(g.s), r2(g.e), g.liege, g.why]), page: h.page
  });
});
// стыки с жизнью сюзерена: присяга дому, который пресёкся чуть раньше конца присяги (Гарднеры — Пламенное поле,
// Тиреллы — сдача Хайгардена), заканчивается с ним; сюзерен по умолчанию, появившийся чуть позже конца последней
// присяги (Баратеоны с Драконьего Камня, 284 г.), — прежняя присяга тянется до него
const exOf = new Map(out.map(h => [h.id, h.ex]));
out.forEach(h => {
  // короткая щель (до года) между соседними присягами, когда закрыть её некому (сюзерена по умолчанию нет или его
  // дома в эти годы нет): до стороны в войне — тянуть прежнюю присягу, иначе — начать следующую раньше
  const D0 = h.liege && exOf.get(h.liege);
  for (let k = 1; k < h.al.length; k++) {
    const A = h.al[k - 1], B = h.al[k];
    if (!(B[0] > A[1] && B[0] - A[1] <= 1)) continue;
    if (D0 && (D0[0] == null || D0[0] <= A[1]) && (D0[1] == null || D0[1] >= B[0])) continue;
    if (CLAIMANT.has(B[2])) A[1] = B[0]; else B[0] = A[1];
  }
  h.al.forEach((g, k) => {
    const L = exOf.get(g[2]);
    if (!L || L[1] == null || !(L[1] < g[1]) || g[1] - L[1] > 0.1 || L[1] <= g[0]) return;
    const next = h.al[k + 1];
    if (next && Math.abs(next[0] - g[1]) < 1e-9) next[0] = L[1];
    g[1] = L[1];
  });
  const D = h.liege && exOf.get(h.liege);
  if (D && D[0] != null) h.al.forEach((g, k) => {
    const next = h.al[k + 1];
    if (g[1] < D[0] && D[0] - g[1] <= 1 && (!next || next[0] >= D[0])) g[1] = D[0];
  });
});
out.sort((a, b) => REGIONS.findIndex(r => r[0] === a.region) - REGIONS.findIndex(r => r[0] === b.region) || (b.great - a.great) || a.ru.localeCompare(b.ru, 'ru'));

const claimants = top.claimants.map(c => ({ id: c.id, ru: c.ru, s: r2(c.from + (c.from_frac || 0)), e: r2(c.to + (c.to_frac != null ? c.to_frac : 1)), why: c.why || '' }));
const milestones = top.milestones.map(m => [r2(m.year + (m.frac || 0)), m.ru]).sort((a, b) => a[0] - b[0]);
const regions = REGIONS.map(([id, ru, lord]) => ({ id, ru, lord }));
// до Завоевания у региона другой король: кто был верховным, пока великий дом не стал им
const pre = [['riverlands', 'hoare'], ['ironislands', 'hoare'], ['reach', 'gardener'], ['stormlands', 'durrandon']].map(([region, king]) => {
  const lord = REGIONS.find(r => r[0] === region)[2];
  const first = (TOPSEG[lord] || []).find(g => g.liege === 'throne');
  return { region, king, until: first ? r2(first.s) : -2 };
});

const D = require('./data');
D.writeJson('vassals.json', { regions, pre, claimants, milestones, houses: out });
const size = fs.statSync(path.join(D.DATA, 'vassals.json')).size;
console.log('домов', out.length, 'великих', out.filter(h => h.great).length, 'периодов присяги', out.reduce((a, h) => a + h.al.length, 0), 'размер', size);
if (problems.length) console.log('проблемы:\n  ' + [...new Set(problems)].join('\n  '));
