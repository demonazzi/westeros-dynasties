/* Драконы: вкладка с древом и жизнями драконов, карточка дракона, драконы в карточках людей, подсветка всадников на древе. */
(function () {
  const App = window.App;
  const { byId, esc, state } = App;
  const DR = new Map(DRAGONS.map(d => [d.id, d]));
  const ORIG = new Map(DRAGON_ORIGINS.map(o => [o.id, o]));
  App.DR = DR;
  App.hooks.dragonPanel = [];
  state.dragon = null;

  /* ——— Подготовка данных ——— */
  const byRider = new Map();
  const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  DRAGONS.forEach(d => {
    d.full = d.full || d.name;
    d.r = d.r || [];
    d.kids = DRAGONS.filter(x => x.par === d.id);
    d.r.forEach(([who, a, b, how]) => { if (byId.has(who)) add(byRider, who, { d, a, b, how, kind: 'rider' }); });
    (d.bond || []).forEach(([who, how]) => { if (byId.has(who)) add(byRider, who, { d, how, kind: 'bond' }); });
    d.end = d.alive ? 301.5 : (d.d != null ? d.d : d.dk);
  });
  App.dragonsOf = id => byRider.get(id) || [];
  App.dragonLabel = id => (DR.get(id) || {}).name || id;
  const riderIds = d => d.r.map(r => r[0]).concat((d.bond || []).map(b => b[0])).filter(id => byId.has(id));

  const yr = y => {
    if (y == null) return '';
    return App.yearWord(Math.floor(y));
  };
  const span = (a, b) => {
    const A = Math.floor(a), B = Math.floor(b);
    if (A === B) return A < 0 ? App.t('{n} до З.', { n: -A }) : String(A);
    const f = n => n < 0 ? App.t('{n} до З.', { n: -n }) : String(n);
    return f(A) + '–' + f(B);
  };
  const lum = hex => {
    const v = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const personName = who => byId.has(who) ? byId.get(who).name : who;
  const personHouse = who => byId.has(who) ? byId.get(who).house : 'oth';

  /* ——— Чипы и ряд «Дракон» в карточке человека ——— */
  function dchip(d, note) {
    return '<li><button type="button" class="chip dchip" data-action="dragon" data-dragon="' + d.id + '" style="--hc:' + d.col[0] + '">' + esc(d.full) + '</button>' +
      (note ? '<span class="ref-note">' + esc(note) + '</span>' : '') + '</li>';
  }
  App.dragonRow = p => {
    const list = App.dragonsOf(p.id);
    if (!list.length) return p.dr ? App.row('Дракон', esc(p.dr)) : '';
    const items = list.map(x => dchip(x.d, x.kind === 'bond' ? x.how : span(x.a, x.b)));
    return App.row(list.length > 1 ? 'Драконы' : 'Дракон', App.list(items));
  };
  App.actions = App.actions || {};
  App.actions.dragon = ds => openDragon(ds.dragon, { center: true });
  App.actions.riders = ds => showRiders(ds.dragon);
  App.actions.locateDragon = ds => centerDragon(ds.dragon);

  /* Значок крыла на карточках всадников. */
  const WING = 'M0 9.5 C2 4.5 6 1 13.5 0 C11.3 2 11.3 3.6 13.5 4.6 C10.8 4.9 10.3 6.2 11.3 7.8 C8.2 7 5 7.8 3 10 Z';
  App.hooks.afterRender.push(nodeSel => {
    nodeSel.select('g.icons').each(function (n) {
      const g = d3.select(this);
      g.selectAll('*').remove();
      const list = App.dragonsOf(n.data.id);
      if (!list.length) return;
      const ic = g.append('g').attr('class', 'wing').attr('transform', 'translate(' + (App.W - 22) + ',5)');
      ic.append('path').attr('d', WING);
      ic.append('title').text(App.t(list.length > 1 ? 'Драконы: {list}' : 'Дракон: {list}', { list: list.map(x => x.d.name).join(', ') }));
    });
  });

  /* ——— Подсветка всадников на древе людей (линза) ——— */
  function showRiders(id) {
    const d = DR.get(id); if (!d) return;
    const ids = riderIds(d);
    if (!ids.length) return;
    const cur = App.currentSubject();
    if (cur) state.history.push(cur);
    App.setView('people', { quiet: true });
    App.setLens({ ids: new Set(ids), label: 'Всадники дракона ' + d.name + ': ' + ids.length });
    ids.forEach(App.reveal);
    App.select(ids[ids.length - 1], { push: false, force: true });
    App.fitIds(ids);
  }

  /* ——— Шкала драконов ——— */
  const dsvgEl = document.getElementById('dragon-svg');
  const dsvg = d3.select(dsvgEl);
  const dg = dsvg.append('g');
  const dz = d3.zoom().scaleExtent([0.15, 2.5]).on('zoom', e => { dg.attr('transform', e.transform); if (App.redrawScale) App.redrawScale(); });
  dsvg.call(dz).on('dblclick.zoom', null);
  let built = false;
  const dsvgEl2 = dsvgEl;
  App.registerView('dragons', {
    el: dsvgEl2, sel: dsvg, tab: document.getElementById('tab-dragons'), legend: document.getElementById('dragon-legend'),
    persons: false, links: false, fitLabel: 'К началу',
    hint: 'Полоса показывает годы жизни дракона, под ней указаны всадники. Нажмите на имя, чтобы открыть описание.',
    scale: 'sync',
    scaleGo: y => {
      const t = d3.zoomTransform(dsvgEl), w = dsvgEl.getBoundingClientRect().width || 1000;
      const nt = d3.zoomIdentity.translate(w / 2 - t.k * X(y), t.y).scale(t.k);
      if (App.reduced) dsvg.call(dz.transform, nt); else dsvg.transition().duration(App.dur).call(dz.transform, nt);
    },
    scaleMap: () => { const t = d3.zoomTransform(dsvgEl); return { x: y => t.applyX(X(y)), inv: px => X.invert(t.invertX(px)), k: t.k, dom: X.domain() }; },
    scaleGaps: () => [[GAP0, GAP1, GAPPAD, '≈ 145 лет без драконов']],
    zoomBy: k => dsvg.transition().duration(App.reduced ? 0 : 250).call(dz.scaleBy, k),
    fit: () => fitDragons(true),
    center: id => centerDragon(id),
    onShow: () => { if (!built) { buildDragons(); built = true; fitDragons(false); } },
    panel: () => renderDragonPanel(state.dragon ? DR.get(state.dragon) : null),
    hash: () => state.dragon ? 'd:' + state.dragon : 'dragons',
    subject: () => state.dragon ? 'd:' + state.dragon : null,
    close: () => { state.dragon = null; state.history = []; renderDragonPanel(null); markSelected(); App.setHash('dragons'); if (App.redrawScale) App.redrawScale(); }
  });
  const X = d3.scaleLinear().domain([-135, 0, 128, 132, 160, 297, 301.5]).range([0, 405, 1429, 1789, 2013, 2153, 2378]);
  const GAP0 = 160, GAP1 = 297, GAPPAD = 10;   // сжатый промежуток: драконов нет с 153 г. до 299 г.
  const ROW = 66, HEAD = 46, TOP = 60, LEFT = 40;
  const rows = [];
  const rowOf = new Map();
  let height = 0;

  function layoutRows() {
    let y = TOP;
    const roots = DRAGON_ORIGINS.filter(o => !o.parent);
    const order = ['valyria', 'wild', 'mont', 'cradle', 'essos'];
    roots.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    function placeDragon(d, depth) {
      y += ROW / 2;
      const r = { type: 'dragon', d, y, depth };
      rows.push(r); rowOf.set(d.id, r);
      y += ROW / 2;
      d.kids.slice().sort((a, b) => a.h - b.h).forEach(k => placeDragon(k, depth + 1));
    }
    function placeOrigin(o, depth) {
      y += HEAD / 2;
      const r = { type: 'origin', o, y, depth, first: rows.length };
      rows.push(r); rowOf.set('o:' + o.id, r);
      y += HEAD / 2;
      DRAGON_ORIGINS.filter(x => x.parent === o.id).forEach(x => placeOrigin(x, depth + 1));
      DRAGONS.filter(d => d.o === o.id && !d.par).sort((a, b) => a.h - b.h).forEach(d => placeDragon(d, depth + 1));
      r.last = rows.length - 1;
      r.bottom = y;
      if (depth === 0) y += 18;
    }
    roots.forEach(o => placeOrigin(o, 0));
    height = y + 40;
  }

  const startX = d => X(d.h) - (d.ha ? 34 : 0);
  function originX(o) {
    const kids = DRAGONS.filter(d => d.o === o.id && !d.par).map(startX)
      .concat(DRAGON_ORIGINS.filter(x => x.parent === o.id).map(x => originX(x)));
    return Math.max(LEFT + (o.name.length * 7.4 + 24) / 2, Math.min(X(o.y), Math.min.apply(null, kids) - 56));
  }

  function buildDragons() {
    layoutRows();
    const width = X(301.5) + 120;
    const L = {};
    ['grid', 'groups', 'branch', 'fights', 'rows', 'marks', 'axis', 'slice'].forEach(k => { L[k] = dg.append('g').attr('class', 'dl-' + k); });
    sliceLine = L.slice.append('line').attr('class', 't-slice').attr('y1', TOP - 50).attr('y2', height - 20).attr('display', 'none');

    // Эпохи и сетка
    const eraTop = TOP - 34, eraBot = height - 20;
    // Эпохи — те же, что на шкале, и с теми же границами; внутри сжатого промежутка без драконов их нет
    (App.ERAS || []).forEach(e => {
      const [a, b] = App.eraSpan(e);
      if (b > GAP0 && a < GAP1) return;
      if (e.band) {
        L.grid.append('rect').attr('class', 'era-band').attr('x', X(a)).attr('y', eraTop).attr('width', X(b) - X(a)).attr('height', eraBot - eraTop);
        [a, b].forEach(v => L.grid.append('line').attr('class', 'era-edge').attr('x1', X(v)).attr('x2', X(v)).attr('y1', eraTop).attr('y2', eraBot));
      } else L.grid.append('line').attr('class', 'era-line').attr('x1', X(a)).attr('x2', X(a)).attr('y1', eraTop).attr('y2', eraBot);
    });
    L.grid.append('rect').attr('class', 'd-gap').attr('x', X(GAP0) + GAPPAD).attr('y', eraTop).attr('width', X(GAP1) - X(GAP0) - 2 * GAPPAD).attr('height', eraBot - eraTop);
    const gx = (X(GAP0) + X(GAP1)) / 2;
    L.axis.append('text').attr('class', 'd-gap-label').attr('x', gx).attr('y', TOP + 40).text('≈ 145 лет');
    L.axis.append('text').attr('class', 'd-gap-label').attr('x', gx).attr('y', TOP + 58).text('без драконов');
    L.axis.append('text').attr('class', 'd-gap-note').attr('x', gx).attr('y', TOP + 78).text('последний умер в 153 г.');
    // Ветви: происхождение
    rows.filter(r => r.type === 'origin').forEach(r => {
      const o = r.o, ox = originX(o);
      r.x = ox;
      r.w = o.name.length * 7.4 + 24;
      if (r.depth === 0) {
        L.groups.append('rect').attr('class', 'd-group').attr('x', 8).attr('y', r.y - HEAD / 2 + 2).attr('width', width - 16).attr('height', r.bottom - (r.y - HEAD / 2) - 2).attr('rx', 14);
      }
    });
    rows.filter(r => r.type === 'origin').forEach(r => {
      const o = r.o;
      const g = L.marks.append('g').attr('class', 'd-origin').attr('transform', 'translate(' + r.x + ',' + r.y + ')');
      g.append('rect').attr('x', -r.w / 2).attr('y', -12).attr('width', r.w).attr('height', 24).attr('rx', 12);
      g.append('text').attr('y', 0.5).text(o.name);
      g.append('title').text(o.t);
      // ветви к детям
      const kids = rows.filter(k => (k.type === 'dragon' && k.d.o === o.id && !k.d.par) || (k.type === 'origin' && k.o.parent === o.id));
      kids.forEach(k => {
        const x1 = k.type === 'dragon' ? startX(k.d) - 4 : k.x - k.w / 2;
        const y0 = r.y + 12, y1 = k.y;
        L.branch.append('path').attr('class', 'd-branch')
          .attr('d', 'M' + r.x + ',' + y0 + ' C' + r.x + ',' + (y1 - 4) + ' ' + (r.x + 18) + ',' + y1 + ' ' + Math.max(r.x + 30, x1) + ',' + y1);
      });
    });
    // Родство драконов (Сиракс → Утро)
    DRAGONS.filter(d => d.par).forEach(d => {
      const p = rowOf.get(d.par), c = rowOf.get(d.id);
      const x = X(d.h);
      L.branch.append('path').attr('class', 'd-branch d-parent')
        .attr('d', 'M' + x + ',' + (p.y + 7) + ' C' + x + ',' + (c.y - 10) + ' ' + x + ',' + (c.y - 10) + ' ' + (x + 2) + ',' + c.y)
        .append('title').text(App.t('{d} вылупилась из яйца {m}', { d: d.name, m: DR.get(d.par).name }));
    });
    // Догадка: яйца Дейенерис — от Пламени Мечты
    const df = rowOf.get('dreamfyre'), es = rowOf.get('o:essos');
    if (df && es) {
      const x0 = X(54), x1 = es.x - es.w / 2;
      const p = L.branch.append('path').attr('class', 'd-guess')
        .attr('d', 'M' + x0 + ',' + (df.y + 6) + ' C' + x0 + ',' + (es.y - 60) + ' ' + (x1 - 120) + ',' + es.y + ' ' + x1 + ',' + es.y);
      p.append('title').text(App.t('Догадка: яйца Дейенерис могли быть яйцами Пламени Мечты, украденными Элиссой Фарман в 54 г. В книгах не подтверждено.'));
      L.branch.append('text').attr('class', 'd-guess-label').attr('x', x1 - 16).attr('y', es.y - 22).attr('text-anchor', 'end').text('догадка: украденные яйца Пламени Мечты?');
    }

    // Ряды драконов
    const dragonRows = rows.filter(r => r.type === 'dragon');
    const rg = L.rows.selectAll('g.drow').data(dragonRows, r => r.d.id).join('g')
      .attr('class', 'drow').attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', r => r.d.full + ', ' + (r.d.hl || '') + ' — ' + (r.d.dl || ''))
      .attr('data-dragon', r => r.d.id)
      .attr('transform', r => 'translate(0,' + r.y + ')');
    rg.append('rect').attr('class', 'd-hit').attr('x', 12).attr('y', -ROW / 2 + 3).attr('width', width - 24).attr('height', ROW - 6).attr('rx', 10);
    rg.each(function (r) {
      const d = r.d, g = d3.select(this);
      const x0 = X(d.h), x1 = X(d.end);
      if (d.ha) g.append('line').attr('class', 'd-approx').attr('x1', x0 - 34).attr('x2', x0).attr('y1', 0).attr('y2', 0).attr('stroke', d.col[0]);
      if (d.dx) g.append('line').attr('class', 'd-approx').attr('x1', x1).attr('x2', X(d.dx)).attr('y1', 0).attr('y2', 0).attr('stroke', d.col[0]);
      g.append('rect').attr('class', 'd-halo').attr('x', x0 - 1.5).attr('y', -7.5).attr('width', Math.max(4, x1 - x0) + 3).attr('height', 15).attr('rx', 7.5);
      g.append('rect').attr('class', 'd-bar').attr('x', x0).attr('y', -6).attr('width', Math.max(4, x1 - x0)).attr('height', 12).attr('rx', 6)
        .attr('fill', d.col[0]).attr('stroke', d.col[1]);
      if (d.alive) g.append('path').attr('class', 'd-alive').attr('d', 'M' + (x1 + 3) + ',-7 L' + (x1 + 13) + ',0 L' + (x1 + 3) + ',7 Z').attr('fill', d.col[0]).attr('stroke', d.col[1]);
      // имя и годы
      const nx = d.ha ? x0 - 34 : x0;
      const t = g.append('text').attr('class', 'd-name').attr('x', nx).attr('y', -13);
      t.append('tspan').text(d.name);
      t.append('tspan').attr('class', 'd-years').attr('dx', 8).text(d.alive ? App.t('{y} — жив', { y: yr(d.h) }) : (d.d != null ? span(d.h, d.d) : yr(d.h) + ' — ?'));
      // события на полосе
      (d.ev || []).forEach(([y, text]) => {
        if (y < d.h || y > d.end) return;
        g.append('circle').attr('class', 'd-ev').attr('cx', X(y)).attr('cy', 0).attr('r', 2.6).append('title').text(yr(y) + ': ' + text);
      });
      // всадники
      const levels = [-Infinity, -Infinity];
      const riders = d.r.concat((d.bond || []).map(([who, how]) => [who, d.h, d.end, how, 0, 1]));
      riders.forEach(([who, a, b, how, approx, isBond]) => {
        const rx0 = X(a), rx1 = Math.max(X(b), rx0 + 6);
        const rg2 = g.append('g').attr('class', 'd-rider h-' + personHouse(who) + (byId.has(who) ? ' linked' : '') + (isBond ? ' bond' : ''));
        if (byId.has(who)) rg2.attr('data-person', who);
        rg2.append('line').attr('class', 'd-rider-line' + (approx ? ' approx' : '')).attr('x1', rx0).attr('x2', rx1).attr('y1', 12).attr('y2', 12);
        const label = personName(who) + (isBond ? ' · ' + how : '');
        const lw = label.length * 6.6 + 6;
        let lv = levels[0] <= rx0 ? 0 : (levels[1] <= rx0 ? 1 : 0);
        levels[lv] = rx0 + lw;
        rg2.append('text').attr('class', 'd-rider-name').attr('x', rx0).attr('y', 25 + lv * 13).text(label);
        rg2.append('title').text(personName(who) + ' · ' + span(a, b) + (how ? ' · ' + how : ''));
      });
      // подпись конца жизни
      if (d.dl && !d.alive) g.append('text').attr('class', 'd-end').attr('x', (d.dx ? X(d.dx) : x1) + 8).attr('y', 4).text(d.d != null ? '† ' + d.dl : d.dl);
    });
    rg.on('click', (e, r) => {
      const p = e.target.closest('[data-person]');
      if (p) { e.stopPropagation(); App.select(p.getAttribute('data-person'), { center: true }); return; }
      openDragon(r.d.id);
    });
    rg.on('keydown', (e, r) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDragon(r.d.id); } });

    // Схватки
    DRAGON_FIGHTS.forEach(f => {
      const a = rowOf.get(f.a), b = rowOf.get(f.b);
      if (!a || !b) return;
      const x = X(f.y);
      const g = L.fights.append('g').attr('class', 'd-fightg');
      g.append('line').attr('class', 'd-fight').attr('x1', x).attr('x2', x).attr('y1', a.y).attr('y2', b.y);
      g.append('title').text(App.t('{a} против {b}', { a: DR.get(f.a).name, b: DR.get(f.b).name }) + ' · ' + yr(f.y) + ', ' + f.place + (f.both ? ' · ' + App.t('погибли оба') : ''));
      const mark = (r, kill) => {
        const m = L.marks.append('g').attr('class', kill ? 'd-kill' : 'd-hitter').attr('transform', 'translate(' + x + ',' + r.y + ')');
        m.append('circle').attr('r', kill ? 6 : 3.5);
        if (kill) m.append('path').attr('d', 'M-2.6-2.6L2.6 2.6M2.6-2.6L-2.6 2.6');
        m.append('title').text(App.t('{a} против {b}', { a: DR.get(f.a).name, b: DR.get(f.b).name }) + ' · ' + yr(f.y) + ', ' + f.place);
      };
      mark(b, true); mark(a, !!f.both);
    });
    markSelected();
  }

  function markSelected() {
    dg.selectAll('g.drow').classed('selected', r => r.d.id === state.dragon).attr('aria-pressed', r => r.d.id === state.dragon ? 'true' : 'false');
    markYear();
    if (App.redrawScale) App.redrawScale();
  }
  /* Выбрать год: живые в этот год драконы остаются яркими. */
  let sliceLine = null;
  const aliveIn = (d, y) => d.h - (d.ha ? 3 : 0) <= y && y <= (d.dx || d.end);
  function markYear() {
    const y = state.year;
    dg.selectAll('g.drow').classed('dim', r => y != null && !aliveIn(r.d, y));
    if (sliceLine) sliceLine.attr('display', y != null ? null : 'none').attr('x1', X(y || 0)).attr('x2', X(y || 0));
  }
  App.hooks.year = App.hooks.year || [];
  App.hooks.year.push(() => { if (built) markYear(); });
  function fitDragons(animate) {
    const r = dsvgEl.getBoundingClientRect();
    const w = r.width || 1000;
    const k = w < 700 ? 0.5 : 0.68;
    const t = d3.zoomIdentity.translate(12, 8).scale(k);
    if (animate && !App.reduced) dsvg.transition().duration(App.dur).call(dz.transform, t); else dsvg.call(dz.transform, t);
  }
  function centerDragon(id) {
    const r = rowOf.get(id); if (!r) return;
    const d = r.d;
    const box = dsvgEl.getBoundingClientRect();
    const k = Math.max(0.55, d3.zoomTransform(dsvgEl).k);
    const cx = (X(d.h) + X(d.dx || d.end)) / 2;
    const t = d3.zoomIdentity.translate(box.width / 2 - k * cx, box.height / 2 - k * r.y).scale(k);
    if (App.reduced) dsvg.call(dz.transform, t); else dsvg.transition().duration(App.dur).call(dz.transform, t);
  }

  /* ——— Карточка дракона ——— */
  const panel = document.getElementById('panel');
  const panelContent = document.getElementById('panel-content');
  function egg(d) {
    const light = lum(d.col[0]) > 0.45;
    const ink = light ? '#1E1B20' : '#FBF8F2';
    return '<svg class="medal" viewBox="0 0 64 76" aria-hidden="true">' +
      '<path d="M32 4 C48 4 58 32 58 47 C58 63 46 72 32 72 C18 72 6 63 6 47 C6 32 16 4 32 4 Z" fill="' + d.col[0] + '" stroke="' + d.col[1] + '" stroke-width="2.5"/>' +
      '<path d="M14 40 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0 M10 52 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0 q4 -4 8 0 M16 63 q6 -6 12 0 q6 -6 12 0 q6 -6 10 -1" fill="none" stroke="' + d.col[1] + '" stroke-opacity=".7" stroke-width="1.4"/>' +
      '<text x="32" y="33" text-anchor="middle" font-family="Forum, Georgia, serif" font-size="22" fill="' + ink + '">' + esc(d.name.charAt(0)) + '</text></svg>';
  }
  const CS = { art: 'Окрас — со слов художника, согласованных с командой Мартина.', ill: 'Окрас — по иллюстрациям; в книгах он не описан.', name: 'Окрас — по имени и рисункам; в книгах он не описан.' };
  function dragonEvents(d) {
    const ev = [];
    const t = App.t, num = y => (y < 0 ? App.t('{n} до З.', { n: -Math.floor(y) }) : String(Math.floor(y)));
    ev.push({ y: d.h, label: (d.ha ? '≈ ' : '') + num(d.h), text: (d.sex === 'f' ? t('Вылупилась') : t('Вылупился')) + (d.hl ? ': ' + d.hl : '') });
    d.r.forEach(([who, a, b, how]) => ev.push({ y: a, label: (a < 0 ? '≈ ' : '') + num(a), text: t('Всадник: {name}', { name: personName(who) }), ref: byId.has(who) ? who : null }));
    (d.ev || []).forEach(([y, text]) => ev.push({ y, label: num(y), text }));
    const deaths = DRAGON_FIGHTS.filter(f => f.b === d.id || (f.both && f.a === d.id));
    deaths.slice(0, 1).forEach(f => {
      const foes = deaths.map(x => DR.get(x.a === d.id ? x.b : x.a));
      ev.push({ y: f.y, label: num(f.y), text: (d.sex === 'f' ? t('Погибла в схватке с драконом {foe}', { foe: foes.map(x => x.name).join(' / ') }) : t('Погиб в схватке с драконом {foe}', { foe: foes.map(x => x.name).join(' / ') })) + ', ' + f.place.replace(/, вместе с .*$/, ''), dragon: foes[0].id, last: true });
    });
    if (d.d != null && !deaths.length) ev.push({ y: d.d, label: num(d.d), text: (d.sex === 'f' ? t('Погибла') : t('Погиб')) + ': ' + d.dl, last: true });
    else if (d.alive) ev.push({ y: 301, label: '300', text: 'Жив' + (d.sex === 'f' ? 'а' : '') + ' на конец книг', last: true });
    else if (d.d == null) ev.push({ y: d.dx, label: '?', text: 'Смерть: ' + d.dl, last: true });
    ev.sort((a, b) => a.y - b.y || (a.last ? 1 : 0) - (b.last ? 1 : 0));
    return ev;
  }
  function renderDragonPanel(d) {
    panelContent.className = 'panel-inner h-none dragon';
    ['--hc', '--dhc-l', '--dhc-d'].forEach(v => panelContent.style.removeProperty(v));
    if (!d) {
      panel.classList.add('is-empty');
      const riders = new Set(DRAGONS.flatMap(riderIds));
      panelContent.innerHTML =
        '<div class="empty"><p class="eyebrow">' + App.plural(DRAGONS.length, 'дракон', 'дракона', 'драконов') + '</p><h2>Выберите дракона</h2>' +
        '<p>Цвет полосы соответствует дракону, цвет линии всадника — его дому. Слева показано происхождение драконов, крестами отмечены погибшие в схватках.</p>' +
        '<p class="stats">' + App.t('{riders} есть на древе людей', { riders: App.plural(riders.size, 'всадник', 'всадника', 'всадников') }) + ' · ' + App.plural(DRAGON_FIGHTS.length, 'схватка', 'схватки', 'схваток') + '</p></div>';
      return;
    }
    panel.classList.remove('is-empty');
    // Цвет акцентов карточки: в светлой теме — не слишком светлый, в тёмной — не слишком тёмный (иначе годы не прочесть)
    panelContent.style.setProperty('--dhc-l', lum(d.col[0]) > 0.6 ? d.col[1] : d.col[0]);
    panelContent.style.setProperty('--dhc-d', lum(d.col[0]) >= 0.12 ? d.col[0] : lum(d.col[1]) >= 0.12 ? d.col[1] : '#C9C3CF');
    const back = state.history.length ? App.historyLabel(state.history[state.history.length - 1]) : null;
    const origin = ORIG.get(d.o);
    const riders = d.r.map(([who, a, b, how]) => byId.has(who) ? App.chip(who, span(a, b) + (how ? ' · ' + how : '')) : '<li><span class="ref">' + esc(who) + '</span><span class="ref-note">' + esc(span(a, b) + (how ? ' · ' + how : '')) + '</span></li>');
    (d.bond || []).forEach(([who, how]) => riders.push(App.chip(who, how)));
    const ev = dragonEvents(d);
    const hasPeople = riderIds(d).length > 0;
    panelContent.innerHTML =
      '<span class="grab" aria-hidden="true"></span>' +
      '<div class="panel-nav">' +
        (back ? '<button type="button" class="btn back" id="panel-back" title="Alt + ←">← ' + esc(back) + '</button>' : '<span></span>') +
        '<button type="button" class="btn btn-icon close" id="panel-close" aria-label="Закрыть карточку">×</button>' +
      '</div>' +
      '<div class="panel-top">' + egg(d) + '<div>' +
        '<p class="eyebrow"><span>' + esc(App.t(d.sex === 'f' ? 'Дракон · самка' : d.sex === 'm' ? 'Дракон · самец' : 'Дракон')) + '</span>' + (origin ? ' · <span>' + esc(origin.name) + '</span>' : '') + '</p>' +
        '<h2>' + esc(d.full) + '</h2>' +
        (App.lang !== 'en' && d.en ? '<p class="en">' + esc(d.en) + '</p>' : '') +
      '</div></div>' +
      (d.tUntranslated ? '<p class="tr-missing">Это описание пока доступно только по-русски.</p>' : '') +
      '<p class="note"' + (d.tUntranslated ? ' lang="ru"' : '') + '>' + esc(d.t) + '</p>' +
      '<ol class="events">' + ev.map(e => '<li><span class="ev-year">' + esc(e.label) + '</span><span class="ev-text">' +
        (e.ref ? '<button type="button" class="linkish" data-id="' + e.ref + '">' + esc(e.text) + '</button>'
          : e.dragon ? '<button type="button" class="linkish" data-action="dragon" data-dragon="' + e.dragon + '">' + esc(e.text) + '</button>' : esc(e.text)) +
        '</span></li>').join('') + '</ol>' +
      '<dl class="facts">' +
        App.row('Окрас', esc(d.colour) + (CS[d.cs] ? '<span class="ref-note block">' + CS[d.cs] + '</span>' : '')) +
        (d.size ? App.row('Размер', esc(d.size)) : '') +
        App.row(riders.length > 1 ? 'Всадники' : 'Всадник', riders.length ? App.list(riders) : 'никто не оседлал') +
        (d.par ? App.row('Родитель', App.list([dchip(DR.get(d.par), 'отложила яйцо')])) : '') +
        (d.kids.length ? App.row('Потомство', App.list(d.kids.map(k => dchip(k)))) : '') +
        (origin ? App.row('Откуда', esc(origin.t)) : '') +
      '</dl>' +
      App.hooks.dragonPanel.map(f => f(d) || '').join('') +
      '<div class="panel-actions">' +
        (hasPeople ? '<button type="button" class="btn" data-action="riders" data-dragon="' + d.id + '">Всадники на древе людей</button>' : '') +
        '<button type="button" class="btn" data-action="locateDragon" data-dragon="' + d.id + '">Показать на шкале</button>' +
        '<a class="btn" href="https://awoiaf.westeros.org/index.php?title=Special:Search&go=Go&search=' + encodeURIComponent(d.en.split(',')[0].replace(/ the .*$/, '')) + '" target="_blank" rel="noopener">A Wiki of Ice and Fire ↗</a>' +
      '</div>' +
      '<p class="src">По «Пламени и крови» и «Песни льда и огня», с уточнениями по A Wiki of Ice and Fire. Годы отсчитываются от Завоевания Эйгона.</p>';
    panel.scrollTop = 0;
  }
  App.renderDragonPanel = renderDragonPanel;

  function openDragon(id, opts) {
    opts = opts || {};
    if (!DR.has(id)) return;
    const cur = App.currentSubject();
    if (opts.push !== false && cur && cur !== 'd:' + id) { state.history.push(cur); if (state.history.length > 40) state.history.shift(); }
    state.dragon = id;
    if (state.view !== 'dragons') App.setView('dragons');
    else renderDragonPanel(DR.get(id));
    markSelected();
    App.setHash('d:' + id);
    if (opts.center !== false) centerDragon(id);
  }
  App.openDragon = openDragon;

  /* ——— Поиск по людям и драконам ——— */
  document.getElementById('people-list').insertAdjacentHTML('beforeend', DRAGONS.map(d => '<option value="' + esc(d.full) + '"></option>').join(''));
  App.findAny = q => {
    q = q.trim().toLowerCase();
    if (!q) return null;
    const pk = p => [p.full, p.name, p.en || ''].concat(p.al || []).map(s => s.toLowerCase());
    const dk = d => [d.full, d.name, d.en].map(s => s.toLowerCase());
    const tests = [s => s === q, s => s.startsWith(q), s => s.includes(q)];
    for (const t of tests) {
      const p = PEOPLE.find(x => pk(x).some(t));
      const d = DRAGONS.find(x => dk(x).some(t));
      if (d && (!p || t === tests[0] && dk(d).includes(q))) return { type: 'dragon', id: d.id };
      if (p) return { type: 'person', id: p.id };
      if (d) return { type: 'dragon', id: d.id };
    }
    return null;
  };

  /* ——— Ссылки вида #d:vhagar и #dragons ——— */
  App.startHash = h => {
    if (h === 'dragons') { App.render(); App.setView('dragons'); return true; }
    if (h.startsWith('d:') && DR.has(h.slice(2))) { App.render(); state.dragon = h.slice(2); App.setView('dragons'); centerDragon(state.dragon); return true; }
    return false;
  };

  /* Для дымового теста. */
  App.smokeDragons = () => {
    const out = {};
    openDragon('vhagar');
    out.dragonPanel = (document.querySelector('#panel h2') || {}).textContent;
    out.dragonRows = document.querySelectorAll('g.drow').length;
    out.fights = document.querySelectorAll('g.d-fightg').length;
    const chip = document.querySelector('#panel .chip[data-id="aemond"]');
    if (chip) chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    out.afterRider = (document.querySelector('#panel h2') || {}).textContent;
    out.view = state.view;
    out.backLabel = (document.querySelector('#panel-back') || {}).textContent;
    const dchipEl = document.querySelector('#panel .dchip');
    if (dchipEl) dchipEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    out.afterDchip = (document.querySelector('#panel h2') || {}).textContent;
    return out;
  };
})();
