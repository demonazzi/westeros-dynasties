/* Проверка вкладки «Вассалитет» в настоящем браузере: в каждой точке перемен у каждого дома есть путь к короне или
   независимому дому без петель; в списке каждый дом ровно один раз, знаменосцы по умолчанию свёрнуты; в кругах каждый
   дом учтён ровно раз, круги не налезают; у событий есть перемены; шкала двигает только год вкладки. */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'targaryen-tree.html')); await p.waitForTimeout(700);
  const res = await p.evaluate(async () => {
    const bad = [];
    App.setView('vassal');
    const H = new Map(V_HOUSES.map(h => [h.id, h]));
    const ROOTS = new Set(['throne', 'indep', 'neutral', 'unknown', ...V_CLAIMANTS.map(c => 'c:' + c.id)]);
    // точки: все границы периодов и вехи
    const ts = new Set();
    V_HOUSES.forEach(h => h.al.forEach(g => { ts.add(g[0] + 0.001); ts.add(g[1] - 0.001); }));
    V_MILESTONES.forEach(m => ts.add(m[0] + 0.001));
    for (let y = -10; y <= 300; y += 7) ts.add(y + 0.3);
    const years = [...ts].filter(y => y >= -10 && y <= 300.98).sort((a, b) => a - b);
    let checked = 0;
    years.forEach(y => {
      const S = App.vSnapshot(y);
      S.par.forEach((p, id) => {
        let q = p, n = 0;
        while (q && H.has(q) && n++ < 20) q = S.par.get(q);
        if (n >= 20) bad.push(y.toFixed(2) + ': петля у ' + id);
        else if (q != null && !ROOTS.has(q) && !H.has(q)) bad.push(y.toFixed(2) + ': ' + id + ' ведёт к неизвестному «' + q + '»');
        if (H.has(p) && !S.par.has(p) && !S.crown.has(p)) bad.push(y.toFixed(2) + ': ' + id + ' служит дому, которого нет на вкладке: ' + p);
      });
      checked++;
    });
    // список: при «Раскрыть всё» каждый дом стоит ровно один раз; по умолчанию знаменосцы свёрнуты
    const wait = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const YS = [-5, 1, 50, 130, 158.6, 196.5, 282.5, 289.5, 299.2, 299.5, 299.7, 300.5, 300.9];
    App.vMode('list');
    for (const y of YS) {
      App.vOpenAll(false); App.vSetYear(y); await wait();
      const closed = document.querySelectorAll('.vs-list-view .vs-row').length;
      App.vOpenAll(true); await wait();
      const S = App.vSnapshot(y);
      const cnt = new Map();
      document.querySelectorAll('.vs-list-view [data-vh]').forEach(e => cnt.set(e.dataset.vh, (cnt.get(e.dataset.vh) || 0) + 1));
      S.par.forEach((p, id) => { const c = cnt.get(id) || 0; if (c !== 1) bad.push(y + ': ' + id + ' в списке ' + c + ' раз'); });
      if (closed >= document.querySelectorAll('.vs-list-view .vs-row').length) bad.push(y + ': свёрнутый список не короче раскрытого');
    }
    App.vOpenAll(false);
    // события: у каждого события есть перемены (кроме первого)
    App.vEvents().forEach((e, i) => { if (i && !e.n) bad.push('событие без перемен: ' + e.name + ' (' + e.t + ')'); });
    // круги: дети внутри корня, корни не налезают друг на друга и не выходят за сцену, каждый дом ровно в одном круге
    App.vMode('bub');
    for (const y of [-10, 1, 100, 130.15, 196.15, 283.35, 299.65, 300.7]) {
      App.vSetYear(y); await wait(); await new Promise(r => setTimeout(r, 30));
      const st = document.getElementById('vs-stage'), W = st.clientWidth, Hh = st.clientHeight;
      const circles = [...document.querySelectorAll('#vs-bub circle.vb:not(.gone)')].map(e => e.__data__);
      const roots = circles.filter(d => d.kind === 'root');
      roots.forEach((a, i) => {
        if (a.x - a.r < -1 || a.x + a.r > W + 1 || a.y - a.r < -1 || a.y + a.r > Hh + 1) bad.push(y + ': корень ' + a.key + ' за краем сцены');
        roots.slice(i + 1).forEach(c => { if (Math.hypot(a.x - c.x, a.y - c.y) < a.r + c.r) bad.push(y + ': корни ' + a.key + ' и ' + c.key + ' налезают'); });
      });
      circles.filter(d => d.parent).forEach(d => { if (Math.hypot(d.x - d.parent.x, d.y - d.parent.y) + d.r > d.parent.r + 0.5) bad.push(y + ': круг ' + d.key + ' вылезает из ' + d.parent.key); });
      const S = App.vSnapshot(y), seen = new Map();
      const add = id => seen.set(id, (seen.get(id) || 0) + 1);
      const under = id => (S.kids.get(id) || []).forEach(k => { add(k); under(k); });
      // корень-дом считается сам, его знаменосцы — по кругам внутри; свёрнутый дом несёт всех своих знаменосцев
      circles.forEach(d => { if (d.id) { add(d.id); if (d.kind !== 'root') under(d.id); } if (d.kind === 'group') d.ids.forEach(k => { add(k); under(k); }); });
      S.par.forEach((p, id) => { const c = seen.get(id) || 0; if (c !== 1) bad.push(y + ': ' + id + ' в кругах ' + c + ' раз'); });
    }
    App.vMode('list');
    return { bad, checked };
  });
  // шкала: перетаскивание двигает год вкладки и не включает срез на древе
  const box = await p.evaluate(() => { const r = document.getElementById('scale-svg').getBoundingClientRect(); return [r.left, r.top, r.width]; });
  await p.mouse.move(box[0] + box[2] * 0.3, box[1] + 30); await p.mouse.down(); await p.mouse.move(box[0] + box[2] * 0.6, box[1] + 30, { steps: 5 }); await p.mouse.up();
  const after = await p.evaluate(() => ({ v: App.vYear(), slice: App.state.year }));
  if (!(after.v > 100 && after.v < 290)) res.bad.push('перетаскивание по шкале дало год ' + after.v);
  if (after.slice != null) res.bad.push('срез по году на древе включился: ' + after.slice);
  await p.evaluate(() => App.vSetYear(298));
  await p.focus('#scale-svg'); await p.keyboard.press('ArrowRight');
  const k = await p.evaluate(() => App.vYear());
  if (!(k > 298)) res.bad.push('стрелка вправо не сдвинула год: ' + k);
  if (errs.length) res.bad.push('ошибки страницы: ' + errs.join(' | '));
  console.log('проверено точек', res.checked);
  if (res.bad.length) { console.log([...new Set(res.bad)].slice(0, 40).join('\n')); console.log('всего замечаний', new Set(res.bad).size); process.exitCode = 1; }
  else console.log('вассалитет в порядке: путь к короне без петель, в списке каждый дом один раз и знаменосцы свёрнуты, в кругах каждый дом учтён один раз, события с переменами, шкала двигает только год вкладки');
  await b.close();
})();
