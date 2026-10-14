/* Хронология: годы жизни и отметки браков не выходят за разумные пределы — рождение не позже 300 г., смерть не
   раньше рождения, отметка брака или помолвки без названного года — не раньше двенадцати лет младшего из пары
   и не позже смерти любого из них; все линии жизни внутри своей полосы. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
let html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'artifact.html'), 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, () => '<script>' + fs.readFileSync(path.join(__dirname, '..', 'src', 'vendor', 'd3.min.js'), 'utf8') + '</script>').replace(/<link[^>]+>/g, '');
const vc = new VirtualConsole(); const errs = [];
vc.on('jsdomError', e => { if (!/baseVal/.test(e.message)) errs.push(e.message); });
const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>', {
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://example.org/',
  beforeParse(w) {
    w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
    w.SVGElement.prototype.getComputedTextLength = function () { return 100; };
    w.SVGElement.prototype.getBBox = function () { return { x: 0, y: 0, width: 100, height: 20 }; };
    Object.defineProperty(w.SVGElement.prototype, 'width', { get() { return { baseVal: { value: 1000 } }; }, configurable: true });
    Object.defineProperty(w.SVGElement.prototype, 'height', { get() { return { baseVal: { value: 700 } }; }, configurable: true });
  }
});
const w = dom.window, d = w.document;
const bad = [];
setTimeout(() => {
  const A = w.App;
  try {
    A.select(null); A.setView('time');
    const end = L => L.alive ? 300 : L.d;
    A.byId.forEach(p => {
      const L = A.life(p.id);
      if (L.b > 300) bad.push(p.id + ': рождение ' + Math.round(L.b));
      if (L.d < L.b) bad.push(p.id + ': смерть раньше рождения');
      if (end(L) > 301) bad.push(p.id + ': конец ' + Math.round(end(L)));
    });
    const named = (p, other) => (p.sp || []).some(([r, note]) => r === other && /(\d+) г\./.test(note || ''));
    const marks = [...d.querySelectorAll('#time-svg g.t-mar')].map(g => g.__data__);
    marks.forEach(m => {
      if (named(m.a.p, m.e.b) || named(m.b.p, m.e.a)) return;
      const lo = Math.max(m.a.L.b, m.b.L.b) + 12, hi = Math.min(end(m.a.L), end(m.b.L));
      if (m.y > hi + 0.01) bad.push('отметка ' + m.key + ' (' + Math.round(m.y) + ') позже смерти одного из пары (' + Math.round(hi) + ')');
      if (m.y < lo - 0.01 && lo <= hi) bad.push('отметка ' + m.key + ' (' + Math.round(m.y) + ') раньше двенадцати лет младшего');
    });
    // линии жизни внутри своих полос
    const boxes = [...d.querySelectorAll('#time-svg .tl-bands .band-bg')].map(r => ({ x1: +r.getAttribute('x') + +r.getAttribute('width'), y0: +r.getAttribute('y'), y1: +r.getAttribute('y') + +r.getAttribute('height') }));
    d.querySelectorAll('#time-svg g.life').forEach(g => {
      const r = g.__data__;
      const box = boxes.find(b => r.y >= b.y0 && r.y <= b.y1);
      if (!box) bad.push(r.p.id + ': линия жизни вне полос');
      else if (r.x0 > box.x1 - 20) bad.push(r.p.id + ': линия жизни начинается за краем полосы');
    });
    console.log('людей', A.byId.size, '· отметок браков', marks.length);
  } catch (e) { bad.push('ошибка: ' + e.message); }
  errs.forEach(e => bad.push('страница: ' + e));
  if (bad.length) { console.log('ХРОНОЛОГИЯ — ОШИБКИ:\n' + bad.join('\n')); process.exit(1); }
  console.log('хронология в порядке: годы жизни в пределах, отметки браков не позже смерти и не раньше юности, линии внутри полос');
  process.exit(0);
}, 1500);
