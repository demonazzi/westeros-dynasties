/* Ядро: подготовка данных, раскладка по поколениям, отрисовка, выбор, карточка, поиск, история. */
(function () {
  const App = window.App = window.App || {};
  const W = 176, H = 46, TOG = 21, DX = 58, DY = 280, KG = 22, KR = 9, BAND_GAP = 150, HEADER = 92, ROOT_GAP = 70;
  Object.assign(App, { W, H, TOG, DX, DY, KG, KR });
  App.hooks = { decorate: [], panel: [], afterRender: [], select: [], locate: [] };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrowMQ = window.matchMedia('(max-width: 760px)');
  App.reduced = reduced;
  App.isNarrow = () => narrowMQ.matches;
  const dur = reduced ? 0 : 550;
  App.dur = dur;

  /* ——— Данные ——— */
  const byId = new Map(PEOPLE.map(p => [p.id, p]));
  PEOPLE.forEach(p => {
    p.full = p.full || p.name;
    if (!p.par) p.par = p.p ? [p.p] : [];
    p.house = p.hs || (p.k === 'B' ? 'bf' : 'targ');
    p.sex = p.group ? 'u' : (p.fem ? 'f' : 'm');
    p.kids = [];
  });
  PEOPLE.forEach(p => { if (p.p && byId.has(p.p)) byId.get(p.p).kids.push(p); });
  App.byId = byId;

  const roots = new Map();
  const nodeById = new Map();
  BANDS.forEach(b => b.roots.forEach(([id]) => {
    const r = d3.hierarchy(byId.get(id), d => d.kids.length ? d.kids : null);
    roots.set(id, r);
    r.each(n => nodeById.set(n.data.id, n));
  }));
  App.roots = roots;
  App.nodeById = nodeById;
  // полоса и колонка поколения каждого человека — по данным, а не по текущей раскладке (скрытые фильтром тоже)
  const bandOf = new Map(), genOf = new Map();
  BANDS.forEach(b => b.roots.forEach(([id, gen]) => roots.get(id).each(n => { bandOf.set(n.data.id, b.house); genOf.set(n.data.id, gen + n.depth); })));
  App.bandOf = id => bandOf.get(id);
  App.genOf = id => genOf.has(id) ? genOf.get(id) : 0;

  /* Малые дома: полоса как у великих, только герб в заголовке меньше; liege — великий дом, которому они
     присягают (по нему же цвета). */
  const bandByHouse = new Map(BANDS.map(b => [b.house, b]));
  App.bandLiege = h => (bandByHouse.get(h) || {}).liege || null;
  // «12 домов» или «12 домов и 5 малых»
  App.housesLabel = () => {
    const minor = BANDS.filter(b => b.liege).length;
    return plural(BANDS.length - minor, 'дом', 'дома', 'домов') + (minor ? ' ' + App.t(minor % 10 === 1 && minor % 100 !== 11 ? 'и {n} малый' : 'и {n} малых', { n: minor }) : '');
  };
  (function () {
    const css = [];
    Object.keys(HOUSES).forEach(h => {
      const tone = HOUSES[h].tone || App.bandLiege(h);
      if (tone) css.push('.h-' + h + '{--hc:var(--' + tone + ');--ht:var(--' + tone + '-tint)}');
    });
    if (css.length) { const s = document.createElement('style'); s.textContent = css.join('\n'); document.head.appendChild(s); }
  })();

  /* Колонки поколений. Где людей много (поздние поколения), промежуток между колонками шире: веер к детям,
     узлы браков и связи между домами не теснятся. Считается по всем людям, без фильтров, — колонки не прыгают. */
  const COL_BUSY = 40, COL_EXTRA = 90;
  const colPos = [0];
  (function () {
    const cnt = new Map();
    genOf.forEach(g => cnt.set(g, (cnt.get(g) || 0) + 1));
    const maxG = Math.max(0, ...cnt.keys());
    for (let g = 0; g <= maxG + 1; g++) colPos.push(colPos[g] + DY + (Math.max(cnt.get(g) || 0, cnt.get(g + 1) || 0) >= COL_BUSY ? COL_EXTRA : 0));
  })();
  const colX = g => g < 0 ? g * DY : g < colPos.length ? colPos[g] : colPos[colPos.length - 1] + (g - colPos.length + 1) * DY;
  // колонка, над чьей карточкой (или ближе всего к ней) лежит точка x
  const colAt = x => { let best = 0; for (let g = 0; g < colPos.length; g++) if (Math.abs(x - colX(g) - W / 2) < Math.abs(x - colX(best) - W / 2)) best = g; return best; };
  App.colX = colX; App.colAt = colAt;
  const tKings = PEOPLE.filter(p => p.k === 'K' && p.n).sort((a, b) => a.n - b.n);
  App.tKings = tKings;

  /* Пары для связей: браки, помолвки, связи вне брака, родство по слухам, воспитанники. */
  const PAIRS = [];
  (function () {
    const seen = new Map();
    PEOPLE.forEach(p => {
      (p.sp || []).forEach(([ref, , type]) => {
        if (!byId.has(ref)) return;
        const key = [p.id, ref].sort().join('|');
        if (seen.has(key)) { const e = seen.get(key); if (type && e.type === 'm') e.type = type; return; }
        const e = { a: p.id, b: ref, type: type || 'm' };
        seen.set(key, e); PAIRS.push(e);
      });
      if (p.rp && byId.has(p.rp)) PAIRS.push({ a: p.rp, b: p.id, type: 'rumor' });
      (p.wd || []).forEach(w => { if (byId.has(w)) PAIRS.push({ a: p.id, b: w, type: 'w' }); });
    });
  })();
  App.PAIRS = PAIRS;

  /* ——— Тексты ——— */
  // формы числа: в английском — по словарю «один|два|пять» → «one|many» (App.tPlural)
  const plural = (n, one, few, many) => { if (App.lang !== 'ru' && App.tPlural) return App.tPlural(n, one, few, many); const a = n % 10, b = n % 100; return n + ' ' + (a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many); };
  App.plural = plural;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  App.esc = esc;
  const simple = /^\d+$/;
  function meta(p) {
    const tD = App.tDate;
    if (p.k === 'K') return p.rm || App.t('правил {r}', { r: p.r });
    if (p.pre) return App.t('до Завоевания');
    if (p.b && p.d) return simple.test(p.b) && simple.test(p.d) ? p.b + '–' + p.d : App.t('р. {b}', { b: tD(p.b) }) + ' · ' + App.t('† {d}', { d: tD(p.d) });
    if (p.d) return App.t('† {d}', { d: tD(p.d) });
    if (p.b) return App.t('р. {b}', { b: tD(p.b) });
    if (p.house === 'oth') return App.t('дом {h}', { h: p.h });
    return '';
  }
  App.meta = meta;
  // длинные годы не влезают в карточку («р. не позднее 262 · † не позднее 281»): границы — знаками, иначе сжать;
  // полностью словами — в карточке человека
  const shortDates = s => s.replace(/(\S+) (или позже|or later)/g, '≥$1').replace(/(не позднее|by) /g, '≤').replace(/(не ранее|no earlier than) /g, '≥').replace(/(после|after) /g, '>');
  function fitMeta() {
    const max = W - 22;
    if (!this.getComputedTextLength || this.getComputedTextLength() <= max) return;
    this.textContent = shortDates(this.textContent);
    if (this.getComputedTextLength() > max) { this.setAttribute('textLength', max); this.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
  }
  const houseName = p => p.house === 'oth' ? App.t('Дом {h}', { h: p.h }) : HOUSES[p.house].name;
  App.houseName = houseName;
  function kindLabel(p) {
    const t = App.t;
    if (p.pre) return t('Владыки Драконьего Камня · до Завоевания');
    if (p.kl) return houseName(p) + ' · ' + p.kl;
    if (p.k === 'K') return (p.n ? t('Король № {n}', { n: p.n }) + ' · ' : houseName(p) + ' · ' + t('король') + ' · ') + (p.rm || t('правил {r}', { r: p.r }));
    if (p.k === 'C') return (p.house === 'targ' ? '' : houseName(p) + ' · ') + (p.sex === 'f' ? t('Претендентка на трон') : t('Претендент на трон'));
    if (p.k === 'B') return p.cl ? t('Дом Блэкфайров · претендент') : t('Дом Блэкфайров');
    if (p.k === 'R') return t('Бастард') + ' · ' + (App.lang === 'ru' ? houseName(p).replace('Дом ', 'дом ') : houseName(p));
    return houseName(p);
  }
  App.kindLabel = kindLabel;
  // в карточке человека название дома — ссылка на карточку дома
  function eyebrowHtml(p) {
    const s = esc(kindLabel(p));
    if (!App.isHouseCard || !App.isHouseCard(p.house)) return s;
    const hn = esc(houseName(p));
    const i = s.indexOf(hn) >= 0 ? s.indexOf(hn) : s.indexOf(hn.replace('Дом ', 'дом '));
    if (i < 0) return s;
    return s.slice(0, i) + '<button type="button" class="linkish eb-house" data-house="' + p.house + '" title="' + esc(App.t('Открыть карточку дома')) + '">' + s.slice(i, i + hn.length) + '</button>' + s.slice(i + hn.length);
  }
  const ariaLabel = p => [p.full, kindLabel(p), meta(p)].filter(Boolean).join(', ');
  const hasKids = d => !!(d.children || d._children);
  App.hasKids = hasKids;
  const yearOf = s => { const m = /-?\d+/.exec(String(s || '')); return m ? +m[0] : null; };
  App.yearOf = yearOf;

  /* ——— Сцена ——— */
  const svg = d3.select('#tree');
  const gRoot = svg.append('g');
  const layers = {};
  ['bands', 'era', 'gap', 'x', 'union', 'links', 'knots', 'lens', 'sel', 'nodes', 'marks', 'over'].forEach(k => { layers[k] = gRoot.append('g').attr('class', 'layer-' + k); });
  App.svg = svg; App.gRoot = gRoot; App.layers = layers;
  const linkGen = d3.linkHorizontal();
  App.linkGen = linkGen;
  const treeLayout = d3.tree().nodeSize([DX, DY]).separation((a, b) => a.parent === b.parent ? 1 : 1.3);
  // Пока древо тащат мышью, пальцем или крутят колесом, наведение на древо выключено (класс panning): иначе каждое
  // движение мыши перекрашивало подсветку и заставляло браузер заново раскладывать всё древо
  // Пока древо едет само (переход к человеку, «Все дома», клик по шкале), наведение тоже не обрабатывается (moving): карточки
  // и линии проезжают под неподвижным указателем, и каждая перекрашивала бы подсветку на каждом кадре
  let panning = false, moving = false;
  // Переходы — прямой интерполяцией: «облёт» d3 по умолчанию на дальних переходах отъезжает, показывая разом всё
  // древо, и каждый кадр перерисовывает тысячу карточек — так переход по линии брака и тормозил
  const zoom = d3.zoom().scaleExtent([0.04, 2.4]).interpolate(d3.interpolate)
    .on('start', e => { if (!e.sourceEvent) moving = true; })
    .on('zoom', e => {
      gRoot.attr('transform', e.transform);
      if (e.sourceEvent && !panning) { panning = true; svg.classed('panning', true); xHover(null); peek(null); }
      App.hooks.afterZoom && App.hooks.afterZoom.forEach(f => f(e.transform));
    })
    .on('end', () => { moving = false; if (panning) { panning = false; svg.classed('panning', false); } });
  App.hooks.afterZoom = [];
  svg.call(zoom).on('dblclick.zoom', null);
  App.zoom = zoom;

  const state = App.state = { selected: null, showLinks: true, mode: 'gen', view: 'people', history: [] };
  let visible = new Set();
  let allNodes = [];
  let bandBoxes = [];
  App.visible = () => visible;
  App.allNodes = () => allNodes;
  App.bandBoxes = () => bandBoxes;

  /* Раскладка по поколениям: полосы домов друг под другом. */
  let bandOrder = BANDS.slice();
  function layoutGenerations() {
    allNodes = []; bandBoxes = [];
    const links = [];
    let cursor = 0, shown = 0;
    const hidden = state.hiddenHouses || new Set();
    bandOrder.forEach(band => {
      if (hidden.has(band.house)) return;
      const bandTop = cursor + (shown++ ? BAND_GAP : 0);
      const contentTop = bandTop + HEADER;
      const placed = [];
      let bottom = contentTop, minCol = Infinity, maxCol = -Infinity;
      band.roots.forEach(([id, gen]) => {
        const r = roots.get(id);
        treeLayout(r);
        const ns = r.descendants();
        let x0 = Infinity, x1 = -Infinity, depth = 0;
        ns.forEach(n => { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); depth = Math.max(depth, n.depth); });
        const g0 = gen, g1 = gen + depth;
        let top = contentTop;
        placed.forEach(pl => { if (!(g1 < pl.g0 || g0 > pl.g1)) top = Math.max(top, pl.bottom + ROOT_GAP); });
        const off = top - x0 + H / 2;
        ns.forEach(n => { n.X = colX(gen + n.depth); n.Y = n.x + off; n.band = band.house; n.gen = gen + n.depth; allNodes.push(n); });
        r.links().forEach(l => links.push(l));
        const b = top + (x1 - x0) + H;
        placed.push({ g0, g1, bottom: b });
        bottom = Math.max(bottom, b);
        minCol = Math.min(minCol, g0); maxCol = Math.max(maxCol, g1);
      });
      bandBoxes.push({ house: band.house, minor: !!band.liege, top: bandTop, bottom: bottom + 40, minCol, maxCol });
      cursor = bottom + 40;
    });
    return links;
  }
  App.layouts = { gen: layoutGenerations };
  App.bandOrder = () => bandOrder;

  /* Порядок полос: первый дом в данных (Таргариены) остаётся наверху, остальные — великие и малые — ставятся
     так, чтобы связи между домами (браки, помолвки, родство по слухам, воспитанники) были в сумме короче.
     Считается один раз по полной раскладке. */
  (function orderBands() {
    const blocks = BANDS.map(b => [b]);
    bandOrder = blocks.flat();
    layoutGenerations();
    const blockOf = new Map(), local = new Map(), height = new Map();
    const topOf = new Map();
    bandBoxes.forEach(b => { const blk = blocks.findIndex(x => x[0].house === b.house); height.set(blk, b.bottom - b.top); topOf.set(b.house, b.top); });
    allNodes.forEach(n => { blockOf.set(n.data.id, blocks.findIndex(x => x[0].house === n.band)); local.set(n.data.id, n.Y - topOf.get(n.band)); });
    const links = [];
    PAIRS.forEach(e => { if (blockOf.has(e.a) && blockOf.has(e.b) && blockOf.get(e.a) !== blockOf.get(e.b)) links.push([e.a, e.b]); });
    const cost = ord => {
      const top = new Map(); let t = 0;
      ord.forEach((blk, i) => { if (i) t += BAND_GAP; top.set(blk, t); t += height.get(blk); });
      return links.reduce((s, [a, b]) => s + Math.abs(top.get(blockOf.get(a)) + local.get(a) - top.get(blockOf.get(b)) - local.get(b)), 0);
    };
    // Домов немного, поэтому перебираются все порядки — по подмножествам: dp[S] — лучшая укладка набора S сверху,
    // считая куски связей до нижнего края S. Блок k под набором S удлиняет каждую связь, торчащую из S, на промежуток
    // и на высоту k (или до её конца в k), а связи, начатые в k, — от их начала до низа k.
    const n = blocks.length, H = blocks.map((_, i) => height.get(i));
    const L = links.map(([a, b]) => ({ A: blockOf.get(a), B: blockOf.get(b), la: local.get(a), lb: local.get(b) }));
    const add = (S, k) => {
      let c = 0;
      L.forEach(l => {
        const inA = S >> l.A & 1, inB = S >> l.B & 1;
        if (inA && !inB) c += BAND_GAP + (l.B === k ? l.lb : H[k]);
        else if (inB && !inA) c += BAND_GAP + (l.A === k ? l.la : H[k]);
        else if (!inA && !inB) { if (l.A === k) c += H[k] - l.la; else if (l.B === k) c += H[k] - l.lb; }
      });
      return c;
    };
    let ord = blocks.map((_, i) => i);
    if (n > 1 && n <= 16) {
      const full = (1 << n) - 1, dp = new Float64Array(1 << n).fill(Infinity), from = new Int8Array(1 << n).fill(-1);
      dp[1] = add(0, 0);
      for (let S = 1; S <= full; S += 2) {
        if (dp[S] === Infinity) continue;
        for (let k = 1; k < n; k++) if (!(S >> k & 1)) { const T = S | 1 << k, c = dp[S] + add(S, k); if (c < dp[T] - 1e-6) { dp[T] = c; from[T] = k; } }
      }
      ord = [];
      for (let S = full; S !== 1;) { const k = from[S]; ord.unshift(k); S ^= 1 << k; }
      ord.unshift(0);
    } else if (n > 16) {
      // слишком много великих домов для полного перебора — перестановки, пока сумма уменьшается
      let best = cost(ord);
      for (let pass = 0; pass < 60; pass++) {
        let move = null;
        for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) {
          if (i === j) continue;
          const o = ord.slice(); const [x] = o.splice(i, 1); o.splice(j, 0, x);
          const c = cost(o);
          if (c < best - 1e-6 && (!move || c < move.c)) move = { o, c };
        }
        if (!move) break;
        ord = move.o; best = move.c;
      }
    }
    const best = cost(ord);
    bandOrder = ord.flatMap(i => blocks[i]);
    // для проверок: сумма прибавок по шагам должна совпадать с прямым подсчётом длины связей
    const stepwise = o => { let S = 0, c = 0; o.forEach(k => { c += add(S, k); S |= 1 << k; }); return c; };
    App.bandOrderCost = { before: cost(blocks.map((_, i) => i)), after: best, order: ord.slice(), cost, stepwise };
  })();

  /* Линия между домами: из низа верхней карточки в верх нижней. oa, ob — сдвиг конца от середины карточки,
     чтобы линии из одной колонки не шли друг по другу. */
  function crossGeom(a, b, oa = 0, ob = 0) {
    const [u, v, ou, ov] = a.Y <= b.Y ? [a, b, oa, ob] : [b, a, ob, oa];
    const x1 = u.X + W / 2 + ou, y1 = u.Y + H / 2, x2 = v.X + W / 2 + ov, y2 = v.Y - H / 2;
    const k = Math.max(70, (y2 - y1) * 0.42);
    return { d: 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + k) + ' ' + x2 + ',' + (y2 - k) + ' ' + x2 + ',' + y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, pts: [[x1, y1], [x1, y1 + k], [x2, y2 - k], [x2, y2]] };
  }
  App.crossGeom = crossGeom;

  /* Узлы браков: дети одной пары выходят из общего узла справа от родителя на древе. */
  let knots = [], knotOf = new Map(), knotByPair = new Map();
  App.knots = () => knots;
  App.knotOf = id => knotOf.get(id);
  function otherParent(p, treeParent) {
    for (const r of p.par) {
      const m = /^([a-z_0-9]+)(?: \(.+\))?$/.exec(r);
      const id = m && byId.has(m[1]) ? m[1] : null;
      if (id === treeParent) continue;
      if (id) return { id, label: byId.get(id).full };
      if (!/^[a-z_0-9]/.test(r) && !/не назван/.test(r)) return { id: null, label: r };
    }
    return null;
  }
  App.otherParent = otherParent;
  function pairType(a, b, kids) {
    if (kids.every(k => k.data.k === 'R')) return 'l';
    const e = b && PAIRS.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    return e && e.type !== 'rumor' && e.type !== 'w' ? e.type : 'm';
  }
  function computeKnots() {
    knots = []; knotOf = new Map(); knotByPair = new Map();
    if (state.mode !== 'gen') return;
    allNodes.forEach(s => {
      if (!s.children) return;
      const groups = new Map();
      s.children.forEach(t => {
        const o = otherParent(t.data, s.data.id);
        if (!o) return;
        const key = o.id || o.label;
        if (!groups.has(key)) groups.set(key, { o, kids: [] });
        groups.get(key).kids.push(t);
      });
      const mine = [];
      groups.forEach(g => {
        const y = g.kids.reduce((a, k) => a + k.Y, 0) / g.kids.length;
        const k = { key: s.data.id + '|' + (g.o.id || g.o.label), s, o: g.o, kids: g.kids, x: s.X + W + TOG + KG, y, type: pairType(s.data.id, g.o.id, g.kids) };
        mine.push(k);
      });
      mine.sort((a, b) => a.y - b.y);
      for (let i = 1; i < mine.length; i++) if (mine[i].y < mine[i - 1].y + 2 * KR + 6) mine[i].y = mine[i - 1].y + 2 * KR + 6;
      mine.forEach(k => {
        knots.push(k);
        k.kids.forEach(t => knotOf.set(t.data.id, k));
        if (k.o.id) { knotByPair.set(s.data.id + '|' + k.o.id, k); if (!knotByPair.has(k.o.id + '|' + s.data.id)) knotByPair.set(k.o.id + '|' + s.data.id, k); }
      });
    });
  }
  const sameBandUnion = k => k.o.id && visible.has(k.o.id) && nodeById.get(k.o.id).band === k.s.band;
  function unionPath(k) {
    const o = nodeById.get(k.o.id);
    const ox = o.X + W + (hasKids(o) ? TOG : 4), oy = o.Y;
    const dir = oy < k.y ? -1 : 1;
    const ty = k.y + dir * KR;
    const dx = Math.max(26, Math.abs(k.x - ox) * 0.5), dy = Math.max(22, Math.abs(ty - oy) * 0.55);
    return 'M' + ox + ',' + oy + ' C' + (ox + dx) + ',' + oy + ' ' + k.x + ',' + (ty + dir * dy) + ' ' + k.x + ',' + ty;
  }
  function knotCross(o, k, oo = 0) {
    const below = o.Y > k.y;
    const x1 = o.X + W / 2 + oo, y1 = o.Y + (below ? -H / 2 : H / 2), y2 = k.y + (below ? KR : -KR);
    const c = Math.max(70, Math.abs(y2 - y1) * 0.42) * (below ? 1 : -1);
    return { d: 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 - c) + ' ' + k.x + ',' + (y2 + c) + ' ' + k.x + ',' + y2, mx: (x1 + k.x) / 2, my: (y1 + y2) / 2, pts: [[x1, y1], [x1, y1 - c], [k.x, y2 + c], [k.x, y2]] };
  }

  function render() {
    if (App.hideXTip) App.hideXTip();
    const links = App.layouts[state.mode]();
    visible = new Set(allNodes.map(n => n.data.id));
    computeKnots();
    const genMode = state.mode === 'gen';
    gRoot.classed('mode-gen', genMode).classed('mode-time', !genMode);

    let maxX = 0; allNodes.forEach(n => { maxX = Math.max(maxX, n.X); });
    const left = genMode ? -60 : App.timeLeft(), right = maxX + W + TOG + 80;

    // Дома на древе
    layers.bands.selectAll('*').remove();
    bandBoxes.forEach(b => {
      const h = HOUSES[b.house];
      const g = layers.bands.append('g').attr('class', 'h-' + b.house + (b.minor ? ' band-minor' : ''));
      g.append('rect').attr('class', 'band-bg').attr('x', left).attr('y', b.top).attr('width', right - left).attr('height', b.bottom - b.top).attr('rx', 18);
      // Заголовок полосы с гербом: у всех домов в одном месте — у левого края полосы; у малого дома герб меньше
      b.hx0 = left + 26;
      const sw = b.minor ? 36 : 54;
      b.tx = sw + 14;
      const head = g.append('g').attr('class', 'band-head').attr('transform', 'translate(' + b.hx0 + ',' + (b.top + 14) + ')');
      head.html(App.sigilSVG ? App.sigilSVG(b.house, 0, b.minor ? 10 : 0, sw) : '');
      head.append('text').attr('class', 'band-title').attr('x', b.tx).attr('y', 40).text(h.band);
      head.append('text').attr('class', 'band-motto').attr('x', b.tx).attr('y', 64).text(h.motto);
      b.headW = Math.max(textWidth('band-title', h.band, 22), textWidth('band-motto', h.motto, 8));
      // герб и название открывают карточку дома
      head.append('rect').attr('class', 'band-hit').attr('x', -8).attr('y', -4).attr('width', b.tx + textWidth('band-title', h.band, 22) + 16).attr('height', 54)
        .on('click', e => { e.stopPropagation(); if (App.openHouse) App.openHouse(b.house); }).append('title').text(App.t('Открыть карточку дома'));
    });

    // Граница Завоевания (в хронологии рисует своя ось)
    layers.era.selectAll('*').remove();
    if (genMode && bandBoxes.length) {
      const lx = colX(6) - (colX(6) - colX(5) - W - TOG) / 2 - 2;
      const top = bandBoxes[0].top - 46, bot = bandsBottom() + 30;
      layers.era.append('line').attr('class', 'era-line').attr('x1', lx).attr('x2', lx).attr('y1', top).attr('y2', bot);
      layers.era.append('text').attr('class', 'era').attr('x', lx - 14).attr('y', top + 16).attr('text-anchor', 'end').text('до Завоевания');
      layers.era.append('text').attr('class', 'era').attr('x', lx + 14).attr('y', top + 16).text('Завоевание, 1 г. →');
    }

    // Пропуски поколений: пунктир и подпись к нему
    layers.gap.selectAll('*').remove();
    if (genMode) drawGaps();

    // Линии родства
    layers.links.selectAll('path.link').data(links, d => d.target.data.id).join('path')
      .attr('class', d => 'link' + (d.target.data.unc ? ' unc' : ''))
      .attr('d', d => App.linkPath(d.source, d.target));

    // Узлы браков и линии к супругам из той же полосы
    layers.union.selectAll('path.union').data(knots.filter(sameBandUnion), d => d.key).join('path')
      .attr('class', d => 'union t-' + d.type)
      .attr('d', unionPath);
    const knotSel = layers.knots.selectAll('g.knot').data(knots, d => d.key).join(enter => {
      const g = enter.append('g');
      g.append('circle').attr('r', KR);
      g.append('text').attr('y', 0.5).text('⚭');
      g.append('title');
      g.on('click', (e, d) => { e.stopPropagation(); select(d.o.id || d.s.data.id, { center: true }); });
      return g;
    });
    knotSel.attr('class', d => 'knot t-' + d.type + (d.o.id ? '' : ' plain')).attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
    knotSel.select('title').text(d => App.t(d.type === 'l' ? 'Связь' : 'Брак') + ': ' + App.t('{a} и {b}', { a: d.s.data.full, b: App.tData(d.o.label) }) + ' · ' + plural(d.kids.length, 'ребёнок', 'ребёнка', 'детей') + (d.o.id ? ' · ' + App.t('нажмите, чтобы открыть второго родителя') : ''));

    // Карточки
    const nodeSel = layers.nodes.selectAll('g.node').data(allNodes, d => d.data.id).join(enter => {
      const g = enter.append('g')
        .attr('class', d => 'node h-' + d.data.house + ' st-' + d.data.k)
        .attr('tabindex', 0).attr('role', 'button')
        .attr('aria-label', d => ariaLabel(d.data));
      g.append('rect').attr('class', 'halo').attr('x', -5).attr('y', -H / 2 - 5).attr('width', W + 10).attr('height', H + 10).attr('rx', 12);
      g.append('rect').attr('class', 'unsure-ring').attr('x', -3).attr('y', -H / 2 - 3).attr('width', W + 6).attr('height', H + 6).attr('rx', 10);
      g.append('rect').attr('class', 'card').attr('x', 0).attr('y', -H / 2).attr('width', W).attr('height', H).attr('rx', 8);
      g.append('rect').attr('class', 'fbar').attr('x', 0).attr('y', -H / 2).attr('width', 6).attr('height', H).attr('rx', 3);
      // alt — дом по теории или слухам (Джон Сноу — Таргариен): полоса его цвета у правого края карточки
      g.filter(d => d.data.alt).append('rect').attr('class', 'altbar').attr('x', W - 6).attr('y', -H / 2).attr('width', 6).attr('height', H).attr('rx', 3)
        .style('fill', d => 'var(--' + d.data.alt + ')');
      g.append('text').attr('class', 'name').attr('x', 12).attr('y', d => meta(d.data) ? -3 : 5).text(d => d.data.name);
      g.append('text').attr('class', 'meta').attr('x', 12).attr('y', 14).text(d => meta(d.data)).each(fitMeta);
      const b = g.filter(d => d.data.k === 'K' && d.data.n).append('g').attr('class', 'badge');
      b.append('rect').attr('x', W - 34).attr('y', -H / 2 + 7).attr('width', 26).attr('height', 17).attr('rx', 8.5);
      b.append('text').attr('x', W - 21).attr('y', -H / 2 + 19.5).text(d => d.data.n);
      g.append('g').attr('class', 'icons');
      const t = g.append('g').attr('class', 'tog').attr('transform', 'translate(' + (W + 12) + ',0)');
      t.append('circle').attr('r', 9.5);
      t.append('text').attr('y', 0.5);
      t.append('title');
      t.on('click', (e, d) => { e.stopPropagation(); toggle(d); });
      g.on('click', (e, d) => App.onNodeClick ? App.onNodeClick(d.data.id, e) : select(d.data.id));
      g.on('pointerenter', (e, d) => peek(d.data.id)).on('pointerleave', () => peek(null));
      g.on('keydown', (e, d) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); App.onNodeClick ? App.onNodeClick(d.data.id, e) : select(d.data.id); }
        else if (e.key === 'ArrowRight' && d._children) { e.preventDefault(); toggle(d); }
        else if (e.key === 'ArrowLeft' && d.children) { e.preventDefault(); toggle(d); }
      });
      return g;
    });
    nodeSel.attr('transform', d => 'translate(' + d.X + ',' + d.Y + ')');
    nodeSel.select('g.tog').attr('display', d => genMode && hasKids(d) ? null : 'none').attr('aria-hidden', 'true');
    nodeSel.select('g.tog text').text(d => d._children ? '+' : '−');
    nodeSel.select('g.tog title').text(d => d._children ? 'Развернуть ветвь (' + d._children.length + ')' : 'Свернуть ветвь');
    App.nodeSel = nodeSel;

    fitNames(nodeSel);
    drawCross();
    App.hooks.afterRender.forEach(f => f(nodeSel));
    decorate();
  }
  App.render = render;
  const bandsBottom = () => bandBoxes.length ? Math.max(...bandBoxes.map(b => b.bottom)) : 0;
  App.bandsBottom = bandsBottom;

  /* Ширина текста в пикселях для класса подписи. Меряется на холсте шрифтом этого класса — без пересчёта
     раскладки страницы — и запоминается. Без браузера (проверки в jsdom) — оценка по числу букв. */
  const textCache = new Map(), fontOf = new Map();
  let measCtx = null, measTried = /jsdom/i.test(navigator.userAgent), measuredEarly = false;
  function textWidth(cls, s, approx) {
    const key = cls + '|' + s;
    if (textCache.has(key)) return textCache.get(key);
    if (!fontOf.has(cls)) {
      let f = null;
      try {
        // «node name» — подпись внутри обёртки .node, как на карточке
        const parts = cls.split(' '), wrap = parts.length > 1 ? layers.gap.append('g').attr('class', parts[0]) : layers.gap;
        const t = wrap.append('text').attr('class', parts[parts.length - 1]).text('x');
        const cs = getComputedStyle(t.node());
        if (cs.fontFamily) f = { font: cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, ls: parseFloat(cs.letterSpacing) || 0, up: cs.textTransform === 'uppercase' };
        (parts.length > 1 ? wrap : t).remove();
      } catch (e) { f = null; }
      fontOf.set(cls, f);
    }
    const f = fontOf.get(cls);
    let w = 0;
    try {
      if (!measTried) { measTried = true; measCtx = document.createElement('canvas').getContext('2d'); }
      if (measCtx && f) { measCtx.font = f.font; w = measCtx.measureText(f.up ? s.toUpperCase() : s).width + f.ls * s.length; }
    } catch (e) { w = 0; }
    if (!(w > 0)) w = s.length * approx;
    if (document.fonts && document.fonts.status !== 'loaded') measuredEarly = true;
    textCache.set(key, w);
    return w;
  }
  App.textWidth = textWidth;
  // Шрифты приходят с Google Fonts позже первой отрисовки: тогда ширины пересчитываются один раз
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
    if (!measuredEarly) return;
    textCache.clear();
    if (allNodes.length && state.view === 'people') render();
  });

  /* Пропуски поколений. Пунктир огибает чужие карточки (изгиб в середине, у начала или у конца).
     Подпись ставится туда, где она не задевает карточки, линии родства, заголовки домов и пунктиры:
     над или под пунктиром, над или под его ровным участком, над или под карточкой, к которой он ведёт.
     Длинная подпись переносится на две-три строки. */
  function drawGaps() {
    const textW = (cls, s) => textWidth(cls, s, cls === 'gap-years' ? 12 : 7.4);
    const LN = 19, YH = 30;
    const hitR = (r, o) => r[0] < o[2] && o[0] < r[2] && r[1] < o[3] && o[1] < r[3];
    // Препятствия: карточки с кнопкой ветви, веера линий от родителя к детям, заголовки домов
    const obst = [];
    allNodes.forEach(n => {
      obst.push({ r: [n.X - 10, n.Y - H / 2 - 10, n.X + W + (hasKids(n) ? TOG + 12 : 0) + 10, n.Y + H / 2 + 10], id: n.data.id });
      if (n.children && n.children.length) { const ys = n.children.map(c => c.Y).concat(n.Y); obst.push({ r: [n.X + W + TOG - 2, Math.min(...ys) - 6, colX(n.gen + 1), Math.max(...ys) + 6], id: n.data.id }); }
    });
    bandBoxes.forEach(b => obst.push({ r: [b.hx0 - 8, b.top + 6, b.hx0 + b.tx + (b.headW || 300) + 16, b.top + 90] }));
    // Пунктир: кубические кривые; форма выбирается так, чтобы не задеть чужие карточки
    const line = (ax, ay, bx, by) => [[ax, ay], [ax + (bx - ax) / 3, ay + (by - ay) / 3], [ax + 2 * (bx - ax) / 3, ay + 2 * (by - ay) / 3], [bx, by]];
    const shapes = (x0, y0, x1, y1) => {
      const k = Math.min(90, (x1 - x0) * 0.5), a = (x1 - x0) * 0.45;
      return [
        { segs: [[[x0, y0], [x0 + a, y0], [x1 - a, y1], [x1, y1]]], flat: null },
        { segs: [[[x0, y0], [x0 + k * 0.6, y0], [x0 + k * 0.4, y1], [x0 + k, y1]], line(x0 + k, y1, x1, y1)], flat: [x0 + k, x1, y1] },
        { segs: [line(x0, y0, x1 - k, y0), [[x1 - k, y0], [x1 - k * 0.4, y0], [x1 - k * 0.6, y1], [x1, y1]]], flat: [x0, x1 - k, y0] }
      ];
    };
    const sample = segs => {
      const pts = [];
      segs.forEach(p => { for (let i = 0; i <= 30; i++) { const t = i / 30, u = 1 - t; pts.push([u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]); } });
      return pts;
    };
    const inR = (pt, r, pad) => pt[0] > r[0] - pad && pt[0] < r[2] + pad && pt[1] > r[1] - pad && pt[1] < r[3] + pad;
    const wrap = (s, n) => {
      const words = s.split(' ');
      if (n === 1 || words.length < n) return [s];
      let best = null;
      const cut = cs => {
        const lines = []; let i = 0;
        cs.concat(words.length).forEach(c => { lines.push(words.slice(i, c).join(' ')); i = c; });
        const w = Math.max(...lines.map(l => textW('gap-note', l)));
        if (!best || w < best.w) best = { w, lines };
      };
      for (let a = 1; a < words.length; a++) { if (n === 2) cut([a]); else for (let c = a + 1; c < words.length; c++) cut([a, c]); }
      return best.lines;
    };
    const gaps = [];
    GAPS.forEach(gp => {
      const src = nodeById.get(gp.from), dst = nodeById.get(gp.to);
      if (!src || !dst || !visible.has(gp.from) || !visible.has(gp.to)) return;
      const kids = src.children || [];
      // Пунктир выходит из колонки детей (или из самой карточки, если детей нет); если оттуда не пройти,
      // не задев внуков, — из-за всей ветви
      const y0 = kids.length ? (kids[0].Y + kids[kids.length - 1].Y) / 2 : src.Y;
      const x1 = dst.X - 8, y1 = dst.Y;
      let best = null;
      [kids.length ? kids : [src], src.descendants()].forEach(group => {
        if (best && !best.hits) return;
        const own = new Set([gp.to, gp.from]);
        let x0 = 0;
        group.forEach(n => { own.add(n.data.id); x0 = Math.max(x0, n.X + W + (hasKids(n) ? TOG : 0)); });
        x0 += 16;
        shapes(x0, y0, x1, y1).forEach(sh => {
          const pts = sample(sh.segs);
          const hits = pts.filter(pt => obst.some(o => o.id && !own.has(o.id) && inR(pt, o.r, 0))).length;
          if (!best || hits < best.hits) best = Object.assign({ hits, pts, x0 }, sh);
        });
      });
      // Если конец пропуска — прямой ребёнок его начала (ветвь младшего сына сдвинута к ровесникам), пунктир идёт
      // из веера родителя, как ещё одна ветка к ребёнку: вниз (или вверх) из кнопки ветви, вдоль края всей ветви и
      // к карточке. Иначе хвост из-за ветви читался как продолжение того из внуков, рядом с кем он начинается.
      // Пропуски через несколько поколений по-прежнему выходят из-за всей ветви.
      const direct = (dst.data.par || []).some(r => (/^[a-z_0-9]+/.exec(r) || [''])[0] === gp.from);
      if (kids.length && direct) {
        const desc = src.descendants().filter(n => n !== src);
        const own = new Set([gp.to, gp.from].concat(desc.map(n => n.data.id)));
        const fx = src.X + W + TOG, fy = src.Y;
        const right = Math.max(...desc.map(n => n.X + W + (hasKids(n) ? TOG : 0)));
        const ends = [Math.max(...desc.map(n => n.Y)) + H / 2 + 22, Math.min(...desc.map(n => n.Y)) - H / 2 - 22];
        let fan = null;
        ends.forEach(ye => {
          const xa = fx + 34, xb = Math.max(right + 30, xa + 20), xc = x1;
          const segs = [[[fx, fy], [fx + 22, fy], [fx + 12, ye], [xa, ye]], line(xa, ye, xb, ye), [[xb, ye], [xb + (xc - xb) * 0.5, ye], [xb + (xc - xb) * 0.5, y1], [xc, y1]]];
          const pts = sample(segs);
          const hits = pts.filter(pt => obst.some(o => o.id && !own.has(o.id) && inR(pt, o.r, 0))).length;
          const len = Math.abs(ye - fy) + Math.abs(ye - y1);
          if (!fan || hits < fan.hits || (hits === fan.hits && len < fan.len)) fan = { hits, len, pts, segs, flat: [xa, xb, ye], x0: fx };
        });
        if (fan.hits <= best.hits) best = fan;
      }
      const x0 = best.x0;
      gaps.push({ gp, dst, x0, y0: best.segs[0][0][1], x1, y1, shape: best });
    });
    const placed = [];
    const free = r => !obst.some(o => hitR(r, o.r)) && !placed.some(q => hitR(r, q)) && !gaps.some(q => q.shape.pts.some(pt => inR(pt, r, 5)));
    const tries = [];
    [1, 2, 3].forEach(n => tries.push([n, 'over'], [n, 'under'], [n, 'flatOver'], [n, 'flatUnder']));
    [2, 3].forEach(n => tries.push([n, 'cardTop'], [n, 'cardBottom']));
    gaps.forEach(({ gp, dst, x0, y0, x1, y1, shape }) => {
      const g = layers.gap.append('g').attr('class', 'h-' + gp.house);
      g.append('path').attr('class', 'gap-link').attr('d', 'M' + shape.segs[0][0] + ' ' + shape.segs.map(p => 'C' + p[1] + ' ' + p[2] + ' ' + p[3]).join(' '));
      const yw = gp.years ? textW('gap-years', gp.years) : 0;
      const spotFor = (n, where, force) => {
        const lines = wrap(gp.note, n);
        const bw = Math.max(yw, ...lines.map(l => textW('gap-note', l))), bh = (gp.years ? YH : 0) + lines.length * LN;
        let xa = x0, xb = x1, ty;
        if (where === 'over' || where === 'under') ty = where === 'over' ? Math.min(y0, y1) - 14 - bh : Math.max(y0, y1) + 14;
        else if (where === 'flatOver' || where === 'flatUnder') {
          if (!shape.flat) return null;
          [xa, xb] = shape.flat;
          ty = where === 'flatOver' ? shape.flat[2] - 12 - bh : shape.flat[2] + 12;
        } else {
          if (bw > W + TOG - 6) return null;
          ty = where === 'cardTop' ? y1 - H / 2 - 12 - bh : y1 + H / 2 + 12;
          return { r: [dst.X, ty, dst.X + bw, ty + bh], x: dst.X, anchor: 'start', lines };
        }
        if (xb - xa < bw + 24 && !force) return null;
        const cx = (xa + xb) / 2;
        return { r: [cx - bw / 2, ty, cx + bw / 2, ty + bh], x: cx, anchor: 'middle', lines };
      };
      let spot = null;
      for (const [n, where] of tries) { const s = spotFor(n, where); if (s && free(s.r)) { spot = s; break; } }
      if (!spot) spot = spotFor(3, 'over', true);
      placed.push(spot.r);
      let y = spot.r[1];
      if (gp.years) { g.append('text').attr('class', 'gap-years').style('text-anchor', spot.anchor).attr('x', spot.x).attr('y', y + 22).text(gp.years); y += YH; }
      spot.lines.forEach((l, i) => g.append('text').attr('class', 'gap-note').style('text-anchor', spot.anchor).attr('x', spot.x).attr('y', y + 14 + i * LN).text(l));
    });
  }

  App.linkPath = (s, t) => {
    const x0 = s.X + W + (state.mode === 'gen' ? TOG : 0);
    const k = state.mode === 'gen' && knotOf.get(t.data.id);
    if (!k || k.s !== s) return linkGen({ source: [x0, s.Y], target: [t.X, t.Y] });
    const stem = 'M' + x0 + ',' + s.Y + ' C' + (x0 + KG * 0.6) + ',' + s.Y + ' ' + (k.x - KG * 0.6) + ',' + k.y + ' ' + k.x + ',' + k.y;
    return stem + ' ' + linkGen({ source: [k.x, k.y], target: [t.X, t.Y] }).replace(/^M/, 'L');
  };

  /* Длинное имя сжимается по ширине карточки. Ширина берётся из запомненных замеров, без чтения раскладки страницы. */
  function fitNames(sel) {
    sel.select('text.name').each(function (d) {
      const max = d.data.k === 'K' && d.data.n ? W - 12 - 40 : W - 22;
      if (textWidth('node name', d.data.name, 7.6) > max) { this.setAttribute('textLength', max); this.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      else { this.removeAttribute('textLength'); this.removeAttribute('lengthAdjust'); }
    });
  }
  App.fitNames = fitNames;

  /* Связи между домами. Линию и значок брака можно навести и нажать: подсвечиваются линия и оба конца,
     подсказка говорит, кто с кем связан, а нажатие переносит к дальнему от указателя концу. */
  const X_KIND = { m: 'Брак', b: 'Помолвка', l: 'Связь вне брака', rumor: 'Родство по слухам', w: 'Воспитанник' };
  const xText = e => { const a = byId.get(e.a).full, b = byId.get(e.b).full, t = App.t;
    return e.type === 'w' ? t('Воспитанник: {b} у {a}', { a, b })
      : e.type === 'rumor' ? (byId.get(e.b).par.some(r => r.startsWith(e.a + ' (по теории')) ? t('По теории: {b} — ребёнок {a}', { a, b }) : t('По слухам: {b} — ребёнок {a}', { a, b }))
      : t(X_KIND[e.type]) + ': ' + t('{a} и {b}', { a, b }); };
  const bez = (p, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i]); };
  function drawCross() {
    xKey = null; peekId = null; xBox = null;
    const pairs = state.showLinks ? PAIRS.filter(e => visible.has(e.a) && visible.has(e.b) && nodeById.get(e.a).band !== nodeById.get(e.b).band) : [];
    const raw = pairs.map(e => ({ e, key: e.a + '|' + e.b, k: e.type !== 'rumor' && e.type !== 'w' && knotByPair.get(e.a + '|' + e.b) }));
    // Концы линий, выходящие из одной колонки в одну сторону, разводятся по полосам поперёк карточки
    const ends = new Map();
    const addEnd = (key, n, dir, toX) => { const g = n.X + '|' + dir; if (!ends.has(g)) ends.set(g, []); ends.get(g).push({ id: key + '@' + n.data.id, n, toX }); };
    raw.forEach(r => {
      if (r.k) { const o = nodeById.get(r.k.s.data.id === r.e.a ? r.e.b : r.e.a); addEnd(r.key, o, o.Y > r.k.y ? 'up' : 'down', r.k.x); return; }
      const a = nodeById.get(r.e.a), b = nodeById.get(r.e.b), [u, v] = a.Y <= b.Y ? [a, b] : [b, a];
      addEnd(r.key, u, 'down', v.X); addEnd(r.key, v, 'up', u.X);
    });
    const LANES = [0, -34, 34, -68, 68, -17, 17, -51, 51, -78, 78];
    const lane = new Map();
    ends.forEach(list => { list.sort((p, q) => p.n.Y - q.n.Y || p.toX - q.toX); list.forEach((x, i) => lane.set(x.id, LANES[i % LANES.length])); });
    const off = (key, id) => lane.get(key + '@' + id) || 0;
    const geo = raw.map(({ e, key, k }) => {
      const g = k ? (o => knotCross(o, k, off(key, o.data.id)))(nodeById.get(k.s.data.id === e.a ? e.b : e.a))
        : crossGeom(nodeById.get(e.a), nodeById.get(e.b), off(key, e.a), off(key, e.b));
      return Object.assign({ key, e, knot: k || null }, g);
    });
    layers.x.selectAll('path.xlink').data(geo, d => d.key).join('path')
      .attr('class', d => 'xlink t-' + d.e.type)
      .attr('d', d => d.d);
    // полоса наведения — ломаной по той же кривой: на очень длинных кривых (через всё древо) браузер проверяет попадание
    // приближённо и местами промахивается мимо линии, по ломаной — точно
    const flat = d => {
      if (!d.pts) return d.d;
      const P = d.pts, len = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) + Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]) + Math.hypot(P[3][0] - P[2][0], P[3][1] - P[2][1]);
      const n = Math.max(8, Math.min(600, Math.ceil(len / 30)));
      let out = 'M' + P[0][0] + ',' + P[0][1];
      for (let i = 1; i <= n; i++) { const q = bez(P, i / n); out += ' L' + q[0].toFixed(1) + ',' + q[1].toFixed(1); }
      return out;
    };
    layers.x.selectAll('path.xhit').data(geo, d => d.key).join(enter => enter.append('path').attr('class', 'xhit').call(xEvents))
      .attr('d', flat);
    // Значок брака — в середине линии, но не на карточке, не на заголовке дома и не вплотную к другому значку
    const busy = allNodes.map(n => [n.X - 14, n.Y - H / 2 - 14, n.X + W + (hasKids(n) ? TOG + 10 : 0) + 14, n.Y + H / 2 + 14])
      .concat(knots.map(k => [k.x - 16, k.y - 16, k.x + 16, k.y + 16]))
      .concat(bandBoxes.map(b => [b.hx0 - 10, b.top, b.hx0 + b.tx + (b.headW || 300) + 10, b.top + 92]));
    const spots = [];
    const ok = pt => !busy.some(r => pt[0] > r[0] && pt[0] < r[2] && pt[1] > r[1] && pt[1] < r[3]) && !spots.some(q => Math.hypot(q[0] - pt[0], q[1] - pt[1]) < 34);
    const markData = geo.filter(d => d.e.type === 'm' && !d.knot);
    markData.forEach(d => {
      let pt = null;
      for (let i = 0; i <= 16 && !pt; i++) for (const sgn of i ? [-1, 1] : [1]) { const q = bez(d.pts, 0.5 + sgn * i * 0.025); if (ok(q)) { pt = q; break; } }
      d.mp = pt || [d.mx, d.my];
      spots.push(d.mp);
    });
    const marks = layers.marks.selectAll('g.xmark').data(markData, d => d.key).join(enter => {
      const g = enter.append('g').attr('class', 'xmark').attr('tabindex', 0).attr('role', 'button').call(xEvents);
      g.append('circle').attr('r', 10);
      g.append('text').text('⚭');
      g.on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); xGo(d, d.mp); } });
      return g;
    });
    marks.attr('transform', d => 'translate(' + d.mp[0] + ',' + d.mp[1] + ')')
      .attr('aria-label', d => xText(d.e) + '. ' + App.t('Перейти к {name}', { name: byId.get(xFar(d, d.mp)).full }));
  }
  // Дальний от точки конец линии: туда и ведёт нажатие
  function xFar(d, pt) {
    const a = nodeById.get(d.e.a), b = nodeById.get(d.e.b);
    const da = Math.hypot(a.X + W / 2 - pt[0], a.Y - pt[1]), db = Math.hypot(b.X + W / 2 - pt[0], b.Y - pt[1]);
    return da > db ? d.e.a : d.e.b;
  }
  function xGo(d, pt) { xHover(null); select(xFar(d, pt), { center: true }); }
  const canvasEl = document.getElementById('canvas');
  const xtip = document.createElement('div');
  xtip.className = 'xtip'; xtip.setAttribute('role', 'tooltip'); xtip.hidden = true;
  canvasEl.appendChild(xtip);
  /* Наведение на связь. Подсветка меняется только при переходе на другую линию; размеры холста и подсказки
     запоминаются в начале наведения — на каждом движении мыши раскладка страницы не читается. */
  let xKey = null, xFarId = null, xBox = null, xTipW = 0, xTipH = 0;
  function xHover(d, ev) {
    const key = d ? d.key : null;
    if (key !== xKey) {
      layers.x.selectAll('path.xlink.hover').classed('hover', false);
      layers.marks.selectAll('g.xmark.hover').classed('hover', false);
      layers.nodes.selectAll('g.node.xpeer').classed('xpeer', false);
      if (d) {
        layers.x.selectAll('path.xlink').filter(q => q.key === key).classed('hover', true);
        layers.marks.selectAll('g.xmark').filter(q => q.key === key).classed('hover', true);
        layers.nodes.selectAll('g.node').filter(n => n.data.id === d.e.a || n.data.id === d.e.b).classed('xpeer', true);
      }
      xKey = key; xFarId = null;
    }
    if (!d) { xtip.hidden = true; xBox = null; return; }
    if (!xBox) {
      const c = canvasEl.getBoundingClientRect(), r = svg.node().getBoundingClientRect();
      xBox = { cl: c.left, ct: c.top, cw: c.width, ch: c.height, sl: r.left, st: r.top };
    }
    const pt = treePoint(ev);
    const far = xFar(d, pt);
    if (far !== xFarId) {
      xFarId = far;
      xtip.innerHTML = '<b>' + esc(xText(d.e)) + '</b><span>' + esc(App.t('Нажмите — перейти к: {name}', { name: byId.get(far).full })) + '</span>';
      xtip.hidden = false;
      xTipW = xtip.offsetWidth; xTipH = xtip.offsetHeight;
    }
    const x = Math.min(ev.clientX - xBox.cl + 16, xBox.cw - xTipW - 8), y = Math.min(ev.clientY - xBox.ct + 18, xBox.ch - xTipH - 8);
    xtip.style.transform = 'translate(' + Math.max(8, x) + 'px,' + Math.max(8, y) + 'px)';
  }
  // точка древа под указателем: по запомненному положению холста и текущему масштабу, без чтения раскладки
  function treePoint(ev) {
    if (!xBox) return d3.pointer(ev, gRoot.node());
    return d3.zoomTransform(svg.node()).invert([ev.clientX - xBox.sl, ev.clientY - xBox.st]);
  }
  function xEvents(sel) {
    sel.on('pointerenter pointermove', (e, d) => { if (!panning && !moving) xHover(d, e); })
      .on('pointerleave', () => xHover(null))
      .on('click', (e, d) => { e.stopPropagation(); xGo(d, treePoint(e)); });
  }
  // подсказка у линии не должна залипать: pointerleave не приходит, если линию перерисовали или убрали из-под
  // указателя (перестройка древа, фильтр, смена вкладки), или указатель ушёл с холста на панель или за окно —
  // поэтому её снимает и любое движение не над линией, и уход с холста, и потеря фокуса окна
  svg.on('pointermove.xtip', e => { if (xKey && !(e.target.closest && e.target.closest('.xhit, .xmark'))) xHover(null); });
  canvasEl.addEventListener('pointerleave', () => { if (xKey) xHover(null); });
  window.addEventListener('blur', () => { if (xKey) xHover(null); });
  App.hideXTip = () => { if (xKey || !xtip.hidden) xHover(null); };
  App.xFar = xFar;
  App.drawCross = drawCross;
  // карточка под указателем: её связи с другими домами видны ярче
  let peekId = null;
  function peek(id) {
    if (id && (panning || moving)) return;
    if (id === peekId) return;
    if (peekId) {
      layers.x.selectAll('path.xlink.peek').classed('peek', false);
      layers.marks.selectAll('g.xmark.peek').classed('peek', false);
    }
    peekId = id;
    if (!id) return;
    layers.x.selectAll('path.xlink').filter(d => d.e.a === id || d.e.b === id).classed('peek', true);
    layers.marks.selectAll('g.xmark').filter(d => d.e.a === id || d.e.b === id).classed('peek', true);
  }

  function toggle(d) {
    const before = { X: d.X, Y: d.Y };
    if (d.children) { d._children = d.children; d.children = null; }
    else if (d._children) { d.children = d._children; d._children = null; }
    render();
    svg.call(zoom.translateBy, before.X - d.X, before.Y - d.Y);
  }

  function reveal(id) {
    const n = nodeById.get(id); if (!n) return;
    let changed = false;
    for (let a = n.parent; a; a = a.parent) {
      if (a._children) { a.children = a._children; a._children = null; changed = true; }
    }
    if (changed) render();
  }
  App.reveal = reveal;

  /* Подсветка выбранного и все «приглушения» (фильтры, линзы, фокус, срез по году). */
  function decorate() {
    const sel = state.selected;
    const path = new Set();
    if (sel && nodeById.has(sel)) for (let n = nodeById.get(sel); n; n = n.parent) path.add(n.data.id);
    const dimmers = App.hooks.decorate.map(f => f()).filter(Boolean);
    const dimmed = id => dimmers.some(fn => fn(id));
    App.dimmedFn = () => dimmed;
    // срез по году: у кого год смерти не известен точно — жив ли в этот год, неизвестно
    const unsure = App.yearUnsure ? App.yearUnsure() : null;
    const unsureOf = id => !!unsure && !dimmed(id) && unsure(id);
    layers.nodes.selectAll('g.node')
      .classed('selected', d => d.data.id === sel)
      .classed('lineage', d => path.has(d.data.id) && d.data.id !== sel)
      .classed('dim', d => dimmed(d.data.id))
      .classed('unsure', d => unsureOf(d.data.id))
      .each(function (d) {
        const on = unsureOf(d.data.id);
        let t = this.querySelector(':scope > title.unsure-t');
        if (on && !t) { t = document.createElementNS('http://www.w3.org/2000/svg', 'title'); t.setAttribute('class', 'unsure-t'); this.insertBefore(t, this.firstChild); }
        if (on) t.textContent = App.t('жив ли в этот год — неизвестно');
        else if (t) t.remove();
      })
      .attr('data-faction', d => (App.lens && App.lens.cls && App.lens.cls.get(d.data.id)) || null)
      .attr('aria-pressed', d => d.data.id === sel ? 'true' : 'false');
    layers.links.selectAll('path.link')
      .classed('path', d => path.has(d.target.data.id))
      .classed('dim', d => dimmed(d.target.data.id) && dimmed(d.source.data.id));
    layers.x.selectAll('path.xlink')
      .classed('hot', d => d.e.a === sel || d.e.b === sel)
      .classed('dim', d => dimmed(d.e.a) && dimmed(d.e.b));
    layers.marks.selectAll('g.xmark')
      .classed('hot', d => d.e.a === sel || d.e.b === sel)
      .classed('dim', d => dimmed(d.e.a) && dimmed(d.e.b));
    const selKnot = sel ? knotOf.get(sel) : null;
    const pathKnots = new Set();
    path.forEach(id => { const k = knotOf.get(id); if (k && path.has(k.s.data.id)) pathKnots.add(k.key); });
    const knotHot = d => d.s.data.id === sel || d.o.id === sel;
    const knotDim = d => dimmed(d.s.data.id) && (!d.o.id || dimmed(d.o.id));
    layers.knots.selectAll('g.knot')
      .classed('hot', knotHot)
      .classed('path', d => pathKnots.has(d.key))
      .classed('dim', knotDim);
    layers.union.selectAll('path.union')
      .classed('hot', d => knotHot(d) || (selKnot && selKnot.key === d.key))
      .classed('dim', knotDim);
    layers.x.selectAll('path.xlink').filter(d => d.knot && selKnot && selKnot.key === d.knot.key).classed('hot', true);

    const extra = [];
    if (sel && visible.has(sel)) {
      const a = nodeById.get(sel);
      PAIRS.filter(e => (e.a === sel || e.b === sel) && e.type !== 'rumor' && e.type !== 'w').forEach(e => {
        const other = nodeById.get(e.a === sel ? e.b : e.a);
        if (!other || !visible.has(other.data.id)) return;
        const k = knotByPair.get(sel + '|' + other.data.id);
        if (k && (other.band === a.band || state.showLinks)) return;
        if (other.band === a.band || !state.showLinks) extra.push({ kind: 'sp', type: e.type, a, b: other, key: 'sp' + other.data.id });
      });
      a.data.par.forEach(r => {
        const ref = (/^[a-z_0-9]+/.exec(r) || [''])[0];
        const op = nodeById.get(ref);
        if (!op || ref === a.data.p || !visible.has(ref)) return;
        if (selKnot && selKnot.o.id === ref && (op.band === a.band || state.showLinks)) return;
        extra.push({ kind: 'par', a: op, b: a, key: 'par' + ref });
      });
    }
    layers.sel.selectAll('path').data(extra, d => d.key).join('path')
      .attr('class', d => d.kind === 'par' ? 'second' : 'spouse t-' + d.type)
      .attr('d', d => {
        if (d.kind === 'par') {
          if (d.a.band !== d.b.band) return crossGeom(d.a, d.b).d;
          return linkGen({ source: [d.a.X + W + (hasKids(d.a) && state.mode === 'gen' ? TOG : 4), d.a.Y], target: [d.b.X, d.b.Y] });
        }
        if (d.a.band !== d.b.band) return crossGeom(d.a, d.b).d;
        const x1 = d.a.X + W + (hasKids(d.a) ? TOG : 4), y1 = d.a.Y;
        const x2 = d.b.X + W + (hasKids(d.b) ? TOG : 4), y2 = d.b.Y;
        const off = 44 + Math.min(180, Math.abs(y2 - y1) * 0.12);
        return 'M' + x1 + ',' + y1 + ' C' + (x1 + off) + ',' + y1 + ' ' + (x2 + off) + ',' + y2 + ' ' + x2 + ',' + y2;
      });
  }
  App.decorate = decorate;

  /* ——— Карточка ——— */
  const panel = document.getElementById('panel');
  const panelContent = document.getElementById('panel-content');

  function chip(ref, note) {
    const p = byId.get(ref);
    const label = p
      ? '<button type="button" class="chip h-' + p.house + '" data-id="' + p.id + '">' + esc(p.full) + '</button>'
      : '<span class="ref">' + esc(App.tData(ref)) + '</span>';
    return '<li>' + label + (note ? '<span class="ref-note">' + esc(App.tData(note)) + '</span>' : '') + '</li>';
  }
  App.chip = chip;
  const row = (label, html) => html ? '<div><dt>' + label + '</dt><dd>' + html + '</dd></div>' : '';
  const list = items => items.length ? '<ul class="refs">' + items.join('') + '</ul>' : '';
  App.row = row; App.list = list;

  const prevKing = p => p.pr ? byId.get(p.pr) : tKings.find(k => k.n === p.n - 1);
  const nextKing = p => p.su ? byId.get(p.su) : tKings.find(k => k.n === p.n + 1);
  App.prevKing = prevKing; App.nextKing = nextKing;

  /* Медальон: щит в цветах дома с инициалом; корона у королей. */
  function initials(p) {
    const w = p.name.replace(/^(Сир|Лорд|Септа|Мейстер)\s+/, '').split(/[\s,]+/);
    const roman = w.find(x => /^[IVX]+$/.test(x));
    return { letter: (w[0] || '?').charAt(0), roman: roman || '' };
  }
  function medallion(p) {
    const s = HOUSES[p.house].sigil || HOUSES.oth.sigil; // у малых домов гербов нет — нейтральный щит
    const ini = initials(p);
    const crown = p.k === 'K'
      ? '<path d="M18 13 L22 4 L27 10 L32 2 L37 10 L42 4 L46 13 Z" fill="' + s.charge + '" stroke="' + s.field + '" stroke-width="1"/>' : '';
    const dash = p.k === 'C' || (p.k === 'B' && p.cl) ? ' stroke-dasharray="5 3"' : (p.k === 'R' ? ' stroke-dasharray="1.5 3"' : '');
    return '<svg class="medal" viewBox="0 0 64 76" aria-hidden="true">' +
      '<path d="M6 12 H58 V40 C58 57 46 67 32 73 C18 67 6 57 6 40 Z" fill="' + s.field + '" stroke="var(--hc)" stroke-width="2.5"' + dash + '/>' +
      '<path d="M11 17 H53 V40 C53 53 44 61 32 66 C20 61 11 53 11 40 Z" fill="none" stroke="' + s.charge + '" stroke-opacity=".45" stroke-width="1"/>' +
      crown +
      '<text x="32" y="' + (ini.roman ? 44 : 49) + '" text-anchor="middle" font-family="Forum, Georgia, serif" font-size="26" fill="' + s.charge + '">' + esc(ini.letter) + '</text>' +
      (ini.roman ? '<text x="32" y="59" text-anchor="middle" font-family="Forum, Georgia, serif" font-size="12" letter-spacing="1" fill="' + s.charge + '">' + ini.roman + '</text>' : '') +
      '</svg>';
  }
  App.medallion = medallion;

  /* Мини-хронология жизни: рождение, браки, правление, смерть и особые события. */
  function lifeEvents(p) {
    const ev = [];
    const t = App.t;
    if (p.b) ev.push({ y: yearOf(p.b), label: App.tDate(p.b), text: p.sex === 'f' ? t('Родилась') : t('Родился') });
    (p.sp || []).forEach(([ref, note, type]) => {
      const m = /(\d+) г\./.exec(note || '');
      if (!m) return;
      const who = byId.has(ref) ? byId.get(ref).full : App.tData(ref);
      ev.push({ y: +m[1], label: m[1], text: (type === 'b' ? t('Помолвка: {who}', { who }) : t('Брак: {who}', { who })), ref: byId.has(ref) ? ref : null });
    });
    (p.ev || []).forEach(([y, text, ref]) => ev.push({ y: yearOf(y), label: String(y), text: App.tData(text), ref }));
    if (p.k === 'K' && p.r) {
      const [a, b] = p.r.split('–');
      ev.push({ y: yearOf(a), label: a, text: p.sex === 'f' ? t('Взошла на Железный трон') : t('Взошёл на Железный трон') });
      if (b && b !== p.d) ev.push({ y: yearOf(b), label: b, text: t('Конец правления') });
    }
    if (p.d) ev.push({ y: yearOf(p.d), label: App.tDate(p.d), text: p.sex === 'f' ? t('Умерла') : t('Умер'), last: true });
    ev.sort((a, b) => (a.y ?? 9999) - (b.y ?? 9999) || (a.last ? 1 : 0) - (b.last ? 1 : 0));
    return ev;
  }
  App.lifeEvents = lifeEvents;

  const wikiUrl = p => 'https://awoiaf.westeros.org/index.php?title=Special:Search&go=Go&search=' +
    encodeURIComponent(p.wiki || (p.en ? p.en.split(',')[0] : p.full));
  App.wikiUrl = wikiUrl;

  function renderPanel(p) {
    panelContent.className = 'panel-inner h-' + (p ? p.house : 'none');
    if (!p) {
      panel.classList.add('is-empty');
      panelContent.innerHTML =
        '<div class="empty"><p class="eyebrow">' + App.housesLabel() + '</p><h2>Выберите персонажа</h2>' +
        '<p>Нажмите на имя, чтобы открыть описание и семейные связи. Его предки и супруги будут подсвечены на древе.</p>' +
        '<p class="stats">' + PEOPLE.length + ' человек · ' + PAIRS.filter(e => e.type === 'm').length + ' браков на древе</p>' +
        '<p class="keys"><kbd>/</kbd> поиск · <kbd>Esc</kbd> закрыть · <kbd>Alt</kbd>+<kbd>←</kbd> назад</p></div>';
      App.translateDom(panelContent);
      return;
    }
    panel.classList.remove('is-empty');
    const kids = PEOPLE.filter(q => q.p === p.id || q.par.includes(p.id));
    let reignRows = '';
    if (p.k === 'K') {
      const prev = prevKing(p), next = nextKing(p);
      reignRows = row('Предшественник', prev ? list([chip(prev.id)]) : 'основатель династии')
        + row('Преемник', next ? list([chip(next.id)]) : 'правит на момент последней книги');
    }
    const par = p.par.map(r => {
      const m = /^(\w+) \((.+)\)$/.exec(r);
      return m && byId.has(m[1]) ? chip(m[1], m[2]) : chip(r);
    });
    const ev = lifeEvents(p);
    const back = state.history.length ? App.historyLabel(state.history[state.history.length - 1]) : null;
    const extraSections = App.hooks.panel.map(f => f(p) || '').join('');
    panelContent.innerHTML =
      '<span class="grab" aria-hidden="true"></span>' +
      '<div class="panel-nav">' +
        (back ? '<button type="button" class="btn back" id="panel-back" title="Alt + ←">← ' + esc(back) + '</button>' : '<span></span>') +
        '<button type="button" class="btn btn-icon close" id="panel-close" aria-label="Закрыть карточку">×</button>' +
      '</div>' +
      '<div class="panel-top">' + medallion(p) + '<div>' +
        '<p class="eyebrow">' + eyebrowHtml(p) + '</p>' +
        '<h2>' + esc(p.full) + '</h2>' +
        // в русской версии под именем — английское; в английской второго имени нет
        (App.lang !== 'en' && p.en ? '<p class="en">' + esc(p.en) + '</p>' : '') +
      '</div></div>' +
      // в английском: перевод текста, если он есть; иначе русский с пометкой, что перевода пока нет
      (p.tUntranslated ? '<p class="tr-missing">Это описание пока доступно только по-русски.</p>' : '') +
      '<p class="note"' + (p.tUntranslated ? ' lang="ru"' : '') + '>' + esc(p.t || '') + '</p>' +
      (p.ai ? '<p class="ai-mark" title="Описание ещё редактируется">✎ Черновик</p>' : '') +
      (ev.length ? '<ol class="events">' + ev.map(e => '<li><span class="ev-year">' + esc(e.label) + '</span><span class="ev-text">' +
        (e.ref ? '<button type="button" class="linkish" data-id="' + e.ref + '">' + esc(e.text) + '</button>' : esc(e.text)) + '</span></li>').join('') + '</ol>' : '') +
      '<dl class="facts">' +
        reignRows +
        row('Родители', list(par)) +
        row('Супруги', list((p.sp || []).map(s => chip(s[0], s[1])))) +
        row('Дети', list(kids.map(k => chip(k.id)))) +
        row('Воспитанники', list((p.wd || []).map(w => chip(w)))) +
        row('Воспитатель', list(PEOPLE.filter(q => (q.wd || []).includes(p.id)).map(q => chip(q.id)))) +
        (App.dragonRow ? App.dragonRow(p) : row('Дракон', p.dr ? esc(p.dr) : '')) +
      '</dl>' +
      extraSections +
      '<div class="panel-actions">' +
        '<button type="button" class="btn locate" data-locate="' + p.id + '">Показать на древе</button>' +
        '<a class="btn" href="' + wikiUrl(p) + '" target="_blank" rel="noopener">A Wiki of Ice and Fire ↗</a>' +
      '</div>' +
      '<p class="src">По книгам Мартина и A Wiki of Ice and Fire. Годы отсчитываются от Завоевания Эйгона.</p>';
    // прокрутка наверх — только если карточку прокручивали, и в следующем кадре: сброс прокрутки прямо здесь
    // заставлял браузер разложить всю страницу посреди обработки нажатия
    if (panelScrolled) { panelScrolled = false; requestAnimationFrame(() => { panel.scrollTop = 0; }); }
    App.translateDom(panelContent);
  }
  let panelScrolled = false;
  panel.addEventListener('scroll', () => { panelScrolled = panel.scrollTop > 0; }, { passive: true });
  App.renderPanel = renderPanel;
  /* История карточек: id человека или «d:id» для дракона. */
  App.historyLabel = h => h.startsWith('d:') ? (App.dragonLabel ? App.dragonLabel(h.slice(2)) : h)
    : h.startsWith('h:') ? ((HOUSES[h.slice(2)] || {}).band || h) : (byId.get(h) || {}).name;
  App.currentSubject = () => state.selected;

  panel.addEventListener('click', e => {
    const c = e.target.closest('[data-id]');
    if (c) { select(c.dataset.id, { center: true }); return; }
    const l = e.target.closest('[data-locate]');
    if (l) {
      if (state.view !== 'people' && state.view !== 'time') setView('people');
      const cv = App.views[state.view];
      (cv.center || centerOn)(l.dataset.locate);
      App.hooks.locate.forEach(f => f(l.dataset.locate));
      return;
    }
    if (e.target.closest('#panel-back')) { goBack(); return; }
    if (e.target.closest('#panel-close')) select(null);
    const extra = e.target.closest('[data-action]');
    if (extra && App.actions && App.actions[extra.dataset.action]) App.actions[extra.dataset.action](extra.dataset);
  });

  function select(id, opts) {
    opts = opts || {};
    const vw = App.views[state.view] || {};
    if (!id && !vw.persons) { App.closeView(); return; }
    if (id && !vw.persons) { const cur = App.currentSubject(); if (opts.push !== false && cur && cur !== id) state.history.push(cur); setView('people', { quiet: true }); opts = Object.assign({}, opts, { push: false, force: true }); }
    if (id && id === state.selected && !opts.force) { if (opts.center) { const v0 = App.views[state.view]; (v0 && v0.center ? v0.center : centerOn)(id); } return; }
    // открыта карточка дома: в историю — она, а не человек под ней
    const was = state.house ? 'h:' + state.house : state.selected;
    state.house = null;
    if (opts.push !== false && was && id && was !== id) { state.history.push(was); if (state.history.length > 40) state.history.shift(); }
    if (!id) state.history = [];
    state.selected = id;
    if (id) reveal(id);
    decorate();
    renderPanel(id ? byId.get(id) : null);
    const cv = App.views[state.view];
    App.setHash(cv && cv.hash ? cv.hash() : (id || ''));
    if (id && opts.center) (cv && cv.center ? cv.center(id) : centerOn(id));
    App.hooks.select.forEach(f => f(id));
  }
  App.select = select;
  function goBack() {
    const prev = state.history.pop();
    if (!prev) return;
    if (prev.startsWith('d:') && App.openDragon) App.openDragon(prev.slice(2), { push: false, center: true });
    else if (prev.startsWith('h:') && App.openHouse) App.openHouse(prev.slice(2), { push: false });
    else select(prev, { center: true, push: false });
  }
  App.goBack = goBack;

  // Размер холста запоминает ResizeObserver: мини-карта и шкала спрашивают его на каждом кадре перетаскивания
  let svgSize = null;
  if (window.ResizeObserver) new ResizeObserver(es => { const r = es[es.length - 1].contentRect; svgSize = r.width ? { w: r.width, h: r.height } : null; }).observe(svg.node());
  function viewSize() { if (svgSize) return svgSize; const r = svg.node().getBoundingClientRect(); return { w: r.width, h: r.height }; }
  App.viewSize = viewSize;

  function centerOn(id, scale, animate) {
    const n = nodeById.get(id); if (!n || n.X === undefined || !visible.has(id)) return;
    const { w, h } = viewSize();
    const cur = d3.zoomTransform(svg.node()).k;
    const k = scale || Math.min(1.2, Math.max(0.7, cur));
    const cy = App.isNarrow() && state.selected ? h * 0.24 : h / 2;
    const t = d3.zoomIdentity.translate(w / 2 - k * (n.X + W / 2), cy - k * n.Y).scale(k);
    if (animate === false || reduced) svg.call(zoom.transform, t);
    else svg.transition().duration(dur).call(zoom.transform, t);
  }
  App.centerOn = centerOn;

  // corner: если рамка не влезает при minK — прижать её левый верхний угол к краю экрана, а не центр
  function fitBox(x0, y0, x1, y1, minK, corner) {
    const { w, h } = viewSize();
    const k = Math.max(minK || 0.04, Math.min(1.2, Math.min(w / (x1 - x0 + 40), h / (y1 - y0 + 40))));
    const tx = corner && k * (x1 - x0) > w ? 20 - k * x0 : w / 2 - k * (x0 + x1) / 2;
    const ty = corner && k * (y1 - y0) > h ? 70 - k * y0 : h / 2 - k * (y0 + y1) / 2;
    const t = d3.zoomIdentity.translate(tx, ty).scale(k);
    svg.transition().duration(dur).call(zoom.transform, t);
  }
  App.fitBox = fitBox;
  function fitAll() {
    if (!bandBoxes.length) return; // все дома сняты фильтром — подгонять не к чему
    let x0 = Infinity, x1 = -Infinity;
    allNodes.forEach(n => { x0 = Math.min(x0, n.X); x1 = Math.max(x1, n.X); });
    fitBox(x0 - 80, bandBoxes[0].top - 60, x1 + W + TOG + 80, bandsBottom() + 30);
  }
  App.fitAll = fitAll;
  App.fitIds = (ids, minK) => {
    const ns = ids.map(id => nodeById.get(id)).filter(n => n && visible.has(n.data.id));
    if (!ns.length) return;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    ns.forEach(n => { x0 = Math.min(x0, n.X); x1 = Math.max(x1, n.X + W); y0 = Math.min(y0, n.Y - H); y1 = Math.max(y1, n.Y + H); });
    fitBox(x0 - 40, y0 - 40, x1 + 40, y1 + 40, minK);
  };

  /* Представления: люди (древо домов) и те, что добавляют модули (драконы). Кнопки масштаба работают с текущим. */
  const hintEl = document.getElementById('hint');
  // Подсказка вида исчезает после первого касания холста (перетащили, покрутили колесо, нажали) и больше
  // в этом виде не показывается: на экране она закрывала древо. Запоминается в браузере, если он позволяет.
  const hintSeen = new Set((() => { try { return JSON.parse(localStorage.getItem('hint-seen') || '[]'); } catch (e) { return []; } })());
  const hintDone = e => {
    const v = state.view;
    if (hintSeen.has(v) || (e.target.closest && e.target.closest('.topbar, .panel, .legend, .zoom, .minimap'))) return;
    hintSeen.add(v); hintEl.hidden = true;
    try { localStorage.setItem('hint-seen', JSON.stringify([...hintSeen])); } catch (err) { /* хранилище недоступно */ }
  };
  ['pointerdown', 'wheel'].forEach(t => document.getElementById('canvas').addEventListener(t, hintDone, { passive: true }));
  const fitLabel = document.querySelector('#zoom-fit .label-wide');
  const linksBtnEl = document.getElementById('toggle-links');
  const lensbar = document.getElementById('lensbar');
  App.setHash = h => { try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (e) { /* frame may refuse */ } };
  App.views = {};
  /* Регистрация представления: el — его svg, tab — кнопка вкладки, persons — показывает людей (карточка человека остаётся). */
  App.registerView = (name, v) => {
    App.views[name] = v;
    if (v.tab) {
      v.tab.addEventListener('click', () => setView(name));
      v.tab.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const tabs = [...document.querySelectorAll('.tabs .tab')];
        const i = tabs.indexOf(v.tab), o = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        o.focus(); o.click();
      });
    }
  };
  function setView(v, opts) {
    opts = opts || {};
    if (state.view === v && !opts.force) return;
    const prev = App.views[state.view], next = App.views[v];
    if (!next) return;
    if (App.hideXTip) App.hideXTip();
    if (prev && prev.sel) prev.sel.interrupt();
    state.view = v;
    Object.keys(App.views).forEach(k => {
      const w = App.views[k];
      w.el.toggleAttribute('hidden', k !== v);
      if (w.legend) w.legend.hidden = k !== v;
      if (w.tab) w.tab.setAttribute('aria-selected', String(k === v));
    });
    linksBtnEl.hidden = !next.links;
    hintEl.innerHTML = next.hint;
    hintEl.hidden = hintSeen.has(v);
    fitLabel.textContent = next.fitLabel || 'Все дома';
    lensbar.hidden = !(App.lens && next.persons);
    document.getElementById('canvas').classList.toggle('has-scale', !!next.scale);
    document.getElementById('canvas').classList.toggle('has-gens', !!next.gens);
    document.getElementById('canvas').classList.toggle('has-marks', !!next.scaleMarks && !App.isNarrow());
    if (next.onShow) next.onShow(opts);
    if (!opts.quiet) {
      if (next.persons) { if (state.house && App.renderHousePanel) App.renderHousePanel(state.house); else renderPanel(state.selected ? byId.get(state.selected) : null); }
      else if (next.panel) next.panel();
      App.setHash(next.hash ? next.hash() : '');
    }
    App.hooks.view.forEach(f => f(v));
  }
  App.setView = setView;
  App.hooks.view = [];
  App.currentSubject = () => { const w = App.views[state.view]; return w && w.subject ? w.subject() : state.house ? 'h:' + state.house : state.selected; };
  App.closeView = () => { const w = App.views[state.view]; if (w && w.close) w.close(); };

  /* Линза: подсветка группы людей на древе (всадники дракона, линзы эпох). */
  App.lens = null;
  App.hooks.decorate.push(() => App.lens ? id => !App.lens.ids.has(id) : null);
  App.setLens = lens => {
    App.lens = lens;
    lensbar.hidden = !lens || !(App.views[state.view] || {}).persons;
    if (lens) { const t = document.getElementById('lensbar-text'); if (lens.html) t.innerHTML = lens.html; else t.textContent = lens.label; }
    decorate();
    App.hooks.lens.forEach(f => f(lens));
  };
  App.hooks.lens = [];
  document.getElementById('lensbar-close').addEventListener('click', () => App.setLens(null));

  App.registerView('people', {
    el: svg.node(), sel: svg, tab: document.getElementById('tab-people'), legend: document.getElementById('legend'),
    persons: true, links: true, fitLabel: 'Все дома', scale: 'free', gens: true,
    hint: 'Перетаскивайте древо. Колесо меняет масштаб. Нажмите на имя — откроется карточка. <kbd>/</kbd> — поиск. Нажмите на шкалу, чтобы выбрать год.',
    zoomBy: k => svg.transition().duration(reduced ? 0 : 250).call(zoom.scaleBy, k),
    fit: () => fitAll(),
    fitIds: (ids, minK) => App.fitIds(ids, minK),
    center: id => centerOn(id),
    hash: () => state.selected || ''
  });
  const view = () => App.views[state.view] || App.views.people;
  document.getElementById('zoom-in').addEventListener('click', () => view().zoomBy(1.35));
  document.getElementById('zoom-out').addEventListener('click', () => view().zoomBy(1 / 1.35));
  document.getElementById('zoom-fit').addEventListener('click', () => view().fit());
  const linksBtn = document.getElementById('toggle-links');
  linksBtn.addEventListener('click', () => {
    state.showLinks = !state.showLinks;
    linksBtn.setAttribute('aria-pressed', String(state.showLinks));
    drawCross(); decorate();
  });

  /* ——— Поиск ——— */
  const input = document.getElementById('search-input');
  const msg = document.getElementById('search-msg');
  document.getElementById('people-list').innerHTML = PEOPLE.map(p => '<option value="' + esc(p.full) + '"></option>').join('');
  function find(q) {
    q = q.trim().toLowerCase();
    if (!q) return null;
    const keys = p => [p.full, p.name, p.en || ''].concat(p.al || []).map(s => s.toLowerCase());
    return PEOPLE.find(p => keys(p).some(s => s === q))
      || PEOPLE.find(p => keys(p).some(s => s.startsWith(q)))
      || PEOPLE.find(p => keys(p).some(s => s.includes(q)));
  }
  App.find = find;
  function runSearch() {
    if (!input.value.trim()) return;
    const hit = App.findAny ? App.findAny(input.value) : (p => p && { type: 'person', id: p.id })(find(input.value));
    if (hit && hit.type === 'dragon') { msg.hidden = true; App.openDragon(hit.id, { center: true }); }
    else if (hit) { msg.hidden = true; if (App.onSearchResult) App.onSearchResult(hit.id); else select(hit.id, { center: true }); }
    else { msg.textContent = 'Никого не нашли по запросу «' + input.value.trim() + '». Попробуйте имя или прозвище.'; msg.hidden = false; }
  }
  document.getElementById('search-form').addEventListener('submit', e => { e.preventDefault(); runSearch(); });
  input.addEventListener('change', runSearch);
  input.addEventListener('input', () => { msg.hidden = true; });

  /* ——— Клавиши ——— */
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));
    if (e.key === '/' && !typing) { e.preventDefault(); input.focus(); input.select(); return; }
    if (e.key === 'Escape') {
      if (typing) { e.target.blur(); return; }
      if (App.lens) { App.setLens(null); return; }
      if (App.onEscape && App.onEscape()) return;
      if (state.selected) select(null);
      return;
    }
    if (e.altKey && e.key === 'ArrowLeft' && !typing) { e.preventDefault(); goBack(); }
  });

  /* ——— Старт ——— */
  App.start = function () {
    render();
    const startId = decodeURIComponent(location.hash.slice(1));
    if (App.startHash && App.startHash(startId)) {
      /* модуль сам открыл нужное представление */
    } else if (byId.has(startId)) {
      select(startId, { push: false }); centerOn(startId, App.isNarrow() ? 0.75 : 0.9, false);
    } else {
      // без адреса никто не выбран: справа — «Выберите персонажа», древо — с начала Таргариенов
      renderPanel(null); centerOn('rhaenys_q', App.isNarrow() ? 0.6 : 0.55, false);
    }
    // открыта без адреса — адрес остаётся чистым; дальше он повторяет выбранное (ссылкой можно поделиться)
    if (!startId) App.setHash('');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitNames(layers.nodes.selectAll('g.node')));
  };
})();
