/* Проверка языка в настоящем браузере.
   1) ?lang=en без словарей: имена из поля en, русское имя под заголовком, непереведённое — по-русски, пометка
      «перевода пока нет» над русским текстом; кнопка RU возвращает русский на том же адресе.
   2) с тестовыми словарями (window.__I18N_TEST): подписи интерфейса, шаблоны с подстановками и формы числа,
      строки данных (дом, девиз, приписка к браку, человек без карточки), годы «не позднее N», английский текст человека,
      подписи, дорисованные позже (фильтры, другие вкладки). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const bad = [], expect = (ok, what) => { if (!ok) bad.push(what); };
  const url = 'file://' + path.join(__dirname, '..', 'dist', 'targaryen-tree.html');
  const page = async init => {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    p.on('pageerror', e => bad.push('страница: ' + e.message));
    await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
    if (init) await p.addInitScript(init);
    return p;
  };
  // 1 — без словарей
  let p = await page();
  await p.goto(url + '?lang=en#robb'); await p.waitForTimeout(900);
  const en = await p.evaluate(() => {
    const robb = App.byId.get('robb');
    return { lang: App.lang, html: document.documentElement.lang, name: robb.name, ru: robb.ruName, h2: document.querySelector('#panel h2').textContent,
      sub: (document.querySelector('#panel .en') || {}).textContent, pressed: document.querySelector('.lang-btn[data-lang="en"]').getAttribute('aria-pressed'),
      miss: !!document.querySelector('#panel .tr-missing'), t: App.t('строка без перевода'), fill: App.t('{a} из {b}', { a: 1, b: 2 }),
      card: [...document.querySelectorAll('#tree g.node')].some(n => n.textContent.includes('Robb Stark')) };
  });
  expect(en.lang === 'en' && en.html === 'en', 'язык en и <html lang="en">');
  expect(en.name === 'Robb Stark' && en.ru === 'Робб Старк', 'имя из поля en, русское сохранено: ' + en.name + ' / ' + en.ru);
  expect(en.h2 === 'Robb Stark' && en.sub === 'Робб Старк', 'карточка: английское имя, под ним русское (' + en.h2 + ' / ' + en.sub + ')');
  expect(en.card, 'на древе английское имя');
  expect(en.pressed === 'true', 'переключатель отмечает EN');
  expect(en.miss, 'над русским текстом — пометка, что перевода нет');
  expect(en.t === 'строка без перевода' && en.fill === '1 из 2', 'непереведённое — по-русски, подстановки работают');
  await p.click('.lang-btn[data-lang="ru"]'); await p.waitForTimeout(1200);
  const ru = await p.evaluate(() => ({ lang: App.lang, name: App.byId.get('robb').name, hash: location.hash }));
  expect(ru.lang === 'ru' && ru.name === 'Робб Старк' && ru.hash === '#robb', 'RU возвращает русский и тот же адрес: ' + JSON.stringify(ru));
  await p.close();
  // 2 — с тестовыми словарями
  p = await page(() => {
    window.__I18N_TEST = {
      ui: { 'Древо': 'Tree', 'Родители': 'Parents', 'Супруги': 'Spouses', 'Бастард': 'Bastard', 'не позднее {n}': 'by {n}', 'р. {b}': 'b. {b}',
        'дом|дома|домов': 'house|houses', 'и {n} малых': 'and {n} minor', '{n} г.': '{n} AC', 'Великие дома': 'Great houses', 'Драконы': 'Dragons', 'Окрас': 'Colouring' },
      data: { 'Дом Ланнистеров': 'House Lannister', 'Утёс Кастерли · «Услышь мой рёв!»': 'Casterly Rock · "Hear Me Roar!"', 'Бриони': 'Briony', 'в сериале — Талиса': 'Talisa in the show' },
      texts: { joy_hill: 'Bastard daughter of Gerion Lannister.' }
    };
  });
  await p.goto(url + '?lang=en#joy_hill'); await p.waitForTimeout(900);
  const t2 = await p.evaluate(() => {
    const robb = App.byId.get('robb');
    return { tab: document.getElementById('tab-people').textContent, eyebrow: document.querySelector('#panel .eyebrow').textContent,
      note: document.querySelector('#panel .note').textContent, miss: !!document.querySelector('#panel .tr-missing'),
      dts: [...document.querySelectorAll('#panel dt')].map(x => x.textContent).join(','), ref: [...document.querySelectorAll('#panel .ref')].map(x => x.textContent).join(','),
      motto: HOUSES.lan.motto, sub: document.getElementById('brand-sub').textContent, date: App.tDate('не позднее 27'), yw: App.yearWord(130),
      robbNote: App.tData(robb.sp[0][1]) };
  });
  expect(t2.tab === 'Tree', 'вкладка из словаря интерфейса: ' + t2.tab);
  expect(t2.eyebrow.startsWith('Bastard · House Lannister'), 'положение и дом: ' + t2.eyebrow);
  expect(t2.note === 'Bastard daughter of Gerion Lannister.' && !t2.miss, 'английский текст человека, без пометки');
  expect(t2.dts.includes('Parents'), 'подписи карточки: ' + t2.dts);
  expect(t2.ref === 'Briony', 'человек без карточки — из словаря данных: ' + t2.ref);
  expect(t2.motto === 'Casterly Rock · "Hear Me Roar!"', 'девиз дома из словаря данных: ' + t2.motto);
  expect(/^12 houses and 33 minor/.test(t2.sub), 'формы числа и шаблон в подзаголовке: ' + t2.sub);
  expect(t2.date === 'by 27' && t2.yw === '130 AC', 'годы: ' + t2.date + ' / ' + t2.yw);
  expect(t2.robbNote === 'Talisa in the show', 'приписка к браку: ' + t2.robbNote);
  await p.evaluate(() => document.getElementById('filter-btn').click()); await p.waitForTimeout(200);
  expect(await p.evaluate(() => document.querySelector('#filter-pop .f-block-h').textContent.startsWith('Great houses')), 'фильтры, дорисованные позже, переведены');
  await p.evaluate(() => App.setView('dragons')); await p.waitForTimeout(400);
  expect(await p.evaluate(() => document.getElementById('tab-dragons').textContent === 'Dragons'), 'вкладка «Драконы»');
  await p.evaluate(() => App.openDragon('balerion', { center: true })); await p.waitForTimeout(300);
  expect(await p.evaluate(() => [...document.querySelectorAll('#panel dt')].some(x => x.textContent === 'Colouring')), 'карточка дракона: подписи переведены наблюдателем');
  await b.close();
  if (bad.length) { console.log('ЯЗЫК — ОШИБКИ:\n' + bad.join('\n')); process.exit(1); }
  console.log('язык в порядке: имена из en, интерфейс, шаблоны и формы числа, строки данных, годы, тексты, дорисованное позже; RU возвращает русский');
})();
