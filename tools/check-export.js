/* «Сохранить картинкой»: меню, четыре варианта на древе и «что на экране» на другой вкладке; файл скачивается,
   PNG открывается как картинка, в SVG есть стили, шрифты и подпись с адресом, в ветке — только её люди.
   node tools/check-export.js */
const { chromium } = require('./pw');
const fs = require('fs'), path = require('path'), os = require('os');
(async () => {
  const bad = [], expect = (ok, what) => { if (!ok) bad.push(what); };
  const b = await chromium.launch();
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => bad.push('страница: ' + e.message));
  await p.route('**/*', r => /^(file|data|blob):/.test(r.request().url()) ? r.continue() : r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'targaryen-tree.html') + '#aegon5'); await p.waitForTimeout(1500);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
  const grab = async (kind, fmt) => {
    await p.click('#export-btn'); await p.waitForTimeout(100);
    const item = p.locator(`#export-pop button[data-kind="${kind}"][data-fmt="${fmt}"]`);
    if (!(await item.count())) { bad.push('нет пункта ' + kind + ' ' + fmt); await p.keyboard.press('Escape'); return null; }
    const [d] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), item.click()]);
    const f = path.join(dir, d.suggestedFilename()); await d.saveAs(f); return f;
  };
  const pngOk = f => { const h = fs.readFileSync(f).subarray(0, 8); return h[0] === 0x89 && h.toString('latin1', 1, 4) === 'PNG'; };
  for (const fmt of ['png', 'svg']) for (const kind of ['screen', 'branch']) {
    const f = await grab(kind, fmt);
    if (!f) continue;
    expect(path.basename(f) === 'westeros-' + (kind === 'branch' ? 'aegon5' : 'tree') + '.' + fmt, 'имя файла ' + path.basename(f));
    if (fmt === 'png') { expect(pngOk(f), kind + ': не PNG'); expect(fs.statSync(f).size > 20000, kind + ': PNG пустой'); continue; }
    const s = fs.readFileSync(f, 'utf8');
    expect(/@font-face/.test(s) && /\.card\b/.test(s), kind + ': в SVG нет стилей или шрифтов');
    expect(s.includes('demonazzi.github.io/westeros-dynasties'), kind + ': нет подписи с адресом');
    if (kind === 'branch') {
      const ids = await p.evaluate(() => { const me = App.allNodes().find(n => n.data.id === 'aegon5'); const k = new Set(me.descendants().map(n => n.data.id)); for (let n = me, u = 0; n && u <= 2; n = n.parent, u++) k.add(n.data.id); return k.size; });
      const cards = (s.match(/class="node /g) || []).length;
      expect(cards === ids, 'ветка: карточек ' + cards + ', а людей в ветке ' + ids);
    }
  }
  // без выбранного человека ветки в меню нет — только пояснение
  await p.evaluate(() => App.select(null)); await p.waitForTimeout(200);
  await p.click('#export-btn'); await p.waitForTimeout(100);
  expect(!(await p.locator('#export-pop button[data-kind="branch"]').count()) && (await p.locator('#export-pop .export-note').count()) === 1, 'без выбранного: в меню осталась ветка');
  await p.keyboard.press('Escape');
  expect(await p.locator('#export-pop').isHidden(), 'Esc не закрывает меню');
  // другая вкладка: «что на экране»
  await p.evaluate(() => App.setView('dragons')); await p.waitForTimeout(600);
  const f = await grab('screen', 'png');
  if (f) { expect(path.basename(f) === 'westeros-dragons.png' && pngOk(f), 'драконы: ' + path.basename(f)); }
  await b.close();
  fs.rmSync(dir, { recursive: true, force: true });
  if (bad.length) { console.log('СОХРАНЕНИЕ КАРТИНКОЙ — ОШИБКИ:\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log('сохранение картинкой в порядке: меню, PNG и SVG на древе (экран и ветка), другая вкладка, без выбранного');
})();
