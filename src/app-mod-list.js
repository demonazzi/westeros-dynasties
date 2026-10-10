/* Список «дом → поколение»: указатель всех людей; на телефоне — вид по умолчанию, карточка открывается на весь экран. */
(function () {
  const App = window.App;
  const { byId, esc, state } = App;
  const el = document.getElementById('list-view');
  const panel = document.getElementById('panel');
  const reopen = document.getElementById('reopen');
  let built = false;

  const genLabel = g => g >= 6 ? 'Поколение ' + (g - 5) : 'До Завоевания';
  const yearsLabel = (lo, hi) => {
    const f = y => y < 0 ? -y + ' до З.' : String(y);
    return 'рождения ≈ ' + (lo === hi ? f(lo) : f(lo) + '–' + f(hi));
  };
  function item(p) {
    const dr = App.dragonsOf ? App.dragonsOf(p.id).length : 0;
    return '<li><button type="button" class="lv-item h-' + p.house + ' st-' + p.k + '" data-id="' + p.id + '" data-q="' +
      esc([p.full, p.name, p.en || '', App.houseName(p)].concat(p.al || []).join(' ').toLowerCase()) + '">' +
      '<span class="lv-dot" aria-hidden="true"></span><span class="lv-name">' + esc(p.full) + '</span>' +
      (dr ? '<span class="lv-wing" title="Всадник дракона" aria-label="всадник дракона">' + '<svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true"><path d="M0 9.5 C2 4.5 6 1 13.5 0 C11.3 2 11.3 3.6 13.5 4.6 C10.8 4.9 10.3 6.2 11.3 7.8 C8.2 7 5 7.8 3 10 Z"/></svg></span>' : '') +
      (p.n ? '<span class="lv-badge">' + p.n + '</span>' : '') +
      '<span class="lv-meta">' + esc(App.meta(p)) + '</span></button></li>';
  }
  function build() {
    let html = '<div class="lv-top"><input type="search" id="lv-q" placeholder="Фильтр по имени или прозвищу" aria-label="Фильтр списка" autocomplete="off"><span class="lv-count" id="lv-count"></span></div>';
    BANDS.forEach(band => {
      const order = [];
      const walk = p => { order.push(p); p.kids.forEach(walk); };
      band.roots.forEach(([id]) => walk(byId.get(id)));
      const gens = new Map();
      order.forEach(p => {
        const g = App.genOf ? App.genOf(p.id) : 0;
        if (!gens.has(g)) gens.set(g, []);
        gens.get(g).push(p);
      });
      const keys = [...gens.keys()].sort((a, b) => a - b);
      html += '<section class="lv-house h-' + band.house + '" data-house="' + band.house + '"><h3 class="lv-head"><button type="button" aria-expanded="true">' +
        (App.sigilSVG ? App.sigilSVG(band.house, 0, 0, 26, 'lv-sigil') : '') +
        esc(HOUSES[band.house].band) + '<span class="lv-n">' + order.length + '</span></button></h3><div class="lv-body">';
      const pre = keys.filter(g => g < 6), post = keys.filter(g => g >= 6);
      const groups = (pre.length ? [[pre, 'До Завоевания']] : []).concat(post.map(g => [[g], genLabel(g)]));
      groups.forEach(([gs, label]) => {
        const ps = gs.flatMap(g => gens.get(g));
        const ys = ps.map(p => Math.round(App.life ? App.life(p.id).b : 0));
        const ends = ps.map(p => { const L = App.life ? App.life(p.id) : null; return L ? Math.round(L.alive ? 300 : L.d) : 0; });
        html += '<div class="lv-gen-wrap" data-lo="' + Math.min(...ys) + '" data-hi="' + Math.max(...ys) + '" data-end="' + Math.max(...ends) + '"><h4 class="lv-gen">' + label + '<span>' + yearsLabel(Math.min(...ys), Math.max(...ys)) + '</span></h4><ul class="lv-list">' + ps.map(item).join('') + '</ul></div>';
      });
      html += '</div></section>';
    });
    el.innerHTML = html;
    built = true;
    el.querySelector('#lv-q').addEventListener('input', e => filter(e.target.value));
    (App.hooks.houses = App.hooks.houses || []).push(() => filter());
    filter('');
    decorateList();
  }
  function filter(q) {
    q = q == null ? (el.querySelector('#lv-q') || {}).value || '' : q;
    q = q.trim().toLowerCase();
    let n = 0;
    const hidden = state.hiddenHouses || new Set();
    el.querySelectorAll('.lv-item').forEach(b => { const ok = (!q || b.dataset.q.includes(q)) && !hidden.has(b.closest('.lv-house').dataset.house); b.parentElement.hidden = !ok; if (ok) n++; });
    el.querySelectorAll('.lv-gen-wrap').forEach(w => { w.hidden = !w.querySelector('li:not([hidden])'); });
    el.querySelectorAll('.lv-house').forEach(h => { h.hidden = !h.querySelector('li:not([hidden])'); });
    el.querySelector('#lv-count').textContent = App.plural(n, 'человек', 'человека', 'человек');
  }
  el.addEventListener('click', e => {
    const head = e.target.closest('.lv-head button');
    if (head) {
      const open = head.getAttribute('aria-expanded') !== 'true';
      head.setAttribute('aria-expanded', String(open));
      head.closest('.lv-house').querySelector('.lv-body').hidden = !open;
      return;
    }
    const it = e.target.closest('.lv-item');
    if (it) App.select(it.dataset.id);
  });
  function decorateList() {
    if (!built) return;
    const dim = App.dimmedFn ? App.dimmedFn() : () => false;
    el.querySelectorAll('.lv-item').forEach(b => {
      b.classList.toggle('selected', b.dataset.id === state.selected);
      b.classList.toggle('dim', dim(b.dataset.id));
      b.setAttribute('aria-pressed', String(b.dataset.id === state.selected));
    });
  }
  const prevDecorate = App.decorate;
  App.decorate = () => { prevDecorate(); decorateList(); };
  App.hooks.select.push(() => decorateList());
  App.hooks.lens.push(() => decorateList());

  App.registerView('list', {
    el, sel: d3.select(el), tab: document.getElementById('tab-list'), legend: null, persons: true, links: false, fitLabel: 'Наверх', scale: 'free',
    /* Годы жизни людей тех поколений, что сейчас видны в списке, и переход к году */
    scaleWindow: () => {
      if (!built) return null;
      const r = el.getBoundingClientRect();
      let a = Infinity, b = -Infinity;
      el.querySelectorAll('.lv-gen-wrap:not([hidden])').forEach(w => {
        if (w.closest('.lv-body') && w.closest('.lv-body').hidden) return;
        const q = w.getBoundingClientRect();
        if (q.bottom < r.top + 60 || q.top > r.bottom) return;
        a = Math.min(a, +w.dataset.lo); b = Math.max(b, +w.dataset.end);
      });
      return a <= b ? [a, b] : null;
    },
    scaleGo: y => {
      if (!built) return;
      const ws = [...el.querySelectorAll('.lv-gen-wrap:not([hidden])')];
      const w = ws.find(x => +x.dataset.lo <= y && y <= +x.dataset.hi) || ws.reduce((best, x) => !best || Math.abs((+x.dataset.lo + +x.dataset.hi) / 2 - y) < Math.abs((+best.dataset.lo + +best.dataset.hi) / 2 - y) ? x : best, null);
      if (w) { const body = w.closest('.lv-body'); if (body && body.hidden) { body.hidden = false; const h = body.parentElement.querySelector('.lv-head button'); if (h) h.setAttribute('aria-expanded', 'true'); } el.scrollTo({ top: w.offsetTop - 60, behavior: App.reduced ? 'auto' : 'smooth' }); }
    },
    hint: '',
    zoomBy: () => {},
    fit: () => { el.scrollTo({ top: 0, behavior: App.reduced ? 'auto' : 'smooth' }); },
    center: id => { const b = el.querySelector('.lv-item[data-id="' + id + '"]'); if (b) { b.parentElement.hidden = false; b.scrollIntoView({ block: 'center', behavior: App.reduced ? 'auto' : 'smooth' }); } },
    onShow: () => { if (!built) build(); else { filter(); decorateList(); } },
    hash: () => 'l:' + (state.selected || '')
  });
  const prevStart = App.startHash;
  App.startHash = h => {
    if (h.startsWith('l:')) { App.render(); const id = h.slice(2); if (byId.has(id)) state.selected = id; App.setView('list'); if (byId.has(id)) App.select(id, { force: true, push: false }); return true; }
    return prevStart ? prevStart(h) : false;
  };

  /* ——— Телефон: карточка на весь экран, «Показать на древе» сворачивает её ——— */
  function collapseCard() {
    panel.classList.add('collapsed');
    reopen.hidden = false;
    reopen.textContent = 'Карточка: ' + (byId.get(state.selected) || {}).name + ' ↑';
  }
  // В родословной на телефоне нажатие перестраивает её вокруг человека, а карточка ждёт за полоской внизу —
  // иначе она закрывает весь экран, а крестик сбрасывает родословную и «Назад»
  App.hooks.select.push(id => {
    if (id && App.isNarrow() && state.view === 'kin') { collapseCard(); return; }
    panel.classList.remove('collapsed'); reopen.hidden = true; if (id && App.isNarrow()) panel.scrollTop = 0;
  });
  App.hooks.locate.push(() => { if (App.isNarrow()) collapseCard(); });
  reopen.addEventListener('click', () => { panel.classList.remove('collapsed'); reopen.hidden = true; });
  const coreStart = App.start;
  App.start = () => {
    coreStart();
    if (App.isNarrow() && !location.hash) App.setView('list');
  };

  App.smokeList = () => {
    App.setView('list');
    const out = { listItems: document.querySelectorAll('#list-view .lv-item').length, listHouses: document.querySelectorAll('#list-view .lv-house').length };
    const q = document.getElementById('lv-q'); q.value = 'таргариен'; q.dispatchEvent(new Event('input'));
    out.listFiltered = document.querySelector('#lv-count').textContent;
    q.value = ''; q.dispatchEvent(new Event('input'));
    const b = document.querySelector('#list-view .lv-item[data-id="cregan"]');
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    out.listPanel = (document.querySelector('#panel h2') || {}).textContent;
    App.setView('people');
    return out;
  };
})();
