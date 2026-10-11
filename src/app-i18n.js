/* Язык интерфейса: русский (исходный) и английский (заготовка).
   Ключ перевода — сама русская строка, как она стоит в разметке или в коде; словарь — src/i18n/en.json
   (собирается tools/i18n-keys.js). Пустой перевод — показывается русская строка, так что недоведённый
   английский не ломает страницу.
   · статичная разметка (body.html) переводится обходом: текстовые узлы и атрибуты title, placeholder, aria-label;
   · строки из кода — через App.t('…') (подстановки: App.t('видно {n} из {all}', { n, all }));
   · имена людей и драконов в английском — из поля en, если оно есть.
   Язык: ?lang=en в адресе или сохранённый выбор; переключение перезагружает страницу с тем же адресом. */
(function () {
  const App = window.App = window.App || {};
  const LANGS = ['ru', 'en'];
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* без хранилища язык живёт до перезагрузки */ } } };
  const fromUrl = (location.search.match(/[?&]lang=(ru|en)\b/) || [])[1];
  const lang = fromUrl || (LANGS.includes(store.get('lang')) ? store.get('lang') : 'ru');
  // window.__I18N_TEST = { ui, data, texts } — словари для проверок (tools/check-i18n.js), поверх собранных
  const TEST = window.__I18N_TEST || {};
  const dict = Object.assign({}, (typeof I18N !== 'undefined' && I18N[lang]) || {}, lang !== 'ru' ? TEST.ui : null);
  App.lang = lang;
  App.langs = LANGS;
  document.documentElement.setAttribute('lang', lang);

  const fill = (s, vars) => vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
  App.t = (ru, vars) => fill(lang === 'ru' ? ru : (dict[ru] || ru), vars);
  App.tHas = ru => lang === 'ru' || !!dict[ru];

  // перевод готовой разметки: текст узла сравнивается без крайних пробелов, сами пробелы сохраняются
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  App.translateDom = root => {
    if (lang === 'ru' || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const raw = n.nodeValue, key = raw.replace(/\s+/g, ' ').trim();
      if (key && dict[key]) n.nodeValue = (/^\s/.test(raw) ? ' ' : '') + dict[key] + (/\s$/.test(raw) ? ' ' : '');
    }
    const els = root.querySelectorAll ? [...root.querySelectorAll('[title],[placeholder],[aria-label]')] : [];
    if (root.nodeType === 1) els.push(root);
    els.forEach(el => ATTRS.forEach(a => {
      const v = el.getAttribute(a);
      const k = v && v.replace(/\s+/g, ' ').trim();
      if (k && dict[k]) el.setAttribute(a, dict[k]);
    }));
  };

  /* Всё, что страница дорисовывает потом (вкладки, всплывающие подсказки, легенды, карточки), переводится само:
     наблюдатель смотрит на новые узлы и переведёт целые подписи, которые есть в словаре. Составные строки
     (с именами и годами внутри) в коде собираются через App.t с подстановками. В русском наблюдателя нет. */
  App.autoTranslate = root => {
    if (lang === 'ru' || !window.MutationObserver) return;
    const one = n => {
      if (n.nodeType === 3) { const k = n.nodeValue.replace(/\s+/g, ' ').trim(); if (k && dict[k]) n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, dict[k]); }
      else if (n.nodeType === 1) App.translateDom(n);
    };
    new MutationObserver(list => list.forEach(m => {
      if (m.type === 'characterData') one(m.target);
      else if (m.type === 'attributes') { const v = m.target.getAttribute(m.attributeName), k = v && v.replace(/\s+/g, ' ').trim(); if (k && dict[k]) m.target.setAttribute(m.attributeName, dict[k]); }
      else m.addedNodes.forEach(one);
    })).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };

  App.setLang = next => {
    if (!LANGS.includes(next) || next === lang) return;
    store.set('lang', next);
    const u = new URL(location.href);
    if (u.searchParams.has('lang')) { u.searchParams.set('lang', next); location.replace(u.toString()); }
    else location.reload();
  };

  /* Данные в английском. Строки данных (дома, девизы, заметки, вассалитет, приписки к бракам…) переводятся по словарю
     I18N_DATA «русская строка → английская» из texts/en/data.json; длинные тексты — из texts/en (поля t_en, df_en).
     Имена людей и драконов — из поля en. Что код разбирает сам (годы рождения и смерти, приписки «N г.» у браков,
     ссылки родителей), остаётся в данных по-русски и переводится только при показе: App.tData, App.tDate. */
  const DD = Object.assign({}, (lang !== 'ru' && typeof I18N_DATA !== 'undefined' && I18N_DATA[lang]) || {}, lang !== 'ru' ? TEST.data : null);
  const NOTE_REF = /^([a-z0-9_]+) \((.+)\)$/;
  App.tData = s => {
    if (lang === 'ru' || typeof s !== 'string') return s;
    if (DD[s]) return DD[s];
    const y = /^(\d+) г\.$/.exec(s.trim());
    if (y) return App.t('{n} г.', { n: y[1] });
    const m = NOTE_REF.exec(s);
    return m && DD[m[2]] ? m[1] + ' (' + DD[m[2]] + ')' : s;
  };
  // годы вида «не позднее 27», «136 или позже», «в младенчестве»: шаблоны из словаря интерфейса
  const DATE_FORMS = [[/^не позднее (.+)$/, 'не позднее {n}'], [/^не ранее (.+)$/, 'не ранее {n}'], [/^после (.+)$/, 'после {n}'],
    [/^(.+) или позже$/, '{n} или позже'], [/^(.+) или (.+)$/, '{n} или {m}']];
  App.tDate = s => {
    if (lang === 'ru' || typeof s !== 'string' || !/[А-Яа-яЁё]/.test(s)) return s;
    if (dict[s]) return dict[s];
    for (const [re, key] of DATE_FORMS) { const m = re.exec(s); if (m) return App.t(key, { n: m[1], m: m[2] }); }
    return s;
  };
  // год словом: «130 г.», «20 г. до З.» (до Завоевания)
  App.yearWord = y => (y < 0 ? App.t('{n} г. до З.', { n: -y }) : App.t('{n} г.', { n: y }));
  // формы числа: ключ «дом|дома|домов» → «house|houses» (единственное|множественное)
  App.tPlural = (n, one, few, many) => {
    const v = dict[one + '|' + few + '|' + many];
    if (!v) { const a = n % 10, b = n % 100; return n + ' ' + (a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many); }
    const [sg, pl] = v.split('|');
    return n + ' ' + (n === 1 ? sg : (pl || sg));
  };
  // какие поля данных переводятся на месте: всё, где есть кириллица, кроме разбираемого кодом и длинных текстов
  const SKIP = new Set(['t', 'df', 'id', 'b', 'd', 'sp', 'par']);
  const CYR = /[А-Яа-яЁё]/;
  const walk = v => {
    if (Array.isArray(v)) { v.forEach((x, i) => { if (typeof x === 'string') { if (CYR.test(x) && DD[x]) v[i] = DD[x]; } else walk(x); }); return; }
    if (v && typeof v === 'object') Object.keys(v).forEach(k => {
      if (SKIP.has(k)) return;
      const x = v[k];
      if (typeof x === 'string') { if (CYR.test(x) && DD[x]) v[k] = DD[x]; } else walk(x);
    });
  };
  App.localizeData = () => {
    if (lang === 'ru') return;
    // данные страницы — глобальные const из tools/data.js; через typeof, чтобы модуль не падал без них (например, в проверках)
    const V = {
      PEOPLE: typeof PEOPLE !== 'undefined' ? PEOPLE : null, DRAGONS: typeof DRAGONS !== 'undefined' ? DRAGONS : null,
      DRAGON_ORIGINS: typeof DRAGON_ORIGINS !== 'undefined' ? DRAGON_ORIGINS : null, EXTRA: typeof EXTRA !== 'undefined' ? EXTRA : null,
      DRAGON_SCREEN: typeof DRAGON_SCREEN !== 'undefined' ? DRAGON_SCREEN : null, DRAGON_SCREEN_EN: typeof DRAGON_SCREEN_EN !== 'undefined' ? DRAGON_SCREEN_EN : null,
      HOUSES: typeof HOUSES !== 'undefined' ? HOUSES : null, GAPS: typeof GAPS !== 'undefined' ? GAPS : null,
      DRAGON_FIGHTS: typeof DRAGON_FIGHTS !== 'undefined' ? DRAGON_FIGHTS : null, SERIES: typeof SERIES !== 'undefined' ? SERIES : null,
      V_REGIONS: typeof V_REGIONS !== 'undefined' ? V_REGIONS : null, V_PRE: typeof V_PRE !== 'undefined' ? V_PRE : null,
      V_CLAIMANTS: typeof V_CLAIMANTS !== 'undefined' ? V_CLAIMANTS : null, V_MILESTONES: typeof V_MILESTONES !== 'undefined' ? V_MILESTONES : null,
      V_HOUSES: typeof V_HOUSES !== 'undefined' ? V_HOUSES : null
    };
    const G = name => V[name];
    const PEOPLE_ = G('PEOPLE') || [], DRAGONS_ = G('DRAGONS') || [], ORIG = G('DRAGON_ORIGINS') || [], EXTRA_ = G('EXTRA');
    PEOPLE_.forEach(p => {
      if (TEST.texts && TEST.texts[p.id]) p.t_en = TEST.texts[p.id];
      p.ruName = p.name; p.ruFull = p.full || p.name;
      if (p.en) { p.name = p.en.split(',')[0]; p.full = p.en; }
      if (p.t_en) { p.t = p.t_en; p.ai = p.ai_en ? 1 : 0; } else if (p.t) p.tUntranslated = true;
    });
    DRAGONS_.concat(ORIG).forEach(d => {
      d.ruName = d.name;
      if (d.en) { d.name = d.en; d.full = d.en; }
      if (d.t_en) { d.t = d.t_en; d.ai = d.ai_en ? 1 : 0; } else if (d.t) d.tUntranslated = true;
    });
    if (EXTRA_ && EXTRA_.screen) Object.values(EXTRA_.screen).forEach(o => {
      if (o.df_en) o.df = o.df_en; else if (o.df) o.dfUntranslated = true;
      // актёры: [сериал, имя по-русски, имя по-английски] — в английском показываем английское
      (o.a || []).forEach(a => { if (a[2]) a[1] = a[2]; });
    });
    const DS = G('DRAGON_SCREEN'), DSE = G('DRAGON_SCREEN_EN');
    if (DS && DSE) Object.keys(DSE).forEach(id => { DS[id] = DSE[id]; });
    ['HOUSES', 'GAPS', 'PEOPLE', 'DRAGONS', 'DRAGON_ORIGINS', 'DRAGON_FIGHTS', 'SERIES', 'EXTRA', 'V_REGIONS', 'V_PRE', 'V_CLAIMANTS', 'V_MILESTONES', 'V_HOUSES']
      .forEach(n => { const v = G(n); if (v) walk(v); });
  };
  App.localizeData();
})();
