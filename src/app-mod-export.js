/* Сохранить картинкой: «что на экране» (любая вкладка) или «ветка выбранного» (древо: родитель и дед по линии древа,
   сам человек и все потомки) — в PNG (двойное разрешение) или SVG. Картинка самодостаточна: стили, переменные цветов
   и шрифты кладутся внутрь, внизу — подпись с адресом проекта (лицензия требует указывать авторство). */
(function () {
  const App = window.App;
  const { state, byId } = App;
  const NS = 'http://www.w3.org/2000/svg';
  const SITE = 'demonazzi.github.io/westeros-dynasties';
  const FOOT = 40;
  const btn = document.getElementById('export-btn'), pop = document.getElementById('export-pop');
  if (!btn || !pop) return;

  // все стили страницы одной строкой (вместе со шрифтами) и значения переменных цветов на корне документа
  let cssCache = null;
  const pageCss = () => {
    if (cssCache) return cssCache;
    let s = '';
    [...document.styleSheets].forEach(sh => { try { [...sh.cssRules].forEach(r => { s += r.cssText + '\n'; }); } catch (e) { /* чужой лист */ } });
    return (cssCache = s);
  };
  const rootVars = () => {
    const cs = getComputedStyle(document.documentElement), out = [];
    for (let i = 0; i < cs.length; i++) { const n = cs[i]; if (n.startsWith('--')) out.push(n + ':' + cs.getPropertyValue(n).trim()); }
    return out.join(';');
  };
  const ground = () => getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() || '#131215';

  // копия svg с фоном, стилями и подписью; box — область в координатах копии [x, y, w, h]
  function dress(clone, box) {
    const [x, y, w, h] = box;
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('viewBox', [x, y, w, h + FOOT].join(' '));
    clone.setAttribute('width', w); clone.setAttribute('height', h + FOOT);
    clone.setAttribute('style', rootVars() + ';background:' + ground());
    clone.removeAttribute('role');
    const style = document.createElementNS(NS, 'style');
    style.textContent = pageCss();
    const bg = document.createElementNS(NS, 'rect');
    [['x', x], ['y', y], ['width', w], ['height', h + FOOT], ['fill', ground()]].forEach(([k, v]) => bg.setAttribute(k, v));
    clone.insertBefore(bg, clone.firstChild);
    clone.insertBefore(style, clone.firstChild);
    // полоса подписи — поверх всего, что уходит за нижний край области
    const foot = document.createElementNS(NS, 'rect');
    [['x', x], ['y', y + h], ['width', w], ['height', FOOT], ['fill', ground()]].forEach(([k, v]) => foot.setAttribute(k, v));
    clone.appendChild(foot);
    const t = document.createElementNS(NS, 'text');
    const title = (document.querySelector('.brand h1') || {}).textContent || '';
    t.textContent = title + ' · ' + SITE;
    [['x', x + w - 16], ['y', y + h + FOOT - 14], ['text-anchor', 'end'], ['fill', 'var(--muted)'],
      ['style', 'font: 13px var(--font-ui); letter-spacing: .02em']].forEach(([k, v]) => t.setAttribute(k, v));
    clone.appendChild(t);
    return clone;
  }

  // что на экране: копия svg текущей вкладки с её же сдвигом и масштабом
  function screenSvg() {
    const v = App.views[state.view] || {};
    const el = v.el;
    if (!el || el.tagName.toLowerCase() !== 'svg') return null;
    const r = el.getBoundingClientRect();
    return dress(el.cloneNode(true), [0, 0, Math.round(r.width), Math.round(r.height)]);
  }

  // ветка выбранного на древе: предки по линии древа, он сам и все потомки (что развёрнуто)
  function branchSvg() {
    const id = state.selected;
    const nodes = App.allNodes ? App.allNodes() : [];
    const me = nodes.find(n => n.data.id === id);
    if (!me) return null;
    const keep = new Set();
    // вверх — только родитель и дед: вся линия предков растягивает картинку на всю ширину древа
    for (let n = me, up = 0; n && up <= 2; n = n.parent, up++) keep.add(n.data.id);
    me.descendants().forEach(n => keep.add(n.data.id));
    const svg = App.svg.node(), clone = svg.cloneNode(true);
    // элементы копии стоят в том же порядке, что и в оригинале: данные d3 берутся у оригинала
    const prune = (sel, ok) => {
      const a = svg.querySelectorAll(sel), b = clone.querySelectorAll(sel);
      a.forEach((el, i) => { if (!ok(el.__data__)) b[i].remove(); });
    };
    const has = x => keep.has(x);
    prune('g.node', d => d && has(d.data.id));
    prune('path.link', d => d && has(d.target.data.id) && has(d.source.data.id));
    prune('path.xlink, path.xhit, g.xmark', d => d && d.e && has(d.e.a) && has(d.e.b));
    prune('g.knot, path.union', d => d && d.s && has(d.s.data.id) && (!d.o.id || has(d.o.id)));
    ['.layer-gap', '.layer-over'].forEach(s => clone.querySelectorAll(s).forEach(g => { g.innerHTML = ''; }));
    // область — по карточкам ветки, без учёта сдвига и масштаба экрана
    const W = 176, H = 46, PAD = 70;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    nodes.filter(n => keep.has(n.data.id)).forEach(n => {
      x0 = Math.min(x0, n.X); x1 = Math.max(x1, n.X + W + 34); y0 = Math.min(y0, n.Y - H / 2); y1 = Math.max(y1, n.Y + H / 2);
    });
    // и по линиям между ними: изгиб к ребёнку бывает выше карточек
    svg.querySelectorAll('path.link').forEach(el => {
      const d = el.__data__;
      if (!d || !has(d.target.data.id) || !has(d.source.data.id)) return;
      const b = el.getBBox();
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    });
    const root = clone.querySelector(':scope > g');
    if (root) root.removeAttribute('transform');
    return dress(clone, [Math.floor(x0 - PAD), Math.floor(y0 - PAD), Math.ceil(x1 - x0 + 2 * PAD), Math.ceil(y1 - y0 + 2 * PAD)]);
  }

  const fileName = (kind, ext) => {
    const who = kind === 'branch' && state.selected ? state.selected : (state.view === 'people' ? 'tree' : state.view);
    return 'westeros-' + who + '.' + ext;
  };
  const download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const toText = svg => '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg);

  // PNG: svg рисуется в canvas; масштаб 2, но не больше, чем выдерживает браузер
  function png(svg, name) {
    const w = +svg.getAttribute('width'), h = +svg.getAttribute('height');
    const k = Math.max(0.25, Math.min(2, 16000 / Math.max(w, h), Math.sqrt(120e6 / (w * h))));
    const img = new Image();
    const url = URL.createObjectURL(new Blob([toText(svg)], { type: 'image/svg+xml' }));
    return new Promise((res, rej) => {
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        const ctx = c.getContext('2d');
        ctx.scale(k, k); ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(b => { if (b) { download(b, name); res(); } else rej(new Error('png')); }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('svg')); };
      img.src = url;
    });
  }

  async function save(kind, fmt) {
    const svg = kind === 'branch' ? branchSvg() : screenSvg();
    if (!svg) return;
    btn.setAttribute('aria-busy', 'true');
    try {
      if (fmt === 'svg') download(new Blob([toText(svg)], { type: 'image/svg+xml' }), fileName(kind, 'svg'));
      else await png(svg, fileName(kind, 'png'));
    } finally { btn.removeAttribute('aria-busy'); }
  }
  App.exportSvg = kind => (kind === 'branch' ? branchSvg() : screenSvg());   // для проверок

  // меню
  const t = App.t;
  function renderMenu() {
    const canBranch = state.view === 'people' && !!state.selected && byId.has(state.selected);
    const who = canBranch ? byId.get(state.selected).name : '';
    const item = (kind, fmt, b, s) => '<button type="button" role="menuitem" data-kind="' + kind + '" data-fmt="' + fmt + '"><b>' + b + '</b><span>' + s + '</span></button>';
    pop.innerHTML =
      item('screen', 'png', t('Что на экране — PNG'), t('картинка для постов и сообщений')) +
      item('screen', 'svg', t('Что на экране — SVG'), t('без потери качества, для вики и печати')) +
      (canBranch
        ? item('branch', 'png', t('Ветка: {name} — PNG', { name: App.esc(who) }), t('родитель и дед, сам и все потомки')) +
          item('branch', 'svg', t('Ветка: {name} — SVG', { name: App.esc(who) }), t('то же без потери качества'))
        : '<p class="export-note">' + t('Выберите человека на древе, чтобы сохранить его ветку целиком.') + '</p>');
  }
  const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (!pop.hidden) { close(); return; }
    renderMenu(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
  });
  pop.addEventListener('click', e => {
    const b = e.target.closest('button[data-kind]');
    if (!b) return;
    close();
    save(b.dataset.kind, b.dataset.fmt).catch(() => { /* браузер отказал — ничего не скачано */ });
  });
  document.addEventListener('click', e => { if (!pop.hidden && !e.target.closest('#export-pop, #export-btn')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) close(); });
})();
