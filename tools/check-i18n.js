/* Проверка языка в настоящем браузере: ?lang=en включает английский (имена из поля en, русское имя — строкой под
   заголовком, переключатель отмечен), непереведённые строки остаются русскими, без ошибок; кнопка RU возвращает русский. */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
  const url = 'file://' + path.join(__dirname, '..', 'dist', 'targaryen-tree.html');
  const bad = [], expect = (ok, what) => { if (!ok) bad.push(what); };
  await p.goto(url + '?lang=en#robb'); await p.waitForTimeout(900);
  const en = await p.evaluate(() => {
    const robb = App.byId.get('robb');
    return { lang: App.lang, html: document.documentElement.lang, name: robb.name, ru: robb.ruName, h2: document.querySelector('#panel h2').textContent,
      sub: (document.querySelector('#panel .en') || {}).textContent, pressed: document.querySelector('.lang-btn[data-lang="en"]').getAttribute('aria-pressed'),
      t: App.t('строка без перевода'), fill: App.t('{a} из {b}', { a: 1, b: 2 }), card: [...document.querySelectorAll('#tree g.node')].some(n => n.textContent.includes('Robb Stark')) };
  });
  expect(en.lang === 'en' && en.html === 'en', 'язык en и <html lang="en">');
  expect(en.name === 'Robb Stark' && en.ru === 'Робб Старк', 'имя из поля en, русское сохранено: ' + en.name + ' / ' + en.ru);
  expect(en.h2 === 'Robb Stark' && en.sub === 'Робб Старк', 'карточка: английское имя, под ним русское (' + en.h2 + ' / ' + en.sub + ')');
  expect(en.card, 'на древе английское имя');
  expect(en.pressed === 'true', 'переключатель отмечает EN');
  expect(en.t === 'строка без перевода' && en.fill === '1 из 2', 'непереведённое — по-русски, подстановки работают');
  await p.click('.lang-btn[data-lang="ru"]'); await p.waitForTimeout(1200);
  const ru = await p.evaluate(() => ({ lang: App.lang, name: App.byId.get('robb').name, hash: location.hash }));
  expect(ru.lang === 'ru' && ru.name === 'Робб Старк' && ru.hash === '#robb', 'RU возвращает русский и тот же адрес: ' + JSON.stringify(ru));
  errs.forEach(e => bad.push('страница: ' + e));
  await b.close();
  if (bad.length) { console.log('ЯЗЫК — ОШИБКИ:\n' + bad.join('\n')); process.exit(1); }
  console.log('язык в порядке: ?lang=en — имена из en, русское под заголовком, непереведённое по-русски; RU возвращает русский');
})();
