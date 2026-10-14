const { chromium } = require('./pw'); const fs = require('fs');
(async () => {
  const [file, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js') || u.includes('d3@')) return r.fulfill({ body: fs.readFileSync(require('path').join(__dirname, '..', 'src', 'vendor', 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
  await p.goto('file://' + file); await p.waitForTimeout(800);
  const data = await p.evaluate(() => {
    const pick = name => { try { return eval(name); } catch (e) { return undefined; } };
    const o = {};
    ['PEOPLE', 'SCREEN', 'DRAGONS', 'DRAGON_ORIGINS', 'HOUSES', 'BANDS', 'GAPS', 'DS', 'SCREEN_DRAGONS', 'DRAGON_SCREEN', 'EXTRA', 'NOTES', 'V_HOUSES'].forEach(n => { const v = pick(n); if (v !== undefined) o[n] = v; });
    o._globals = Object.keys(window).filter(k => /^[A-Z_]+$/.test(k));
    return JSON.parse(JSON.stringify(o));
  });
  fs.writeFileSync(out, JSON.stringify(data));
  console.log(file.split('/').pop(), 'ошибки:', errs.length, Object.keys(data).map(k => k + ':' + (Array.isArray(data[k]) ? data[k].length : typeof data[k] === 'object' ? Object.keys(data[k]).length : data[k])).join(' '));
  await b.close();
})();
