/* Мини-карта и фильтры: обзор всего древа с рамкой текущего вида; скрытие полос домов и приглушение по положению. */
(function () {
  const App = window.App;
  const { byId, esc, state } = App;

  /* ——— Мини-карта ——— */
  const box = document.getElementById('minimap');
  const msvg = d3.select('#minimap-svg');
  const toggleBtn = document.getElementById('minimap-toggle');
  let MW = 200, MH = 170;
  const content = msvg.append('g');
  const vp = msvg.append('rect').attr('class', 'mm-view');
  let geo = null;
  function drawMap() {
    const ns = App.allNodes();
    const bb = App.bandBoxes();
    if (!ns.length || !bb.length) return;
    let x0 = Infinity, x1 = -Infinity;
    ns.forEach(n => { x0 = Math.min(x0, n.X); x1 = Math.max(x1, n.X + App.W); });
    x0 -= 60; x1 += 80;
    const y0 = bb[0].top - 20, y1 = bb[bb.length - 1].bottom + 20;
    const s = Math.min(200 / (x1 - x0), 170 / (y1 - y0));
    MW = Math.round((x1 - x0) * s); MH = Math.round((y1 - y0) * s);
    msvg.attr('viewBox', '0 0 ' + MW + ' ' + MH).attr('width', MW).attr('height', MH);
    const ox = 0, oy = 0;
    geo = { x0, y0, s, ox, oy };
    content.selectAll('*').remove();
    bb.forEach(b => content.append('rect').attr('class', 'mm-band h-' + b.house)
      .attr('x', ox).attr('y', oy + (b.top - y0) * s).attr('width', (x1 - x0) * s).attr('height', Math.max(1, (b.bottom - b.top) * s)));
    const dim = App.dimmedFn ? App.dimmedFn() : () => false;
    content.selectAll('rect.mm-node').data(ns).join('rect')
      .attr('class', d => 'mm-node h-' + d.data.house + (dim(d.data.id) ? ' dim' : ''))
      .attr('x', d => ox + (d.X - x0) * s).attr('y', d => oy + (d.Y - App.H / 2 - y0) * s)
      .attr('width', Math.max(1.5, App.W * s)).attr('height', Math.max(1, App.H * s));
    if (state.selected && App.nodeById.has(state.selected)) {
      const n = App.nodeById.get(state.selected);
      if (App.visible().has(n.data.id)) content.append('circle').attr('class', 'mm-sel').attr('cx', ox + (n.X + App.W / 2 - x0) * s).attr('cy', oy + (n.Y - y0) * s).attr('r', 3.5);
    }
    drawViewport(d3.zoomTransform(App.svg.node()));
  }
  function drawViewport(t) {
    if (!geo) return;
    const r = App.svg.node().getBoundingClientRect();
    const [ax, ay] = t.invert([0, 0]), [bx, by] = t.invert([r.width || 1000, r.height || 700]);
    const x = geo.ox + (ax - geo.x0) * geo.s, y = geo.oy + (ay - geo.y0) * geo.s;
    const w = (bx - ax) * geo.s, h = (by - ay) * geo.s;
    const cx = Math.max(-2, Math.min(MW + 2, x)), cy = Math.max(-2, Math.min(MH + 2, y));
    vp.attr('x', cx).attr('y', cy).attr('width', Math.max(4, Math.min(MW + 2, x + w) - cx)).attr('height', Math.max(4, Math.min(MH + 2, y + h) - cy));
  }
  App.hooks.afterRender.push(() => drawMap());
  App.hooks.afterZoom.push(t => drawViewport(t));
  App.hooks.select.push(() => drawMap());
  App.hooks.lens.push(() => drawMap());
  function goTo(evt) {
    if (!geo) return;
    const pt = d3.pointer(evt, msvg.node());
    const cx = geo.x0 + (pt[0] - geo.ox) / geo.s, cy = geo.y0 + (pt[1] - geo.oy) / geo.s;
    App.svg.interrupt().call(App.zoom.translateTo, cx, cy);
  }
  let dragging = false;
  msvg.on('pointerdown', e => { dragging = true; msvg.node().setPointerCapture(e.pointerId); goTo(e); })
    .on('pointermove', e => { if (dragging) goTo(e); })
    .on('pointerup pointercancel', () => { dragging = false; });
  toggleBtn.addEventListener('click', () => {
    const collapsed = box.classList.toggle('collapsed');
    toggleBtn.textContent = collapsed ? '▣' : '−';
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    toggleBtn.title = collapsed ? 'Показать мини-карту' : 'Свернуть мини-карту';
  });
  App.hooks.view.push(v => { box.hidden = v !== 'people'; if (v === 'people') drawMap(); });
  if (App.isNarrow()) { box.classList.add('collapsed'); toggleBtn.textContent = '▣'; }

  /* ——— Фильтры ——— */
  state.hiddenHouses = new Set();
  const GREAT = () => BANDS.filter(b => !b.sub).map(b => b.house);
  state.kinds = new Set(['K', 'C', 'R', 'B', 'T']);
  state.ridersOnly = false;
  const KINDS = [['K', 'Короли'], ['C', 'Претенденты'], ['R', 'Бастарды'], ['B', 'Блэкфайры'], ['T', 'Остальные']];
  // «Только всадники» показывает всех всадников, как бы ни стояли галочки положения: пока он включён, положение не учитывается
  App.hooks.decorate.push(() => {
    const kindsOff = !state.ridersOnly && state.kinds.size < KINDS.length;
    const houseOff = state.hiddenHouses.size && state.view !== 'people';
    if (!kindsOff && !state.ridersOnly && !houseOff) return null;
    return id => {
      const p = byId.get(id);
      if (kindsOff && !state.kinds.has(p.k)) return true;
      if (state.ridersOnly && !(App.dragonsOf && App.dragonsOf(id).length)) return true;
      if (houseOff && state.hiddenHouses.has(App.bandOf(id))) return true;
      return false;
    };
  });
  const fbtn = document.getElementById('filter-btn');
  const fpop = document.getElementById('filter-pop');
  const fcount = document.getElementById('filter-count');
  function renderFilters() {
    fpop.innerHTML =
      '<fieldset><legend>Полосы домов</legend>' + App.bandOrder().map(b =>
        '<label class="h-' + b.house + (b.sub ? ' f-sub' : '') + '"><input type="checkbox" data-house="' + b.house + '"' + (state.hiddenHouses.has(b.house) ? '' : ' checked') + '><i></i>' + esc(HOUSES[b.house].band) + '</label>').join('') +
      '<div class="f-row"><button type="button" class="linkish" data-fall="1">все</button> · <button type="button" class="linkish" data-fall="core">только Таргариены и Веларионы</button></div></fieldset>' +
      '<fieldset' + (state.ridersOnly ? ' disabled' : '') + '><legend>Положение' + (state.ridersOnly ? ' <span class="f-note">— не учитывается, пока включены «Только всадники»</span>' : '') + '</legend>' + KINDS.map(([k, t]) =>
        '<label><input type="checkbox" data-kind="' + k + '"' + (state.kinds.has(k) ? ' checked' : '') + '>' + t + '</label>').join('') + '</fieldset>' +
      '<fieldset class="f-one"><legend>Драконы</legend><label><input type="checkbox" data-riders="1"' + (state.ridersOnly ? ' checked' : '') + '>Только всадники драконов</label></fieldset>' +
      '<div class="f-row f-foot"><button type="button" class="btn" data-freset="1">Сбросить</button></div>';
  }
  function updateCount() {
    const n = state.hiddenHouses.size + (state.ridersOnly ? 1 : KINDS.length - state.kinds.size);
    fcount.hidden = !n; fcount.textContent = n;
    fbtn.classList.toggle('active', !!n);
  }
  function applyHouses() {
    App.render();
    App.fitAll();
    updateCount();
    (App.hooks.houses || []).forEach(f => f());
    App.decorate();
  }
  function openFilters(open) {
    fpop.hidden = !open;
    fbtn.setAttribute('aria-expanded', String(open));
    if (open) { renderFilters(); const f = fpop.querySelector('input'); f && f.focus(); }
  }
  fbtn.addEventListener('click', e => { e.stopPropagation(); openFilters(fpop.hidden); });
  document.addEventListener('click', e => { if (!fpop.hidden && !e.target.closest('.lens-menu')) openFilters(false); });
  fpop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); openFilters(false); fbtn.focus(); } });
  fpop.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.house) {
      if (t.checked) state.hiddenHouses.delete(t.dataset.house);
      else if (App.bandSub(t.dataset.house) || GREAT().filter(h => !state.hiddenHouses.has(h)).length > 1) state.hiddenHouses.add(t.dataset.house);
      else t.checked = true;
      applyHouses();
    } else if (t.dataset.kind) {
      if (t.checked) state.kinds.add(t.dataset.kind); else state.kinds.delete(t.dataset.kind);
      App.decorate(); drawMap(); updateCount();
    } else if (t.dataset.riders) {
      state.ridersOnly = t.checked; App.decorate(); drawMap(); updateCount();
      renderFilters(); const r = fpop.querySelector('input[data-riders]'); r && r.focus();
    }
  });
  fpop.addEventListener('click', e => {
    const all = e.target.closest('[data-fall]');
    if (all) {
      state.hiddenHouses = new Set(all.dataset.fall === 'core' ? GREAT().filter(h => h !== 'targ' && h !== 'vel') : []);
      renderFilters(); applyHouses(); return;
    }
    if (e.target.closest('[data-freset]')) {
      state.hiddenHouses = new Set(); state.kinds = new Set(KINDS.map(k => k[0])); state.ridersOnly = false;
      renderFilters(); applyHouses(); App.decorate();
    }
  });
  // Если выбранный человек оказался в скрытой полосе — показываем её снова.
  App.hooks.select.push(id => {
    if (!id) return;
    const h = App.bandOf(id), par = App.bandSub(h);
    if (h && (state.hiddenHouses.has(h) || (par && state.hiddenHouses.has(par))) && state.view === 'people') {
      state.hiddenHouses.delete(h); if (par) state.hiddenHouses.delete(par);
      App.render(); updateCount(); App.centerOn(id);
    }
  });

  App.smokeMini = () => {
    const out = { mmNodes: document.querySelectorAll('#minimap-svg rect.mm-node').length };
    state.hiddenHouses = new Set(GREAT().filter(h => h !== 'targ' && h !== 'vel'));
    applyHouses();
    out.nodesAfterHide = document.querySelectorAll('#tree g.node').length;
    state.hiddenHouses = new Set(); applyHouses();
    out.nodesAfterShow = document.querySelectorAll('#tree g.node').length;
    state.kinds.delete('T'); App.decorate();
    out.dimByKind = document.querySelectorAll('#tree g.node.dim').length;
    state.kinds.add('T'); App.decorate(); updateCount();
    // «Только всадники» не зависит от галочек положения
    state.kinds = new Set(['K']); state.ridersOnly = true; App.decorate();
    const riders = [...document.querySelectorAll('#tree g.node')].filter(n => App.dragonsOf(n.__data__.data.id).length).length;
    out.ridersAlone = document.querySelectorAll('#tree g.node:not(.dim)').length + ' видно, всадников ' + riders;
    state.kinds = new Set(KINDS.map(k => k[0])); state.ridersOnly = false; App.decorate(); updateCount();
    return out;
  };
})();
