/* Дымовой тест в jsdom: страница запускается без ошибок, основные действия работают. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
let html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'artifact.html'), 'utf8');
const d3src = fs.readFileSync(path.join(__dirname, 'd3.min.js'), 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, () => '<script>' + d3src + '</script>').replace(/<link[^>]+>/g, '');
const vc = new VirtualConsole(); const errs = [];
vc.on('jsdomError', e => { if (!/baseVal/.test(e.message)) errs.push(e.message + (e.detail ? ' ' + e.detail : '')); });
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
const steps = (process.argv[2] || '').split(',').filter(Boolean);
setTimeout(() => {
  const out = { errors: errs.slice(), nodes: d.querySelectorAll('g.node').length, links: d.querySelectorAll('path.link').length, xlinks: d.querySelectorAll('path.xlink').length, bands: d.querySelectorAll('.band-bg').length, panel: (d.querySelector('#panel h2') || {}).textContent };
  try {
    const click = sel => { const el = typeof sel === 'string' ? d.querySelector(sel) : sel; if (!el) throw new Error('нет элемента ' + sel); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
    const node = name => [...d.querySelectorAll('g.node')].find(n => n.getAttribute('aria-label').startsWith(name));
    click(node('Визерис I')); out.afterClick = d.querySelector('#panel h2').textContent;
    out.events = d.querySelectorAll('#panel .events li').length;
    click(d.querySelector('#panel .chip[data-id="rhaenyra"]')); out.chip = d.querySelector('#panel h2').textContent;
    out.back = (d.querySelector('#panel-back') || {}).textContent;
    click('#panel-back'); out.afterBack = d.querySelector('#panel h2').textContent;
    const inp = d.getElementById('search-input'); inp.value = 'Эгг'; d.getElementById('search-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
    out.search = d.querySelector('#panel h2').textContent;
    if (w.App.smoke) Object.assign(out, w.App.smoke(steps));
    if (w.App.smokeDragons) Object.assign(out, w.App.smokeDragons());
    if (w.App.smokeScreen) Object.assign(out, w.App.smokeScreen());
    if (w.App.smokeTime) Object.assign(out, w.App.smokeTime());
    if (w.App.smokeLens) Object.assign(out, w.App.smokeLens());
    if (w.App.smokeKin) Object.assign(out, w.App.smokeKin());
    if (w.App.smokeMini) Object.assign(out, w.App.smokeMini());
    if (w.App.smokeList) Object.assign(out, w.App.smokeList());
    if (w.App.smokeVassal) Object.assign(out, w.App.smokeVassal());
    if (w.App.smokeScale) Object.assign(out, w.App.smokeScale());
  } catch (e) { out.actionError = e.message; }
  out.errors = errs;
  console.log(JSON.stringify(out, null, 1));
  process.exit(errs.length || out.actionError ? 1 : 0);
}, 1500);
