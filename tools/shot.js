/* Скриншоты собранной страницы: d3 подставляется локально, шрифты — системные. node tools/shot.js [name] [width] [height] [js] [theme] */
const { chromium } = require('./pw');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
(async () => {
  const [name = 'shot', w = '1440', h = '900', js = '', theme = 'light'] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, colorScheme: theme });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, '..', 'src', 'vendor', 'd3.min.js')), contentType: 'application/javascript' });
    if (u.startsWith('file:')) return r.continue();
    return r.abort();
  });
  await page.goto('file://' + path.join(ROOT, 'dist', 'targaryen-tree.html'));
  await page.waitForTimeout(900);
  if (js) { await page.evaluate(js); await page.waitForTimeout(900); }
  await page.screenshot({ path: path.join(ROOT, 'shots', name + '.png') });
  if (errors.length) console.log('ошибки страницы:', errors.filter(e => !/fonts|net::/.test(e)).join(' | '));
  console.log('ok', name);
  await browser.close();
})();
