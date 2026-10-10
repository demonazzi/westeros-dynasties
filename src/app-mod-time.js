/* Хронология в духе TimeNets: линии жизни по годам, браки, линии к детям, правления, эпохи и срез по году. */
(function () {
  const App = window.App;
  const { byId, esc, state } = App;

  /* ——— Годы жизни: известные и оценённые ——— */
  const num = s => {
    const m = String(s == null ? '' : s).match(/-?\d+/g);
    if (!m) return null;
    const v = m.map(Number);
    return v.reduce((a, b) => a + b, 0) / v.length;
  };
  const idOf = r => (/^[a-z_0-9]+/.exec(r) || [''])[0];
  const LIFE = new Map();
  let estimated = false;
  function ensureLife() {
    if (estimated) return;
    estimated = true;
    estimate();
  }
  function estimate() {
    PEOPLE.forEach(p => {
      const b = num(p.b), d = num(p.d);
      const L = { b, d, be: b == null, de: d == null, alive: false, mar: null };
      // «в детстве», «в младенчестве» — умер, но год не назван: линия короткая, не «жив на 300 г.»
      if (d == null && /детств|младенч/.test(p.d || '')) L.young = /младенч/.test(p.d) ? 1 : 8;
      if (p.k === 'K' && p.r && /^\d/.test(p.r)) { const [ra, rb] = p.r.split('–').map(Number); L.ra = ra; L.rb = rb; }
      else if (p.rm && /с (\d+)/.test(p.rm)) { L.ra = +/с (\d+)/.exec(p.rm)[1]; L.rb = null; }
      (p.sp || []).forEach(([, note]) => { const m = /(\d+) г\./.exec(note || ''); if (m) L.mar = L.mar == null ? +m[1] : Math.min(L.mar, +m[1]); });
      LIFE.set(p.id, L);
    });
    const parentsOf = p => p.par.map(idOf).filter(id => byId.has(id));
    const kidsOf = p => PEOPLE.filter(q => q.p === p.id || q.par.some(r => idOf(r) === p.id));
    const spousesOf = p => (p.sp || []).map(s => s[0]).filter(id => byId.has(id)).concat(PEOPLE.filter(q => (q.sp || []).some(s => s[0] === p.id)).map(q => q.id));
    for (let pass = 0; pass < 8; pass++) {
      PEOPLE.forEach(p => {
        const L = LIFE.get(p.id);
        if (L.b != null) return;
        const kb = kidsOf(p).map(q => LIFE.get(q.id).b).filter(v => v != null);
        const pb = parentsOf(p).map(id => LIFE.get(id).b).filter(v => v != null);
        const sb = spousesOf(p).map(id => LIFE.get(id).b).filter(v => v != null);
        if (L.ra != null && pb.length) L.b = Math.min(L.ra - 16, Math.max(...pb) + 26);
        else if (kb.length) L.b = Math.min(...kb) - 26;
        else if (pb.length) L.b = Math.max(...pb) + 26;
        else if (sb.length) L.b = sb[0];
        else if (L.d != null) L.b = L.d - 45;
        else if (L.mar != null) L.b = L.mar - 20;
        else if (L.ra != null) L.b = L.ra - 25;
      });
    }
    // Остальных — по колонке поколения на древе
    const pairs = [];
    PEOPLE.forEach(p => { const L = LIFE.get(p.id); if (!L.be && App.genOf(p.id) != null) pairs.push([App.genOf(p.id), L.b]); });
    const genYear = g => {
      const near = pairs.filter(([x]) => Math.abs(x - g) <= 1).map(([, y]) => y);
      return near.length ? near.reduce((a, b) => a + b, 0) / near.length : -150 + g * 24;
    };
    PEOPLE.forEach(p => {
      const L = LIFE.get(p.id);
      if (L.b == null) L.b = genYear(App.genOf(p.id));
      if (p.pre && L.be) L.b = Math.min(L.b, -20);
      if (L.d == null && L.young) { L.d = L.b + L.young; L.de = true; }
      if (L.d == null) {
        const lastKid = Math.max(-Infinity, ...kidsOf(p).map(q => LIFE.get(q.id).b).filter(v => v != null));
        const floor = Math.max(L.b + 20, lastKid, L.rb || -Infinity, L.mar || -Infinity);
        if (L.b >= 228 && !p.pre) { L.d = 300; L.alive = true; L.de = false; }
        else L.d = Math.min(299, Math.max(floor, L.b + 55));
      }
      // оценка по цепочке родни может уехать за 300 г. — рождение не позже 299
      if (L.be && L.b > 299) L.b = 299;
      if (L.d < L.b) L.d = L.b + 1;
    });
    KINGS = PEOPLE.filter(p => p.k === 'K' && LIFE.get(p.id).ra != null).sort((a, b) => LIFE.get(a.id).ra - LIFE.get(b.id).ra);
  }
  let KINGS = [];
  App.life = id => { ensureLife(); return LIFE.get(id); };
  const aliveAt = (id, y) => { ensureLife(); const L = LIFE.get(id); return !!L && L.b <= y && y <= L.d; };
  App.aliveAt = aliveAt;

  /* ——— Эпохи ——— */
  /* События и эпохи. p — важность: при нехватке места на шкале подписи важных событий ставятся первыми.
     У войн from/to — дробные годы, чтобы полоса шла от начала до конца, одинаково на шкале и на вкладках:
     Танец драконов — от смерти Визериса I (начало 129 г.) до смерти Эйгона II (131 г.). */
  const ERAS = [
    { y: -114, name: 'Исход Эйнара', p: 1 },
    { y: -102, name: 'Рок Валирии', p: 3 },
    { y: -2, y2: 1, name: 'Завоевание', p: 3 },
    { y: 101, name: 'Великий совет', p: 2 },
    { y: 129, y2: 131, from: 129.2, to: 131.6, name: 'Танец драконов', band: 1, p: 3 },
    { y: 153, name: 'Умер последний дракон', p: 2 },
    { y: 157, y2: 161, from: 157, to: 161.5, name: 'Поход на Дорн', band: 1, p: 1 },
    { y: 187, name: 'Дорн в королевстве', p: 1 },
    { y: 196, name: '1-е восстание Блэкфайров', p: 2 },
    { y: 209, name: 'Великий весенний мор', p: 1 },
    { y: 233, name: 'Великий совет', p: 1 },
    { y: 259, name: 'Летний Замок', p: 2 },
    { y: 260, name: 'Война девятигрошовых королей', p: 1 },
    { y: 282, y2: 283, from: 282, to: 283.9, name: 'Восстание Роберта', band: 1, p: 3 },
    { y: 289, name: 'Восстание Грейджоя', p: 1 },
    { y: 298, y2: 300, from: 298.6, to: 300.9, name: 'Война пяти королей', band: 1, p: 3 }
  ];
  const eraSpan = e => e.band ? [e.from != null ? e.from : e.y, e.to != null ? e.to : e.y2 + 1] : [e.y, e.y];
  const eraAt = y => ERAS.find(e => e.y2 != null && y >= e.y && y <= e.y2 + 0.99);
  App.ERAS = ERAS;
  App.eraSpan = eraSpan;
  App.eraAt = eraAt;
  App.kings = () => { ensureLife(); return KINGS; };

  /* ——— Сцена ——— */
  const el = document.getElementById('time-svg');
  const tsvg = d3.select(el);
  const gz = tsvg.append('g');
  const tz = d3.zoom().scaleExtent([0.12, 3]).on('zoom', e => { gz.attr('transform', e.transform); if (App.redrawScale) App.redrawScale(); });
  tsvg.call(tz).on('dblclick.zoom', null);
  const X = d3.scaleLinear().domain([-180, -10, 302]).range([0, 440, 440 + 312 * 12]);
  const ROW = 30, BHEAD = 64, BGAP = 26, TOP = 30;
  let built = false, rows = new Map(), bandBoxes = [], width = 0, height = 0, builtKey = '';
  // фильтр «Полосы домов»: скрытые дома не попадают в хронологию, как и на древо
  const hiddenKey = () => [...(state.hiddenHouses || [])].sort().join(',');
  const LAB = 8;

  function layout() {
    ensureLife();
    let y = TOP;
    bandBoxes = [];
    rows = new Map();
    const hidden = state.hiddenHouses || new Set();
    (App.bandOrder ? App.bandOrder() : BANDS).filter(b => !hidden.has(b.house)).forEach(band => {
      const order = [];
      const walk = p => { order.push(p); p.kids.forEach(walk); };
      band.roots.forEach(([id]) => walk(byId.get(id)));
      const ends = [];
      const top = y + BHEAD;
      order.forEach(p => {
        const L = LIFE.get(p.id);
        const x0 = X(L.b), x1 = X(L.d);
        const lw = p.name.length * 6.8 + 14;
        const need = x0 - LAB;
        const ext = Math.max(x1 + (L.alive ? 18 : 6), x0 + lw) + 14;
        const pr = p.p && rows.has(p.p) && rows.get(p.p).band === band.house ? rows.get(p.p).row : -1;
        const cand = [];
        for (let i = pr + 1; i < ends.length; i++) cand.push(i);
        for (let i = Math.min(pr, ends.length - 1); i >= 0; i--) cand.push(i);
        let row = cand.find(i => ends[i] <= need);
        if (row == null) { row = ends.length; ends.push(-Infinity); }
        ends[row] = ext;
        rows.set(p.id, { row, band: band.house, y: top + row * ROW + ROW / 2, x0, x1, p, L });
      });
      const bottom = top + ends.length * ROW + 10;
      bandBoxes.push({ house: band.house, minor: !!band.liege, top: y, bottom });
      y = bottom + BGAP;
    });
    width = X(302) + 40; height = y + 40;
  }


  const L_ = {};
  function build() {
    builtKey = hiddenKey();
    gz.selectAll('*').remove();
    layout();
    ['bands', 'eras', 'mar', 'drops', 'lives', 'labels', 'slice'].forEach(k => { L_[k] = gz.append('g').attr('class', 'tl-' + k); });
    // Полосы домов
    bandBoxes.forEach(b => {
      const g = L_.bands.append('g').attr('class', 'h-' + b.house + (b.minor ? ' band-minor' : ''));
      g.append('rect').attr('class', 'band-bg').attr('x', 0).attr('y', b.top).attr('width', width).attr('height', b.bottom - b.top).attr('rx', 18);
      // Заголовок полосы с гербом и девизом — у левого края вида «К началу», на месте и не двигается
      const head = g.append('g').attr('class', 'band-head t-head').attr('transform', 'translate(' + (X(-30) + 6) + ',' + (b.top + 12) + ')');
      // у малого дома герб меньше
      const sw = b.minor ? 24 : 34, tx = sw + 10;
      head.html(App.sigilSVG ? App.sigilSVG(b.house, 0, b.minor ? 6 : 0, sw) : '');
      head.append('text').attr('class', 'band-title').attr('x', tx).attr('y', 30).text(HOUSES[b.house].band);
      const tw = App.textWidth ? App.textWidth('t-head band-title', HOUSES[b.house].band, 15) : HOUSES[b.house].band.length * 15;
      head.append('text').attr('class', 'band-motto').attr('x', tx + tw + 18).attr('y', 30).text(HOUSES[b.house].motto);
    });
    // Эпохи
    ERAS.forEach(e => {
      const [a, b] = eraSpan(e);
      if (e.band) {
        L_.eras.append('rect').attr('class', 'era-band').attr('x', X(a)).attr('y', TOP - 20).attr('width', X(b) - X(a)).attr('height', height - TOP);
        [a, b].forEach(v => L_.eras.append('line').attr('class', 'era-edge').attr('x1', X(v)).attr('x2', X(v)).attr('y1', TOP - 20).attr('y2', height - 20));
      } else L_.eras.append('line').attr('class', 'era-line').attr('x1', X(a)).attr('x2', X(a)).attr('y1', TOP - 20).attr('y2', height - 20);
    });
    // Браки
    const marriages = [];
    App.PAIRS.forEach(e => {
      if (e.type === 'rumor' || e.type === 'w') return;
      const a = rows.get(e.a), b = rows.get(e.b);
      if (!a || !b) return;
      let y = null;
      [[a.p, e.b], [b.p, e.a]].forEach(([p, other]) => (p.sp || []).forEach(([ref, note]) => { if (ref === other) { const m = /(\d+) г\./.exec(note || ''); if (m) y = +m[1]; } }));
      // год не назван — оценка: до первого общего ребёнка, иначе через 20 лет после рождения младшего
      // (помолвка — через 12); не раньше двенадцати лет младшего и не позже смерти любого из двоих
      if (y == null) {
        const kids = PEOPLE.filter(q => q.par.map(idOf).includes(e.a) && q.par.map(idOf).includes(e.b)).map(q => LIFE.get(q.id).b);
        const young = Math.max(a.L.b, b.L.b);
        y = kids.length ? Math.min(...kids) - 1 : young + (e.type === 'b' ? 12 : 20);
        y = Math.max(y, young + 12);
        y = Math.min(y, a.L.alive ? 300 : a.L.d, b.L.alive ? 300 : b.L.d);
      }
      marriages.push({ e, a, b, y, key: e.a + '|' + e.b, cross: a.band !== b.band });
    });
    const mg = L_.mar.selectAll('g.t-mar').data(marriages, d => d.key).join('g').attr('class', d => 't-mar t-' + d.e.type + (d.cross ? ' cross' : ''));
    mg.append('line').attr('x1', d => X(d.y)).attr('x2', d => X(d.y)).attr('y1', d => d.a.y).attr('y2', d => d.b.y);
    mg.append('circle').attr('cx', d => X(d.y)).attr('cy', d => d.a.y).attr('r', 3.6);
    mg.append('circle').attr('cx', d => X(d.y)).attr('cy', d => d.b.y).attr('r', 3.6);
    mg.append('title').text(d => (d.e.type === 'b' ? 'Помолвка: ' : d.e.type === 'l' ? 'Связь: ' : 'Брак: ') + d.a.p.full + ' и ' + d.b.p.full + (d.e.type === 'm' ? ' · около ' + Math.round(d.y) + ' г.' : ''));
    // Линии к детям: от родителя на древе к началу жизни ребёнка
    const drops = [];
    rows.forEach(r => {
      const parents = r.p.par.map(idOf).filter(id => rows.has(id));
      parents.forEach(pid => {
        const pr = rows.get(pid);
        if (r.L.b < pr.L.b) return;
        drops.push({ key: pid + '>' + r.p.id, pr, r, main: pid === r.p.p, cross: pr.band !== r.band });
      });
    });
    L_.drops.selectAll('path.t-drop').data(drops, d => d.key).join('path')
      .attr('class', d => 't-drop' + (d.main ? '' : ' second') + (d.cross ? ' cross' : '') + (d.r.p.unc ? ' unc' : ''))
      .attr('d', d => { const x = X(d.r.L.b); return 'M' + x + ',' + d.pr.y + ' V' + d.r.y; });
    L_.drops.selectAll('circle.t-birth').data(drops.filter(d => d.main), d => d.key).join('circle').attr('class', 't-birth').attr('cx', d => X(d.r.L.b)).attr('cy', d => d.pr.y).attr('r', 2.4);
    // Линии жизни
    const lives = L_.lives.selectAll('g.life').data([...rows.values()], d => d.p.id).join('g')
      .attr('class', d => 'life h-' + d.p.house + ' st-' + d.p.k)
      .attr('data-id', d => d.p.id).attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', d => d.p.full + ', ' + App.kindLabel(d.p) + ', ' + Math.round(d.L.b) + '–' + (d.L.alive ? 'жив на 300 г.' : Math.round(d.L.d)));
    lives.append('line').attr('class', 'hit').attr('x1', d => d.x0).attr('x2', d => Math.max(d.x1, d.x0 + 30)).attr('y1', d => d.y).attr('y2', d => d.y);
    lives.each(function (d) {
      const g = d3.select(this);
      const est = 22;
      if (d.L.be) g.append('line').attr('class', 'lf est').attr('x1', d.x0).attr('x2', Math.min(d.x1, d.x0 + est)).attr('y1', d.y).attr('y2', d.y);
      const s0 = d.L.be ? Math.min(d.x1, d.x0 + est) : d.x0;
      const s1 = d.L.de && !d.L.alive ? Math.max(s0, d.x1 - est) : d.x1;
      if (s1 > s0) g.append('line').attr('class', 'lf').attr('x1', s0).attr('x2', s1).attr('y1', d.y).attr('y2', d.y);
      if (d.L.de && !d.L.alive) g.append('line').attr('class', 'lf est').attr('x1', s1).attr('x2', d.x1).attr('y1', d.y).attr('y2', d.y);
      if (d.L.alive) g.append('path').attr('class', 'lf-arrow').attr('d', 'M' + (d.x1 + 2) + ',' + (d.y - 5) + ' L' + (d.x1 + 10) + ',' + d.y + ' L' + (d.x1 + 2) + ',' + (d.y + 5) + ' Z');
      if (d.L.ra != null) {
        const r1 = X(d.L.rb != null ? d.L.rb : 300);
        g.append('line').attr('class', 'reign').attr('x1', X(d.L.ra)).attr('x2', Math.max(r1, X(d.L.ra) + 3)).attr('y1', d.y).attr('y2', d.y);
        if (d.p.n) {
          const bg = g.append('g').attr('class', 'badge').attr('transform', 'translate(' + X(d.L.ra) + ',' + d.y + ')');
          bg.append('circle').attr('r', 8);
          bg.append('text').attr('y', 0.5).text(d.p.n);
        }
      }
      if (d.p.d) g.append('circle').attr('class', 'lf-end').attr('cx', d.x1).attr('cy', d.y).attr('r', 2.6);
      g.append('text').attr('class', 'lf-name').attr('x', d.x0).attr('y', d.y - 7).text(d.p.name);
      g.append('title').text(d.p.full + ' · ' + (d.L.be ? '≈' : '') + Math.round(d.L.b) + '–' + (d.L.alive ? 'жив на 300 г.' : (d.L.de ? '≈' : '') + Math.round(d.L.d)) + (d.L.be || d.L.de ? ' (годы со знаком ≈ оценены по родственникам)' : ''));
    });
    lives.on('click', (e, d) => App.select(d.p.id));
    lives.on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); App.select(d.p.id); } });
    // Срез по году
    L_.slice.append('line').attr('class', 't-slice').attr('y1', TOP - 20).attr('y2', height - 20).attr('display', 'none');
    decorateTime();
  }

  /* Подсветка: выбранный, его родня, срез по году. */
  function relatives(id) {
    const p = byId.get(id); if (!p) return new Set();
    const s = new Set([id]);
    p.par.map(idOf).forEach(x => byId.has(x) && s.add(x));
    PEOPLE.forEach(q => {
      if (q.p === id || q.par.map(idOf).includes(id)) s.add(q.id);
      if ((q.sp || []).some(x => x[0] === id)) s.add(q.id);
    });
    (p.sp || []).forEach(x => byId.has(x[0]) && s.add(x[0]));
    return s;
  }
  function decorateTime() {
    if (!built) return;
    const sel = state.selected;
    const rel = sel ? relatives(sel) : null;
    const dimmers = App.hooks.decorate.map(f => f()).filter(Boolean);
    const yearDim = state.year != null ? id => !aliveAt(id, state.year) : null;
    const dimmed = id => dimmers.some(fn => fn(id)) || (yearDim && yearDim(id));
    gz.selectAll('g.life')
      .classed('selected', d => d.p.id === sel)
      .classed('rel', d => !!rel && rel.has(d.p.id) && d.p.id !== sel)
      .classed('far', d => !!rel && !rel.has(d.p.id))
      .classed('dim', d => dimmed(d.p.id))
      .attr('data-faction', d => (App.lens && App.lens.cls && App.lens.cls.get(d.p.id)) || null)
      .attr('aria-pressed', d => d.p.id === sel ? 'true' : 'false');
    gz.selectAll('g.t-mar').classed('hot', d => d.e.a === sel || d.e.b === sel).classed('dim', d => dimmed(d.e.a) && dimmed(d.e.b));
    gz.selectAll('path.t-drop').classed('hot', d => !!sel && (d.r.p.id === sel || d.pr.p.id === sel)).classed('dim', d => dimmed(d.r.p.id));
    gz.select('line.t-slice').attr('display', state.year != null ? null : 'none').attr('x1', X(state.year || 0)).attr('x2', X(state.year || 0));
  }
  App.hooks.select.push(() => decorateTime());
  App.hooks.lens.push(() => decorateTime());
  (App.hooks.houses = App.hooks.houses || []).push(() => { if (built && state.view === 'time' && builtKey !== hiddenKey()) { build(); decorateTime(); fitTime(false); } });
  const coreDecorate = App.decorate;
  App.decorate = () => { coreDecorate(); decorateTime(); };

  function centerLife(id, k) {
    const r = rows.get(id); if (!r) return;
    const box = el.getBoundingClientRect();
    k = k || Math.max(0.6, d3.zoomTransform(el).k);
    const cx = Math.min(r.x1, r.x0 + 220);
    const t = d3.zoomIdentity.translate(box.width * 0.35 - k * r.x0, box.height / 2 + 20 - k * r.y).scale(k);
    if (App.reduced) tsvg.call(tz.transform, t); else tsvg.transition().duration(App.dur).call(tz.transform, t);
    return cx;
  }
  function fitTime(animate) {
    const box = el.getBoundingClientRect();
    const k = box.width < 700 ? 0.45 : 0.7;
    const target = state.selected && rows.has(state.selected) ? rows.get(state.selected) : null;
    if (target) { centerLife(state.selected, k); return; }
    const t = d3.zoomIdentity.translate(20 - k * X(-30), 52).scale(k);
    if (animate && !App.reduced) tsvg.transition().duration(App.dur).call(tz.transform, t); else tsvg.call(tz.transform, t);
  }

  App.registerView('time', {
    el, sel: tsvg, tab: document.getElementById('tab-time'), legend: document.getElementById('time-legend'),
    persons: true, links: false, fitLabel: 'К началу',
    hint: 'Слева направо — годы. Линия — жизнь человека; вертикали — браки и рождение детей; пунктир — годы оценены.',
    scale: 'sync',
    scaleGo: y => {
      const t = d3.zoomTransform(el), w = el.getBoundingClientRect().width || 1000;
      const nt = d3.zoomIdentity.translate(w / 2 - t.k * X(y), t.y).scale(t.k);
      if (App.reduced) tsvg.call(tz.transform, nt); else tsvg.transition().duration(App.dur).call(tz.transform, nt);
    },
    scaleMap: () => { const t = d3.zoomTransform(el); return { x: y => t.applyX(X(y)), inv: px => X.invert(t.invertX(px)), k: t.k, dom: X.domain() }; },
    zoomBy: k => tsvg.transition().duration(App.reduced ? 0 : 250).call(tz.scaleBy, k),
    fit: () => fitTime(true),
    center: id => centerLife(id),
    fitIds: ids => {
      if (!built) return;
      const rs = ids.map(id => rows.get(id)).filter(Boolean);
      if (!rs.length) return;
      const x0 = Math.min(...rs.map(r => r.x0)) - 40, x1 = Math.max(...rs.map(r => r.x1)) + 60;
      const y0 = Math.min(...rs.map(r => r.y)) - 40, y1 = Math.max(...rs.map(r => r.y)) + 40;
      const box = el.getBoundingClientRect();
      const k = Math.max(0.12, Math.min(1.2, box.width / (x1 - x0), box.height / (y1 - y0)));
      const tr = d3.zoomIdentity.translate(box.width / 2 - k * (x0 + x1) / 2, box.height / 2 - k * (y0 + y1) / 2).scale(k);
      if (App.reduced) tsvg.call(tz.transform, tr); else tsvg.transition().duration(App.dur).call(tz.transform, tr);
    },
    onShow: () => {
      if (!built) { build(); built = true; decorateTime(); fitTime(false); }
      else if (builtKey !== hiddenKey()) { build(); decorateTime(); fitTime(false); }
      else decorateTime();
    },
    hash: () => 't:' + (state.selected || '')
  });
  const startHashPrev = App.startHash;
  App.startHash = h => {
    if (h === 't:' || h.startsWith('t:')) {
      App.render();
      const id = h.slice(2);
      if (byId.has(id)) { state.selected = id; }
      App.setView('time');
      return true;
    }
    return startHashPrev ? startHashPrev(h) : false;
  };

  /* ——— Срез по году: ползунок живёт на общей шкале (app-mod-timescale.js) ——— */
  state.year = null;
  App.hooks.decorate.push(() => state.year != null ? id => !aliveAt(id, state.year) : null);
  App.yearText = y => {
    ensureLife();
    const alive = PEOPLE.filter(p => aliveAt(p.id, y) && !p.group).length;
    const king = KINGS.find(p => { const L = LIFE.get(p.id); return L.ra <= y && y < (L.rb != null ? L.rb : 301); });
    const era = eraAt(y);
    return { year: y < 0 ? -y + ' г. до З.' : y + ' г.', alive, king: king ? king.name : '', era: era ? era.name : '' };
  };

  App.smokeTime = () => {
    App.setView('time');
    const out = { lives: document.querySelectorAll('#time-svg g.life').length, marriages: document.querySelectorAll('#time-svg g.t-mar').length, drops: document.querySelectorAll('#time-svg path.t-drop').length };
    const g = document.querySelector('#time-svg g.life[data-id="viserys1"]');
    if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    out.timePanel = (document.querySelector('#panel h2') || {}).textContent;
    out.rel = document.querySelectorAll('#time-svg g.life.rel').length;
    App.setYear(129);
    out.yearText = (document.getElementById('yearchip-text') || {}).textContent;
    out.dimTime = document.querySelectorAll('#time-svg g.life.dim').length;
    App.setYear(null);
    App.setView('people');
    return out;
  };
})();
