/* Книги и сериалы: актёры и отличия в карточках, режим «Экранизации» на древе (приглушает тех, кого нет на экране, и помечает расхождения). */
(function () {
  const App = window.App;
  const { byId, esc, state } = App;
  const SCREEN = (typeof EXTRA !== 'undefined' && EXTRA.screen) || {};
  const DS = typeof DRAGON_SCREEN !== 'undefined' ? DRAGON_SCREEN : {};
  const onScreen = id => !!(SCREEN[id] && SCREEN[id].a && SCREEN[id].a.length);
  const differs = id => !!(SCREEN[id] && SCREEN[id].df);
  App.onScreen = onScreen;
  state.screen = false;

  /* ——— Карточка человека ——— */
  function actorsList(list) {
    return '<ul class="actors">' + list.map(([s, ru, en, note]) =>
      '<li><span class="series s-' + s + '">' + esc(SERIES[s].name) + '</span>' +
      '<span class="actor">' + esc(ru) + (ru === en ? '' : ' <span class="lat">' + esc(en) + '</span>') +
      (note ? '<span class="ref-note">' + esc(note) + '</span>' : '') + '</span></li>').join('') + '</ul>';
  }
  App.hooks.panel.push(p => {
    const e = SCREEN[p.id];
    if (!e) return state.screen ? '<section class="screen-sec quiet"><h3 class="sec-h">В экранизации</h3><p class="muted">В экранизациях этого персонажа нет или он мелькает без имени.</p></section>' : '';
    return '<section class="screen-sec"><h3 class="sec-h">В экранизации</h3>' +
      (e.a && e.a.length ? actorsList(e.a) : '<p class="muted">В экранизациях этого персонажа нет.</p>') +
      (e.dfUntranslated ? '<p class="tr-missing">Это описание пока доступно только по-русски.</p>' : '') +
      (e.df ? '<p class="diff"' + (e.dfUntranslated ? ' lang="ru"' : '') + '><span class="diff-h">Отличия от книг' + (e.ai ? ' <span class="ai-mark inline" title="Описание ещё редактируется">✎ черновик</span>' : '') + '</span>' + esc(e.df) + '</p>' : '') +
      '</section>';
  });
  App.hooks.dragonPanel && App.hooks.dragonPanel.push(d => DS[d.id]
    ? '<section class="screen-sec"><h3 class="sec-h">В экранизации</h3><p class="diff"><span class="diff-h">Отличия от книг</span>' + esc(DS[d.id]) + '</p></section>' : '');

  /* ——— Значок «в сериале иначе» на карточках древа ——— */
  App.hooks.afterRender.push(nodeSel => {
    nodeSel.filter(n => differs(n.data.id)).each(function (n) {
      const g = d3.select(this);
      if (!g.select('g.scr-ico').empty()) return;
      const x = App.dragonsOf && App.dragonsOf(n.data.id).length ? App.W - 42 : App.W - 23;
      const ic = g.append('g').attr('class', 'scr-ico').attr('transform', 'translate(' + x + ',3)');
      ic.append('rect').attr('x', 0.5).attr('y', 0.5).attr('width', 13).attr('height', 9).attr('rx', 2);
      ic.append('path').attr('d', 'M4 12h6M7 9.5v2.5');
      ic.append('title').text(App.t('В экранизации иначе: {text}', { text: SCREEN[n.data.id].df.split('. ')[0] + '.' }));
    });
  });
  // Драконы: значок рядом с именем на шкале
  function markDragons() {
    d3.selectAll('#dragon-svg g.drow').each(function (r) {
      if (!DS[r.d.id]) return;
      const g = d3.select(this);
      if (!g.select('g.scr-ico').empty()) return;
      const name = g.select('text.d-name');
      let w = 120;
      try { w = name.node().getComputedTextLength(); } catch (e) { /* not rendered */ }
      const x = +name.attr('x') + w + 8;
      const ic = g.append('g').attr('class', 'scr-ico').attr('transform', 'translate(' + x + ',-24)');
      ic.append('rect').attr('x', 0.5).attr('y', 0.5).attr('width', 13).attr('height', 9).attr('rx', 2);
      ic.append('path').attr('d', 'M4 12h6M7 9.5v2.5');
      ic.append('title').text(App.t('В экранизации иначе: {text}', { text: DS[r.d.id] }));
    });
  }

  /* ——— Режим «Экранизации» ——— */
  App.hooks.decorate.push(() => state.screen && state.view === 'people' ? id => !onScreen(id) : null);
  const btn = document.getElementById('toggle-screen');
  function setScreen(on) {
    state.screen = on;
    btn.setAttribute('aria-pressed', String(on));
    document.body.classList.toggle('screen-on', on);
    try { localStorage.setItem('tt-screen', on ? '1' : ''); } catch (e) { /* storage may be blocked */ }
    if (on) markDragons();
    App.decorate();
    if (state.view === 'dragons') { if (state.dragon) App.renderDragonPanel(App.DR.get(state.dragon)); }
    else App.renderPanel(state.selected ? byId.get(state.selected) : null);
  }
  App.setScreen = setScreen;
  btn.addEventListener('click', () => setScreen(!state.screen));
  App.hooks.view.push(v => { if (v === 'dragons' && state.screen) markDragons(); });
  try { if (localStorage.getItem('tt-screen') === '1') setTimeout(() => setScreen(true), 0); } catch (e) { /* storage may be blocked */ }

  /* ——— Поиск по актёрам ——— */
  const actorIndex = [];
  Object.keys(SCREEN).forEach(id => (SCREEN[id].a || []).forEach(([, ru, en]) => actorIndex.push({ id, keys: [ru.toLowerCase(), en.toLowerCase()] })));
  const prevFind = App.findAny;
  App.findAny = q => {
    const hit = prevFind ? prevFind(q) : null;
    if (hit) return hit;
    q = q.trim().toLowerCase();
    if (q.length < 3) return null;
    const a = actorIndex.find(x => x.keys.some(k => k === q)) || actorIndex.find(x => x.keys.some(k => k.includes(q)));
    return a ? { type: 'person', id: a.id } : null;
  };

  App.smokeScreen = () => {
    setScreen(true);
    App.select('daemon', { force: true });
    const out = { screenSection: !!document.querySelector('#panel .screen-sec .actors'), dimmed: document.querySelectorAll('g.node.dim').length, tvIcons: document.querySelectorAll('g.node g.scr-ico').length };
    const inp = document.getElementById('search-input'); inp.value = 'Мэтт Смит';
    document.getElementById('search-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    out.actorSearch = (document.querySelector('#panel h2') || {}).textContent;
    setScreen(false);
    return out;
  };
})();
