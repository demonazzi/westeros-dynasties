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
  const dict = (typeof I18N !== 'undefined' && I18N[lang]) || {};
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
    root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el => ATTRS.forEach(a => {
      const v = el.getAttribute(a);
      const k = v && v.replace(/\s+/g, ' ').trim();
      if (k && dict[k]) el.setAttribute(a, dict[k]);
    }));
  };

  App.setLang = next => {
    if (!LANGS.includes(next) || next === lang) return;
    store.set('lang', next);
    const u = new URL(location.href);
    if (u.searchParams.has('lang')) { u.searchParams.set('lang', next); location.replace(u.toString()); }
    else location.reload();
  };

  // имена в данных: в английском — поле en (если есть), русское имя остаётся в ruName/ruFull
  App.localizeData = () => {
    if (lang === 'ru') return;
    (typeof PEOPLE !== 'undefined' ? PEOPLE : []).forEach(p => {
      p.ruName = p.name; p.ruFull = p.full || p.name;
      if (p.en) { p.name = p.en.split(',')[0]; p.full = p.en; }
    });
    (typeof DRAGONS !== 'undefined' ? DRAGONS : []).forEach(d => { d.ruName = d.name; if (d.en) d.name = d.en; });
  };
  App.localizeData();
})();
