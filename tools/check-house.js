/* Карточка дома в настоящем браузере.
   Открывается: по адресу #h:код, кликом по гербу и названию полосы на древе и в хронологии, по названию дома
   в карточке человека, из списка и из карточки дома во вкладке «Вассалитет». Проверяет историю (назад к человеку
   и обратно), подсветку полосы, «Показать на древе» (полоса в экране и читаема), текст о доме (общий с «Вассалитетом») и его пометку ✎, сюзерена по вассалитету,
   королей краёв и претендентов, ярлыки полос у левого края,
   английскую версию (английское название, без русского). */
const { chromium } = require('./pw');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const bad = [], expect = (ok, what) => { if (!ok) bad.push(what); };
  const url = 'file://' + path.join(__dirname, '..', 'dist', 'targaryen-tree.html');
  const page = async () => {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    p.on('pageerror', e => bad.push('страница: ' + e.message));
    await p.route('**/*', r => { const u = r.request().url(); if (u.includes('d3.min.js')) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'd3.min.js')), contentType: 'application/javascript' }); if (u.startsWith('file:')) return r.continue(); return r.abort(); });
    return p;
  };
  const card = p => p.evaluate(() => ({ house: App.state.house, sel: App.state.selected, hash: location.hash, view: App.state.view,
    h2: (document.querySelector('#panel h2') || {}).textContent, cls: document.getElementById('panel-content').className,
    band: [...document.querySelectorAll('.band-sel')].map(g => g.getAttribute('class')).join(' | ') }));

  // 1 — по адресу
  let p = await page();
  await p.goto(url + '#h:wes'); await p.waitForTimeout(1500);
  let c = await card(p);
  expect(c.house === 'wes' && c.h2 === 'Дом Вестерлингов' && c.cls.includes('house-card'), '#h:wes открывает карточку: ' + JSON.stringify(c));
  expect(/h-wes/.test(c.band), 'полоса Вестерлингов подсвечена: ' + c.band);
  const facts = await p.evaluate(() => ({ dts: [...document.querySelectorAll('#panel dt')].map(x => x.textContent), words: (document.querySelector('#panel .hc-words') || {}).textContent,
    seat: (document.querySelector('#panel .hc-seat') || {}).textContent, per: document.querySelectorAll('#panel .hc-periods li').length, empty: !!document.querySelector('#panel .hc-empty'),
    notes: [...document.querySelectorAll('#panel .note')].map(x => x.textContent), want: V_HOUSES.find(h => h.id === HOUSES.wes.v).t,
    wantAi: !!V_HOUSES.find(h => h.id === HOUSES.wes.v).ai, ai: !!document.querySelector('#panel .ai-mark') }));
  expect(facts.dts.includes('Сюзерен') && facts.dts.includes('На древе'), 'строки карточки: ' + facts.dts.join(','));
  expect(facts.words === '«Честь, а не почести»' && facts.seat === 'Скала', 'девиз и замок: ' + facts.words + ' / ' + facts.seat);
  expect(facts.per > 0, 'есть «Кому служил»');
  // текст о доме — из texts/vassals.md, абзацы через пустую строку — отдельными абзацами; ✎ — если текст черновой
  expect(!facts.empty && facts.want && facts.notes.join('\n\n') === facts.want && facts.ai === facts.wantAi, 'текст о доме из texts/vassals.md по абзацам, ✎ по данным: ' + JSON.stringify(facts.notes).slice(0, 200));
  // «Показать на древе»: полоса в экране, масштаб читаемый
  await p.click('#panel [data-house-locate]'); await p.waitForTimeout(1300);
  const loc = await p.evaluate(() => { const k = d3.zoomTransform(App.svg.node()).k; const r = document.querySelector('g.h-wes .band-bg').getBoundingClientRect(); const s = App.svg.node().getBoundingClientRect(); return { k, top: r.top, bottom: r.bottom, sTop: s.top, sBottom: s.bottom }; });
  expect(loc.k >= 0.5 && loc.bottom > loc.sTop + 100 && loc.top < loc.sBottom - 100, '«Показать на древе» — полоса в экране: ' + JSON.stringify(loc));
  // сюзерен — карточка его дома, назад — обратно
  await p.click('#panel .facts [data-house="lan"]'); await p.waitForTimeout(500);
  c = await card(p);
  expect(c.house === 'lan' && c.hash === '#h:lan', 'сюзерен открывает карточку Ланнистеров: ' + JSON.stringify(c));
  await p.click('#panel-back'); await p.waitForTimeout(500);
  expect((await card(p)).house === 'wes', 'назад — к Вестерлингам');

  // 2 — клик по заголовку полосы на древе
  await p.evaluate(() => App.select(null)); await p.waitForTimeout(300);
  await p.evaluate(() => { const b = App.bandBoxes().find(x => x.house === 'stk'); App.fitBox(b.hx0 - 40, b.top - 30, b.hx0 + 900, b.top + 400, 0.5); }); await p.waitForTimeout(1200);
  const pt = await p.evaluate(() => { const r = document.querySelector('g.h-stk .band-hit').getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2; const el = document.elementFromPoint(x, y); return { x, y, hit: el && el.getAttribute('class') }; });
  expect(pt.hit === 'band-hit', 'заголовок полосы под указателем: ' + pt.hit);
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(600);
  c = await card(p);
  expect(c.house === 'stk' && c.hash === '#h:stk' && /h-stk/.test(c.band), 'клик по гербу и названию открывает карточку Старков: ' + JSON.stringify(c));
  // человек → дом → назад к человеку
  await p.evaluate(() => App.select('robb', { center: true })); await p.waitForTimeout(700);
  c = await card(p);
  expect(c.sel === 'robb' && !c.house && !c.band, 'выбор человека закрывает карточку дома и снимает подсветку: ' + JSON.stringify(c));
  await p.click('#panel .eyebrow [data-house="stk"]'); await p.waitForTimeout(500);
  c = await card(p);
  expect(c.house === 'stk' && c.sel === null, 'название дома в карточке человека открывает карточку дома');
  await p.click('#panel-back'); await p.waitForTimeout(500);
  c = await card(p);
  expect(c.sel === 'robb' && !c.house, 'назад — к Роббу: ' + JSON.stringify(c));
  await p.click('#panel-back'); await p.waitForTimeout(500);
  expect((await card(p)).house === 'stk', 'и ещё раз назад — к Старкам');
  await p.click('#panel-close'); await p.waitForTimeout(300);
  c = await card(p);
  expect(!c.house && !c.band && c.hash === '', 'закрыть — карточки и подсветки нет: ' + JSON.stringify(c));

  // 3 — хронология, список, вассалитет
  await p.evaluate(() => App.setView('time')); await p.waitForTimeout(1200);
  await p.evaluate(() => [...document.querySelectorAll('g.h-tul .band-hit')].find(x => x.getBoundingClientRect().width > 0).dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(500);
  c = await card(p);
  expect(c.view === 'time' && c.house === 'tul', 'хронология: заголовок полосы открывает карточку: ' + JSON.stringify(c));
  await p.evaluate(() => App.setView('list')); await p.waitForTimeout(800);
  await p.click('.lv-house.h-arr [data-hcard]'); await p.waitForTimeout(500);
  c = await card(p);
  expect(c.view === 'list' && c.house === 'arr', 'список: «Карточка дома»: ' + JSON.stringify(c));
  await p.evaluate(() => App.setView('vassal')); await p.waitForTimeout(1500);
  await p.evaluate(() => App.vOpenHouse(HOUSES.fry.v, true)); await p.waitForTimeout(500);
  await p.click('#panel .vs-card [data-house]'); await p.waitForTimeout(800);
  c = await card(p);
  expect(c.view === 'people' && c.house === 'fry', 'вассалитет: «Карточка дома на древе»: ' + JSON.stringify(c));
  await p.click('#panel [data-house-vassal]'); await p.waitForTimeout(800);
  expect(await p.evaluate(() => App.state.view === 'vassal' && /Фре/.test(document.querySelector('#panel h2').textContent)), 'и обратно во «Вассалитет»');

  // 4 — текст о доме и пометка ✎
  // один текст на обе вкладки: поправили — видно и в карточке дома, и во «Вассалитете»
  await p.evaluate(() => { const h = V_HOUSES.find(x => x.id === HOUSES.pip.v); h.t = 'Проверочный текст.'; h.ai = 0; App.openHouse('pip'); }); await p.waitForTimeout(400);
  const tx = await p.evaluate(() => ({ note: (document.querySelector('#panel .note') || {}).textContent, ai: !!document.querySelector('#panel .ai-mark'), empty: !!document.querySelector('#panel .hc-empty') }));
  expect(tx.note === 'Проверочный текст.' && !tx.ai && !tx.empty, 'текст о доме, без ✎: ' + JSON.stringify(tx));
  await p.click('#panel [data-house-vassal]'); await p.waitForTimeout(800);
  expect(await p.evaluate(() => (document.querySelector('#panel .note') || {}).textContent === 'Проверочный текст.'), 'тот же текст во «Вассалитете»');
  await p.evaluate(() => { const h = V_HOUSES.find(x => x.id === HOUSES.pip.v); h.t = ''; App.openHouse('pip'); }); await p.waitForTimeout(400);
  expect(await p.evaluate(() => !!document.querySelector('#panel .hc-empty') && !document.querySelector('#panel .note')), 'без текста — пометка «ещё не написан»');
  await p.close();

  // 4б — дом из «12», который по вассалитету чей-то знаменосец; короли краёв и претенденты
  p = await page();
  await p.goto(url + '#h:bw'); await p.waitForTimeout(1500);
  const bw = await p.evaluate(() => ({ eb: document.querySelector('#panel .eyebrow').textContent, rows: [...document.querySelectorAll('#panel .facts > div')].map(d => d.querySelector('dt').textContent + ':' + d.querySelector('dd').textContent.trim()) }));
  expect(bw.eb === 'Дом · Речные земли' && bw.rows.includes('Сюзерен:Талли'), 'Блэквуды — «Дом», сюзерен Талли по вассалитету: ' + JSON.stringify(bw));
  const kings = await p.evaluate(() => Object.fromEntries(['stk', 'lan', 'arr', 'gry', 'bar'].map(h => { App.openHouse(h); return [h, [...document.querySelectorAll('#panel .facts > div')].filter(d => /Короли|Претенденты/.test(d.querySelector('dt').textContent)).map(d => d.querySelector('dt').textContent + ':' + [...d.querySelectorAll('[data-id]')].map(x => x.dataset.id).join(',')).join(' | ')]; })));
  expect(/Короли:.*torrhen.*robb/.test(kings.stk) && /loren/.test(kings.lan) && /ronnel_k/.test(kings.arr) && /balon.*euron|euron.*balon/.test(kings.gry) && /Претенденты на трон:.*stannis/.test(kings.bar), 'короли краёв и претенденты: ' + JSON.stringify(kings));
  // ярлык полосы у левого края: заголовок за экраном — ярлык виден и открывает карточку
  await p.evaluate(() => App.select('robb', { center: true })); await p.waitForTimeout(1200);
  const pin = await p.evaluate(() => { const g = [...document.querySelectorAll('.band-pin')].find(g => g.style.display !== 'none' && /h-stk/.test(g.getAttribute('class'))); if (!g) return null; const r = g.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  expect(!!pin, 'у Робба заголовок Старков за экраном — виден ярлык «Старки»');
  if (pin) { await p.mouse.click(pin[0], pin[1]); await p.waitForTimeout(500); expect(await p.evaluate(() => App.state.house === 'stk'), 'ярлык открывает карточку дома'); }
  await p.evaluate(() => App.fitAll()); await p.waitForTimeout(1200);
  expect(await p.evaluate(() => ![...document.querySelectorAll('.band-pin')].some(g => g.style.display !== 'none')), '«Всё» — заголовки видны, ярлыков нет');
  await p.close();

  // 5 — английский
  p = await page();
  await p.goto(url + '?lang=en#h:bw'); await p.waitForTimeout(1500);
  const en = await p.evaluate(() => ({ h2: document.querySelector('#panel h2').textContent, sub: (document.querySelector('#panel .en') || {}).textContent }));
  expect(en.h2 === 'House Blackwood' && en.sub === undefined, 'EN: английское название, русского под ним нет: ' + JSON.stringify(en));
  await b.close();
  if (bad.length) { console.log('КАРТОЧКА ДОМА — ОШИБКИ:\n' + bad.join('\n')); process.exit(1); }
  console.log('карточка дома в порядке: адрес, древо, хронология, список, вассалитет, карточка человека, история, подсветка, «Показать на древе», текст, английский');
})();
