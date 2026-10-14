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
    // все дома сняты фильтром: мини-карта пустая, без рамки (раньше на ней оставалось прежнее древо)
    if (!ns.length || !bb.length) { content.selectAll('*').remove(); vp.attr('width', 0).attr('height', 0); geo = null; return; }
    let x0 = Infinity, x1 = -Infinity;
    ns.forEach(n => { x0 = Math.min(x0, n.X); x1 = Math.max(x1, n.X + App.W); });
    x0 -= 60; x1 += 80;
    const y0 = bb[0].top - 20, y1 = bb[bb.length - 1].bottom + 20;
    // пропорции древа сохраняются, пока карта не становится слишком узкой или низкой: когда домов на древе много,
    // древо намного выше, чем шире, — тогда карта выше (до 45% экрана), а по ширине не уже 150 px (масштаб по осям разный)
    const maxH = Math.max(170, Math.min(300, Math.round(App.viewSize().h * 0.45)));
    const s = Math.min(200 / (x1 - x0), maxH / (y1 - y0));
    MW = Math.max(150, Math.round((x1 - x0) * s)); MH = Math.max(60, Math.round((y1 - y0) * s));
    const sx = MW / (x1 - x0), sy = MH / (y1 - y0);
    msvg.attr('viewBox', '0 0 ' + MW + ' ' + MH).attr('width', MW).attr('height', MH);
    const ox = 0, oy = 0;
    geo = { x0, y0, sx, sy, ox, oy };
    content.selectAll('*').remove();
    bb.forEach(b => content.append('rect').attr('class', 'mm-band h-' + b.house)
      .attr('x', ox).attr('y', oy + (b.top - y0) * sy).attr('width', MW).attr('height', Math.max(1, (b.bottom - b.top) * sy)));
    const dim = App.dimmedFn ? App.dimmedFn() : () => false;
    content.selectAll('rect.mm-node').data(ns).join('rect')
      .attr('class', d => 'mm-node h-' + d.data.house + (dim(d.data.id) ? ' dim' : ''))
      .attr('x', d => ox + (d.X - x0) * sx).attr('y', d => oy + (d.Y - App.H / 2 - y0) * sy)
      .attr('width', Math.max(1.5, App.W * sx)).attr('height', Math.max(1, App.H * sy));
    drawSel();
    drawViewport(d3.zoomTransform(App.svg.node()));
  }
  // выбор человека не меняет раскладку: двигается только метка выбранного, а у прямоугольников меняется лишь
  // приглушение, и то только там, где оно стало другим (раньше мини-карта перестраивалась целиком)
  function drawSel() {
    if (!geo) return;
    content.selectAll('circle.mm-sel').remove();
    if (state.selected && App.nodeById.has(state.selected)) {
      const n = App.nodeById.get(state.selected);
      if (App.visible().has(n.data.id)) content.append('circle').attr('class', 'mm-sel').attr('cx', geo.ox + (n.X + App.W / 2 - geo.x0) * geo.sx).attr('cy', geo.oy + (n.Y - geo.y0) * geo.sy).attr('r', 3.5);
    }
  }
  function onSelect() {
    if (!geo) { drawMap(); return; }
    const dim = App.dimmedFn ? App.dimmedFn() : () => false;
    content.selectAll('rect.mm-node').each(function (d) { const on = dim(d.data.id); if (this.classList.contains('dim') !== on) this.classList.toggle('dim', on); });
    drawSel();
  }
  function drawViewport(t) {
    if (!geo) return;
    const r = App.viewSize();
    const [ax, ay] = t.invert([0, 0]), [bx, by] = t.invert([r.w || 1000, r.h || 700]);
    const x = geo.ox + (ax - geo.x0) * geo.sx, y = geo.oy + (ay - geo.y0) * geo.sy;
    const w = (bx - ax) * geo.sx, h = (by - ay) * geo.sy;
    const cx = Math.max(-2, Math.min(MW + 2, x)), cy = Math.max(-2, Math.min(MH + 2, y));
    vp.attr('x', cx).attr('y', cy).attr('width', Math.max(4, Math.min(MW + 2, x + w) - cx)).attr('height', Math.max(4, Math.min(MH + 2, y + h) - cy));
  }
  App.hooks.afterRender.push(() => drawMap());
  App.hooks.afterZoom.push(t => drawViewport(t));
  App.hooks.select.push(() => onSelect());
  App.hooks.lens.push(() => drawMap());
  function goTo(evt) {
    if (!geo) return;
    const pt = d3.pointer(evt, msvg.node());
    const cx = geo.x0 + (pt[0] - geo.ox) / geo.sx, cy = geo.y0 + (pt[1] - geo.oy) / geo.sy;
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
  const ALL = () => BANDS.map(b => b.house);
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
  /* Дома в фильтре: великие — отдельным блоком сверху, малые — ниже, по краям своих сюзеренов (у края своя галочка:
     все его малые дома разом, «частично», если включены не все). У каждого дома и края — «только» (оставить одно это),
     у блоков — «все» и «снять». Строка поиска сужает список. */
  const REGIONS = [['crown', 'Королевские земли', ['targ', 'vel', 'bf', 'seed']], ['dorne', 'Дорн', ['mar']], ['reach', 'Простор', ['tyr', 'hgt']],
    ['storm', 'Штормовые земли', ['bar']], ['west', 'Западные земли', ['lan']], ['river', 'Речные земли', ['tul', 'bw']],
    ['vale', 'Долина Аррен', ['arr']], ['north', 'Север', ['stk']], ['iron', 'Железные острова', ['gry']]];
  const GREAT = () => BANDS.filter(b => !b.liege).map(b => b.house), MINOR = () => BANDS.filter(b => b.liege).map(b => b.house);
  const regionsNow = () => {
    const regOf = new Map(); REGIONS.forEach(([id, , hs]) => hs.forEach(h => regOf.set(h, id)));
    const out = REGIONS.map(([id, title]) => ({ id, title, houses: [] })).concat({ id: 'other', title: 'Прочие', houses: [] });
    App.bandOrder().filter(b => b.liege).forEach(b => (out.find(r => r.id === regOf.get(b.liege)) || out[out.length - 1]).houses.push(b.house));
    out.forEach(r => r.houses.sort((x, y) => HOUSES[x].band.localeCompare(HOUSES[y].band, 'ru')));
    return out.filter(r => r.houses.length);
  };
  state.fq = '';
  const houseItem = (h, great) => '<div class="f-item h-' + h + (great ? ' f-great' : '') + '" data-name="' + esc(HOUSES[h].band.toLowerCase()) + '">' +
    '<label><input type="checkbox" data-house="' + h + '"' + (state.hiddenHouses.has(h) ? '' : ' checked') + '><i></i>' + esc(HOUSES[h].band) + '</label>' +
    '<button type="button" class="f-only" data-only="' + h + '" title="' + esc(App.t('Показать только {name}', { name: HOUSES[h].band })) + '">только</button></div>';
  const regionBox = r => '<section class="f-reg" data-reg="' + r.id + '" data-name="' + esc(r.title.toLowerCase()) + '">' +
    '<div class="f-reg-h"><label><input type="checkbox" data-reg="' + r.id + '">' + esc(r.title) + '</label>' +
    '<button type="button" class="f-only" data-only-reg="' + r.id + '" title="' + esc(App.t('Показать только малые дома края: {name}', { name: App.t(r.title) })) + '">только</button></div>' +
    r.houses.map(h => houseItem(h, false)).join('') + '</section>';
  const blockHead = (title, kind) => '<div class="f-block-h"><span>' + title + ' <span class="f-cnt" data-cnt="' + kind + '"></span></span>' +
    '<span class="f-acts"><button type="button" class="linkish" data-ball="' + kind + '">все</button> · <button type="button" class="linkish" data-bnone="' + kind + '">снять</button></span></div>';
  function renderFilters() {
    fpop.innerHTML =
      '<div class="f-top"><input type="search" class="f-search" placeholder="Найти дом или край…" aria-label="Найти дом" value="' + esc(state.fq) + '">' +
      '<span class="f-shown"></span></div>' +
      '<div class="f-row f-houses"><button type="button" class="linkish" data-fall="1">все дома</button> · <button type="button" class="linkish" data-fall="great">только великие</button> · ' +
      '<button type="button" class="linkish" data-fall="minor">только малые</button> · <button type="button" class="linkish" data-fall="core">только Таргариены и Веларионы</button> · ' +
      '<button type="button" class="linkish" data-fall="none">снять все</button></div>' +
      '<section class="f-block f-block-great">' + blockHead('Великие дома', 'great') + '<div class="f-greats">' + App.bandOrder().filter(b => !b.liege).map(b => houseItem(b.house, true)).join('') + '</div></section>' +
      '<section class="f-block f-block-minor">' + blockHead('Малые дома', 'minor') + '<div class="f-regions">' + regionsNow().map(regionBox).join('') + '</div></section>' +
      '<p class="f-empty" hidden>Ничего не найдено</p>' +
      '<fieldset class="f-kinds"' + (state.ridersOnly ? ' disabled' : '') + '><legend>Категория' + (state.ridersOnly ? ' <span class="f-note">— не учитывается, пока включены «Только всадники»</span>' : '') + '</legend>' + KINDS.map(([k, t]) =>
        '<label><input type="checkbox" data-kind="' + k + '"' + (state.kinds.has(k) ? ' checked' : '') + '>' + t + '</label>').join('') + '</fieldset>' +
      '<fieldset class="f-one"><legend>Драконы</legend><label><input type="checkbox" data-riders="1"' + (state.ridersOnly ? ' checked' : '') + '>Только всадники драконов</label></fieldset>' +
      '<div class="f-row f-foot"><button type="button" class="btn" data-freset="1">Сбросить</button></div>';
    App.translateDom(fpop);
    syncHouses(); searchHouses();
  }
  // галочки домов и краёв по состоянию (край — «частично», если включены не все его дома) и счётчик видимых
  function syncHouses() {
    if (fpop.hidden && !fpop.innerHTML) return;
    fpop.querySelectorAll('input[data-house]').forEach(cb => { cb.checked = !state.hiddenHouses.has(cb.dataset.house); });
    regionsNow().forEach(r => {
      const cb = fpop.querySelector('input[data-reg="' + r.id + '"]'); if (!cb) return;
      const on = r.houses.filter(h => !state.hiddenHouses.has(h)).length;
      cb.checked = on === r.houses.length; cb.indeterminate = on > 0 && on < r.houses.length;
    });
    const all = ALL().length, shown = all - state.hiddenHouses.size, el = fpop.querySelector('.f-shown');
    if (el) el.textContent = !shown ? App.t('все дома сняты — отметьте нужные') : shown === all ? App.t('видны все {all}', { all }) : App.t('видно {n} из {all}', { n: shown, all });
    [['great', GREAT()], ['minor', MINOR()]].forEach(([k, hs]) => { const c = fpop.querySelector('[data-cnt="' + k + '"]'); if (c) c.textContent = App.t('{n} из {all}', { n: hs.filter(h => !state.hiddenHouses.has(h)).length, all: hs.length }); });
  }
  function searchHouses() {
    const q = state.fq.trim().toLowerCase();
    fpop.querySelectorAll('.f-greats .f-item').forEach(it => { it.hidden = !!q && !it.dataset.name.includes(q); });
    fpop.querySelectorAll('.f-reg').forEach(sec => {
      const regHit = q && sec.dataset.name.includes(q);
      let n = 0;
      sec.querySelectorAll('.f-item').forEach(it => { const ok = !q || regHit || it.dataset.name.includes(q); it.hidden = !ok; if (ok) n++; });
      sec.hidden = !n;
    });
    let any = false;
    fpop.querySelectorAll('.f-block').forEach(b => { const n = b.querySelectorAll('.f-item:not([hidden])').length; b.hidden = !n; if (n) any = true; });
    const e = fpop.querySelector('.f-empty'); if (e) e.hidden = any;
  }
  // оставить видимыми только эти дома (хотя бы один дом всегда остаётся)
  const showOnly = hs => { state.hiddenHouses = new Set(ALL().filter(h => !hs.includes(h))); syncHouses(); applyHouses(); };
  function updateCount() {
    // скрытые дома — один фильтр, сколько бы их ни было; положение — по числу снятых галочек
    const n = (state.hiddenHouses.size ? 1 : 0) + (state.ridersOnly ? 1 : KINDS.length - state.kinds.size);
    fcount.hidden = !n; fcount.textContent = n;
    fbtn.classList.toggle('active', !!n);
  }
  // пустое поле: ни одного дома не выбрано — подсказка с кнопками вместо пустоты (на древе, в хронологии и в списке)
  const noHouses = document.getElementById('no-houses');
  function syncEmpty() {
    const empty = ALL().length > 0 && ALL().every(h => state.hiddenHouses.has(h)) && ['people', 'time', 'list'].includes(state.view);
    noHouses.hidden = !empty;
    box.classList.toggle('mm-empty', empty);
  }
  noHouses.addEventListener('click', e => {
    const b = e.target.closest('[data-nh]'); if (!b) return;
    if (b.dataset.nh === 'all') { state.hiddenHouses = new Set(); syncHouses(); applyHouses(); }
    else { e.stopPropagation(); openFilters(true); }
  });
  App.hooks.view.push(() => syncEmpty());
  function applyHouses() {
    syncEmpty();
    App.render();
    App.fitAll();
    updateCount();
    (App.hooks.houses || []).forEach(f => f());
    App.decorate();
  }
  function openFilters(open) {
    fpop.hidden = !open;
    fbtn.setAttribute('aria-expanded', String(open));
    if (open) { renderFilters(); const f = fpop.querySelector('.f-search'); f && f.focus(); }
  }
  fbtn.addEventListener('click', e => { e.stopPropagation(); openFilters(fpop.hidden); });
  document.addEventListener('click', e => { if (!fpop.hidden && !e.target.closest('.lens-menu')) openFilters(false); });
  fpop.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    // Esc в непустой строке поиска сначала очищает её
    if (e.target.classList.contains('f-search') && e.target.value) { e.target.value = state.fq = ''; searchHouses(); return; }
    openFilters(false); fbtn.focus();
  });
  fpop.addEventListener('input', e => { if (e.target.classList.contains('f-search')) { state.fq = e.target.value; searchHouses(); } });
  fpop.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.house) {
      if (t.checked) state.hiddenHouses.delete(t.dataset.house); else state.hiddenHouses.add(t.dataset.house);
      syncHouses(); applyHouses();
    } else if (t.dataset.reg) {
      const r = regionsNow().find(x => x.id === t.dataset.reg);
      r.houses.forEach(h => (t.checked ? state.hiddenHouses.delete(h) : state.hiddenHouses.add(h)));
      syncHouses(); applyHouses();
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
      const f = all.dataset.fall;
      state.hiddenHouses = new Set(f === 'core' ? ALL().filter(h => h !== 'targ' && h !== 'vel') : f === 'great' ? MINOR() : f === 'minor' ? GREAT() : f === 'none' ? ALL() : []);
      syncHouses(); applyHouses(); return;
    }
    const ball = e.target.closest('[data-ball]'), bnone = e.target.closest('[data-bnone]');
    if (ball || bnone) {
      const hs = (ball || bnone).dataset[ball ? 'ball' : 'bnone'] === 'great' ? GREAT() : MINOR();
      hs.forEach(h => (ball ? state.hiddenHouses.delete(h) : state.hiddenHouses.add(h)));
      syncHouses(); applyHouses(); return;
    }
    const only = e.target.closest('[data-only]');
    if (only) { showOnly([only.dataset.only]); return; }
    const onlyReg = e.target.closest('[data-only-reg]');
    if (onlyReg) { showOnly(regionsNow().find(x => x.id === onlyReg.dataset.onlyReg).houses); return; }
    if (e.target.closest('[data-freset]')) {
      state.hiddenHouses = new Set(); state.kinds = new Set(KINDS.map(k => k[0])); state.ridersOnly = false; state.fq = '';
      renderFilters(); applyHouses(); App.decorate();
    }
  });
  // Если выбранный человек оказался в скрытой полосе — показываем её снова.
  App.hooks.select.push(id => {
    if (!id) return;
    const h = App.bandOf(id);
    if (h && state.hiddenHouses.has(h) && state.view === 'people') { state.hiddenHouses.delete(h); App.render(); updateCount(); App.centerOn(id); }
  });

  App.smokeMini = () => {
    const out = { mmNodes: document.querySelectorAll('#minimap-svg rect.mm-node').length };
    state.hiddenHouses = new Set(ALL().filter(h => h !== 'targ' && h !== 'vel'));
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
