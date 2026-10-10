/* Проверка связей между домами в настоящем браузере: каждый значок брака и каждая линия отзываются на наведение
   (подсказка с обоими именами, подсветка обоих концов) и на нажатие (переход к дальнему концу); значки не лежат на карточках. */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'targaryen-tree.html')); await p.waitForTimeout(700);
  // CHECK_PRE — js перед проверкой (например, другой вид или фильтр)
  if (process.env.CHECK_PRE) { await p.evaluate(process.env.CHECK_PRE); await p.waitForTimeout(300); }
  await p.evaluate(() => { App.reduced = true; App.select(null); });
  const bad = [];
  // Ставит точку дерева (x, y) в центр холста при масштабе k и возвращает экранные координаты
  const aim = (x, y, k) => p.evaluate(([x, y, k]) => {
    const r = App.svg.node().getBoundingClientRect();
    App.svg.interrupt(); App.svg.call(App.zoom.transform, d3.zoomIdentity.translate(r.width / 2 - k * x, r.height / 2 - k * y).scale(k));
    return [r.left + r.width / 2, r.top + r.height / 2];
  }, [x, y, k]);
  const marks = await p.evaluate(() => App.layers.marks.selectAll('g.xmark').data().map(d => ({ key: d.key, a: d.e.a, b: d.e.b, mp: d.mp })));
  const lines = await p.evaluate(() => App.layers.x.selectAll('path.xhit').data().map(d => ({ key: d.key, a: d.e.a, b: d.e.b, type: d.e.type })));
  // Значки не лежат на карточках
  const overlap = await p.evaluate(() => {
    const out = [];
    App.layers.marks.selectAll('g.xmark').each(function (d) {
      const m = this.getBoundingClientRect();
      App.layers.nodes.selectAll('g.node rect.card').each(function (n) { const c = this.getBoundingClientRect(); if (m.left < c.right && c.left < m.right && m.top < c.bottom && c.top < m.bottom) out.push(d.key + ' на ' + n.data.id); });
    });
    return out;
  });
  overlap.forEach(o => bad.push('значок брака лежит на карточке: ' + o));
  // Каждый значок: под указателем именно он, подсказка с обоими именами, нажатие уводит к одному из супругов
  for (const m of marks) {
    await p.evaluate(() => App.select(null));
    // место значка берётся заново: выбор человека из малого дома разворачивает его, и раскладка сдвигается
    const mp = await p.evaluate(key => { const q = App.layers.marks.selectAll('g.xmark').data().find(x => x.key === key); return q ? q.mp : null; }, m.key);
    if (!mp) { bad.push('значок ' + m.key + ' пропал'); continue; }
    const [sx, sy] = await aim(mp[0], mp[1], 1);
    await p.mouse.move(sx - 30, sy - 30); await p.mouse.move(sx, sy);
    const st = await p.evaluate(([sx, sy, key]) => {
      const el = document.elementFromPoint(sx, sy), g = el && el.closest('g.xmark');
      const tip = document.querySelector('.xtip');
      return { under: g ? g.__data__.key : (el ? el.tagName + '.' + el.getAttribute('class') : 'ничего'), tip: tip && !tip.hidden ? tip.textContent : '', peers: document.querySelectorAll('#tree g.node.xpeer').length };
    }, [sx, sy, m.key]);
    const names = await p.evaluate(([a, b]) => [App.byId.get(a).full, App.byId.get(b).full], [m.a, m.b]);
    if (st.under !== m.key) bad.push('значок ' + m.key + ': под указателем ' + st.under);
    if (!st.tip.includes(names[0]) || !st.tip.includes(names[1])) bad.push('значок ' + m.key + ': подсказка «' + st.tip + '»');
    if (st.peers !== 2) bad.push('значок ' + m.key + ': подсвечено концов ' + st.peers);
    await p.mouse.click(sx, sy); await p.waitForTimeout(60);
    const sel = await p.evaluate(() => App.state.selected);
    if (sel !== m.a && sel !== m.b) bad.push('значок ' + m.key + ': нажатие выбрало ' + sel);
  }
  // Каждая линия: у конца A наводим и нажимаем — переносит к B, и наоборот
  for (const l of lines) {
    for (const [from, to] of [[l.a, l.b], [l.b, l.a]]) {
      await p.evaluate(() => App.select(null));
      const pt = await p.evaluate(([key, from, to]) => {
        const path = App.layers.x.selectAll('path.xhit').filter(q => q.key === key).node();
        const L = path.getTotalLength(), n = App.nodeById.get(from), m = App.nodeById.get(to);
        // точка линии вне карточек и вдали от других линий и линий родства, ближайшая к концу from
        // и на его половине (нажатие ведёт к дальнему от указателя концу)
        // карточка вместе с кружком раскрытия справа от неё
        const cards = App.allNodes().map(c => [c.X - 4, c.Y - 27, c.X + 210, c.Y + 27]);
        const sample = (sel, skip) => { const pts = []; sel.each(function (q) { if (skip && skip(q)) return; const P = this.getTotalLength(); for (let s = 0; s <= P; s += 3) { const o = this.getPointAtLength(s); pts.push([o.x, o.y]); } }); return pts; };
        const others = sample(App.layers.x.selectAll('path.xhit'), q => q.key === key);
        // точки линий родства — один раз на раскладку, в сетке по 20 px
        const tkey = App.allNodes().length + '|' + App.bandsBottom();
        if (!window.__tree || window.__tree.key !== tkey) {
          const grid = new Map();
          sample(App.layers.links.selectAll('path.link')).forEach(([x, y]) => { const k = Math.floor(x / 20) + ',' + Math.floor(y / 20); if (!grid.has(k)) grid.set(k, []); grid.get(k).push([x, y]); });
          window.__tree = { key: tkey, grid };
        }
        const nearTree = q => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const c = window.__tree.grid.get((Math.floor(q.x / 20) + i) + ',' + (Math.floor(q.y / 20) + j)); if (c && c.some(o => Math.abs(o[0] - q.x) < 6 && Math.abs(o[1] - q.y) < 6)) return true; } return false; };
        const knots = App.layers.knots.selectAll('g.knot').data(), marks = App.layers.marks.selectAll('g.xmark').data();
        const pick = (gap, half) => {
          let best = null;
          for (let s = 0; s <= L; s += 4) {
            const q = path.getPointAtLength(s);
            if (cards.some(r => q.x > r[0] && q.x < r[2] && q.y > r[1] && q.y < r[3])) continue;
            if (knots.some(k => Math.hypot(k.x - q.x, k.y - q.y) < 14)) continue;
            if (marks.some(k => Math.hypot(k.mp[0] - q.x, k.mp[1] - q.y) < 14)) continue;
            if (others.some(o => Math.abs(o[0] - q.x) < gap && Math.abs(o[1] - q.y) < gap)) continue;
            if (nearTree(q)) continue;
            const dist = Math.hypot(n.X + 88 - q.x, n.Y - q.y);
            if (half && dist >= Math.hypot(m.X + 88 - q.x, m.Y - q.y)) continue;
            if (!best || dist < best.dist) best = { x: q.x, y: q.y, dist };
          }
          return best;
        };
        // если у конца from линия идёт в пучке с другими, берётся чистое место дальше по линии:
        // тогда проверяется, что подсказка и нажатие ведут к одному и тому же концу
        // у линии для наведения полоса 14 px: точка ближе 8 px к соседней линии лежит под ней
        const near = pick(11, true) || pick(8, true);
        if (near) return Object.assign(near, { strict: true });
        return pick(11, false) || pick(8, false);
      }, [l.key, from, to]);
      if (!pt) { bad.push('линия ' + l.key + ': по всей длине сливается с другими линиями'); continue; }
      if (!pt.strict) {
        if (from !== l.a) continue; // одной проверки в чистом месте достаточно
        const [sx, sy] = await aim(pt.x, pt.y, 1.2);
        await p.mouse.move(sx - 20, sy); await p.mouse.move(sx, sy);
        const st = await p.evaluate(([sx, sy]) => { const el = document.elementFromPoint(sx, sy); const tip = document.querySelector('.xtip'); return { under: el ? (el.__data__ && el.__data__.key) || el.getAttribute('class') : 'ничего', tip: tip && !tip.hidden ? tip.textContent : '' }; }, [sx, sy]);
        if (st.under !== l.key) { bad.push('линия ' + l.key + ': под указателем ' + st.under); continue; }
        await p.mouse.click(sx, sy); await p.waitForTimeout(60);
        const sel = await p.evaluate(() => App.state.selected);
        const selName = await p.evaluate(id => id && App.byId.get(id) ? App.byId.get(id).full : '', sel);
        if ((sel !== l.a && sel !== l.b) || !st.tip.includes('перейти к: ' + selName)) bad.push('линия ' + l.key + ': подсказка «' + st.tip + '», нажатие выбрало ' + sel);
        continue;
      }
      const [sx, sy] = await aim(pt.x, pt.y, 1.2);
      await p.mouse.move(sx - 20, sy); await p.mouse.move(sx, sy);
      const st = await p.evaluate(([sx, sy]) => { const el = document.elementFromPoint(sx, sy); const tip = document.querySelector('.xtip'); return { under: el ? (el.__data__ && el.__data__.key) || el.getAttribute('class') : 'ничего', tip: tip && !tip.hidden ? tip.textContent : '' }; }, [sx, sy]);
      if (st.under !== l.key) { bad.push('линия ' + l.key + ' (' + l.type + ') у ' + from + ': под указателем ' + st.under); continue; }
      const toName = await p.evaluate(id => App.byId.get(id).full, to);
      if (!st.tip.includes('перейти к: ' + toName)) bad.push('линия ' + l.key + ' у ' + from + ': подсказка «' + st.tip + '»');
      await p.mouse.click(sx, sy); await p.waitForTimeout(60);
      const sel = await p.evaluate(() => App.state.selected);
      if (sel !== to) bad.push('линия ' + l.key + ' у ' + from + ': нажатие выбрало ' + sel + ', ждали ' + to);
    }
  }
  // Значки браков внутри домов: под указателем именно значок, нажатие открывает второго родителя (или самого родителя, если второй не назван)
  const knots = await p.evaluate(() => App.knots().map(k => ({ key: k.key, x: k.x, y: k.y, want: k.o.id || k.s.data.id })));
  for (const k of knots) {
    await p.evaluate(() => App.select(null));
    const kp = await p.evaluate(key => { const q = App.knots().find(x => x.key === key); return q ? [q.x, q.y] : null; }, k.key);
    if (!kp) { bad.push('узел брака ' + k.key + ' пропал'); continue; }
    const [sx, sy] = await aim(kp[0], kp[1], 1);
    await p.mouse.move(sx - 25, sy - 25); await p.mouse.move(sx, sy);
    const under = await p.evaluate(([sx, sy]) => { const el = document.elementFromPoint(sx, sy); const g = el && el.closest('g.knot'); return g ? g.__data__.key : (el ? el.tagName + '.' + el.getAttribute('class') : 'ничего'); }, [sx, sy]);
    if (under !== k.key) { bad.push('узел брака ' + k.key + ': под указателем ' + under); continue; }
    await p.mouse.click(sx, sy); await p.waitForTimeout(40);
    const sel = await p.evaluate(() => App.state.selected);
    if (sel !== k.want) bad.push('узел брака ' + k.key + ': нажатие выбрало ' + sel + ', ждали ' + k.want);
  }
  console.log('узлов браков внутри домов', knots.length);
  // Перетаскивание, начатое на линии: пока тянут, подсветка и карточки не меняются (иначе всё тормозит),
  // после отпускания наведение снова работает
  {
    await p.evaluate(() => App.select(null));
    const l = lines[0];
    const pt = await p.evaluate(key => { const path = App.layers.x.selectAll('path.xhit').filter(q => q.key === key).node(); const q = path.getPointAtLength(path.getTotalLength() / 2); return [q.x, q.y]; }, l.key);
    const [sx, sy] = await aim(pt[0], pt[1], 1);
    await p.mouse.move(sx - 20, sy); await p.mouse.move(sx, sy);
    const before = await p.evaluate(() => { const t = document.querySelector('.xtip'); return !t.hidden; });
    await p.evaluate(() => { window.__cls = 0; window.__mo = new MutationObserver(ms => ms.forEach(m => { if (m.attributeName === 'class' && m.target.id !== 'tree') window.__cls++; })); window.__mo.observe(App.gRoot.node(), { attributes: true, subtree: true, attributeFilter: ['class'] }); });
    await p.mouse.down();
    for (let i = 1; i <= 30; i++) await p.mouse.move(sx + i * 5, sy + i * 3);
    const during = await p.evaluate(() => ({ cls: window.__cls, panning: App.svg.classed('panning'), tip: !document.querySelector('.xtip').hidden }));
    await p.mouse.up();
    await p.evaluate(() => window.__mo.disconnect());
    const afterEnd = await p.evaluate(() => App.svg.classed('panning'));
    if (!before) bad.push('перетаскивание: до него подсказка линии ' + l.key + ' не появилась');
    // в начале перетаскивания один раз снимается подсветка (линия, значок, два конца); дальше — ничего
    if (during.cls > 8) bad.push('перетаскивание по линии: классы на древе менялись ' + during.cls + ' раз');
    if (!during.panning || during.tip) bad.push('перетаскивание: panning ' + during.panning + ', подсказка ' + during.tip);
    if (afterEnd) bad.push('перетаскивание: после отпускания класс panning остался');
    const pt2 = await p.evaluate(key => { const path = App.layers.x.selectAll('path.xhit').filter(q => q.key === key).node(); const q = path.getPointAtLength(path.getTotalLength() / 2); return [q.x, q.y]; }, l.key);
    const [tx, ty] = await aim(pt2[0], pt2[1], 1);
    await p.mouse.move(tx - 20, ty); await p.mouse.move(tx, ty);
    const again = await p.evaluate(() => !document.querySelector('.xtip').hidden && document.querySelectorAll('#tree g.node.xpeer').length === 2);
    if (!again) bad.push('перетаскивание: после него наведение на линию ' + l.key + ' не работает');
  }
  if (errs.length) bad.push('ошибки страницы: ' + errs.join(' | '));
  console.log('значков брака', marks.length, 'линий между домами', lines.length);
  if (bad.length) { console.log(bad.join('\n')); process.exitCode = 1; } else console.log('связи в порядке: значки и линии отзываются на наведение и нажатие, ведут к нужному концу, на карточках не лежат; перетаскивание с линии не трогает подсветку');
  await b.close();
})();
