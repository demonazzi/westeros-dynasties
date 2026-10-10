/* Малые дома (подполосы): Фреи под Талли (с гербом) и, в копии проекта, Блэквуды там же (без герба).
   Проверяет: свёрнуты по умолчанию, разворачиваются и сворачиваются на древе, в хронологии и в списке, сами
   раскрываются при выборе человека, скрываются вместе с великим домом; затем в копии гоняются smoke,
   check-labels и check-links (свёрнутыми и развёрнутыми). */
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const FX = fs.mkdtempSync(path.join(os.tmpdir(), 'subs-'));
['data', 'texts', 'src'].forEach(d => fs.cpSync(path.join(ROOT, d), path.join(FX, d), { recursive: true }));
fs.mkdirSync(path.join(FX, 'tools'));
fs.readdirSync(__dirname).filter(f => f !== 'node_modules').forEach(f => fs.cpSync(path.join(__dirname, f), path.join(FX, 'tools', f), { recursive: true }));
fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(FX, 'tools', 'node_modules'));
const D = require(path.join(FX, 'tools', 'data.js'));
const meta = JSON.parse(fs.readFileSync(path.join(FX, 'data', 'meta.json'), 'utf8'));
const SUBS = { bw: 'tul' };
meta.bands.forEach(b => { if (SUBS[b.house]) b.sub = SUBS[b.house]; });
delete meta.houses.bw.sigil; // малый дом без герба; у Фреев герб есть — проверяются оба вида заголовка
D.writeJson('meta.json', meta);
const run = (cmd, args, env) => execFileSync(cmd, args, { cwd: FX, env: Object.assign({}, process.env, env || {}), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
run('python3', [path.join(FX, 'tools', 'build.py')]);

const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
let html = fs.readFileSync(path.join(FX, 'dist', 'artifact.html'), 'utf8');
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
const bad = [];
const expect = (ok, what) => { if (!ok) bad.push(what); };
setTimeout(() => {
  const A = w.App, st = A.state;
  w.BANDS_N_SUB = A.bandOrder().filter(b => b.sub).length;
  const nodesOf = h => [...d.querySelectorAll('#tree g.node')].filter(n => A.bandOf(n.__data__.data.id) === h).length;
  try {
    A.select(null);
    const ord = A.bandOrder().map(b => b.house), ti = ord.indexOf('tul');
    expect(['fry', 'bw'].every(h => ord.indexOf(h) > ti && ord.indexOf(h) <= ti + 2), 'малые дома стоят сразу за великим');
    const NSUB = w.BANDS_N_SUB;
    expect(d.querySelectorAll('#tree g.sub-head').length === NSUB, 'на древе строк малых домов: ' + d.querySelectorAll('#tree g.sub-head').length + ', ждали ' + NSUB);
    expect(d.querySelectorAll('#tree g.band-sub.h-fry .sub-sigil svg').length === 1 && !d.querySelector('#tree g.band-sub.h-bw .sub-sigil'), 'герб в строке малого дома — только у того, кому задан');
    expect(nodesOf('fry') === 0 && nodesOf('bw') === 0, 'малые дома свёрнуты по умолчанию');
    const tul = A.bandBoxes().find(b => b.house === 'tul'), fry = A.bandBoxes().find(b => b.house === 'fry');
    expect(fry.top > tul.top && fry.bottom < tul.bottom, 'строка малого дома внутри полосы великого');
    const y0 = A.svg.node().__zoom.applyY(fry.top);
    d.querySelector('#tree g.band-sub.h-fry g.sub-head').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    expect(nodesOf('fry') === A.bandSize('fry'), 'нажатие разворачивает малый дом: ' + nodesOf('fry') + ' из ' + A.bandSize('fry'));
    const y1 = A.svg.node().__zoom.applyY(A.bandBoxes().find(b => b.house === 'fry').top);
    expect(Math.abs(y0 - y1) < 1, 'строка малого дома осталась на месте экрана');
    expect(d.querySelector('#tree g.band-sub.h-fry g.sub-head').getAttribute('aria-expanded') === 'true', 'aria-expanded у развёрнутого');
    A.toggleSub('fry');
    expect(nodesOf('fry') === 0, 'повторное нажатие сворачивает');
    A.select('roslin_fr');
    expect(st.openSubs.has('fry') && nodesOf('fry') === A.bandSize('fry'), 'выбор человека из свёрнутого дома разворачивает его');
    A.select(null); A.toggleSub('fry', false);
    st.hiddenHouses = new Set(['tul']); A.render();
    expect(!d.querySelector('#tree g.band-sub'), 'скрытый великий дом скрывает и малые');
    st.hiddenHouses = new Set(); A.render();
    // хронология
    A.setView('time');
    const lives = () => d.querySelectorAll('#time-svg g.life').length;
    const n0 = lives();
    expect(d.querySelectorAll('#time-svg g.sub-head').length === NSUB, 'в хронологии строк малых домов столько же');
    d.querySelector('#time-svg g.band-sub.h-fry g.sub-head').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    expect(lives() > n0, 'в хронологии малый дом разворачивается');
    A.toggleSub('fry', false); A.toggleSub('bw', false);
    expect(lives() === n0, 'и сворачивается');
    // список
    A.setView('list');
    const subs = [...d.querySelectorAll('#list-view .lv-sub')];
    expect(subs.length === NSUB && subs.every(s => s.querySelector('.lv-body').hidden), 'в списке малые дома свёрнуты');
    const q = d.getElementById('lv-q'); q.value = 'рослин'; q.dispatchEvent(new w.Event('input', { bubbles: true }));
    expect(!d.querySelector('#list-view .lv-sub.h-fry .lv-body').hidden, 'поиск в списке раскрывает малый дом');
    q.value = ''; q.dispatchEvent(new w.Event('input', { bubbles: true }));
    A.setView('people');
  } catch (e) { bad.push('ошибка: ' + e.message); }
  errs.forEach(e => bad.push('страница: ' + e));
  const checks = [['smoke.js', {}], ['check-labels.js', {}], ['check-links.js', {}],
    ['check-labels.js', { CHECK_PRE: "App.bandOrder().filter(b => b.sub).forEach(b => App.toggleSub(b.house, true))" }],
    ['check-links.js', { CHECK_PRE: "App.bandOrder().filter(b => b.sub).forEach(b => App.toggleSub(b.house, true))" }]];
  checks.forEach(([f, env]) => {
    try { run('node', [path.join(FX, 'tools', f)], env); }
    catch (e) { bad.push(f + (env.CHECK_PRE ? ' (развёрнуты)' : '') + ': ' + ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(-4).join(' | ')); }
  });
  fs.rmSync(FX, { recursive: true, force: true });
  if (bad.length) { console.log('МАЛЫЕ ДОМА — ОШИБКИ:\n' + bad.join('\n')); process.exit(1); }
  console.log('малые дома в порядке: свёрнуты, разворачиваются на древе, в хронологии и в списке, раскрываются при выборе, скрываются с великим домом; smoke, подписи и связи — в обоих видах');
  process.exit(0);
}, 1500);
