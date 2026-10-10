/* Малые дома (в полосах — liege): своя полоса, как у великих, но герб в заголовке меньше — на древе, в хронологии
   и в списке; в фильтре — отдельный раздел «Малые дома»; скрываются и показываются сами по себе. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
let html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'artifact.html'), 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, () => '<script>' + fs.readFileSync(path.join(__dirname, 'd3.min.js'), 'utf8') + '</script>').replace(/<link[^>]+>/g, '');
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
const bad = [], expect = (ok, what) => { if (!ok) bad.push(what); };
setTimeout(() => {
  const A = w.App, st = A.state;
  const minor = A.bandOrder().filter(b => b.liege).map(b => b.house), great = A.bandOrder().filter(b => !b.liege).map(b => b.house);
  const sigW = sel => { const s = d.querySelector(sel); return s ? +s.getAttribute('width') : 0; };
  const nodesOf = h => [...d.querySelectorAll('#tree g.node')].filter(n => A.bandOf(n.__data__.data.id) === h).length;
  try {
    A.select(null);
    expect(minor.length > 0, 'в данных нет малых домов');
    minor.forEach(h => {
      expect(nodesOf(h) > 0, h + ': люди малого дома на древе');
      expect(d.querySelector('#tree .h-' + h + ' .band-bg') && d.querySelector('#tree .h-' + h + ' .band-head'), h + ': своя полоса с заголовком');
      const gs = sigW('#tree .h-' + great[0] + ' .band-head svg.sigil'), ms = sigW('#tree .h-' + h + ' .band-head svg.sigil');
      expect(ms > 0 && ms < gs, h + ': герб на древе меньше, чем у великого дома (' + ms + ' и ' + gs + ')');
    });
    // фильтр: два раздела
    d.getElementById('filter-btn').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const legends = [...d.querySelectorAll('#filter-pop fieldset legend')].map(l => l.textContent);
    expect(legends[0] === 'Великие дома' && legends[1] === 'Малые дома', 'разделы фильтра: ' + legends.slice(0, 2).join(', '));
    const inFs = i => [...d.querySelectorAll('#filter-pop fieldset')[i].querySelectorAll('input[data-house]')].map(x => x.dataset.house);
    expect(inFs(0).join() === great.join(), 'в «Великих домах» — великие');
    expect(inFs(1).join() === minor.join(), 'в «Малых домах» — малые');
    // скрыть малый дом галочкой — исчезает только он
    const cb = d.querySelector('#filter-pop input[data-house="' + minor[0] + '"]');
    cb.checked = false; cb.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(nodesOf(minor[0]) === 0, 'скрытый малый дом убран с древа');
    const liege = A.bandLiege(minor[0]);
    expect(nodesOf(liege) > 0, 'его великий дом остаётся');
    st.hiddenHouses = new Set([liege]); A.render();
    expect(nodesOf(minor[0]) > 0, 'скрытый великий дом не прячет малый');
    st.hiddenHouses = new Set(); A.render();
    // хронология и список
    A.setView('time');
    minor.forEach(h => {
      const gs = sigW('#time-svg .h-' + great[0] + ' .band-head svg.sigil'), ms = sigW('#time-svg .h-' + h + ' .band-head svg.sigil');
      expect(ms > 0 && ms < gs, h + ': в хронологии своя полоса, герб меньше');
    });
    A.setView('list');
    minor.forEach(h => {
      const sec = d.querySelector('#list-view .lv-house.h-' + h);
      expect(sec && !sec.querySelector('.lv-body').hidden, h + ': в списке раздел открыт, как у великих');
      expect(sigW('#list-view .lv-house.h-' + h + ' svg.sigil') < sigW('#list-view .lv-house.h-' + great[0] + ' svg.sigil'), h + ': в списке герб меньше');
    });
    A.setView('people');
  } catch (e) { bad.push('ошибка: ' + e.message); }
  errs.forEach(e => bad.push('страница: ' + e));
  if (bad.length) { console.log('МАЛЫЕ ДОМА — ОШИБКИ:\n' + bad.join('\n')); process.exit(1); }
  console.log('малые дома в порядке (' + minor.join(', ') + '): своя полоса, герб меньше на древе, в хронологии и в списке; в фильтре — свой раздел');
  process.exit(0);
}, 1500);
