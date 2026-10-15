/* Маршруты линий между домами.
   Линия выходит справа от карточки — от значка брака или от кнопки ветви — и идёт по коридору своей колонки:
   по полосе между колонкой значков браков и следующей колонкой карточек. В другой коридор она переходит только
   по промежутку между полосами домов и входит в другую карточку тоже справа, по коридору её колонки.
   У каждой линии на каждом участке своя дорожка (там, где участки не перекрываются, дорожка общая). Дорожки
   упорядочены так, чтобы линии не пересекали друг друга на поворотах — вложенно: та, что поворачивает раньше,
   идёт снаружи. В коридорах карточек нет, поэтому под карточку линия уходит, только если коридор переполнен;
   такие линии помечаются (under — под какими карточками прошла). Считается в браузере при каждой раскладке. */
(function () {
  const App = window.App;
  const { W, H, TOG, KG, KR } = App;
  const TURN = 60;          // цена поворота в другой коридор: лишний поворот должен окупаться длиной
  const HEAD_PEN = 4000;    // цена прохода через заголовок дома (герб, название, девиз)
  // шаг дорожек: полоса наведения у линии 14 px, при шаге 10 px у каждой линии остаётся своя середина
  const LANE = 10, LANE_MIN = 4, GLANE = 10, CORNER = 6;

  /* Порядок дорожек в одном коридоре (или промежутке). Участок — отрезок [lo, hi] вдоль коридора; на концах
     участка линия поворачивает в сторону dir (−1 — к меньшей координате, +1 — к большей). Поворот на отметке p
     пересекает соседний участок, если тот проходит через p и стоит с той стороны, куда поворачивают.
     C[i][j] — сколько пересечений, если i стоит раньше j (ближе к меньшей координате). Порядок — вставками
     в лучшее место и перестановками, пока сумма уменьшается. */
  function arrange(list) {
    const n = list.length;
    if (n < 2) return list.map((_, i) => i);
    const inside = (p, s) => p >= s.lo - 1 && p <= s.hi + 1;
    const C = list.map(() => new Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let c = 0;
      list[j].ends.forEach(e => { if (e.dir < 0 && inside(e.p, list[i])) c++; });
      list[i].ends.forEach(e => { if (e.dir > 0 && inside(e.p, list[j])) c++; });
      C[i][j] = c;
    }
    const bestPos = (ord, i) => {
      let c = 0;
      ord.forEach(x => { c += C[i][x]; });
      let best = c, pos = 0;
      for (let q = 0; q < ord.length; q++) {
        c += C[ord[q]][i] - C[i][ord[q]];
        if (c < best) { best = c; pos = q + 1; }
      }
      return pos;
    };
    const byLen = list.map((_, i) => i).sort((a, b) => (list[b].hi - list[b].lo) - (list[a].hi - list[a].lo) || a - b);
    const ord = [];
    byLen.forEach(i => ord.splice(bestPos(ord, i), 0, i));
    for (let pass = 0; pass < 8; pass++) {
      let moved = false;
      byLen.forEach(i => {
        const at = ord.indexOf(i);
        ord.splice(at, 1);
        const pos = bestPos(ord, i);
        ord.splice(pos, 0, i);
        if (pos !== at) moved = true;
      });
      if (!moved) break;
    }
    return ord;
  }
  // Номера дорожек по порядку: участок получает номер на один больше, чем у перекрывающихся с ним соседей,
  // уже стоящих ближе к краю, с которого считаем
  function lanes(list, ord) {
    const r = new Array(list.length).fill(0);
    const done = [];
    ord.forEach(i => {
      let k = 0;
      done.forEach(j => { if (list[i].lo < list[j].hi + 8 && list[j].lo < list[i].hi + 8) k = Math.max(k, r[j] + 1); });
      r[i] = k; done.push(i);
    });
    return r;
  }

  // Путь по ломаной со скруглёнными углами
  function roundPath(P) {
    let d = 'M' + P[0][0] + ',' + P[0][1];
    for (let i = 1; i < P.length - 1; i++) {
      const [x0, y0] = P[i - 1], [x, y] = P[i], [x1, y1] = P[i + 1];
      const l0 = Math.hypot(x - x0, y - y0), l1 = Math.hypot(x1 - x, y1 - y);
      const r = Math.min(CORNER, l0 / 2, l1 / 2);
      const ax = x - (x - x0) / l0 * r, ay = y - (y - y0) / l0 * r, bx = x + (x1 - x) / l1 * r, by = y + (y1 - y) / l1 * r;
      d += ' L' + ax.toFixed(1) + ',' + ay.toFixed(1) + ' Q' + x + ',' + y + ' ' + bx.toFixed(1) + ',' + by.toFixed(1);
    }
    const L = P[P.length - 1];
    return d + ' L' + L[0] + ',' + L[1];
  }
  // Убирает повторы и точки посреди прямого участка
  function simplify(P) {
    const out = [];
    P.forEach(p => {
      const q = out[out.length - 1];
      if (q && Math.abs(q[0] - p[0]) < 0.01 && Math.abs(q[1] - p[1]) < 0.01) return;
      const o = out[out.length - 2];
      if (o && q && ((Math.abs(o[0] - q[0]) < 0.01 && Math.abs(q[0] - p[0]) < 0.01) || (Math.abs(o[1] - q[1]) < 0.01 && Math.abs(q[1] - p[1]) < 0.01))) out[out.length - 1] = p;
      else out.push(p);
    });
    return out;
  }

  /* items: [{ key, A, B }], A и B — концы: { id, x, y — точка, откуда линия уходит вправо; g — колонка поколения;
     band — дом полосы; stem — [x, y] края карточки, если конец — значок брака: от него к значку идёт отвод }.
     Возвращает Map key → { pts, d, len, from, to, under }. */
  function routeLines(items) {
    const out = new Map();
    const bands = App.bandBoxes();
    const nb = bands.length;
    if (!nb || !items.length) return out;
    const bi = new Map(bands.map((b, i) => [b.house, i]));
    const colX = App.colX;
    const cx0 = g => colX(g) + W + TOG + KG + KR + 6;
    const cx1 = g => colX(g + 1) - 14;
    const cxm = g => (cx0(g) + cx1(g)) / 2;
    // промежуток j — под полосой j; под последней полосой — место до низа древа
    const gapOf = j => j < nb - 1 ? [bands[j].bottom, bands[j + 1].top] : [bands[j].bottom, bands[j].bottom + 150];
    const gapY = j => { const g = gapOf(j); return (g[0] + g[1]) / 2; };
    // уровни по вертикали: заголовок полосы k — k, карточки полосы i — i + 0.5, промежуток j — j + 0.75
    const nodes = App.allNodes();
    let gMin = Infinity, gMax = -Infinity;
    nodes.forEach(n => { gMin = Math.min(gMin, n.gen); gMax = Math.max(gMax, n.gen); });
    const cols = [];
    for (let g = gMin; g <= gMax; g++) cols.push(g);
    // сколько заголовков домов лежит на пути по коридору: префиксные суммы по полосам
    const pref = new Map();
    cols.forEach(g => {
      const a = cx0(g), b = cx1(g), p = [0];
      bands.forEach((bd, k) => { const h0 = bd.hx0 - 8, h1 = bd.hx0 + bd.tx + (bd.headW || 300) + 16; p.push(p[k] + (a < h1 && h0 < b ? 1 : 0)); });
      pref.set(g, p);
    });
    const heads = (g, l1, l2) => {
      const p = pref.get(g);
      if (!p) return 0;
      const lo = Math.min(l1, l2), hi = Math.max(l1, l2);
      return p[Math.min(nb, Math.floor(hi) + 1)] - p[Math.min(nb, Math.floor(lo) + 1)];
    };
    const vCost = (g, y1, l1, y2, l2) => Math.abs(y2 - y1) + HEAD_PEN * heads(g, l1, l2);
    const hCost = (g1, g2) => g1 === g2 ? 0 : Math.abs(cxm(g1) - cxm(g2)) + TURN;

    // 1. Выбор пути: коридор начала → (промежуток → коридор)* → коридор конца
    const routes = [];
    items.forEach(it => {
      let A = it.A, B = it.B, flip = false;
      if (!bi.has(A.band) || !bi.has(B.band)) return;
      if (bi.get(A.band) > bi.get(B.band)) { [A, B] = [B, A]; flip = true; }
      const ia = bi.get(A.band), ib = bi.get(B.band), la = ia + 0.5, lb = ib + 0.5;
      let best = null;
      const take = (cost, plan) => { if (!best || cost < best.cost - 1e-6) best = { cost, plan }; };
      if (A.g === B.g) take(vCost(A.g, A.y, la, B.y, lb), []);
      const jLo = Math.max(0, ia - 1), jHi = Math.min(ib, nb - 1);
      for (let j1 = jLo; j1 <= jHi; j1++) {
        const y1 = gapY(j1), l1 = j1 + 0.75, head = vCost(A.g, A.y, la, y1, l1);
        if (A.g !== B.g) take(head + hCost(A.g, B.g) + vCost(B.g, y1, l1, B.y, lb) + 0.001 * Math.abs(j1 - (ib - 1)), [{ j: j1, g: B.g }]);
        for (let j2 = j1 + 1; j2 <= jHi; j2++) {
          const y2 = gapY(j2), l2 = j2 + 0.75, tail = vCost(B.g, y2, l2, B.y, lb);
          cols.forEach(gm => {
            if (gm === A.g || gm === B.g) return;
            take(head + hCost(A.g, gm) + vCost(gm, y1, l1, y2, l2) + hCost(gm, B.g) + tail, [{ j: j1, g: gm }, { j: j2, g: B.g }]);
          });
        }
      }
      if (!best) return;
      const legs = [A.g].concat(best.plan.map(s => s.g)), turns = best.plan.map(s => s.j);
      routes.push({ it, A, B, flip, legs, turns, lx: [], ty: [] });
    });

    // 2. Дорожки в коридорах. Концы участков у промежутков пока берутся по середине промежутка.
    const vert = new Map();
    routes.forEach((r, ri) => {
      r.legs.forEach((g, i) => {
        const y0 = i ? gapY(r.turns[i - 1]) : r.A.y, y1 = i < r.turns.length ? gapY(r.turns[i]) : r.B.y;
        const ends = [];
        // у карточки линия уходит влево, к своему значку или кнопке; у промежутка — в сторону следующего коридора
        ends.push({ p: y0, dir: i ? Math.sign(cxm(r.legs[i - 1]) - cxm(g)) : -1 });
        ends.push({ p: y1, dir: i < r.turns.length ? Math.sign(cxm(r.legs[i + 1]) - cxm(g)) : -1 });
        if (!vert.has(g)) vert.set(g, []);
        vert.get(g).push({ ri, i, lo: Math.min(y0, y1), hi: Math.max(y0, y1), ends });
      });
    });
    vert.forEach((list, g) => {
      const ord = arrange(list);
      // считаем от правого края коридора: одиночная линия идёт у следующей колонки, а не у значков
      const r = lanes(list, ord.slice().reverse());
      const m = Math.max(0, ...r), wide = cx1(g) - cx0(g);
      const sp = m ? Math.max(LANE_MIN, Math.min(LANE, wide / m)) : LANE;
      list.forEach((s, k) => { routes[s.ri].lx[s.i] = cx1(g) - r[k] * sp; });
    });

    // 3. Дорожки в промежутках между полосами — по настоящим дорожкам коридоров
    const horiz = new Map();
    routes.forEach((r, ri) => {
      r.turns.forEach((j, i) => {
        const xa = r.lx[i], xb = r.lx[i + 1], gy = gapY(j);
        // вертикаль до поворота идёт от своего начала, после поворота — к своему концу
        const yBefore = i ? gapY(r.turns[i - 1]) : r.A.y, yAfter = i + 1 < r.turns.length ? gapY(r.turns[i + 1]) : r.B.y;
        const ends = [{ p: xa, dir: Math.sign(yBefore - gy) }, { p: xb, dir: Math.sign(yAfter - gy) }];
        if (!horiz.has(j)) horiz.set(j, []);
        horiz.get(j).push({ ri, i, lo: Math.min(xa, xb), hi: Math.max(xa, xb), ends });
      });
    });
    horiz.forEach((list, j) => {
      const ord = arrange(list);
      const r = lanes(list, ord);
      const m = Math.max(0, ...r), [g0, g1] = gapOf(j), room = g1 - g0 - 48;
      const sp = m ? Math.max(LANE_MIN, Math.min(GLANE, room / m)) : GLANE;
      const top = (g0 + g1) / 2 - m * sp / 2;
      list.forEach((s, k) => { routes[s.ri].ty[s.i] = top + r[k] * sp; });
    });

    // 4. Ломаные, пометка проходов под карточками
    const cards = nodes.map(n => ({ id: n.data.id, r: [n.X, n.Y - H / 2, n.X + W, n.Y + H / 2] }));
    routes.forEach(r => {
      let P = [[r.A.x, r.A.y], [r.lx[0], r.A.y]];
      r.turns.forEach((j, i) => { P.push([r.lx[i], r.ty[i]], [r.lx[i + 1], r.ty[i]]); });
      P.push([r.lx[r.legs.length - 1], r.B.y], [r.B.x, r.B.y]);
      P = simplify(P);
      if (r.flip) P.reverse();
      const under = [];
      for (let s = 1; s < P.length; s++) {
        const x0 = Math.min(P[s - 1][0], P[s][0]), x1 = Math.max(P[s - 1][0], P[s][0]), y0 = Math.min(P[s - 1][1], P[s][1]), y1 = Math.max(P[s - 1][1], P[s][1]);
        cards.forEach(c => { if (x0 < c.r[2] && c.r[0] < x1 + 0.01 && y0 < c.r[3] && c.r[1] < y1 + 0.01 && under.indexOf(c.id) < 0) under.push(c.id); });
      }
      // Отвод от карточки к значку брака: значок стоит в колонке значков, и без отвода между ним и карточкой
      // (особенно без кнопки ветви) остаётся пустое место. Отвод — часть линии: на нём тоже работают наведение и нажатие.
      let d = roundPath(P);
      const sa = r.it.A.stem, sb = r.it.B.stem;
      if (sa) {
        const [x, y] = P[0], c = (x - sa[0]) / 2;
        d = 'M' + sa[0] + ',' + sa[1] + ' C' + (sa[0] + c) + ',' + sa[1] + ' ' + (x - c) + ',' + y + ' ' + x + ',' + y + d.replace(/^M[^ ]+/, '');
        P.unshift(sa.slice());
      }
      if (sb) {
        const [x, y] = P[P.length - 1], c = (x - sb[0]) / 2;
        d += ' C' + (x - c) + ',' + y + ' ' + (sb[0] + c) + ',' + sb[1] + ' ' + sb[0] + ',' + sb[1];
        P.push(sb.slice());
      }
      let len = 0;
      for (let s = 1; s < P.length; s++) len += Math.hypot(P[s][0] - P[s - 1][0], P[s][1] - P[s - 1][1]);
      out.set(r.it.key, { pts: P, d, len, from: r.it.A.id, to: r.it.B.id, under });
    });
    return out;
  }
  App.routeLines = routeLines;

  // Положение точки вдоль ломаной: длина пути от начала до ближайшей к точке её точки
  App.alongPath = (P, pt) => {
    let best = Infinity, at = 0, acc = 0;
    for (let s = 1; s < P.length; s++) {
      const [x0, y0] = P[s - 1], [x1, y1] = P[s], L = Math.hypot(x1 - x0, y1 - y0);
      const t = L ? Math.max(0, Math.min(1, ((pt[0] - x0) * (x1 - x0) + (pt[1] - y0) * (y1 - y0)) / (L * L))) : 0;
      const dd = Math.hypot(x0 + t * (x1 - x0) - pt[0], y0 + t * (y1 - y0) - pt[1]);
      if (dd < best) { best = dd; at = acc + t * L; }
      acc += L;
    }
    return { at, len: acc };
  };
})();
