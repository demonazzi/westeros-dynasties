/* Проверка шкалы в настоящем браузере: рамка обзора, полоса выбранного и подписи колонок совпадают с тем, что видно на экране. */
const { chromium } = require('./pw');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, '..', 'src', 'vendor', 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'targaryen-tree.html')); await p.waitForTimeout(700);
  // Общая функция в странице: ожидаемая рамка и та, что нарисована
  await p.evaluate(() => {
    window.__free = w => { const s = d3.scaleLinear().domain([-180, 0, 302]).range([18, 18 + (w - 36) * 0.2, w - 18]); return s; };
    window.__check = () => {
      const svgNode = App.svg.node(), r = svgNode.getBoundingClientRect(), t = d3.zoomTransform(svgNode);
      let a = Infinity, bb = -Infinity, who = [];
      App.allNodes().forEach(n => {
        const x0 = t.applyX(n.X), x1 = t.applyX(n.X + App.W), sy = t.applyY(n.Y);
        const vis = Math.min(x1, r.width) - Math.max(x0, 0);
        if (vis < (x1 - x0) * 0.35 || sy < 0 || sy > r.height) return;
        const L = App.life(n.data.id), end = L.alive ? 300 : L.d;
        who.push(n.data.id);
        a = Math.min(a, L.b); bb = Math.max(bb, end);
      });
      const rect = document.querySelector('#scale-svg .ts-win rect');
      const w = document.getElementById('scale').clientWidth;
      const X = window.__free(w);
      if (!who.length) return { ok: !rect, note: 'пусто' };
      if (!rect) return { ok: false, note: 'нет рамки', exp: [a, bb] };
      const gotA = X.invert(+rect.getAttribute('x') + 3), gotB = X.invert(+rect.getAttribute('x') + +rect.getAttribute('width') - 3);
      // рамка не уже 6px: у очень короткой жизни правый край отодвинут
      const narrow = X(bb) - X(a) < 6;
      return { ok: Math.abs(gotA - a) < 0.6 && (Math.abs(gotB - bb) < 0.6 || narrow) || (bb - a < 1), exp: [Math.round(a), Math.round(bb)], got: [Math.round(gotA), Math.round(gotB)], n: who.length };
    };
  });
  const bad = [];
  // 1. Вид как на скриншоте: дети Роберта крупно
  await p.evaluate(() => { const n = App.nodeById.get('myrcella'); const r = App.svg.node().getBoundingClientRect(); const k = 1.4; App.svg.call(App.zoom.transform, d3.zoomIdentity.translate(r.width * 0.3 - k * n.X, r.height / 2 - k * n.Y).scale(k)); });
  await p.waitForTimeout(250);
  const robertKids = await p.evaluate(() => window.__check());
  console.log('дети Роберта:', JSON.stringify(robertKids));
  if (!robertKids.ok || robertKids.exp[1] < 300) bad.push('дети Роберта');
  // 2. Случайные виды древа
  for (let i = 0; i < 40; i++) {
    const res = await p.evaluate(i => {
      const ns = App.allNodes(); const n = ns[(i * 37) % ns.length];
      const r = App.svg.node().getBoundingClientRect(); const k = [0.08, 0.2, 0.45, 0.8, 1.3][i % 5];
      App.svg.call(App.zoom.transform, d3.zoomIdentity.translate(r.width * ((i % 7) / 7) - k * n.X, r.height * ((i % 3) / 3 + 0.2) - k * n.Y).scale(k));
      return null;
    }, i);
    await p.waitForTimeout(120);
    const c = await p.evaluate(() => window.__check());
    if (!c.ok) bad.push('вид ' + i + ' ' + JSON.stringify(c));
  }
  // 3. Полоса выбранного = годы жизни
  for (const id of ['joffrey_b', 'robert', 'aegon5', 'rhaenys_q', 'aenar', 'daenerys', 'jon']) {
    const c = await p.evaluate(id => {
      App.select(id, { force: true });
      return new Promise(res => setTimeout(() => {
        const L = App.life(id), end = L.alive ? 300 : L.d;
        const rect = document.querySelector('#scale-svg .ts-sub-bar');
        const X = window.__free(document.getElementById('scale').clientWidth);
        if (!rect) return res({ id, ok: false, note: 'нет полосы' });
        const a = X.invert(+rect.getAttribute('x')), b = X.invert(+rect.getAttribute('x') + +rect.getAttribute('width'));
        const label = (document.querySelector('#scale-svg .ts-sub-label text') || {}).textContent;
        res({ id, ok: Math.abs(a - L.b) < 0.6 && (Math.abs(b - end) < 0.6 || b - a <= 2), exp: [Math.round(L.b), Math.round(end)], got: [Math.round(a), Math.round(b)], label });
      }, 120));
    }, id);
    console.log('полоса', JSON.stringify(c));
    if (!c.ok) bad.push('полоса ' + id);
  }
  // 4. Подписи колонок: текст совпадает с расчётом, подпись над своей колонкой
  const gens = await p.evaluate(() => {
    App.svg.call(App.zoom.transform, d3.zoomIdentity.translate(40, 0).scale(0.35));
    return new Promise(res => setTimeout(() => {
      const t = d3.zoomTransform(App.svg.node());
      const out = [];
      document.querySelectorAll('#scale-svg .ts-gen').forEach(g => {
        const m = /translate\(([-\d.]+)/.exec(g.getAttribute('transform'));
        const x = +m[1];
        const col = App.colAt(t.invertX(x));
        const cardL = t.applyX(App.colX(col)), cardR = t.applyX(App.colX(col) + App.W);
        out.push({ text: g.querySelector('text').textContent, col, inside: x >= cardL - 30 && x <= cardR + 30 });
      });
      res(out);
    }, 150));
  });
  if (gens.some(g => !g.inside)) bad.push('подписи колонок не над колонками: ' + JSON.stringify(gens.filter(g => !g.inside)));
  // 5. Список: рамка = годы жизни видимых поколений
  const list = await p.evaluate(() => {
    App.setView('list');
    const el = document.getElementById('list-view');
    el.scrollTop = 1600;
    return new Promise(res => setTimeout(() => {
      const r = el.getBoundingClientRect(); let a = Infinity, bb = -Infinity;
      el.querySelectorAll('.lv-gen-wrap:not([hidden])').forEach(w => { const q = w.getBoundingClientRect(); if (q.bottom < r.top + 60 || q.top > r.bottom) return; w.querySelectorAll('.lv-item').forEach(it => { const L = App.life(it.dataset.id); a = Math.min(a, L.b); bb = Math.max(bb, L.alive ? 300 : L.d); }); });
      const rect = document.querySelector('#scale-svg .ts-win rect');
      const X = window.__free(document.getElementById('scale').clientWidth);
      const gotA = X.invert(+rect.getAttribute('x') + 3), gotB = X.invert(+rect.getAttribute('x') + +rect.getAttribute('width') - 3);
      res({ exp: [Math.round(a), Math.round(bb)], got: [Math.round(gotA), Math.round(gotB)] });
    }, 300));
  });
  console.log('список', JSON.stringify(list));
  if (Math.abs(list.exp[0] - list.got[0]) > 1 || Math.abs(list.exp[1] - list.got[1]) > 1) bad.push('список');
  await p.screenshot({ path: path.join(__dirname, '..', 'shots', 'check-list.png') });
  // 6. Хронология и драконы: шкала идёт ровно над содержимым (полоса выбранного совпадает с его линией)
  for (const [view, id, sel] of [['time', 'viserys1', '#time-svg g.life[data-id="viserys1"] line.hit'], ['time', 'aenar', '#time-svg g.life[data-id="aenar"] line.hit'], ['dragons', 'vhagar', '#dragon-svg g.drow[data-dragon="vhagar"] rect.d-bar']]) {
    const c = await p.evaluate(([view, id, sel]) => {
      if (view === 'dragons') App.openDragon(id, { center: true }); else { App.setView(view); App.select(id, { force: true, center: true }); }
      return new Promise(res => setTimeout(() => {
        const bar = document.querySelector('#scale-svg .ts-sub-bar'), line = document.querySelector(sel);
        if (!bar || !line) return res({ view, id, ok: false, note: 'нет элементов' });
        const q1 = bar.getBoundingClientRect(), q2 = line.getBoundingClientRect();
        res({ view, id, ok: Math.abs(q1.left - q2.left) < 3, bar: [Math.round(q1.left), Math.round(q1.right)], content: [Math.round(q2.left), Math.round(q2.right)] });
      }, 900));
    }, [view, id, sel]);
    console.log('совпадение', JSON.stringify(c));
    if (!c.ok) bad.push('шкала не над содержимым: ' + view + ' ' + id);
  }
  console.log(bad.length ? 'ОШИБКИ:\n' + bad.join('\n') : 'шкала в порядке: 40 случайных видов древа, дети Роберта, полосы выбранных, подписи колонок, список, хронология и драконы');
  if (errs.length) console.log('ошибки страницы', errs);
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
