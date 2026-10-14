/* Малые дома (в полосах — liege): своя полоса, как у великих, но герб в заголовке меньше — на древе, в хронологии
   и в списке; в фильтре — в крае своего сюзерена; скрываются и показываются сами по себе. */
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
    // фильтр: великие дома — своим блоком, малые — своим, по краям сюзеренов; каждый дом ровно один раз
    d.getElementById('filter-btn').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const inBlock = k => [...d.querySelectorAll('#filter-pop .f-block-' + k + ' input[data-house]')].map(x => x.dataset.house);
    expect(inBlock('great').join() === great.join(), 'в блоке «Великие дома» — великие: ' + inBlock('great').join());
    expect(inBlock('minor').length === minor.length && minor.every(h => inBlock('minor').includes(h)), 'в блоке «Малые дома» — все малые');
    const regOfHouse = h => { const cb = d.querySelector('#filter-pop .f-block-minor input[data-house="' + h + '"]'); return cb && cb.closest('.f-reg').dataset.reg; };
    minor.forEach(h => minor.forEach(g => { if (A.bandLiege(h) === A.bandLiege(g)) expect(regOfHouse(h) === regOfHouse(g), h + ' и ' + g + ': один сюзерен — один край'); }));
    const click = sel => d.querySelector('#filter-pop ' + sel).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    // галочка края прячет все его малые дома, «частично» — когда включены не все; «только» оставляет один дом
    const reg = regOfHouse(minor[0]), regCb = d.querySelector('#filter-pop input[data-reg="' + reg + '"]');
    const regHouses = [...d.querySelectorAll('#filter-pop .f-reg[data-reg="' + reg + '"] input[data-house]')].map(x => x.dataset.house);
    regCb.checked = false; regCb.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(regHouses.every(h => st.hiddenHouses.has(h) && nodesOf(h) === 0), 'галочка края прячет все его малые дома');
    regCb.checked = true; regCb.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(regHouses.every(h => !st.hiddenHouses.has(h)), 'галочка края возвращает его дома');
    const cb1 = d.querySelector('#filter-pop input[data-house="' + minor[0] + '"]');
    cb1.checked = false; cb1.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(regCb.indeterminate && !regCb.checked, 'край «частично», когда один его дом скрыт');
    cb1.checked = true; cb1.dispatchEvent(new w.Event('change', { bubbles: true }));
    click('[data-only="' + minor[0] + '"]');
    expect(st.hiddenHouses.size === great.length + minor.length - 1 && nodesOf(minor[0]) > 0, '«только» оставляет один дом');
    // кнопки: только великие, только малые, снять все, все у блоков, все дома
    click('[data-fall="great"]');
    expect(great.every(h => !st.hiddenHouses.has(h)) && minor.every(h => st.hiddenHouses.has(h)), '«только великие»');
    click('[data-fall="minor"]');
    expect(minor.every(h => !st.hiddenHouses.has(h)) && great.every(h => st.hiddenHouses.has(h)), '«только малые»');
    click('[data-fall="none"]');
    expect(st.hiddenHouses.size === great.length + minor.length && d.querySelectorAll('#tree g.node').length === 0, '«снять все» — древо пустое, без ошибок');
    click('[data-ball="great"]');
    expect(great.every(h => !st.hiddenHouses.has(h)) && minor.every(h => st.hiddenHouses.has(h)), '«все» у великих включает только великие');
    click('[data-bnone="great"]'); click('[data-ball="minor"]');
    expect(minor.every(h => !st.hiddenHouses.has(h)) && great.every(h => st.hiddenHouses.has(h)), '«снять» у великих и «все» у малых');
    click('[data-fall="1"]');
    expect(st.hiddenHouses.size === 0, '«все дома»');
    // поиск сужает список
    const q = d.querySelector('#filter-pop .f-search');
    q.value = 'мормонт'; q.dispatchEvent(new w.Event('input', { bubbles: true }));
    const vis = [...d.querySelectorAll('#filter-pop .f-item')].filter(it => !it.hidden).map(it => it.querySelector('input').dataset.house);
    expect(vis.length === 1 && vis[0] === 'mor', 'поиск «мормонт» оставляет только Мормонтов: ' + vis.join());
    q.value = 'север'; q.dispatchEvent(new w.Event('input', { bubbles: true }));
    expect([...d.querySelectorAll('#filter-pop .f-reg')].filter(r => !r.hidden).map(r => r.dataset.reg).join() === 'north', 'поиск по краю показывает весь край');
    q.value = ''; q.dispatchEvent(new w.Event('input', { bubbles: true }));
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
  console.log('малые дома в порядке (' + minor.join(', ') + '): своя полоса, герб меньше на древе, в хронологии и в списке; в фильтре — по краям, с галочкой края, «только» и поиском');
  process.exit(0);
}, 1500);
