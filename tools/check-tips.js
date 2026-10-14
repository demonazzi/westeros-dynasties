/* Подсказка у линии связи между домами не залипает: снимается, когда указатель ушёл с линии на пустое место, на панель,
   когда древо перестроилось под неподвижным указателем и при смене вкладки. */
const { chromium } = require('./pw');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const bad = [], expect = (ok, what) => { if (!ok) bad.push(what); };
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  p.on('pageerror', e => bad.push('страница: ' + e.message));
  await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'targaryen-tree.html') + '#robb'); await p.waitForTimeout(1500);
  const shown = () => p.evaluate(() => !document.querySelector('.xtip').hidden);
  // точка на видимой линии между домами, где сверху нет ничего другого
  const onLine = () => p.evaluate(() => {
    const s = App.svg.node().getBoundingClientRect();
    for (const el of document.querySelectorAll('#tree path.xhit')) {
      const L = el.getTotalLength();
      for (let f = 0.3; f <= 0.7; f += 0.1) {
        const q = el.getPointAtLength(L * f), m = el.getScreenCTM(), x = m.a * q.x + m.c * q.y + m.e, y = m.b * q.x + m.d * q.y + m.f;
        if (x < s.left + 60 || x > s.right - 260 || y < s.top + 80 || y > s.bottom - 80) continue;
        if (document.elementFromPoint(x, y) === el) return [x, y];
      }
    }
    return null;
  });
  const hover = async () => { const pt = await onLine(); if (!pt) return false; await p.mouse.move(pt[0] - 3, pt[1]); await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(120); return shown(); };
  expect(await hover(), 'подсказка появляется над линией');
  // пустое место древа: фон полосы, где нет ни линии, ни карточки
  const empty = await p.evaluate(() => { const s = App.svg.node().getBoundingClientRect(); for (let y = s.top + 120; y < s.bottom - 80; y += 23) for (let x = s.left + 80; x < s.right - 300; x += 37) { const el = document.elementFromPoint(x, y); if (el && el.classList.contains('band-bg')) return [x, y]; } return null; });
  expect(!!empty, 'нашлось пустое место');
  await p.mouse.move(empty[0], empty[1]); await p.waitForTimeout(120);
  expect(!(await shown()), 'ушли с линии на пустое место — подсказки нет');
  expect(await hover(), 'подсказка снова появляется');
  await p.mouse.move(1400, 500); await p.waitForTimeout(120);
  expect(!(await shown()), 'ушли на панель — подсказки нет');
  expect(await hover(), 'и снова');
  await p.evaluate(() => App.render()); await p.waitForTimeout(150);
  expect(!(await shown()), 'древо перестроилось под неподвижным указателем — подсказки нет');
  expect(await hover(), 'и снова');
  await p.evaluate(() => App.setView('vassal')); await p.waitForTimeout(400);
  expect(!(await shown()), 'сменили вкладку — подсказки нет');
  await b.close();
  if (bad.length) { console.log('ПОДСКАЗКИ — ОШИБКИ:\n' + bad.join('\n')); process.exit(1); }
  console.log('подсказки в порядке: у линии появляется и снимается — уход с линии, на панель, перестройка древа, смена вкладки');
})();
