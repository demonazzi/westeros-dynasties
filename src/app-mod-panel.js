/* Ширина карточки на компьютере: тянуть за левый край, стрелки на клавиатуре, двойной клик — ширина по умолчанию. Ширина запоминается в браузере. */
(function () {
  const App = window.App;
  const main = document.querySelector('.main');
  const handle = document.getElementById('panel-resizer');
  const DEF = 440, MIN = 320;
  const max = () => Math.max(MIN, Math.min(820, (main.clientWidth || 1400) - 380));
  let w = DEF, drag = false;
  try { const saved = +localStorage.getItem('tt-panel-w'); if (saved >= MIN) w = saved; } catch (e) { /* storage may be blocked */ }
  function set(v, save) {
    w = Math.round(Math.max(MIN, Math.min(max(), v)));
    main.style.setProperty('--panel-w', w + 'px');
    handle.setAttribute('aria-valuenow', String(w));
    handle.setAttribute('aria-valuemax', String(max()));
    if (save) { try { localStorage.setItem('tt-panel-w', String(w)); } catch (e) { /* storage may be blocked */ } }
    if (App.redrawScale) App.redrawScale();
  }
  App.setPanelWidth = set;
  set(w);
  handle.addEventListener('pointerdown', e => {
    drag = true;
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    handle.classList.add('drag'); document.body.classList.add('resizing');
    e.preventDefault();
  });
  handle.addEventListener('pointermove', e => { if (drag) set(main.getBoundingClientRect().right - e.clientX); });
  const end = () => { if (!drag) return; drag = false; handle.classList.remove('drag'); document.body.classList.remove('resizing'); set(w, true); };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('lostpointercapture', end);
  handle.addEventListener('dblclick', () => set(DEF, true));
  handle.addEventListener('keydown', e => {
    const step = e.shiftKey ? 80 : 24;
    if (e.key === 'ArrowLeft') { e.preventDefault(); set(w + step, true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); set(w - step, true); }
    else if (e.key === 'Home') { e.preventDefault(); set(DEF, true); }
  });
  window.addEventListener('resize', () => set(w));
})();
