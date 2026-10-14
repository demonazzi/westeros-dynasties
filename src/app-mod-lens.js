/* Подсветка: Танец драконов, путь Железного трона, восстания Блэкфайров, Великие советы. Линза приглушает всех, кроме участников, и окрашивает стороны. */
(function () {
  const App = window.App;
  const { byId, esc, state } = App;
  const has = id => byId.has(id);

  const FACTIONS = {
    black: 'Чёрные — за Рейениру', green: 'Зелёные — за Эйгона II',
    king: 'Король на Железном троне', claim: 'Претендент',
    rebel: 'Блэкфайры и их сторонники', loyal: 'Защитники Таргариенов',
    chosen: 'Избран', cand: 'Другие претенденты', host: 'Созвал совет',
    ai: 'Черновик описания'
  };
  const kings = PEOPLE.filter(p => p.k === 'K');
  const throneOrder = App.tKings.map(p => p.id);
  for (let p = byId.get('robert'); p; p = p.su ? byId.get(p.su) : null) throneOrder.push(p.id);
  const LENSES = [
    { id: 'dance', name: 'Танец драконов', sub: 'чёрные и зелёные, 129–131 гг.',
      note: 'Гражданская война за трон после смерти Визериса I.', focus: ['rhaenyra', 'daemon', 'aegon2', 'aemond', 'helaena', 'jacaerys', 'lucerys', 'joffrey', 'daeron_d', 'aegon3'],
      groups: {
        black: ['rhaenyra', 'daemon', 'jacaerys', 'lucerys', 'joffrey', 'aegon3', 'viserys2', 'rhaenys_q', 'corlys', 'baela', 'rhaena_d', 'addam', 'alyn', 'cregan', 'samwell_bw', 'alysanne_bw', 'benjicot', 'elmo', 'kermit', 'oscar', 'jeyne'],
        green: ['aegon2', 'helaena', 'aemond', 'daeron_d', 'jaehaerys_a', 'jaehaera', 'maelor', 'alicent', 'otto', 'gwayne', 'ormund_h', 'jason_l', 'tyland', 'borros']
      } },
    { id: 'throne', name: 'Железный трон', sub: 'путь короны от Эйгона I до Томмена',
      note: 'Стрелки ведут от короля к преемнику.', focus: ['aegon1', 'aenys1', 'maegor1', 'jaehaerys1', 'viserys1', 'aegon2', 'aegon3'],
      groups: {
        king: kings.map(p => p.id),
        claim: PEOPLE.filter(p => p.k === 'C' || (p.k === 'B' && p.cl)).map(p => p.id)
      }, path: throneOrder },
    { id: 'blackfyre', name: 'Восстания Блэкфайров', sub: '196–260 гг.',
      note: 'Пять восстаний потомков Деймона Блэкфайра, бастарда Эйгона IV.', focus: ['daemon_bf', 'aegor', 'brynden', 'daeron2', 'baelor_b', 'maekar1'],
      groups: {
        rebel: PEOPLE.filter(p => p.k === 'B').map(p => p.id).concat(['aegor']),
        loyal: ['daeron2', 'baelor_b', 'maekar1', 'brynden', 'aerys1', 'aegon5', 'jaehaerys2', 'ormund']
      } },
    { id: 'council101', name: 'Великий совет 101 г.', sub: 'наследник Джейехериса I',
      note: 'Лорды выбрали Визериса, внука по мужской линии, а не Лейнора, сына Рейенис.',
      groups: { chosen: ['viserys1'], cand: ['laenor', 'rhaenys_q'], host: ['jaehaerys1'] } },
    { id: 'council233', name: 'Великий совет 233 г.', sub: 'наследник Мейкара I',
      note: 'Корону предложили мейстеру Эймону; он отказался, и выбрали его младшего брата Эгга.',
      groups: { chosen: ['aegon5'], cand: ['aemon_m', 'maegor_a', 'vaella_s'] } }
  ];
  // черновики: описания и отличия от книг, которые написал Claude и которые автор ещё правит
  const SCR = (typeof EXTRA !== 'undefined' && EXTRA.screen) || {};
  LENSES.push({ id: 'ai', name: 'Черновики', sub: 'описания, ожидающие проверки',
    note: 'Подсвечены персонажи с черновыми описаниями.', focus: ['luthor', 'mace', 'olenna', 'garth_t', 'moryn'],
    groups: { ai: PEOPLE.filter(p => p.ai || (SCR[p.id] && SCR[p.id].ai)).map(p => p.id) } });
  LENSES.forEach(l => Object.keys(l.groups).forEach(g => { l.groups[g] = l.groups[g].filter(has); }));
  App.LENSES = LENSES;

  /* ——— Меню ——— */
  const btn = document.getElementById('lens-btn');
  const pop = document.getElementById('lens-pop');
  let current = null;
  function renderMenu() {
    pop.innerHTML = LENSES.map(l =>
      '<button type="button" role="menuitemradio" aria-checked="' + (current === l.id) + '" data-lens="' + l.id + '"><b>' + esc(l.name) + '</b><span>' + esc(l.sub) + '</span></button>').join('') +
      '<button type="button" role="menuitemradio" aria-checked="' + (current == null) + '" data-lens=""><b>Без подсветки</b><span>показать всех</span></button>';
  }
  function openMenu(open) {
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) { renderMenu(); const first = pop.querySelector('[aria-checked="true"]') || pop.querySelector('button'); first && first.focus(); }
  }
  btn.addEventListener('click', e => { e.stopPropagation(); openMenu(pop.hidden); });
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-lens]');
    if (!b) return;
    openMenu(false);
    applyLens(b.dataset.lens || null);
    btn.focus();
  });
  pop.addEventListener('keydown', e => {
    const items = [...pop.querySelectorAll('button')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Escape') { e.stopPropagation(); openMenu(false); btn.focus(); }
  });
  document.addEventListener('click', e => { if (!pop.hidden && !e.target.closest('.lens-menu')) openMenu(false); });

  /* ——— Применение ——— */
  function applyLens(id) {
    const l = LENSES.find(x => x.id === id);
    current = l ? l.id : null;
    btn.classList.toggle('active', !!l);
    if (!l) { App.setLens(null); return; }
    const cls = new Map();
    Object.keys(l.groups).forEach(g => l.groups[g].forEach(pid => { if (!cls.has(pid)) cls.set(pid, g); }));
    const ids = [...cls.keys()];
    const legend = Object.keys(l.groups).filter(g => l.groups[g].length).map(g =>
      '<span class="lens-key" data-faction="' + g + '"><i></i>' + esc(FACTIONS[g]) + '</span>').join('');
    if (!(App.views[state.view] || {}).persons) App.setView('people');
    ['legend', 'time-legend'].forEach(id => { const el = document.getElementById(id); if (el) el.open = false; });
    ids.forEach(App.reveal);
    App.setLens({ id: l.id, ids: new Set(ids), cls, path: l.path || null, label: l.name, html: '<b>' + esc(l.name) + '</b>' + legend + '<span class="lens-note">' + esc(l.note) + '</span>' });
    const v = App.views[state.view];
    if (v && v.fitIds) v.fitIds((l.focus || ids).filter(has), 0.35);
  }
  App.applyLens = applyLens;
  App.hooks.lens.push(lens => { if (!lens || !lens.cls) { current = null; btn.classList.remove('active'); } drawPath(); });

  /* ——— Путь короны на древе людей ——— */
  const defs = App.svg.append('defs');
  defs.append('marker').attr('id', 'arrow-crown').attr('viewBox', '0 0 10 10').attr('refX', 8).attr('refY', 5)
    .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M0 0 L10 5 L0 10 Z').attr('class', 'crown-arrow');
  function drawPath() {
    const layer = App.layers.lens;
    layer.selectAll('*').remove();
    const lens = App.lens;
    if (!lens || !lens.path || state.mode !== 'gen') return;
    const vis = App.visible();
    const ns = lens.path.map(id => App.nodeById.get(id)).filter(n => n && vis.has(n.data.id));
    for (let i = 0; i + 1 < ns.length; i++) {
      const a = ns[i], b = ns[i + 1];
      const x1 = a.X + App.W / 2, y1 = a.Y + (b.Y >= a.Y ? App.H / 2 : -App.H / 2);
      const x2 = b.X + App.W / 2, y2 = b.Y + (b.Y >= a.Y ? -App.H / 2 - 4 : App.H / 2 + 4);
      const dy = Math.max(40, Math.abs(y2 - y1) * 0.4) * (b.Y >= a.Y ? 1 : -1);
      const crown = !lens.pathClass;
      layer.append('path').attr('class', lens.pathClass || 'crown-path')
        .attr('d', 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + dy) + ' ' + x2 + ',' + (y2 - dy) + ' ' + x2 + ',' + y2)
        .attr('marker-end', crown ? 'url(#arrow-crown)' : null)
        .append('title').text(a.data.full + ' → ' + b.data.full);
    }
  }
  App.hooks.afterRender.push(() => drawPath());

  App.smokeLens = () => {
    applyLens('dance');
    const out = { lensGreen: document.querySelectorAll('g.node[data-faction="green"]').length, lensBlack: document.querySelectorAll('g.node[data-faction="black"]').length };
    applyLens('throne');
    out.crownPaths = document.querySelectorAll('path.crown-path').length;
    applyLens(null);
    out.afterClear = document.querySelectorAll('g.node[data-faction]').length;
    return out;
  };
})();
