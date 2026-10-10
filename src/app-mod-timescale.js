/* Шкала времени над вкладками «Древо», «Драконы», «Хронология» и «Список»: годы, правления, события.
   В хронологии и у драконов шкала движется вместе с содержимым, на древе и в списке показывает всю историю целиком.
   — рамка на шкале: годы рождения тех, кто сейчас на экране (древо, список);
   — цветная полоса с подписью: годы жизни того, кто открыт в карточке;
   — на древе под шкалой — годы рождения для каждой колонки-поколения;
   — клик по шкале переносит к этим годам; кнопка «Срез по году» включает ползунок. */
(function () {
  const App = window.App;
  const { byId, esc, state } = App;
  const canvas = document.getElementById('canvas');
  const box = document.getElementById('scale');
  const svgEl = document.getElementById('scale-svg');
  const ssvg = d3.select(svgEl);
  const chip = document.getElementById('yearchip');
  const chipText = document.getElementById('yearchip-text');
  const yearBtn = document.getElementById('year-btn');
  const YMIN = -180, YMAX = 300, PAD = 18;
  const FREE = d3.scaleLinear().domain([YMIN, 0, 302]);
  const raf = window.requestAnimationFrame ? f => window.requestAnimationFrame(f) : f => setTimeout(f, 16);
  let pending = false, dragging = false, ghostX = null, hoverCol = null, last = null;

  const view = () => App.views[state.view] || {};
  // у вида может быть свой год (вкладка «Вассалитет»): тогда ползунок всегда на шкале и не трогает срез по году на древе
  const own = () => view().ownYear || null;
  const lum = hex => {
    const v = String(hex).replace('#', '').match(/../g);
    if (!v || v.length < 3) return 0.5;
    const c = v.slice(0, 3).map(x => parseInt(x, 16) / 255).map(q => q <= 0.03928 ? q / 12.92 : Math.pow((q + 0.055) / 1.055, 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const baseH = () => App.isNarrow() ? 50 : 68;
  const gensH = () => view().gens ? (App.isNarrow() ? 20 : 24) : 0;
  // ряд отметок под шкалой (во вкладке «Вассалитет» — события)
  const marksH = () => view().scaleMarks && !App.isNarrow() ? 16 : 0;
  function mapping() {
    const w = box.clientWidth || svgEl.getBoundingClientRect().width || 1000;
    const v = view();
    if (v.scale === 'sync' && v.scaleMap) return Object.assign({ w }, v.scaleMap());
    FREE.range([PAD, PAD + (w - 2 * PAD) * 0.2, w - PAD]);
    return { w, x: y => FREE(y), inv: px => FREE.invert(px), dom: FREE.domain() };
  }
  const label = y => y < 0 ? -y + ' до З.' : (y === 0 ? '1' : String(y));
  const yearWord = y => y < 0 ? -y + ' г. до З.' : y + ' г.';
  const range = (a, b) => a === b ? (a < 0 ? -a + ' до З.' : String(a)) : a < 0 && b < 0 ? (-a) + '–' + (-b) + ' до З.' : a < 0 ? (-a) + ' до З.–' + b : a + '–' + b;
  const clampY = y => Math.max(YMIN, Math.min(YMAX, Math.round(y)));
  const quant = (arr, q) => arr[Math.max(0, Math.min(arr.length - 1, Math.round(q * (arr.length - 1))))];

  /* Годы жизни того, кто сейчас открыт в карточке. */
  function subject() {
    if (own()) return null;
    if (state.view === 'dragons') {
      const d = state.dragon && App.DR ? App.DR.get(state.dragon) : null;
      if (!d) return null;
      const L = lum(d.col[0]);
      return { a: d.h - (d.ha ? 3 : 0), b: d.alive ? 300 : (d.dx || d.end), name: d.name, color: d.col[0], ink: L > 0.4 ? '#1E1B20' : '#FFFFFF', tint: L > 0.5 ? 0.5 : 1, alive: d.alive };
    }
    const p = state.selected && byId.get(state.selected);
    if (!p || !App.life) return null;
    const L = App.life(p.id);
    return L ? { a: L.b, b: L.alive ? 300 : L.d, name: p.name, house: p.house, est: L.be || L.de, alive: L.alive } : null;
  }

  /* Древо: годы рождения по колонкам-поколениям (10–90 % людей колонки) и те, кто сейчас на экране. */
  function treeCols() {
    const cols = new Map();
    App.allNodes().forEach(n => { if (!cols.has(n.gen)) cols.set(n.gen, []); cols.get(n.gen).push(App.life(n.data.id).b); });
    const out = [];
    cols.forEach((ys, g) => { ys.sort((a, b) => a - b); out.push({ g, lo: Math.round(quant(ys, 0.1)), hi: Math.round(quant(ys, 0.9)), mid: quant(ys, 0.5), n: ys.length }); });
    return out.sort((a, b) => a.g - b.g);
  }
  /* Рамка на древе: годы жизни тех, чьи карточки сейчас видны на экране, — от самого раннего рождения до самой поздней смерти (живые — до 300 г.). */
  function treeWindow() {
    const svgNode = App.svg.node();
    const vs = App.viewSize(), r = { width: vs.w, height: vs.h };
    if (!r.width) return null;
    const t = d3.zoomTransform(svgNode);
    let a = Infinity, b = -Infinity;
    App.allNodes().forEach(n => {
      const x0 = t.applyX(n.X), x1 = t.applyX(n.X + App.W), sy = t.applyY(n.Y);
      const vis = Math.min(x1, r.width) - Math.max(x0, 0);
      if (vis < (x1 - x0) * 0.35 || sy < 0 || sy > r.height) return;
      const L = App.life(n.data.id);
      const end = L.alive ? 300 : L.d;
      if (L.b < a) a = L.b;
      if (end > b) b = end;
    });
    return a <= b ? [Math.round(a), Math.round(b)] : null;
  }
  function windowYears() {
    const v = view();
    if (state.view === 'people') return treeWindow();
    return v.scaleWindow ? v.scaleWindow() : null;
  }
  function goToYear(y) {
    const v = view();
    if (state.view === 'people') {
      const cols = treeCols();
      if (!cols.length) return;
      const c = cols.reduce((best, x) => Math.abs(x.mid - y) < Math.abs(best.mid - y) ? x : best);
      const svgNode = App.svg.node(), t = d3.zoomTransform(svgNode);
      const w = svgNode.getBoundingClientRect().width || 1000;
      const nt = d3.zoomIdentity.translate(w / 2 - t.k * (App.colX(c.g) + App.W / 2), t.y).scale(t.k);
      if (App.reduced) App.svg.call(App.zoom.transform, nt); else App.svg.transition().duration(App.dur).call(App.zoom.transform, nt);
    } else if (v.scaleGo) v.scaleGo(y);
  }

  function draw() {
    pending = false;
    const v = view();
    const on = !!v.scale;
    canvas.classList.toggle('has-scale', on);
    canvas.classList.toggle('has-gens', !!v.gens);
    canvas.classList.toggle('has-marks', !!marksH());
    box.hidden = !on;
    yearBtn.hidden = !on || !!own() || state.year != null;
    if (!on) return;
    const m = last = mapping();
    const H = baseH(), GH = gensH(), MH = marksH(), HT = H + GH + MH, narrow = App.isNarrow();
    const R0 = narrow ? 21 : 23, RH = narrow ? 16 : 17, E0 = R0 + RH + 4;
    ssvg.attr('width', m.w).attr('height', HT).attr('viewBox', '0 0 ' + m.w + ' ' + HT);
    ssvg.selectAll('*').remove();
    const inView = (a, b) => b >= -40 && a <= m.w + 40;
    const pat = ssvg.append('defs').append('pattern').attr('id', 'ts-hatch').attr('width', 6).attr('height', 6).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
    pat.append('rect').attr('class', 'hatch-bg').attr('width', 6).attr('height', 6);
    pat.append('line').attr('class', 'hatch-line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6);
    ssvg.append('rect').attr('class', 'ts-bg').attr('width', m.w).attr('height', H);

    // Годы жизни выбранного (полоса и подпись)
    const s = subject();
    let subLabel = null;
    if (s) {
      const a = m.x(s.a), b = Math.max(m.x(s.b), a + 3);
      if (inView(a, b)) {
        const g = ssvg.append('g').attr('class', 'ts-sub' + (s.house ? ' h-' + s.house : ''));
        if (s.color) g.style('--hc', s.color).style('--ht', s.color).style('--sub-k', s.tint);
        g.append('rect').attr('class', 'ts-sub-bg').attr('x', a).attr('y', 0).attr('width', b - a).attr('height', H);
        g.append('rect').attr('class', 'ts-sub-bar').attr('x', a).attr('y', H - 5).attr('width', b - a).attr('height', 5);
        g.append('line').attr('class', 'ts-sub-edge').attr('x1', a).attr('x2', a).attr('y1', 0).attr('y2', H);
        g.append('line').attr('class', 'ts-sub-edge').attr('x1', b).attr('x2', b).attr('y1', 0).attr('y2', H);
        const tip = s.name + ': ' + (s.est ? '≈ ' : '') + yearWord(Math.round(s.a)) + ' — ' + (s.alive ? 'жив на конец книг' : yearWord(Math.round(s.b)));
        g.append('title').text(tip + ' (годы жизни выбранного)');
        subLabel = { a, b, s, text: s.name + ' · ' + (s.est ? '≈ ' : '') + range(Math.round(s.a), Math.round(s.b)) + (s.alive ? ' и дальше' : '') };
      }
    }

    // Рамка обзора: кто сейчас на экране
    const win = windowYears();
    if (win) {
      const a = m.x(win[0]), b = Math.max(m.x(win[1]), a + 6);
      if (inView(a, b)) {
        const g = ssvg.append('g').attr('class', 'ts-win');
        g.append('rect').attr('x', a - 3).attr('y', 1.5).attr('width', b - a + 6).attr('height', H - 3).attr('rx', 5);
        g.append('title').text('Годы жизни тех, кто сейчас на экране: ' + range(win[0], win[1]));
      }
    }

    // Сжатые промежутки (у драконов: годы без драконов) — на шкале это заштрихованный разрыв
    const gaps = (v.scale === 'sync' && v.scaleGaps ? v.scaleGaps() : []).map(([g0, g1, pad, text]) => {
      const k = m.k || 1;
      return { x0: m.x(g0) + pad * k, x1: m.x(g1) - pad * k, text, g0, g1 };
    }).filter(g => g.x1 > g.x0 && inView(g.x0, g.x1));
    const inGap = (x, pad) => gaps.some(g => x > g.x0 - (pad || 6) && x < g.x1 + (pad || 6));
    const taken = [];

    // Деления: шкала бывает сжата или растянута по участкам (до Завоевания, Танец драконов, годы без драконов),
    // поэтому шаг подбирается для каждого участка свой — круглый (1, 5, 10, 25, 50, 100 лет) и ровный внутри участка
    const rank = y => y === 1 ? 5 : y % 100 === 0 ? 6 : y % 50 === 0 ? 5 : y % 25 === 0 ? 4 : y % 10 === 0 ? 3 : y % 5 === 0 ? 2 : 1;
    const dom = (m.dom || [YMIN, 0, 302]).slice().sort((a, b) => a - b);
    const cand = new Set();
    for (let i = 0; i < dom.length - 1; i++) {
      const d0 = Math.max(dom[i], YMIN), d1 = Math.min(dom[i + 1], 300);
      if (d1 <= d0) continue;
      const ppy = Math.abs(m.x(d1) - m.x(d0)) / (d1 - d0);
      const st = [1, 5, 10, 25, 50, 100].find(v2 => v2 * ppy >= 58) || 100;
      for (let y = Math.ceil(d0 / st) * st; y <= d1; y += st) cand.add(y === 0 ? 1 : y);
      if (d0 <= 1 && d1 >= 1) cand.add(1);
    }
    const order = [...cand].sort((a, b) => rank(b) - rank(a) || a - b);
    const placed = [];
    const tg = ssvg.append('g').attr('class', 'ts-ticks');
    order.forEach(y => {
      const x = m.x(y), half = y < 0 ? 30 : 14;
      if (x < half || x > m.w - half || inGap(x, half + 4)) return;
      if (placed.some(px => Math.abs(px - x) < (y < 0 ? 66 : 50))) return;
      placed.push(x);
      tg.append('line').attr('x1', x).attr('x2', x).attr('y1', 16).attr('y2', R0 - 2);
      tg.append('text').attr('x', x).attr('y', 12).text(label(y));
    });

    // Правления
    const rg = ssvg.append('g').attr('class', 'ts-reigns');
    const hatch = (x0, x1, cls, text, tip) => {
      x0 = Math.max(x0, -2); x1 = Math.min(x1, m.w + 2);
      if (x1 - x0 < 3) return;
      const g = rg.append('g').attr('class', 'ts-hatch ' + cls);
      g.append('rect').attr('x', x0).attr('y', R0).attr('width', x1 - x0).attr('height', RH).attr('rx', 3);
      const words = text.filter(t => t.length * 6.4 + 14 < x1 - x0);
      if (words.length) g.append('text').attr('x', x0 + 7).attr('y', R0 + RH / 2 + 0.5).text(words[0]);
      g.append('title').text(tip);
    };
    hatch(0, m.x(1) - 1, 'pre', ['до Завоевания: владыки Драконьего Камня', 'владыки Драконьего Камня', 'до Завоевания'], 'До Завоевания королей не было: Таргариены правили Драконьим Камнем');
    (App.kings ? App.kings() : []).forEach(p => {
      const L = App.life(p.id);
      const a = m.x(L.ra), b = L.rb != null ? m.x(L.rb) : Math.max(m.x(300), a + 10);
      if (!inView(a, b)) return;
      const g = rg.append('g').attr('class', 't-reign h-' + p.house + (p.id === state.selected ? ' on' : '')).attr('data-id', p.id)
        .attr('data-tip', p.name + ' · ' + (p.r || p.rm)).attr('data-cx', (a + b) / 2);
      g.append('rect').attr('class', 'rhit').attr('x', a - 1).attr('y', R0 - 4).attr('width', Math.max(6, b - a + 1)).attr('height', RH + 8);
      g.append('rect').attr('class', 'rb').attr('x', a).attr('y', R0).attr('width', Math.max(2, b - a - 1)).attr('height', RH).attr('rx', 3);
      const w = b - a;
      const t = p.n ? (w > 96 ? p.n + ' · ' + p.name : w > 20 ? String(p.n) : '') : (w > 64 ? p.name : '');
      if (t) g.append('text').attr('x', a + 5).attr('y', R0 + RH / 2 + 0.5).text(t);
      g.append('title').text(p.full + ' · правил' + (p.sex === 'f' ? 'а ' : ' ') + (p.r || p.rm) + ' · нажмите — открыть карточку');
    });
    hatch(m.x(300) + 10, m.w, 'post', ['после книг — неизвестно', 'неизвестно', '?'], 'Дальше книги не дошли: что было после 300 г., неизвестно');
    gaps.forEach(gp => {
      const g = ssvg.append('g').attr('class', 'ts-gap');
      g.append('rect').attr('x', gp.x0).attr('y', 0).attr('width', gp.x1 - gp.x0).attr('height', H);
      if (gp.x1 - gp.x0 > 90) g.append('text').attr('x', (gp.x0 + gp.x1) / 2).attr('y', R0 + RH / 2 + 0.5).text(gp.x1 - gp.x0 > 160 ? gp.text : '≈ 145 лет');
      g.append('title').text(gp.text + ': ' + gp.g0 + '–' + gp.g1 + ' г. — здесь шкала сжата');
      taken.push([gp.x0, gp.x1]);
    });

    // Подпись выбранного — в нижнем ряду, раньше событий, чтобы они её не закрывали
    let subNode = null;
    if (subLabel) {
      const tx = Math.max(4, Math.min(subLabel.a + 2, m.w - 200));
      const lg = ssvg.append('g').attr('class', 'ts-sub-label' + (subLabel.s.house ? ' h-' + subLabel.s.house : '')).attr('transform', 'translate(' + tx + ',' + (H - 19) + ')');
      if (subLabel.s.color) lg.style('--hc', subLabel.s.color).style('--sub-ink', subLabel.s.ink);
      lg.append('title').text('Годы жизни того, кто открыт в карточке · нажмите — показать');
      subNode = lg.node();
      const t = lg.append('text').attr('x', 6).attr('y', 11).text(subLabel.text);
      const tw = App.textWidth('ts-sub-label text', subLabel.text, 6.6);
      lg.insert('rect', 'text').attr('width', tw + 12).attr('height', 15).attr('rx', 7.5);
      taken.push([tx, tx + tw + 12]);
    }

    // События и эпохи: полосы войн и отметки событий — с теми же границами, что на вкладках; подписи — по важности
    if (!narrow) {
      const eg = ssvg.append('g').attr('class', 'ts-eras');
      const marks = eg.append('g'), texts = eg.append('g');
      const spanOf = e => App.eraSpan ? App.eraSpan(e) : [e.y, e.y2 != null ? e.y2 + 1 : e.y];
      const list = (App.ERAS || []).map(e => { const [y0e, y1e] = spanOf(e); return { e, a: m.x(y0e), b: m.x(y1e) }; })
        .filter(o => inView(o.a, o.b) && !inGap(o.a) && !(o.e.band && inGap(o.b)));
      const boxes = taken.slice();
      const order = list.slice().sort((p1, p2) => (p2.e.p || 1) - (p1.e.p || 1) || p1.a - p2.a);
      order.forEach(o => {
        const x = o.a + 4;
        if (x > m.w - 30) return;
        const t = texts.append('text').attr('x', x).attr('y', H - 10).text(o.e.name);
        const tw = App.textWidth('ts-eras text', o.e.name, 7.6);
        if (x + tw > m.w - 4 || boxes.some(([p1, q1]) => x < q1 + 8 && x + tw > p1 - 8)) { t.remove(); return; }
        o.labeled = true;
        boxes.push([x, x + tw]);
        t.append('title').text(tipOf(o.e));
      });
      list.forEach(o => {
        const g = marks.append('g').attr('class', 'ts-era' + (o.e.band ? ' band' : '') + (o.labeled ? ' on' : ''));
        if (o.e.band) {
          g.append('rect').attr('class', 'era-band').attr('x', o.a).attr('y', E0).attr('width', Math.max(3, o.b - o.a)).attr('height', H - E0 - 6);
          [o.a, o.b].forEach(x => g.append('line').attr('class', 'era-edge').attr('x1', x).attr('x2', x).attr('y1', E0).attr('y2', H - 6));
        } else g.append('line').attr('class', 'era-line').attr('x1', o.a).attr('x2', o.a).attr('y1', o.labeled ? E0 : H - 12).attr('y2', H - 6);
        g.append('title').text(tipOf(o.e));
      });
      if (subNode) ssvg.node().appendChild(subNode);
    }

    // Отметки вида (во вкладке «Вассалитет» — события): ромбики в своём ряду под шкалой, нажатие — к событию
    if (MH) {
      const mg = ssvg.append('g').attr('class', 'ts-marks').attr('transform', 'translate(0,' + (H + GH) + ')');
      mg.append('rect').attr('class', 'ts-marks-bg').attr('width', m.w).attr('height', MH);
      const on = v.scaleMarkOn ? v.scaleMarkOn() : null;
      v.scaleMarks().forEach(mk => {
        const x = m.x(mk.t);
        if (x < -4 || x > m.w + 4) return;
        const g = mg.append('g').attr('class', 'ts-mark' + (on != null && Math.abs(on - mk.t) < 1e-6 ? ' on' : '')).attr('data-t', mk.t).attr('transform', 'translate(' + x.toFixed(1) + ',' + (MH / 2) + ')');
        g.append('rect').attr('class', 'ts-mark-hit').attr('x', -4).attr('y', -MH / 2).attr('width', 8).attr('height', MH);
        g.append('path').attr('d', 'M0,-4.5 L3.6,0 L0,4.5 L-3.6,0 Z');
        g.append('title').text(mk.label);
      });
      // нынешнее — поверх соседей
      mg.selectAll('.ts-mark.on').raise();
    }

    // Под шкалой на древе: годы рождения каждой колонки
    if (GH) drawGens(m, H, GH);

    // Срез по году
    const sy = own() ? own().get() : state.year;
    if (sy != null) {
      const x = m.x(sy);
      const g = ssvg.append('g').attr('class', 'ts-slice');
      g.append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', H);
      pill(g, x, own() ? own().label(sy) : label(sy), 'ts-pill handle');
    }
    // Подсказка под курсором
    ssvg.append('g').attr('class', 'ts-colspan');
    ssvg.append('g').attr('class', 'ts-ghost').attr('display', 'none');
    if (ghostX != null && !dragging) showGhost(ghostX);
    if (hoverCol) showColSpan(hoverCol);

    svgEl.setAttribute('aria-valuenow', String(sy != null ? Math.round(sy) : 129));
    svgEl.setAttribute('aria-valuetext', own() ? 'Год: ' + own().label(sy) : state.year != null ? 'Срез: ' + yearWord(state.year) : 'Срез по году выключен');
  }

  function drawGens(m, H, GH) {
    const g = ssvg.append('g').attr('class', 'ts-gens').attr('transform', 'translate(0,' + H + ')');
    g.append('rect').attr('class', 'ts-gens-bg').attr('width', m.w).attr('height', GH);
    const t = d3.zoomTransform(App.svg.node());
    let end = 58;
    treeCols().forEach(c => {
      const cx = t.applyX(App.colX(c.g) + App.W / 2);
      const cardL = t.applyX(App.colX(c.g)), cardR = t.applyX(App.colX(c.g) + App.W);
      if (cardR < 20 || cardL > m.w - 20) return;
      const text = '≈ ' + range(c.lo, c.hi);
      const lg = g.append('g').attr('class', 'ts-gen');
      const tx = lg.append('text').attr('y', 0.5).text(text);
      const tw = App.textWidth('ts-gen text', text, 6.2);
      // у краёв подпись прижимается к видимой части колонки
      const visL = Math.max(cardL, 62);
      let px = cx;
      if (px - tw / 2 < visL + 4) px = visL + 4 + tw / 2;
      if (px + tw / 2 > m.w - 4) px = m.w - 4 - tw / 2;
      if (px - tw / 2 - 6 < end || px + tw / 2 > m.w - 4) { lg.remove(); return; }
      lg.attr('transform', 'translate(' + px + ',' + (GH / 2) + ')');
      lg.insert('rect', 'text').attr('x', -tw / 2 - 7).attr('y', -GH / 2 + 3).attr('width', tw + 14).attr('height', GH - 6).attr('rx', (GH - 6) / 2);
      lg.append('title').text('Колонка древа: здесь родились ≈ ' + range(c.lo, c.hi) + ' (' + App.plural(c.n, 'человек', 'человека', 'человек') + '). Наведите — годы подсветятся на шкале');
      lg.on('mouseenter', () => { hoverCol = c; showColSpan(c); }).on('mouseleave', () => { hoverCol = null; ssvg.select('g.ts-colspan').selectAll('*').remove(); });
      end = px + tw / 2 + 8;
    });
    const cap = g.append('g').attr('class', 'ts-gens-cap');
    cap.append('rect').attr('width', 56).attr('height', GH);
    cap.append('text').attr('x', 10).attr('y', GH / 2 + 0.5).text('рожд.');
    cap.append('title').text('Годы рождения людей в каждой колонке древа');
  }
  function showColSpan(c) {
    const m = last || mapping();
    const g = ssvg.select('g.ts-colspan');
    if (g.empty()) return;
    g.selectAll('*').remove();
    const a = m.x(c.lo), b = Math.max(m.x(c.hi), a + 4);
    g.append('rect').attr('x', a).attr('y', 1).attr('width', b - a).attr('height', baseH() - 2).attr('rx', 4);
  }
  const tipOf = e => e.name + ' · ' + (e.y2 != null ? label(e.y) + '–' + label(e.y2) : yearWord(e.y));
  function pill(g, x, text, cls, width) {
    const w = width || text.length * 7 + 14;
    const gg = g.append('g').attr('class', cls).attr('transform', 'translate(' + x + ',0)');
    gg.append('rect').attr('x', -w / 2).attr('y', 1).attr('width', w).attr('height', 17).attr('rx', 8.5);
    gg.append('text').attr('y', 13).text(text);
  }
  function showGhost(px) {
    const m = last || mapping();
    const y = Math.round(m.inv(px));
    const g = ssvg.select('g.ts-ghost');
    if (g.empty()) return;
    g.selectAll('*').remove();
    if (y < YMIN || y > YMAX) { g.attr('display', 'none'); return; }
    g.attr('display', null);
    const x = m.x(y);
    g.append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', baseH());
    pill(g, x, own() ? own().label(m.inv(px)) : (state.year != null ? '' : '→ ') + label(y), 'ts-pill ghost');
  }
  function redraw() { if (pending) return; pending = true; raf(draw); }
  App.redrawScale = redraw;

  /* ——— Срез по году ——— */
  function updateChip() {
    const y = state.year;
    chip.hidden = y == null || !!own();
    yearBtn.hidden = y != null || !view().scale || !!own();
    yearBtn.setAttribute('aria-pressed', String(y != null));
    if (y == null) return;
    const t = App.yearText ? App.yearText(y) : { year: yearWord(y), alive: 0, king: '', era: '' };
    chipText.innerHTML = '<b>' + esc(t.year) + '</b><span>живых: ' + t.alive + '</span>' +
      (t.king ? '<span>на троне: ' + esc(t.king) + '</span>' : '') + (t.era ? '<span>' + esc(t.era) + '</span>' : '') +
      '<span class="yc-tip">двигайте ползунок на шкале</span>';
  }
  function setYear(y) {
    if (y != null) y = clampY(y);
    if (y === state.year) return;
    state.year = y;
    updateChip();
    App.decorate();
    (App.hooks.year || []).forEach(f => f(y));
    redraw();
  }
  App.setYear = setYear;
  function startYear() {
    const w = windowYears();
    if (w) return clampY((w[0] + w[1]) / 2);
    const m = mapping();
    const y = m.inv(m.w / 2);
    return isFinite(y) ? clampY(y) : 129;
  }
  yearBtn.addEventListener('click', () => setYear(startYear()));
  document.getElementById('yearchip-off').addEventListener('click', () => { setYear(null); yearBtn.focus(); });

  const pxOf = e => e.clientX - svgEl.getBoundingClientRect().left;
  const inGens = e => e.clientY - svgEl.getBoundingClientRect().top > baseH();
  svgEl.addEventListener('pointerdown', e => {
    const mk = e.button === 0 && e.target.closest && e.target.closest('.ts-mark');
    if (mk && own()) { own().set(+mk.getAttribute('data-t')); e.preventDefault(); return; }
    if (e.button !== 0 || inGens(e)) return;
    const o = own();
    if (!o && e.target.closest && e.target.closest('.t-reign')) return;
    if (!o && state.year == null) return;                // срез выключен — клик просто переносит к году
    dragging = true;
    try { svgEl.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    svgEl.classList.add('drag');
    if (o) o.set((last || mapping()).inv(pxOf(e))); else setYear((last || mapping()).inv(pxOf(e)));
    e.preventDefault();
  });
  svgEl.addEventListener('pointermove', e => {
    const px = pxOf(e);
    if (dragging) { const y = (last || mapping()).inv(px); if (own()) own().set(y); else setYear(y); return; }
    const reign = e.target.closest && e.target.closest('.t-reign');
    if (reign) { ghostX = null; showReignTip(reign); return; }
    if (inGens(e) || (e.target.closest && e.target.closest('.ts-sub-label'))) { ghostX = null; ssvg.select('g.ts-ghost').attr('display', 'none'); return; }
    ghostX = px;
    showGhost(px);
  });
  const stop = () => { if (!dragging) return; dragging = false; svgEl.classList.remove('drag'); redraw(); };
  svgEl.addEventListener('pointerup', stop);
  svgEl.addEventListener('pointercancel', stop);
  svgEl.addEventListener('lostpointercapture', stop);
  svgEl.addEventListener('pointerleave', () => { ghostX = null; ssvg.select('g.ts-ghost').attr('display', 'none'); });
  function showReignTip(reign) {
    const g = ssvg.select('g.ts-ghost');
    if (g.empty()) return;
    g.selectAll('*').remove();
    g.attr('display', null);
    const text = reign.getAttribute('data-tip');
    const m = last || mapping();
    const w = text.length * 6.6 + 16;
    const cx = Math.max(w / 2 + 2, Math.min(m.w - w / 2 - 2, +reign.getAttribute('data-cx')));
    pill(g, cx, text, 'ts-pill tip', w);
  }
  svgEl.addEventListener('click', e => {
    if (own()) return;
    const r = e.target.closest && e.target.closest('.t-reign');
    if (r) { App.select(r.getAttribute('data-id'), { center: true, force: true }); return; }
    if (e.target.closest && e.target.closest('.ts-sub-label')) {
      const v = view();
      if (state.view === 'dragons' && state.dragon) v.center(state.dragon);
      else if (state.selected) (v.center || App.centerOn)(state.selected);
      return;
    }
    if (state.year != null || inGens(e)) return;
    goToYear(Math.round((last || mapping()).inv(pxOf(e))));
  });
  svgEl.addEventListener('keydown', e => {
    const o = own();
    if (o) {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (d) o.step(d, e.shiftKey); else if (e.key === 'Home') o.set(-1e9); else if (e.key === 'End') o.set(1e9); else return;
      e.preventDefault(); e.stopPropagation();
      return;
    }
    const base = state.year != null ? state.year : startYear();
    const big = e.shiftKey ? 10 : 1;
    let y;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') y = state.year != null ? base + big : base;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') y = state.year != null ? base - big : base;
    else if (e.key === 'PageUp') y = base + 25;
    else if (e.key === 'PageDown') y = base - 25;
    else if (e.key === 'Home') y = YMIN;
    else if (e.key === 'End') y = YMAX;
    else if (e.key === 'Enter' || e.key === ' ') y = state.year != null ? null : base;
    else if (e.key === 'Escape' || e.key === 'Delete') { if (state.year == null) return; y = null; }
    else return;
    e.preventDefault(); e.stopPropagation();
    setYear(y);
  });

  /* ——— Когда перерисовывать ——— */
  App.hooks.view.push(() => { updateChip(); redraw(); });
  App.hooks.select.push(() => redraw());
  App.hooks.afterZoom.push(() => redraw());
  App.hooks.afterRender.push(() => redraw());
  document.getElementById('list-view').addEventListener('scroll', redraw, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(() => redraw()).observe(canvas);
  else window.addEventListener('resize', redraw);
  const prevStart = App.start;
  App.start = () => { canvas.classList.toggle('has-scale', !!view().scale); canvas.classList.toggle('has-gens', !!view().gens); canvas.classList.toggle('has-marks', !!marksH()); prevStart(); updateChip(); redraw(); };

  App.smokeScale = () => {
    App.setView('people');
    draw();
    const out = { scaleTicks: svgEl.querySelectorAll('.ts-ticks text').length, scaleReigns: svgEl.querySelectorAll('.t-reign').length, scaleEras: svgEl.querySelectorAll('.ts-era').length, scaleGens: svgEl.querySelectorAll('.ts-gen').length, yearBtn: !yearBtn.hidden };
    yearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    draw();
    out.scaleSlice = !!svgEl.querySelector('.ts-slice') && !chip.hidden && yearBtn.hidden;
    setYear(130);
    out.scaleChip = chipText.textContent;
    out.scaleDim = document.querySelectorAll('#tree g.node.dim').length;
    setYear(null);
    out.yearBtnBack = !yearBtn.hidden;
    return out;
  };
})();
