/* Карточка дома: открывается с древа и из хронологии (герб и название полосы), из карточки человека (название дома)
   и из списка. Показывает герб, замок и девиз, текст о доме (texts/houses.md), край, сюзерена и знаменосцев на древе,
   королей и сколько людей дома на древе, а по вкладке «Вассалитет» — кому дом служил. В истории — «h:код», в адресе — #h:код. */
(function () {
  const App = window.App;
  const { byId, esc, state } = App;
  const panel = document.getElementById('panel');
  const panelContent = document.getElementById('panel-content');
  const bandSet = new Set(BANDS.map(b => b.house));
  App.isHouseCard = h => bandSet.has(h);
  // сюзерен в «Кому служил» — по id вассалитета; если у него есть полоса на древе, открываем его карточку
  const HOUSES_BY_V = new Map(Object.keys(HOUSES).filter(h => bandSet.has(h) && HOUSES[h].v).map(h => [HOUSES[h].v, h]));
  App.houseByV = v => HOUSES_BY_V.get(v);

  function stats(code) {
    const ps = PEOPLE.filter(p => p.house === code && !p.group);
    const L = App.life ? ps.map(p => App.life(p.id)).filter(Boolean) : [];
    const a = L.length ? Math.round(Math.min(...L.map(x => x.b))) : null;
    const b = L.length ? Math.round(Math.max(...L.map(x => (x.alive ? 300 : x.d)))) : null;
    return { n: ps.length, a, b, kings: ps.filter(p => p.k === 'K') };
  }
  const houseChip = h => '<li><button type="button" class="chip h-' + h + '" data-house="' + h + '">' + esc(HOUSES[h].band) + '</button></li>';

  function renderHousePanel(code) {
    const H = HOUSES[code];
    if (!H) return;
    const band = BANDS.find(b => b.house === code) || {};
    const info = H.v && App.vHouseInfo ? App.vHouseInfo(H.v) : null;
    const st = stats(code);
    const liege = band.liege;
    const vassals = BANDS.filter(b => b.liege === code).map(b => b.house).sort((x, y) => HOUSES[x].band.localeCompare(HOUSES[y].band, 'ru'));
    const first = band.roots && band.roots.length ? band.roots[0][0] : null;
    // «Замок · «Девиз»»; у Пламмов — только девиз, у Блэквудов вместо девиза пометка
    const parts = String(H.motto || '').split(' · ').filter(Boolean), isWords = x => /^[«"“]/.test(x);
    const words = parts.find(isWords), seat = parts.filter(x => !isWords(x)).join(' · ');
    const yw = App.yearWord;
    const back = state.history.length ? App.historyLabel(state.history[state.history.length - 1]) : null;
    const t = App.t;
    panel.classList.remove('is-empty');
    panelContent.className = 'panel-inner house-card h-' + code;
    panelContent.innerHTML =
      '<span class="grab" aria-hidden="true"></span>' +
      '<div class="panel-nav">' +
        (back ? '<button type="button" class="btn back" id="panel-back" title="Alt + ←">← ' + esc(back) + '</button>' : '<span></span>') +
        '<button type="button" class="btn btn-icon close" id="panel-close" aria-label="Закрыть карточку">×</button>' +
      '</div>' +
      '<div class="panel-top">' + (App.sigilSVG ? App.sigilSVG(code, 0, 0, 64, 'medal') : '') + '<div>' +
        '<p class="eyebrow"><span>' + esc(liege ? t('Малый дом') : t('Великий дом')) + '</span>' + (info ? ' · <span>' + esc(info.region) + '</span>' : '') + '</p>' +
        // второе название под заголовком: в русском — английское, в английском — русское
        '<h2>' + esc(App.lang === 'en' && H.name === H.ruName && info ? 'House ' + info.h.en : H.name) + '</h2>' +
        (App.lang === 'en' ? '<p class="en" lang="ru">' + esc(H.ruName || '') + '</p>' : info ? '<p class="en">House ' + esc(info.h.en) + '</p>' : '') +
      '</div></div>' +
      (seat || words ? '<p class="hc-motto">' + (words ? '<span class="hc-words">' + esc(words) + '</span>' : '') + (seat ? '<span class="hc-seat">' + esc(seat) + '</span>' : '') + '</p>' : '') +
      // текст о доме — из texts/houses.md; пока его нет, на его месте заметка о доме из «Вассалитета»
      (H.t ? (H.tUntranslated ? '<p class="tr-missing">Перевода пока нет — ниже русский текст.</p>' : '') + '<p class="note"' + (H.tUntranslated ? ' lang="ru"' : '') + '>' + esc(H.t) + '</p>' +
        (H.ai ? '<p class="ai-mark" title="Текст написал Claude; автор его ещё правит">✎ Черновик Claude</p>' : '')
        : info && info.note ? '<p class="note vs-note hc-vnote">' + esc(info.note) + '</p>'
        : '<p class="hc-empty">Текст о доме ещё не написан.</p>') +
      '<dl class="facts">' +
        (liege ? App.row('Сюзерен', '<ul class="refs">' + houseChip(liege) + '</ul>') : '') +
        (vassals.length ? App.row('Знаменосцы на древе', '<ul class="refs">' + vassals.map(houseChip).join('') + '</ul>') : '') +
        (st.kings.length ? App.row('Короли', App.list(st.kings.map(p => App.chip(p.id)))) : '') +
        (first && byId.has(first) ? App.row('Первый на древе', App.list([App.chip(first)])) : '') +
        App.row('На древе', '<span>' + esc(App.plural(st.n, 'человек', 'человека', 'человек')) + '</span>' + (st.a != null ? ' · <span>' + esc((st.a < 0 ? yw(st.a) : st.a) + '–' + yw(st.b)) + '</span>' : '')) +
        (info && (info.from != null || info.to != null) ? App.row('Годы дома', esc((info.from != null ? t('с {y}', { y: info.yearWord(info.from) }) : '') + (info.from != null && info.to != null ? ' ' : '') + (info.to != null ? t('по {y}', { y: info.yearWord(info.to - 0.001) }) : ''))) : '') +
      '</dl>' +
      (info && info.periods.length ? '<h3 class="sec">Кому служил</h3>' + (H.t && info.note ? '<p class="note vs-note hc-vnote">' + esc(info.note) + '</p>' : '') + '<ol class="events hc-periods">' + info.periods.map(p =>
        '<li><span class="ev-year">' + esc(p.span) + '</span><span class="ev-text">' +
          (p.to && HOUSES_BY_V.has(p.to) ? '<button type="button" class="linkish" data-house="' + HOUSES_BY_V.get(p.to) + '">' + esc(p.liege) + '</button>' : esc(p.liege)) +
          (p.why ? '<span class="ref-note block">' + esc(p.why) + '</span>' : '') + '</span></li>').join('') + '</ol>' : '') +
      '<div class="panel-actions">' +
        '<button type="button" class="btn" data-house-locate="' + code + '">Показать на древе</button>' +
        (info ? '<button type="button" class="btn" data-house-vassal="' + esc(H.v) + '">Во вкладке «Вассалитет»</button>' : '') +
        (info ? '<a class="btn" href="https://awoiaf.westeros.org/index.php/' + encodeURIComponent(info.h.page || ('House ' + info.h.en)) + '" target="_blank" rel="noopener">A Wiki of Ice and Fire ↗</a>' : '') +
      '</div>';
    panel.scrollTop = 0;
    App.translateDom(panelContent);
    markBand(code);
  }
  App.renderHousePanel = renderHousePanel;

  // выбранная полоса: заголовок подсвечен на древе и в хронологии
  function markBand(code) {
    document.querySelectorAll('.band-sel').forEach(g => g.classList.remove('band-sel'));
    if (code) document.querySelectorAll('g.h-' + code).forEach(g => { if (g.querySelector(':scope > .band-head')) g.classList.add('band-sel'); });
  }

  function openHouse(code, opts) {
    opts = opts || {};
    if (!bandSet.has(code)) return;
    const vw = App.views[state.view] || {};
    const cur = App.currentSubject();
    if (opts.push !== false && cur && cur !== 'h:' + code) { state.history.push(cur); if (state.history.length > 40) state.history.shift(); }
    if (!vw.persons) App.setView('people', { quiet: true });
    // карточка дома заменяет выбранного человека: подсветка с древа снимается
    state.selected = null;
    state.house = code;
    if (state.hiddenHouses && state.hiddenHouses.has(code)) { state.hiddenHouses.delete(code); App.render(); }
    App.decorate();
    renderHousePanel(code);
    App.setHash('h:' + code);
    App.hooks.select.forEach(f => f(null));
    if (opts.locate) locate(code);
  }
  App.openHouse = openHouse;

  // показать полосу дома на древе: вписать её в экран, а если она слишком длинная — начало полосы в читаемом масштабе
  function locate(code) {
    if (state.view !== 'people') App.setView('people', { quiet: true });
    const b = App.bandBoxes().find(x => x.house === code);
    if (!b) return;
    const ns = App.allNodes().filter(n => App.bandOf(n.data.id) === code);
    if (!ns.length) return;
    const x0 = Math.min(...ns.map(n => n.X)), x1 = Math.max(...ns.map(n => n.X)) + App.W;
    App.fitBox(x0 - 80, b.top - 20, x1 + 60, b.bottom, 0.5, true);
  }
  App.locateBand = locate;

  panel.addEventListener('click', e => {
    const h = e.target.closest('[data-house]');
    if (h) { e.stopPropagation(); openHouse(h.dataset.house); return; }
    const l = e.target.closest('[data-house-locate]');
    if (l) { locate(l.dataset.houseLocate); return; }
    const v = e.target.closest('[data-house-vassal]');
    if (v) { App.setView('vassal'); if (App.vOpenHouse) App.vOpenHouse(v.dataset.houseVassal, true); }
  });
  // закрыть карточку дома или выбрать человека — подсветка полосы снимается
  App.hooks.select.push(id => { if (id || !state.house) markBand(null); });
  App.hooks.afterRender.push(() => markBand(state.house));

  const prevStart = App.startHash;
  App.startHash = h => {
    if (h.startsWith('h:') && bandSet.has(h.slice(2))) { openHouse(h.slice(2), { push: false, locate: true }); return true; }
    return prevStart ? prevStart(h) : false;
  };
})();
