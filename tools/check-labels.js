/* Проверка подписей в настоящем браузере: заголовки домов, подписи пропусков и пунктир не наезжают на карточки и друг на друга. */
const { chromium } = require('./pw');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, '..', 'src', 'vendor', 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'targaryen-tree.html')); await p.waitForTimeout(700);
  // CHECK_PRE — js перед проверкой (например, другой вид или фильтр)
  if (process.env.CHECK_PRE) { await p.evaluate(process.env.CHECK_PRE); await p.waitForTimeout(300); }
  const res = await p.evaluate(() => {
    const bad = [];
    const box = el => { const r = el.getBoundingClientRect(); return { x0: r.left, x1: r.right, y0: r.top, y1: r.bottom }; };
    const hit = (a, c, pad) => a.x0 < c.x1 + pad && c.x0 < a.x1 + pad && a.y0 < c.y1 + pad && c.y0 < a.y1 + pad;
    const name = el => (el.textContent || '').slice(0, 40);
    // Древо в масштабе 1, чтобы пиксели были понятны
    App.svg.call(App.zoom.transform, d3.zoomIdentity);
    const cards = [...document.querySelectorAll('#tree g.node rect.card')].map(c => ({ b: box(c), id: c.parentNode.__data__.data.id }));
    const labels = [...document.querySelectorAll('#tree .gap-note, #tree .gap-years, #tree g.band-head text, #tree g.band-head svg')];
    labels.forEach(l => { const lb = box(l); cards.forEach(c => { if (hit(lb, c.b, 6)) bad.push('древо: «' + name(l) + '» наезжает на ' + c.id); }); });
    // Подписи пропусков между собой и с заголовками
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const hg = el => el.closest('g.band-head');
      if (hg(labels[i]) && hg(labels[i]) === hg(labels[j])) continue;
      // строки одной подписи пропуска стоят вплотную по замыслу; рамки шрифта у них перекрываются, буквы — нет
      if (labels[i].parentNode === labels[j].parentNode && /gap-/.test(labels[i].getAttribute('class')) && /gap-/.test(labels[j].getAttribute('class'))) continue;
      if (hit(box(labels[i]), box(labels[j]), 2)) bad.push('древо: «' + name(labels[i]) + '» и «' + name(labels[j]) + '» наезжают друг на друга');
    }
    // Пунктир пропуска не проходит под текстом своей подписи
    document.querySelectorAll('#tree path.gap-link').forEach(pth => {
      const g = pth.parentNode, L = pth.getTotalLength(), texts = [...g.querySelectorAll('text')].map(box);
      for (let s = 0; s <= L; s += 6) {
        const pt = pth.getPointAtLength(s), m = pth.getScreenCTM(), x = m.a * pt.x + m.c * pt.y + m.e, y = m.b * pt.x + m.d * pt.y + m.f;
        if (texts.some(t => x > t.x0 - 2 && x < t.x1 + 2 && y > t.y0 - 2 && y < t.y1 + 2)) { bad.push('древо: пунктир проходит под подписью «' + name(g.querySelector('text')) + '»'); break; }
        const c = cards.find(c => x > c.b.x0 && x < c.b.x1 && y > c.b.y0 && y < c.b.y1);
        if (c) { bad.push('древо: пунктир «' + name(g.querySelector('text')) + '» проходит через карточку ' + c.id); break; }
      }
    });
    // Хронология: заголовки полос не наезжают на полосы жизни
    App.setView('time');
    const tsvg = document.getElementById('time-svg');
    const bars = [...tsvg.querySelectorAll('.lf, .lf-name, .hit, .reign')].filter(r => r.getBoundingClientRect().width > 0);
    tsvg.querySelectorAll('g.t-head text, g.t-head svg').forEach(l => { const lb = box(l); bars.forEach(r => { if (hit(lb, box(r), 2)) bad.push('хронология: «' + name(l) + '» наезжает на полосу'); }); });
    App.setView('people');
    return { bad, cards: cards.length, labels: labels.length, bars: bars.length };
  });
  if (errs.length) res.bad.push('ошибки страницы: ' + errs.join(' | '));
  console.log('карточек', res.cards, 'подписей', res.labels, 'полос в хронологии', res.bars);
  if (res.bad.length) { console.log([...new Set(res.bad)].join('\n')); process.exitCode = 1; } else console.log('подписи в порядке: заголовки домов, пропуски и пунктир ни на что не наезжают');
  await b.close();
})();
