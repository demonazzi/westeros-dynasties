/* Вкладка «Присяги»: кто кому фактически служит в выбранный момент.
   Сверху — год, эпоха и её события (на шкале они стоят ромбиками, ползунок к ним липнет). Ниже — два вида на выбор:
   список (корона и стороны → дома со знаменосцами; знаменосцы свёрнуты по умолчанию) и круги (размер круга — сколько
   домов служит). Живёт отдельно от древа: свой год и своя карточка дома.
   Данные — data/vassals.json (A Wiki of Ice and Fire; русские названия — 7kingdoms.ru). */
(function () {
  const App = window.App;
  const { esc, state } = App;
  const el = document.getElementById('vassal-view');
  const panel = document.getElementById('panel');
  const panelContent = document.getElementById('panel-content');
  const H = new Map(V_HOUSES.map(h => [h.id, h]));
  // одинаковые русские названия (Broom и Broome — оба «Брумы») различаются английским в скобках
  const RU = new Map();
  V_HOUSES.forEach(h => RU.set(h.ru, (RU.get(h.ru) || 0) + 1));
  V_HOUSES.forEach(h => { if (RU.get(h.ru) > 1) h.ru = h.ru + ' (' + h.en + ')'; });
  const REG = new Map(V_REGIONS.map(r => [r.id, r]));
  const RORDER = V_REGIONS.map(r => r.id);
  const CLAIM = new Set(V_CLAIMANTS.map(c => c.id));
  const SIGIL = { stark: 'stk', arryn: 'arr', lannister: 'lan', tully: 'tul', tyrell: 'tyr', baratheon: 'bar', martell: 'mar', greyjoy: 'gry', targaryen: 'targ', gardener: 'gar', durrandon: 'dur', hoare: 'hoa' };
  const REGCLS = { north: 'stk', riverlands: 'tul', vale: 'arr', westerlands: 'lan', reach: 'tyr', stormlands: 'bar', dorne: 'mar', ironislands: 'gry', crownlands: 'targ' };
  const CLAIMCLS = { blacks: 'targ', greens: 'hgt', blackfyre: 'targ', rebels: 'bar', robb: 'stk', renly: 'bar', stannis: 'bar', balon: 'gry', euron: 'gry', aegon_young: 'targ' };
  const HIDE = new Set(['baratheon_of_kings_landing']);   // дом, сидящий на троне, — это сама корона
  const Y0 = -10, Y1 = 300.98;
  const THRONE_START = (H.get('targaryen').al.find(g => g[2] === 'throne') || [-1.95])[0];
  let year = 298, built = false, last = null, sel = null, query = '', pending = false;
  let CHANGES = null, EVDIFF = null;

  /* ——— Кто кому служит ——— */
  const exists = (h, y) => (h.ex[0] == null || y >= h.ex[0]) && (h.ex[1] == null || y < h.ex[1]);
  const claimantAt = (id, y) => V_CLAIMANTS.find(c => c.id === id && c.s <= y && y < c.e);
  function liegeAt(h, y) {
    let seg = null;
    for (const g of h.al) if (g[0] <= y && y < g[1]) seg = g;
    let to = seg ? seg[2] : h.liege, why = seg ? seg[3] : '', own = !!seg;
    const bad = t => t == null || t === h.id || (H.has(t) && !exists(H.get(t), y)) || (CLAIM.has(t) && !claimantAt(t, y)) || (t === 'throne' && y < THRONE_START);
    if (own && bad(to)) { to = h.liege; why = ''; own = false; }
    // до Завоевания в регионе правил другой король: великий дом ещё не был верховным лордом
    const pre = V_PRE.find(p => p.region === h.region && y < p.until);
    if (pre && h.id !== pre.king && H.has(pre.king) && exists(H.get(pre.king), y) && !own && (to === REG.get(h.region).lord || bad(to))) to = pre.king;
    if (bad(to)) to = null;
    // ⚑ — присяга по событию: сторона в войне, нейтралитет, переход к чужому сюзерену
    const ev = own && to != null && (CLAIM.has(to) || to === 'neutral' || (!h.great && to !== h.liege && to !== 'independent') || (!h.great && to === 'independent'));
    return { to, why, own: ev };
  }
  App.vLiegeAt = (id, y) => liegeAt(H.get(id), y);

  function snapshot(y) {
    const live = V_HOUSES.filter(h => !HIDE.has(h.id) && exists(h, y));
    const info = new Map(live.map(h => [h.id, liegeAt(h, y)]));
    // сторона в войне та же, что у сюзерена по умолчанию, — дом остаётся под ним и без флажка
    const topOf = id => { let q = id; for (let n = 0; n < 12 && q && H.has(q) && info.has(q); n++) { const t = info.get(q).to; if (!t || !H.has(t)) return t; q = t; } return q; };
    live.forEach(h => {
      const L = info.get(h.id);
      if (!CLAIM.has(L.to) || !h.liege || !info.has(h.liege) || h.liege === h.id) return;
      if (topOf(h.liege) === L.to) info.set(h.id, { to: h.liege, why: L.why, own: false });
    });
    // дом, сидящий на троне или поднявший мятеж под своим именем, показан самой короной / стороной
    const crown = new Set();
    if (info.has('targaryen') && info.get('targaryen').to === 'throne') crown.add('targaryen');
    if (info.has('blackfyre') && claimantAt('blackfyre', y)) crown.add('blackfyre');
    const par = new Map();
    live.forEach(h => {
      if (crown.has(h.id)) return;
      let p = info.get(h.id).to;
      if (p === 'blackfyre' && crown.has('blackfyre')) p = 'c:blackfyre';
      else if (p && (crown.has(p) || HIDE.has(p))) p = 'throne';
      if (p == null) p = 'unknown';
      else if (p === 'independent') p = h.great || h.id === 'blackfyre' ? null : 'indep';
      else if (CLAIM.has(p) && !H.has(p)) p = 'c:' + p;
      else if (CLAIM.has(p) && claimantAt(p, y) && !info.has(p)) p = 'c:' + p;
      par.set(h.id, p);
    });
    // защита от замкнутых присяг (не должно быть, но данные живые)
    par.forEach((p, id) => { let q = p, n = 0; while (q && H.has(q) && n++ < 15) { if (q === id) { par.set(id, 'unknown'); break; } q = par.get(q); } });
    const kids = new Map();
    par.forEach((p, id) => { if (p != null) (kids.get(p) || kids.set(p, []).get(p)).push(id); });
    const sizes = new Map();
    const size = id => { if (sizes.has(id)) return sizes.get(id); const v = (kids.get(id) || []).reduce((a, k) => a + 1 + size(k), 0); sizes.set(id, v); return v; };
    kids.forEach(list => list.sort((a, b) => {
      const A = H.get(a), B = H.get(b);
      return (B.great - A.great) || (size(b) > 0) - (size(a) > 0) || RORDER.indexOf(A.region) - RORDER.indexOf(B.region) || size(b) - size(a) || A.ru.localeCompare(B.ru, 'ru');
    }));
    return { y, par, info, kids, size, live, crown, sig: [...par].map(([k, v]) => k + '>' + v).join(',') };
  }
  App.vSnapshot = y => snapshot(y == null ? year : y);

  /* Моменты, когда что-то меняется. */
  function changes() {
    if (CHANGES) return CHANGES;
    const pts = new Set([Y0, THRONE_START]);
    V_HOUSES.forEach(h => { h.al.forEach(g => { pts.add(g[0]); pts.add(g[1]); }); if (h.ex[0] != null) pts.add(h.ex[0]); if (h.ex[1] != null) pts.add(h.ex[1]); });
    V_CLAIMANTS.forEach(c => { pts.add(c.s); pts.add(c.e); });
    V_PRE.forEach(p => pts.add(p.until));
    const ts = [...pts].filter(t => t >= Y0 && t <= Y1).sort((a, b) => a - b);
    const out = [];
    let prev = null;
    ts.forEach(t => {
      const s = snapshot(t);
      if (prev == null || s.sig !== prev) out.push(t);
      prev = s.sig;
    });
    CHANGES = out;
    return out;
  }
  function stepChange(dir) {
    const C = changes();
    let i = -1;
    C.forEach((t, k) => { if (t <= year + 1e-9) i = k; });
    if (dir > 0) setYear(i + 1 < C.length ? C[i + 1] : Y1);
    else setYear(i > 0 ? (Math.abs(C[i] - year) < 1e-6 ? C[i - 1] : C[i]) : Y0);
  }

  /* ——— События-опоры: только те, где присяги действительно меняются. Время снимка — когда перемены события уже
     произошли (например, «Две коронации» — после обеих, а не в миг смерти Визериса). ——— */
  const ERAS = [
    { name: 'До Завоевания', ev: [[-10, 'Семь королевств', 'Вестерос до высадки Эйгона: короли Севера, Горы и Долины, Утёса, Простора, Штормовых земель, Островов и Рек; Дорн; Таргариены на Драконьем Камне']] },
    { name: 'Завоевание', ev: [[-1.95, 'Высадка Эйгона'], [-1.7, 'Талли переходят к Эйгону'], [-1.65, 'Сожжение Харренхолла', 'Сожжение Харренхолла: гибель Хоаров; на Железных островах начинается борьба за Морской трон'], [-1.55, 'Последний Шторм'],
      [-1.37, 'Пламенное Поле', 'Пламенное Поле: гибель Гарднеров, Лорен Ланнистер преклоняет колено, Харлен Тирелл сдаёт Хайгарден'],
      [-1.25, 'Торрхен преклоняет колено', 'Торрхен Старк преклоняет колено на Трезубце'], [-1.15, 'Долина покоряется'],
      [1, 'Коронация в Староместе', 'Коронация Эйгона в Староместе: Хайтауэры открывают ворота'], [2.5, 'Викон Грейджой', 'Викон Грейджой — лорд Железных островов']] },
    { name: 'Танец драконов', ev: [[129.2, 'Две коронации', 'Смерть Визериса I: коронованы Эйгон II («зелёные») и Рейнира («чёрные»)'],
      [130.15, 'Рейнира берёт Королевскую Гавань'], [130.81, 'Гибель Рейниры'], [131.45, 'Битва на Королевском тракте'], [131.5, 'Эйгон III', 'Смерть Эйгона II, король Эйгон III']] },
    { name: 'Дорн', ev: [[158.5, 'Покорение Солнечного Копья', 'Дейерон I покоряет Дорн'], [160, 'Дорн восстаёт', 'Дорнийцы сбрасывают власть трона; Дейерона I убьют под мирным знаменем (161)'],
      [187.5, 'Дорн входит в Семь Королевств', 'Брак Дейенерис Таргариен и Марона Мартелла: Дорн входит в Семь Королевств']] },
    { name: 'Блэкфайры и мятежи', ev: [[196.15, 'Первое восстание Блэкфайра'], [196.85, 'Краснотравное поле', 'Битва на Краснотравном поле'],
      [212.4, 'Второе восстание Блэкфайра'], [219.3, 'Третье восстание Блэкфайра'], [233, 'Мятеж Пиков'], [236.3, 'Четвёртое восстание Блэкфайра'],
      [260, 'Война Девятигрошовых королей'], [261, 'Мятеж Рейнов и Тарбеков']] },
    { name: 'Восстание Роберта', ev: [[282.16, 'Начало восстания', 'Начало Восстания Роберта: Аррены, Старки и Баратеоны поднимают знамёна'],
      [282.9, 'Дорн за Эйриса', 'Доран Мартелл посылает войско Эйрису'], [283.1, 'Колокольная битва', 'Колокольная битва; Талли с мятежниками'],
      [283.32, 'Битва на Трезубце', 'Битва на Трезубце; после неё в войну вступают Грейджои'], [283.35, 'Разорение Королевской Гавани'],
      [283.45, 'Коронация Роберта I'], [284.3, 'Станнис на Драконьем Камне', 'Станнис берёт Драконий Камень, Таргариены бегут в Браавос']] },
    { name: 'Восстание Бейлона', ev: [[289.1, 'Бейлон — король', 'Восстание Бейлона Грейджоя'], [289.9, 'Падение Пайка', 'Бейлон преклоняет колено']] },
    { name: 'Война пяти королей', ev: [[298.55, 'Арест Эддарда', 'Смерть Роберта I и арест Эддарда Старка: Старки и Талли воюют с Ланнистерами'],
      [298.9, 'Ренли — король'], [299.05, 'Робб — король', 'Робб провозглашён Королём Севера и Трезубца'], [299.1, 'Станнис — король'],
      [299.2, 'Бейлон — король', 'Бейлон снова объявляет себя королём'], [299.35, 'Гибель Ренли', 'Гибель Ренли; Штормовой Предел сдаётся Станнису'],
      [299.47, 'Битва на Черноводной', 'Битва на Черноводной; союз Тиреллов и Ланнистеров'], [299.6, 'Гибель Бейлона'], [299.65, 'Красная свадьба'],
      [300, 'Новые лорды Севера и Трезубца', 'К 300 г. северные дома присягают Болтонам или Станнису, речные — Петиру Бейлишу'],
      [300.2, 'Король Эурон', 'Вече на Старом Вике: король Эурон'], [300.45, 'Риверран сдаётся'], [300.6, 'Станнис на Севере', 'Станнис на Севере: Темнолесье, поход на Винтерфелл'],
      [300.7, 'Высадка Золотых Мечей', 'Золотые Мечи высаживаются с Эйгоном']] }
  ];
  const EVS = [];
  ERAS.forEach((e, i) => e.ev.forEach(([t, name, desc]) => EVS.push({ t, name, desc: desc || name, era: i })));
  EVS.sort((a, b) => a.t - b.t);
  const eventAt = y => { let e = null; EVS.forEach(x => { if (x.t <= y + 1e-6) e = x; }); return e; };
  const atEvent = y => { const e = eventAt(y); return e && Math.abs(e.t - y) < 1e-6 ? e : null; };
  function stepEvent(dir) {
    const cur = eventAt(year);
    if (dir > 0) { const n = EVS.find(x => x.t > year + 1e-6); setYear(n ? n.t : Y1); return; }
    if (cur && Math.abs(cur.t - year) > 1e-6) { setYear(cur.t); return; }
    const i = cur ? EVS.indexOf(cur) : -1;
    setYear(i > 0 ? EVS[i - 1].t : Y0);
  }
  function diffIds(A, B) { const out = []; B.par.forEach((p, id) => { if (A.par.has(id) && A.par.get(id) !== p) out.push(id); }); return out; }
  // сколько домов сменили сюзерена с предыдущего события
  function evDiff() { if (!EVDIFF) EVDIFF = EVS.map((e, i) => i ? diffIds(snapshot(EVS[i - 1].t), snapshot(e.t)).length : 0); return EVDIFF; }

  /* ——— Подписи ——— */
  const yearWord = y => { const f = Math.floor(y); return App.yearWord(f < 0 ? f : Math.max(1, f)); };
  const yearShort = y => { const f = Math.floor(y); return f < 0 ? App.t('{n} до З.', { n: -f }) : String(Math.max(1, f)); };
  const span = (a, b) => { const A = yearShort(a), B = b >= Y1 ? '300' : yearShort(b - 0.001); return A === B ? A : A + '–' + B; };
  function kingAt(y) {
    if (y < 1) return 'Эйгон Завоеватель';
    if (y >= 283.35 && y < 283.45) return '';          // Эйрис убит при Разорении, Роберт ещё не коронован
    const K = App.kings ? App.kings() : [];
    const p = K.find(q => { const L = App.life(q.id); return L.ra <= y && y < (L.rb != null ? L.rb : 301); });
    return p ? p.name : '';
  }
  function liegeName(t, y) {
    if (t == null) return App.t('не указан');
    if (H.has(t)) return H.get(t).ru;
    if (t === 'throne') return 'Железный трон';
    if (t === 'independent') return 'никому — независимы';
    if (t === 'neutral') return 'нейтралитет';
    const c = (y != null && claimantAt(t, y)) || V_CLAIMANTS.find(x => x.id === t);
    return c ? c.ru : t;
  }
  const clsOf = h => SIGIL[h.id] || REGCLS[h.region] || 'oth';
  /* Пояснения собраны с вики и местами сухие: книги — по-русски, годы — «г.» и «до З.», дома — русскими названиями. */
  const BOOKS = { AGOT: '«Игра престолов»', ACOK: '«Битва королей»', ASOS: '«Буря мечей»', AFFC: '«Пир стервятников»', ADWD: '«Танец с драконами»', TWOW: '«Ветра зимы»', TWOIAF: '«Мир льда и пламени»', 'F&B': '«Пламя и кровь»', TSS: '«Таинственный рыцарь»', THK: '«Межевой рыцарь»', TMK: '«Таинственный рыцарь»' };
  const EN2RU = new Map([...V_HOUSES].sort((a, b) => b.en.length - a.en.length).map(h => [h.en, h.ru]));
  const enRx = new RegExp('\\b(?:House )?(' + [...EN2RU.keys()].map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'g');
  function tidy(t) {
    if (!t) return '';
    if (App.lang !== 'ru' && !/[А-Яа-яЁё]/.test(t)) return t; // переведённая заметка уже чистая: AC/BC и названия книг не трогаем
    return t
      .replace(/\b(TWOIAF|AGOT|ACOK|ASOS|AFFC|ADWD|TWOW|TSS|THK|TMK|F&B)\b/g, m => BOOKS[m] || m)
      .replace(/(\d+)\s*AC\b\.?/g, '$1 г.').replace(/(\d+)\s*BC\b\.?/g, '$1 г. до З.')
      .replace(/([Ии])нфобокс(ом|у|е|а|ы)?/g, (m, i, end) => (i === 'И' ? 'К' : 'к') + ({ 'ом': 'арточкой', 'у': 'арточке', 'е': 'арточке', 'а': 'арточки', 'ы': 'арточки' }[end] || 'арточка') + ' на вики')
      .replace(/\bВПК\b/g, 'Война пяти королей')
      .replace(enRx, (m, en) => EN2RU.get(en) || m);
  }


  /* ——— Шкала: свой масштаб — годы перемен шире, тихие века уже. События стоят на ней ромбиками, ползунок к ним липнет. ——— */
  const PADL = 18, PADR = 18;
  const DOM = [-11, -2, -1, 3, 129, 132, 156, 162, 186, 198, 280, 282, 283, 284, 285, 297, 298.5, 301.2];
  const WGT = [0.8, 40, 4, 0.4, 10, 0.4, 3, 0.4, 2, 0.6, 0.6, 10, 30, 4, 1, 2, 32];
  function scaleMap() {
    const w = document.getElementById('scale').clientWidth || el.clientWidth || 1000;
    const units = WGT.map((k, i) => k * (DOM[i + 1] - DOM[i])), total = units.reduce((a, b) => a + b, 0);
    const range = [PADL];
    units.forEach(u => range.push(range[range.length - 1] + u / total * Math.max(100, w - PADL - PADR)));
    const s = d3.scaleLinear().domain(DOM).range(range);
    // годы раньше начала шкалы (эпохи вроде Рока Валирии) уходят за левый край
    return { x: y => y < DOM[0] - 1e-9 ? -999 : s(y), inv: px => s.invert(px), k: 1, dom: DOM, w };
  }
  // ползунок, отпущенный в паре пикселей от события, встаёт ровно на событие
  function snapYear(y) {
    const m = scaleMap(), x = m.x(y);
    let best = null;
    EVS.forEach(e => { const d = Math.abs(m.x(e.t) - x); if (d <= 5 && (!best || d < best.d)) best = { d, t: e.t }; });
    return best ? best.t : y;
  }

  /* ——— Разметка вкладки ——— */
  let mode = 'list';
  try { if (localStorage.getItem('vassal-mode') === 'bub') mode = 'bub'; } catch (e) { /* хранилище недоступно */ }
  let listEl, stageEl, bubSvg, tipEl, yearEl, statusEl, eraSel, evsEl, allBtn;
  function build() {
    el.innerHTML =
      '<div class="vs-top">' +
        '<div class="vs-year"><button type="button" class="btn btn-icon" id="vs-prev" title="К предыдущему событию (←)" aria-label="К предыдущему событию">‹</button>' +
        '<b id="vs-year" aria-live="polite"></b>' +
        '<button type="button" class="btn btn-icon" id="vs-next" title="К следующему событию (→)" aria-label="К следующему событию">›</button></div>' +
        '<label class="vs-era-wrap"><span class="sr-only">Эпоха</span><select id="vs-era" class="vs-era">' + ERAS.map((e, i) => '<option value="' + i + '">' + esc(e.name) + '</option>').join('') + '</select></label>' +
        '<p class="vs-status" id="vs-status"></p>' +
        '<div class="seg vs-mode" role="group" aria-label="Вид">' +
          '<button type="button" class="seg-btn" data-mode="list" title="Список домов по присяге; вассалы раскрываются стрелкой">Список</button>' +
          '<button type="button" class="seg-btn" data-mode="bub" title="Размер круга соответствует числу вассальных домов">Круги</button>' +
        '</div>' +
      '</div>' +
      '<div class="vs-evbar"><div class="vs-evs" id="vs-evs" role="toolbar" aria-label="События эпохи"></div>' +
        '<button type="button" class="btn vs-all" id="vs-all" aria-pressed="false">Раскрыть всё</button>' +
        '<input type="search" id="vs-q" placeholder="Найти дом" aria-label="Найти дом" autocomplete="off"></div>' +
      '<div class="vs-list-view" id="vs-list" tabindex="-1"></div>' +
      '<div class="vs-stage" id="vs-stage"><svg id="vs-bub" role="group" aria-label="Дома сгруппированы по присяге в выбранном году. Нажмите на название, чтобы открыть карточку."></svg></div>' +
      '<div class="vs-tip" id="vs-tip" hidden></div>';
    built = true;
    listEl = el.querySelector('#vs-list'); stageEl = el.querySelector('#vs-stage'); bubSvg = el.querySelector('#vs-bub'); tipEl = el.querySelector('#vs-tip');
    yearEl = el.querySelector('#vs-year'); statusEl = el.querySelector('#vs-status'); eraSel = el.querySelector('#vs-era'); evsEl = el.querySelector('#vs-evs'); allBtn = el.querySelector('#vs-all');
    el.querySelector('#vs-prev').addEventListener('click', () => stepEvent(-1));
    el.querySelector('#vs-next').addEventListener('click', () => stepEvent(1));
    eraSel.addEventListener('change', () => { const e = EVS.find(x => x.era === +eraSel.value); if (e) setYear(e.t); });
    evsEl.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setYear(+b.dataset.t); });
    evsEl.addEventListener('scroll', fadeEvs, { passive: true });
    el.querySelectorAll('.vs-mode .seg-btn').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    allBtn.addEventListener('click', () => { const on = allBtn.getAttribute('aria-pressed') !== 'true'; openAll(on); });
    const q = el.querySelector('#vs-q');
    q.addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); hitIdx = -1; markQuery(); });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nextHit(); } });
    el.addEventListener('keydown', e => {
      if (e.target.closest('input, select')) return;
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      if (e.shiftKey) stepChange(d); else stepEvent(d);
    });
    listEl.addEventListener('click', e => {
      const t = e.target.closest('[data-tog]');
      if (t) { toggle(t.dataset.tog); return; }
      const b = e.target.closest('[data-vh]');
      if (b) openHouse(b.dataset.vh);
    });
    initBubbles();
    if (window.ResizeObserver) new ResizeObserver(() => { if (state.view === 'vassal' && mode === 'bub') resize(); }).observe(el);
    setMode(mode, true);
  }
  function setMode(m, quiet) {
    mode = m;
    try { localStorage.setItem('vassal-mode', m); } catch (e) { /* хранилище недоступно */ }
    el.querySelectorAll('.vs-mode .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    listEl.hidden = m !== 'list';
    stageEl.hidden = m !== 'bub';
    allBtn.hidden = m !== 'list';
    el.classList.toggle('mode-bub', m === 'bub');
    if (state.view === 'vassal') { const hint = document.getElementById('hint'); if (hint) hint.textContent = hintText(); }
    hideTip();
    if (m === 'bub') resize(true);
    else if (last) drawList(last, false);
    if (!quiet || !last) draw();
    markQuery();
  }
  const hintText = () => App.t('← → — события · Shift + ← → — смены присяги') + ' · ' + App.t(mode === 'bub' ? 'Нажмите на круг, чтобы открыть дом; «Остальные» откроет список' : 'Стрелка раскрывает вассалов, название открывает карточку');
  const JSDOM = /jsdom/i.test(navigator.userAgent);       // проверки без браузера: размеров нет, берутся условные
  function resize(force) {
    const w = stageEl.clientWidth || (JSDOM ? 960 : 0), h = stageEl.clientHeight || (JSDOM ? 480 : 0);
    if (!force && w === stageW && h === stageH) return;
    stageW = w; stageH = h;
    if (last) relayout(last, false);
  }

  /* ——— Подсказка ——— */
  function showTip(e, html) {
    tipEl.innerHTML = html;
    tipEl.hidden = false;
    const r = el.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    let x = e.clientX - r.left + 14, y = e.clientY - r.top + 16;
    if (x + tw > r.width - 8) x = e.clientX - r.left - tw - 14;
    if (y + th > r.height - 8) y = e.clientY - r.top - th - 12;
    tipEl.style.left = Math.max(6, x) + 'px';
    tipEl.style.top = Math.max(6, y) + 'px';
  }
  function hideTip() { if (tipEl) tipEl.hidden = true; }

  /* ——— Общее для списка и кругов: кто в корне, что свёрнуто ——— */
  const open = new Set();                 // раскрытые: 'h:дом' (его знаменосцы) и 'g:корень' («остальные знаменосцы»)
  let moved = new Set(), hitIdx = -1;     // кто сменил сюзерена с прошлого показа
  function rootKeys(S) {
    const out = [];
    if (S.y >= THRONE_START && S.kids.has('throne')) out.push('throne');
    const seen = new Set();
    V_CLAIMANTS.forEach(c => { if (claimantAt(c.id, S.y) && !seen.has(c.id) && S.kids.has('c:' + c.id)) { seen.add(c.id); out.push('c:' + c.id); } });
    S.live.filter(h => S.par.get(h.id) === null).sort((a, b) => RORDER.indexOf(a.region) - RORDER.indexOf(b.region)).forEach(h => out.push(h.id));
    ['indep', 'neutral', 'unknown'].forEach(k => { if (S.kids.has(k)) out.push(k); });
    return out;
  }
  const isBig = (S, id) => (S.kids.get(id) || []).length > 0 || H.get(id).great;
  // в корне: дома со своими знаменосцами и великие — отдельно, остальные — одной свёрнутой группой (если их больше трёх)
  function split(S, key) {
    const ch = S.kids.get(key) || [];
    const big = ch.filter(id => isBig(S, id)).sort((a, b) => (H.get(b).great - H.get(a).great) || RORDER.indexOf(H.get(a).region) - RORDER.indexOf(H.get(b).region) || S.size(b) - S.size(a) || H.get(a).ru.localeCompare(H.get(b).ru, 'ru'));
    const small = ch.filter(id => !isBig(S, id));
    return { big, small, grouped: small.length > 3 };
  }
  function rootInfo(S, key) {
    const c = key.startsWith('c:') ? claimantAt(key.slice(2), S.y) : null;
    const o = { key, id: H.has(key) ? key : null, cnt: (S.kids.get(key) || []).reduce((a, id) => a + 1 + S.size(id), 0), group: 'Остальные знаменосцы' };
    if (key === 'throne') {
      const contested = ['blacks', 'greens'].some(k => claimantAt(k, S.y)), king = kingAt(S.y);
      Object.assign(o, { name: 'Железный трон', cls: S.y < 283.45 ? 'targ' : 'bar', group: 'Напрямую короне',
        sub: contested ? 'престол оспаривается: здесь дома, чья сторона не указана' : king ? App.t('На троне: {name}', { name: king }) : 'трон пуст: Эйрис убит, Роберт ещё не коронован' });
      o.sig = o.cls;
    } else if (c) {
      const [a, b] = splitName(c.ru);
      Object.assign(o, { name: c.ru, short: a, shortSub: b, cls: CLAIMCLS[key.slice(2)] || 'none', sub: c.why.length > 150 ? c.why.slice(0, 148).replace(/\s+\S*$/, '').replace(/[\s,.;:]+$/, '') + '…' : c.why, group: 'Остальные сторонники' });
    } else if (o.id) {
      const h = H.get(key);
      Object.assign(o, { name: h.ru, cls: clsOf(h), sig: h.great ? clsOf(h) : null,
        sub: key === 'targaryen' && S.y > 283 ? 'в изгнании за Узким морем' : (S.y < 1 && h.great ? 'королевство · ' : 'сами по себе · ') + REG.get(h.region).ru,
        shortSub: key === 'targaryen' && S.y > 283 ? 'в изгнании' : S.y < 1 && h.great ? 'королевство' : 'сами по себе' });
    } else {
      Object.assign(o, { cls: 'none', group: 'Дома',
        name: key === 'indep' ? 'Сами по себе' : key === 'neutral' ? 'Вне войны' : 'Сюзерен не указан',
        sub: key === 'indep' ? 'дома, которые в этот момент не признают ничьей власти' : key === 'neutral' ? 'держат нейтралитет' : 'Присяга в эти годы неизвестна' });
    }
    return o;
  }
  // подпись претендента: «Робб Старк — Король Севера и Трезубца» → заголовок и строка под ним
  function splitName(s) {
    let m = s.match(/^(.*?) — (.*)$/);
    if (m) return [m[1], m[2]];
    m = s.match(/^(.*?) \((.*)\)$/);
    if (m) return [m[1], m[2].replace(/^[«"]|[»"]$/g, '')];
    return [s, ''];
  }
  function subtreeHas(id, set) { const k = last ? last.kids.get(id) || [] : []; return k.some(c => set.has(c) || subtreeHas(c, set)); }
  function toggle(key) {
    if (open.has(key)) open.delete(key); else open.add(key);
    if (last) drawList(last, false);
    syncAll();
  }
  function openAll(on) {
    open.clear();
    if (on && last) {
      last.par.forEach((p, id) => { if ((last.kids.get(id) || []).length) open.add('h:' + id); });
      rootKeys(last).forEach(k => open.add('g:' + k));
    }
    if (built && last) { drawList(last, false); if (mode === 'bub') relayout(last, false); }
    syncAll();
  }
  function syncAll() {
    if (!allBtn) return;
    const any = open.size > 0;
    allBtn.setAttribute('aria-pressed', String(any));
    allBtn.textContent = any ? 'Свернуть всё' : 'Раскрыть всё';
  }

  /* ——— Список: корни → карточки домов со знаменосцами → строки. Знаменосцы свёрнуты, шеврон раскрывает,
     имя открывает карточку дома. ——— */
  const WIDE = 12;
  const chev = (key, isOpen, label) => '<button type="button" class="vs-tog" data-tog="' + key + '" aria-expanded="' + isOpen + '" aria-label="' + esc(label) + '"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5 L7 5 L3 8.5"/></svg></button>';
  function rowHtml(S, id) {
    const h = H.get(id), L = S.info.get(id), sub = S.kids.get(id) || [], n = S.size(id), key = 'h:' + id;
    const isOpen = sub.length > 0 && open.has(key);
    const mv = moved.has(id) || (!isOpen && subtreeHas(id, moved));
    const tip = (h.seat ? h.seat + ' · ' : '') + REG.get(h.region).ru + (L.own && L.why ? '\n' + tidy(L.why) : '');
    return '<li><div class="vs-row h-' + REGCLS[h.region] + (L.own ? ' own' : '') + (mv ? ' moved' : '') + '">' +
      (sub.length ? chev(key, isOpen, App.t(isOpen ? 'Свернуть знаменосцев: {name}' : 'Раскрыть знаменосцев: {name}', { name: h.ru })) : '<span class="vs-tog-sp"></span>') +
      '<button type="button" class="vs-name' + (id === sel ? ' sel' : '') + '" data-vh="' + id + '" data-q="' + esc(norm(h.ru + ' ' + h.en)) + '" title="' + esc(tip) + '"><i aria-hidden="true"></i><span>' + esc(h.ru) + '</span>' +
        (L.own ? '<span class="vs-flag" aria-label="присяга по событию">⚑</span>' : '') + '</button>' +
      (n ? '<button type="button" class="vs-n" data-tog="' + key + '" tabindex="-1" aria-hidden="true">' + n + '</button>' : '') + '</div>' +
      (isOpen ? '<ul class="vs-sub">' + sub.map(k => rowHtml(S, k)).join('') + '</ul>' : '') + '</li>';
  }
  function cardHtml(S, id) {
    const h = H.get(id), L = S.info.get(id), sub = S.kids.get(id) || [], n = S.size(id), key = 'h:' + id;
    const isOpen = sub.length > 0 && open.has(key), wide = isOpen && n >= WIDE;
    const mv = moved.has(id) || (!isOpen && subtreeHas(id, moved));
    return '<article class="vs-card h-' + clsOf(h) + (wide ? ' wide' : '') + (isOpen ? ' open' : '') + (mv ? ' moved' : '') + '"><h4 class="vs-card-head">' +
      (sub.length ? chev(key, isOpen, App.t(isOpen ? 'Свернуть знаменосцев: {name}' : 'Раскрыть знаменосцев: {name}', { name: h.ru })) : '<span class="vs-tog-sp"></span>') +
      '<button type="button" class="vs-card-name' + (id === sel ? ' sel' : '') + '" data-vh="' + id + '" data-q="' + esc(norm(h.ru + ' ' + h.en)) + '" title="' + esc((h.seat ? h.seat + ' · ' : '') + REG.get(h.region).ru + (L.own && L.why ? '\n' + tidy(L.why) : '')) + '">' +
        (h.great && App.sigilSVG ? App.sigilSVG(clsOf(h), 0, 0, 20, 'vs-sigil') : '<i aria-hidden="true"></i>') + '<span>' + esc(h.ru) + '</span>' +
        (L.own ? '<span class="vs-flag">⚑</span>' : '') + '</button>' +
      (sub.length ? '<button type="button" class="vs-n" data-tog="' + key + '" tabindex="-1" aria-hidden="true">' + n + '</button>' : '<span class="vs-n vs-n0">знаменосцы не названы</span>') + '</h4>' +
      (isOpen ? '<ul class="vs-list' + (wide ? ' vs-multi' : '') + '">' + sub.map(k => rowHtml(S, k)).join('') + '</ul>' : '') + '</article>';
  }
  function realmHtml(S, key) {
    const R = rootInfo(S, key), { big, small, grouped } = split(S, key);
    const sig = R.sig && App.sigilSVG ? App.sigilSVG(R.sig, 0, 0, 28, 'vs-sigil') : '';
    const head = R.id ? '<button type="button" class="vs-realm-title' + (key === sel ? ' sel' : '') + '" data-vh="' + key + '" data-q="' + esc(norm(R.name + ' ' + H.get(key).en)) + '">' + sig + '<span>' + esc(R.name) + '</span></button>'
      : '<span class="vs-realm-title">' + sig + '<span>' + esc(R.name) + '</span></span>';
    const gk = 'g:' + key, gOpen = !grouped || open.has(gk);
    const gmv = grouped && !open.has(gk) && small.some(id => moved.has(id));
    return '<section class="vs-realm h-' + R.cls + '" data-key="' + key + '"><header>' + head +
      '<span class="vs-realm-sub">' + esc(R.sub) + '</span><span class="vs-n">' + App.plural(R.cnt, 'дом', 'дома', 'домов') + '</span></header>' +
      (big.length ? '<div class="vs-grid">' + big.map(id => cardHtml(S, id)).join('') + '</div>' : '') +
      (small.length ? '<div class="vs-leaves' + (gOpen ? ' open' : '') + (gmv ? ' moved' : '') + '"><h4>' + (grouped ? chev(gk, gOpen, (gOpen ? 'Свернуть' : 'Раскрыть') + ': ' + R.group) : '') +
        '<span class="vs-leaves-t"' + (grouped ? ' data-tog="' + gk + '"' : '') + '>' + esc(big.length || key !== 'throne' ? R.group : 'Напрямую короне') + '</span><span class="vs-n"' + (grouped ? ' data-tog="' + gk + '"' : '') + '>' + small.length + '</span></h4>' +
        (gOpen ? '<ul class="vs-list vs-multi">' + small.map(id => rowHtml(S, id)).join('') + '</ul>' : '') + '</div>' : '') +
      (!big.length && !small.length ? '<p class="vs-none">никого</p>' : '') + '</section>';
  }
  function drawList(S, keepScroll) {
    if (!listEl || mode !== 'list') return;
    const top = listEl.scrollTop;
    listEl.innerHTML = rootKeys(S).map(k => realmHtml(S, k)).join('');
    if (keepScroll !== true) listEl.scrollTop = top;
    markQuery();
  }

  /* ——— Круги: корни раскладываются полками, внутри — дома со знаменосцами (числом) и «остальные». Без масштаба и
     раскрытия: подробности — в списке и в карточке. ——— */
  let stageW = 0, stageH = 0, layout = null, gC, gPulse, gLab;
  const M = { l: 14, r: 14, t: 4, b: 60 };
  function initBubbles() {
    const svg = d3.select(bubSvg);
    gC = svg.append('g').attr('class', 'vb-circles');
    gPulse = svg.append('g').attr('class', 'vb-pulses');
    gLab = svg.append('g').attr('class', 'vb-labs');
    bubSvg.addEventListener('click', e => { const c = e.target.closest('.vb'); if (c) activate(c.dataset.key); });
    bubSvg.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const c = e.target.closest('.vb');
      if (!c) return;
      e.preventDefault();
      activate(c.dataset.key);
    });
    bubSvg.addEventListener('pointermove', e => {
      const c = e.target.closest('.vb');
      if (!c) { hideTip(); return; }
      const n = layout && layout.byKey.get(c.dataset.key);
      if (n) showTip(e, tipOf(n));
    });
    bubSvg.addEventListener('pointerleave', hideTip);
  }
  function tipOf(n) {
    const S = last;
    if (n.kind === 'group') return '<b>' + esc(n.name) + '</b> · ' + App.plural(n.cnt, 'дом', 'дома', 'домов') + '<br><span class="vs-tip-hint">нажмите — показать списком</span>';
    if (n.kind === 'root' && !n.id) return '<b>' + esc(n.full || n.name) + '</b>' + (n.tip ? '<br>' + esc(n.tip) : '') + '<br>' + App.plural(n.cnt, 'дом', 'дома', 'домов');
    const h = H.get(n.id), L = S.info.get(n.id);
    let s = '<b>' + esc(h.ru) + '</b>' + (h.seat ? ' · ' + esc(h.seat) : '') + '<br><span class="vs-tip-y">' + esc(REG.get(h.region).ru) + (h.great ? ' · ' + App.t('Великий дом') : '') + '</span>';
    if (n.kind !== 'root') s += '<br>служит: <b>' + esc(liegeName(L ? L.to : null, S.y)) + '</b>' + (L && L.own ? ' ⚑' : '');
    if (L && L.own && L.why) s += '<br><span class="vs-tip-why">' + esc(tidy(L.why)) + '</span>';
    if (n.cnt) s += '<br>' + App.plural(n.cnt, 'знаменосец', 'знаменосца', 'знаменосцев');
    return s + '<br><span class="vs-tip-hint">нажмите — карточка дома</span>';
  }
  function rootNode(S, key) {
    const R = rootInfo(S, key), { big, small, grouped } = split(S, key);
    const n = { key: 'r:' + key, rk: key, id: R.id, kind: 'root', cnt: R.cnt, cls: R.cls, sig: R.sig, name: R.short || R.name, full: R.name,
      sub: R.id ? R.shortSub : R.short ? R.shortSub : key === 'throne' ? R.sub : '', tip: R.id ? '' : R.sub };
    const leaf = id => { const h = H.get(id), L = S.info.get(id), c = S.size(id); return { key: 'h:' + id, id, kind: c ? 'house' : 'leaf', name: h.ru, cls: clsOf(h), great: h.great, cnt: c, w: 1 + c, own: !!(L && L.own) }; };
    n.children = big.map(leaf);
    if (grouped) n.children.push({ key: 'g:' + key, rk: key, kind: 'group', name: R.group.replace(/^Остальные /, 'остальные ').replace(/^Напрямую /, 'напрямую ').replace(/^Дома$/, 'дома'), cnt: small.length, w: small.length, cls: R.cls, ids: small });
    else small.forEach(id => n.children.push(leaf(id)));
    n.w = Math.max(1, n.children.reduce((a, ch) => a + ch.w, 0));
    return n;
  }
  const labW = (cls, s, k) => App.textWidth(cls, s, k);
  /* Корни раскладываются полками: несколько рядов, мелкие круги в ряду встают столбиком. Перебираются все разбиения
     на ряды (до трёх), берётся то, где круги крупнее всего. Площадь круга — число домов в нём. */
  const LH = 40, RGAP = 22;
  function shelf(items, aw, ah) {
    const n = items.length;
    const rowFit = (row, s) => {
      const hs = row.map(it => 2 * it.b * s + it.lh), Hh = Math.max(...hs);
      const cols = [];
      let cur = null;
      row.forEach((it, j) => {
        const h = hs[j], w = Math.max(2 * it.b * s, it.lw);
        if (cur && cur.h + h <= Hh + 0.5) { cur.items.push(it); cur.h += h; cur.w = Math.max(cur.w, w); }
        else { cur = { items: [it], h, w }; cols.push(cur); }
      });
      return { w: cols.reduce((a, c) => a + c.w, 0) + RGAP * (cols.length - 1), h: Hh, cols };
    };
    const okAt = (rows, s) => {
      let th = 0;
      for (const r of rows) { const f = rowFit(r, s); if (f.w > aw) return false; th += f.h; }
      return th + RGAP * (rows.length - 1) <= ah;
    };
    let best = null;
    const maxRows = Math.min(3, n);
    const smax = Math.max(0.02, (ah - Math.max(...items.map(it => it.lh))) / (2 * Math.max(...items.map(it => it.b))));
    for (let mask = 0; mask < (1 << (n - 1)); mask++) {
      let breaks = 0;
      for (let i = 0; i < n - 1; i++) if (mask & (1 << i)) breaks++;
      if (breaks + 1 > maxRows) continue;
      const rows = [[items[0]]];
      for (let i = 1; i < n; i++) { if (mask & (1 << (i - 1))) rows.push([]); rows[rows.length - 1].push(items[i]); }
      // столбики делают допустимость немонотонной (при мелком масштабе подписи не дают ставить круги друг на друга),
      // поэтому масштаб ищется сверху вниз шагами, затем уточняется
      let lo = smax;
      while (lo > 0.01 && !okAt(rows, lo)) lo *= 0.96;
      if (lo <= 0.01) continue;
      let hi = Math.min(smax, lo / 0.96);
      for (let it = 0; it < 12; it++) { const mid = (lo + hi) / 2; if (okAt(rows, mid)) lo = mid; else hi = mid; }
      if (!best || lo > best.s * 1.02) best = { s: lo, rows };
    }
    if (!best) best = { s: 0.01, rows: [items] };
    const fits = best.rows.map(r => rowFit(r, best.s));
    const total = fits.reduce((a, f) => a + f.h, 0) + RGAP * (fits.length - 1);
    let y = (ah - total) / 2;
    fits.forEach(f => {
      let x = (aw - f.w) / 2;
      f.cols.forEach(c => {
        let cy = y + (f.h - c.h) / 2;
        c.items.forEach(it => { const d = 2 * it.b * best.s; it.x = x + c.w / 2; it.y = cy + it.lh + d / 2; it.r = d / 2; cy += d + it.lh; });
        x += c.w + RGAP;
      });
      y += f.h + RGAP;
    });
    return best.s;
  }
  function layoutAll(S) {
    const roots = rootKeys(S).map(k => rootNode(S, k));
    const aw = Math.max(200, stageW - M.l - M.r), ah = Math.max(160, stageH - M.t - M.b);
    roots.forEach(r => {
      r.b = Math.sqrt(r.w);
      const t1 = labW('vb-t1', r.name + (r.cnt ? ' · ' + r.cnt : ''), 9) + (r.sig ? 26 : 0), t2 = r.sub ? labW('vb-t2', r.sub, 6.5) : 0;
      r.lw = Math.min(200, Math.max(t1, t2)) + 8;
      r.lh = r.sub ? LH : 26;
    });
    if (roots.length) shelf(roots, aw, ah);
    const all = [], byKey = new Map();
    roots.forEach(r => {
      r.x += M.l; r.y += M.t;
      all.push(r); byKey.set(r.key, r);
      if (!r.children.length) return;
      const inner = r.r - Math.max(3, r.r * 0.03);
      const top = { children: r.children };
      const hr = d3.hierarchy(top, d => d === top ? d.children : null).sum(d => d === top ? 0 : d.w)
        .sort((a, b) => b.value - a.value || (a.data.key < b.data.key ? -1 : 1));
      d3.pack().size([2 * inner, 2 * inner]).padding(Math.max(2.5, inner * 0.022))(hr);
      hr.children.forEach(c => { const n = c.data; n.x = r.x - inner + c.x; n.y = r.y - inner + c.y; n.r = c.r; n.parent = r; all.push(n); byKey.set(n.key, n); });
    });
    return { roots, all, byKey };
  }
  function containsAny(n, set) {
    if (n.id && set.has(n.id)) return true;
    if (n.kind === 'group') return n.ids.some(id => set.has(id) || subtreeHas(id, set));
    if (n.kind === 'house') return subtreeHas(n.id, set);
    return false;
  }
  function relayout(S, animate) {
    if (!stageW || !stageH || mode !== 'bub') return;
    layout = layoutAll(S);
    drawBubbles(animate);
  }
  function drawBubbles(animate) {
    const L = layout, nodes = L.all;
    const dur = animate && !App.reduced ? 520 : 0;
    gC.selectAll('circle.vb').interrupt('vb');
    const t = dur ? d3.transition('vb').duration(dur).ease(d3.easeCubicInOut) : null;
    const circ = gC.selectAll('circle.vb').data(nodes, d => d.key);
    circ.exit().classed('gone', true).call(sel2 => { if (t) sel2.transition(t).attr('r', 0).style('opacity', 0).remove(); else sel2.remove(); });
    gC.selectAll('circle.gone').filter(function () { return !d3.active(this, 'vb'); }).remove();
    const ent = circ.enter().append('circle').attr('data-key', d => d.key).attr('cx', d => d.parent ? d.parent.x : d.x).attr('cy', d => d.parent ? d.parent.y : d.y).attr('r', 0);
    const all = ent.merge(circ)
      .attr('class', d => 'vb vb-' + d.kind + ' h-' + d.cls + (d.id && d.id === sel ? ' sel' : '') + (d.kind === 'root' && d.id ? ' is-house' : '') + (d.own ? ' own' : ''))
      .attr('data-vh', d => d.id || null)
      .attr('tabindex', d => d.kind === 'root' && !d.id ? null : 0)
      .attr('role', d => d.kind === 'root' && !d.id ? null : 'button')
      .attr('aria-label', d => d.name + (d.cnt ? ', ' + App.plural(d.cnt, 'дом', 'дома', 'домов') : ''));
    all.order();
    (t ? all.transition(t) : all).attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r).style('opacity', 1);
    if (t) { gLab.selectAll('*').remove(); setTimeout(() => { if (layout === L) { placeLabels(true); pulse(); } }, dur + 20); }
    else { placeLabels(); pulse(); }
    markQuery();
  }
  function pulse() {
    if (!moved.size || App.reduced || !layout) return;
    gPulse.selectAll('*').remove();
    layout.all.filter(n => n.kind !== 'root' && containsAny(n, moved)).slice(0, 80).forEach(n => {
      gPulse.append('circle').attr('class', 'vb-pulse').attr('cx', n.x).attr('cy', n.y).attr('r', n.r)
        .transition().duration(1300).ease(d3.easeCubicOut).attr('r', n.r + 12).style('opacity', 0).remove();
    });
  }
  /* Подписи: не налезают друг на друга — сначала корни и крупные круги, мелким — только число или ничего. */
  function fit(cls, s, maxW, approx) {
    if (labW(cls, s, approx) <= maxW) return s;
    let lo = 0, hi = s.length;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (labW(cls, s.slice(0, mid) + '…', approx) <= maxW) lo = mid; else hi = mid - 1; }
    return lo >= 3 ? s.slice(0, lo).replace(/[\s,·]+$/, '') + '…' : '';
  }
  // перенос на две строки по словам; не влезло — многоточие во второй строке
  function wrap2(cls, s, maxW, approx) {
    if (labW(cls, s, approx) <= maxW) return [s];
    const words = s.split(' ');
    if (words.length < 2) return [fit(cls, s, maxW, approx)].filter(Boolean);
    let a = words[0], i = 1;
    while (i < words.length && labW(cls, a + ' ' + words[i], approx) <= maxW) a += ' ' + words[i++];
    if (labW(cls, a, approx) > maxW) return [fit(cls, s, maxW, approx)].filter(Boolean);
    return [a, fit(cls, words.slice(i).join(' '), maxW, approx)].filter(Boolean);
  }
  function placeLabels(fade) {
    if (!layout) return;
    const specs = [];
    layout.all.forEach(n => {
      const x = n.x, y = n.y, R = n.r;
      if (n.kind === 'root') {
        const room = Math.max(2 * R, n.lw || 140), cnt = n.cnt ? ' · ' + n.cnt : '';
        const t1 = fit('vb-t1', n.name, room - (n.sig ? 26 : 0) - labW('vb-t1', cnt, 9), 9);
        const t2 = n.sub ? fit('vb-t2', n.sub, room, 6.5) : '';
        specs.push({ key: n.key, x, y: y - R - (t2 ? 24 : 9), kind: 'root', lines: [[t1 ? t1 + cnt : '', 'vb-t1'], [t2, 'vb-t2']], sig: n.sig, n });
        return;
      }
      if (n.kind === 'house' || n.kind === 'group') {
        if (R < 13) return;
        const big = n.great && R >= 44;
        const t = R >= 18 ? wrap2('vb-n', n.name, Math.max(1.75 * R, Math.min(2 * R + 10, 76)), 7) : [];
        specs.push({ key: n.key, x, y: big ? y + Math.min(R * 0.28, 15) : y, kind: 'in', lines: t.map(x2 => [x2, 'vb-n']).concat([[String(n.cnt), 'vb-c']]), sig: big ? n.cls : null, sigW: Math.min(R * 0.46, 34), n });
        return;
      }
      if (R < 9) return;
      const t = fit('vb-l', n.name, Math.max(2 * R + 14, R >= 12 ? 84 : 0), 6.2);
      if (!t || (t.endsWith('…') && t.length < 6)) return;
      specs.push({ key: n.key, x, y, kind: 'leaf', lines: [[t + (n.own ? ' ⚑' : ''), 'vb-l']], n });
    });
    const PRI = { root: 0, in: 1, leaf: 2 };
    specs.sort((a, b) => PRI[a.kind] - PRI[b.kind] || b.n.r - a.n.r);
    const boxes = [], kept = [];
    const boxOf = (d, lines) => {
      const w = Math.max(...lines.map(l => labW(l[1], l[0], l[1] === 'vb-t1' ? 9 : 6.6))) + (d.kind === 'root' && d.sig ? 26 : 0);
      if (d.kind === 'root') return [d.x - w / 2, d.y - 15, d.x + w / 2, d.y + 16 * (lines.length - 1) + 4];
      if (d.kind === 'in') { const h2 = lines.length * 13 / 2, sg = d.sig ? d.sigW * 76 / 64 + 3 : 0; return [d.x - w / 2, d.y - h2 - sg, d.x + w / 2, d.y + h2]; }
      return [d.x - w / 2, d.y - 7, d.x + w / 2, d.y + 6];
    };
    const free = b => !boxes.some(o => b[0] < o[2] + 2 && o[0] < b[2] + 2 && b[1] < o[3] && o[1] < b[3]);
    specs.forEach(d => {
      d.lines = d.lines.filter(l => l[0]);
      if (!d.lines.length) return;
      let b = boxOf(d, d.lines);
      if (!free(b) && d.kind === 'in' && d.lines.length > 1) { d.lines = d.lines.slice(-1); d.sig = null; b = boxOf(d, d.lines); }
      if (!free(b) && d.kind !== 'root') return;
      boxes.push(b);
      kept.push(d);
    });
    const g = gLab.selectAll('g.vb-lab').data(kept, d => d.key);
    g.exit().remove();
    const en = g.enter().append('g').attr('class', 'vb-lab');
    const all = en.merge(g).attr('transform', d => 'translate(' + d.x.toFixed(1) + ',' + d.y.toFixed(1) + ')').attr('data-kind', d => d.kind);
    all.each(function (d) {
      const gg = d3.select(this);
      const sig = d.sig && App.sigilSVG ? (d.kind === 'root' ? 20 : d.sigW) : 0;
      const keySig = d.sig ? d.sig + ':' + Math.round(sig) : '';
      if (gg.attr('data-sig') !== keySig) {
        gg.selectAll('g.vb-sig').remove();
        gg.attr('data-sig', keySig);
        if (keySig) gg.append('g').attr('class', 'vb-sig h-' + d.sig).html(App.sigilSVG(d.sig, 0, 0, sig, 'vb-sigil'));
      }
      const tx = gg.selectAll('text').data(d.lines);
      tx.exit().remove();
      tx.enter().append('text').merge(tx).attr('class', l => l[1]).text(l => l[0]);
      const lines = gg.selectAll('text').nodes();
      if (d.kind === 'root') {
        const w1 = d.lines[0][1] === 'vb-t1' ? labW('vb-t1', d.lines[0][0], 9) : 0;
        const sx = d.sig ? -(w1 + 26) / 2 : 0;
        lines.forEach((t2, i) => d3.select(t2).attr('text-anchor', i === 0 && d.sig ? 'start' : 'middle').attr('x', i === 0 && d.sig ? sx + 26 : 0).attr('y', i * 16));
        gg.select('.vb-sig').attr('transform', 'translate(' + sx + ',' + (-17) + ')');
      } else if (d.kind === 'in') {
        const hgt = lines.length * 13;
        lines.forEach((t2, i) => d3.select(t2).attr('text-anchor', 'middle').attr('x', 0).attr('y', -hgt / 2 + 10 + i * 13));
        if (d.sig) gg.select('.vb-sig').attr('transform', 'translate(' + (-d.sigW / 2) + ',' + (-hgt / 2 - d.sigW * 76 / 64 - 3) + ')');
      } else lines.forEach(t2 => d3.select(t2).attr('text-anchor', 'middle').attr('x', 0).attr('y', 4));
    });
    if (fade && !App.reduced) en.style('opacity', 0).transition().duration(180).style('opacity', 1);
  }
  // нажатие: дом — карточка; «остальные знаменосцы» — показать их списком
  function activate(key) {
    const n = layout && layout.byKey.get(key);
    if (!n) return;
    hideTip();
    if (n.kind === 'group') {
      open.add('g:' + n.rk);
      setMode('list');
      const s = listEl.querySelector('.vs-realm[data-key="' + cssEsc(n.rk) + '"] .vs-leaves');
      if (s && s.scrollIntoView) s.scrollIntoView({ block: 'start', behavior: App.reduced ? 'auto' : 'smooth' });
      return;
    }
    if (n.id) openHouse(n.id);
  }
  const cssEsc = s => (window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^\w:-]/g, '\\$&'));

  /* ——— Поиск: в списке — подсветка и раскрытие цепочки, в кругах — подсветка кругов, где спрятан дом ——— */
  // «фрей» находит «Фреи»: й и ё не различаются, у длинного запроса последняя буква не обязательна
  const norm = t => t.toLowerCase().replace(/й/g, 'и').replace(/ё/g, 'е');
  function hitsOf() {
    if (!query || !last) return [];
    const q = norm(query), q2 = q.length >= 4 ? q.slice(0, -1) : q;
    return [...last.par.keys()].filter(id => { const t = norm(H.get(id).ru + ' ' + H.get(id).en); return t.includes(q) || t.includes(q2); });
  }
  function markQuery() {
    if (!built) return;
    const hits = new Set(hitsOf());
    el.classList.toggle('q-on', !!query);
    if (mode === 'list' && listEl) {
      listEl.querySelectorAll('[data-vh]').forEach(b => b.classList.toggle('hit', hits.has(b.dataset.vh)));
      listEl.querySelectorAll('.vs-tog').forEach(b => {
        const k = b.dataset.tog, closed = b.getAttribute('aria-expanded') !== 'true';
        let has = false;
        if (query && closed) has = k.startsWith('h:') ? subtreeHas(k.slice(2), hits) : (split(last, k.slice(2)).small.some(id => hits.has(id) || subtreeHas(id, hits)));
        b.classList.toggle('has-hit', has);
        const row = b.parentElement; if (row) row.classList.toggle('has-hit', has);
      });
    }
    if (gC) gC.selectAll('circle.vb').classed('hit', d => !!d.id && hits.has(d.id)).classed('has-hit', d => !!query && !(d.id && hits.has(d.id)) && d.kind !== 'root' && containsAny(d, hits));
  }
  function nextHit() {
    const hits = hitsOf();
    if (!hits.length) return;
    hitIdx = (hitIdx + 1) % hits.length;
    openHouse(hits[hitIdx], true);
  }
  // показать дом в списке: раскрыть цепочку сюзеренов и «остальных», прокрутить к строке
  function reveal(id) {
    const S = last;
    if (!S || !S.par.has(id)) return;
    const chain = [id];
    let q = S.par.get(id);
    while (q != null && H.has(q)) { chain.push(q); q = S.par.get(q); }
    const rootKey = q != null ? q : chain[chain.length - 1];
    const below = q != null ? chain : chain.slice(0, -1);       // дома ниже корня, от самого дома вверх
    below.slice(1).forEach(a => open.add('h:' + a));
    const first = below[below.length - 1];
    if (first && !isBig(S, first) && split(S, rootKey).grouped) open.add('g:' + rootKey);
    syncAll();
    if (mode !== 'list') { if (gC) gC.selectAll('circle.vb').classed('sel', d => !!d.id && d.id === sel); return; }
    drawList(S, false);
    const b = listEl.querySelector('[data-vh="' + cssEsc(id) + '"]');
    if (b) {
      listEl.querySelectorAll('.focus-hit').forEach(x => x.classList.remove('focus-hit'));
      b.classList.add('focus-hit');
      if (b.scrollIntoView) b.scrollIntoView({ block: 'center', behavior: App.reduced ? 'auto' : 'smooth' });
    }
  }

  /* ——— Шапка: год, эпоха, события ——— */
  // края ленты событий гаснут только там, где за краем ещё есть события
  function fadeEvs() {
    const l = evsEl.scrollLeft > 2, r = evsEl.scrollLeft + evsEl.clientWidth < evsEl.scrollWidth - 2;
    evsEl.classList.toggle('fade-l', l); evsEl.classList.toggle('fade-r', r);
  }
  let evEra = -1;
  function drawHeader(S) {
    yearEl.textContent = yearWord(year);
    const cur = eventAt(year), exact = atEvent(year);
    const era = cur ? cur.era : 0;
    if (+eraSel.value !== era) eraSel.value = String(era);
    if (evEra !== era) {
      evEra = era;
      const D = evDiff();
      evsEl.innerHTML = EVS.map((e, i) => e.era !== era ? '' : '<button type="button" class="vs-ev" data-t="' + e.t + '" title="' + esc(e.desc + (D[i] ? ' — ' + App.plural(D[i], 'дом сменил', 'дома сменили', 'домов сменили') + ' сюзерена' : '')) + '">' +
        '<span class="vs-ev-y">' + esc(yearShort(e.t)) + '</span>' + esc(e.name) + (D[i] ? '<span class="vs-ev-n">' + D[i] + '</span>' : '') + '</button>').join('');
    }
    let on = null;
    evsEl.querySelectorAll('.vs-ev').forEach(b => { const hit = !!cur && Math.abs(+b.dataset.t - cur.t) < 1e-6; b.classList.toggle('on', hit); b.classList.toggle('exact', hit && !!exact); b.setAttribute('aria-pressed', String(hit && !!exact)); if (hit) on = b; });
    if (on) { const r = on.offsetLeft - evsEl.offsetLeft, w = evsEl.clientWidth; if (r < evsEl.scrollLeft + 24 || r + on.offsetWidth > evsEl.scrollLeft + w - 24) { const left = r - w / 2 + on.offsetWidth / 2; if (evsEl.scrollTo) evsEl.scrollTo({ left, behavior: App.reduced ? 'auto' : 'smooth' }); else evsEl.scrollLeft = left; } }
    fadeEvs();
    const n = exact ? evDiff()[EVS.indexOf(exact)] : 0;
    const king = S.y >= THRONE_START && !['blacks', 'greens'].some(k => claimantAt(k, S.y)) ? kingAt(S.y) : '';
    statusEl.innerHTML = (exact ? '<b>' + esc(exact.desc) + '</b>' : cur ? esc(App.t('После события: {event}', { event: '' })) + '<b>' + esc(cur.name) + '</b> · ' + esc(yearWord(cur.t)) : App.t('до высадки Эйгона')) +
      (n ? '<span class="vs-st-n">' + esc(App.t('{n} смен присяги', { n })) + '</span>' : '') +
      (king ? '<span>' + esc(App.t('На троне: {name}', { name: king })) + '</span>' : '');
  }

  /* ——— Отрисовка ——— */
  function draw() {
    pending = false;
    if (!built) return;
    const S = snapshot(year);
    drawHeader(S);
    const prev = last;
    const changed = !prev || prev.sig !== S.sig;
    moved = prev && changed ? new Set(diffIds(prev, S)) : new Set();
    last = S;
    if (changed || (mode === 'list' && !listEl.firstChild)) {
      if (mode === 'list') drawList(S, false); else relayout(S, !!prev && !!layout);
    } else {
      // король сменился без перемен в присягах — обновить подпись трона
      const king = kingAt(S.y);
      if (king && !['blacks', 'greens'].some(k => claimantAt(k, S.y))) {
        const th = mode === 'list' ? listEl.querySelector('.vs-realm[data-key="throne"] .vs-realm-sub') : null;
        if (th) th.textContent = App.t('На троне: {name}', { name: king });
        const r = layout && layout.byKey.get('r:throne');
        if (r && mode === 'bub' && r.sub !== App.t('На троне: {name}', { name: king })) { r.sub = App.t('На троне: {name}', { name: king }); placeLabels(); }
      }
    }
    if (App.redrawScale) App.redrawScale();
    if (sel && state.view === 'vassal') renderPanel();
  }
  function schedule() { if (pending) return; pending = true; (window.requestAnimationFrame || (f => setTimeout(f, 16)))(draw); }
  function setYear(y) {
    y = Math.max(Y0, Math.min(Y1, y));
    if (y === year) return;
    year = y;
    schedule();
    if (App.redrawScale) App.redrawScale();
    if (state.view === 'vassal') App.setHash('v:' + (Math.round(year * 100) / 100));
  }
  App.vSetYear = setYear;
  App.vYear = () => year;

  /* ——— Карточка дома ——— */
  function periods(h) {
    const C = changes().concat(h.al.map(g => g[0]), h.ex[0] != null ? [h.ex[0]] : []).filter(t => t >= Y0 && t < Y1);
    const ts = [...new Set(C)].sort((a, b) => a - b).filter(t => exists(h, t));
    const out = [];
    ts.forEach(t => {
      const L = liegeAt(h, t), key = L.to || '';
      const p = out[out.length - 1];
      if (p && p.key === key) return;
      if (p) p.b = t;
      out.push({ a: t, b: null, key, to: L.to, why: L.why, own: L.own });
    });
    if (out.length) out[out.length - 1].b = h.ex[1] != null ? h.ex[1] : Y1 + 0.02;
    return out;
  }
  // текст о доме — texts/vassals.md; тот же абзац показывает и карточка дома на древе
  function houseText(h) {
    if (!h.t) return '';
    return (h.tUntranslated ? '<p class="tr-missing">Это описание пока доступно только по-русски.</p>' : '') +
      h.t.split(/\n\s*\n/).map(p => '<p class="note vs-note"' + (h.tUntranslated ? ' lang="ru"' : '') + '>' + esc(p) + '</p>').join('') +
      (h.ai ? '<p class="ai-mark" title="Описание ещё редактируется">✎ Черновик</p>' : '');
  }
  // для карточки дома на древе: край, годы и «кому служил» по периодам
  App.vHouseInfo = id => {
    const h = H.get(id);
    if (!h) return null;
    return { h, region: REG.get(h.region).ru, from: h.ex[0], to: h.ex[1], yearWord, textHtml: houseText(h),
      periods: periods(h).map(p => ({ span: span(p.a, p.b), liege: liegeName(p.to, p.a), to: p.to, why: p.why ? tidy(p.why) : '' })) };
  };
  function renderPanel() {
    const h = sel && H.get(sel);
    ['--hc'].forEach(v => panelContent.style.removeProperty(v));
    if (!h) {
      panelContent.className = 'panel-inner h-none vassal';
      panel.classList.add('is-empty');
      panelContent.innerHTML = '<div class="empty"><p class="eyebrow">' + App.plural(V_HOUSES.length, 'дом', 'дома', 'домов') + ' Вестероса</p><h2>Выберите дом</h2>' +
        '<p>Выберите год на шкале или событие под ней. Кнопки ‹ › переходят между событиями; Shift + стрелки — между всеми изменениями присяг.</p>' +
        '<p>В списке стрелка раскрывает вассалов, название открывает карточку дома. В круговой схеме размер круга зависит от числа вассальных домов. Подсветка отмечает смену присяги, ⚑ — участие в войне или мятеже.</p>' +
        '<p class="stats">Источник — A Wiki of Ice and Fire, русские названия — 7kingdoms.ru</p></div>';
      return;
    }
    panel.classList.remove('is-empty');
    panelContent.className = 'panel-inner vassal h-' + clsOf(h);
    const S = last || snapshot(year);
    const now = S.kids.get(h.id) || [];
    const per = periods(h);
    const life = h.ex[0] != null || h.ex[1] != null ? '<p class="vs-life">' + (h.ex[0] != null ? App.t('с {y}', { y: yearWord(h.ex[0]) }) : '') + (h.ex[0] != null && h.ex[1] != null ? ' ' : '') + (h.ex[1] != null ? App.t('по {y}', { y: yearWord(h.ex[1] - 0.001) }) : '') + '</p>' : '';
    panelContent.innerHTML =
      '<span class="grab" aria-hidden="true"></span>' +
      '<div class="panel-nav"><span></span><button type="button" class="btn btn-icon close" id="panel-close" aria-label="Закрыть карточку">×</button></div>' +
      '<div class="panel-top' + (h.great ? '' : ' no-medal') + '">' + (h.great && App.sigilSVG ? App.sigilSVG(clsOf(h), 0, 0, 64, 'medal') : '') + '<div>' +
        '<p class="eyebrow">' + esc(REG.get(h.region).ru) + (h.great ? ' · ' + App.t('Великий дом') : '') + '</p>' +
        '<h2>' + esc(h.ru) + '</h2><p class="en">House ' + esc(h.en) + (h.seat ? ' · ' + esc(h.seat) : '') + '</p>' + life +
      '</div></div>' +
      houseText(h) +
      '<h3 class="sec">Кому служил</h3>' +
      '<ol class="events vs-periods">' + per.map(p => '<li' + (p.a <= year && year < p.b ? ' class="now"' : '') + '><span class="ev-year">' + span(p.a, p.b) + '</span><span class="ev-text">' +
        (p.to && H.has(p.to) ? '<button type="button" class="linkish" data-vh="' + p.to + '">' + esc(liegeName(p.to, p.a)) + '</button>' : esc(liegeName(p.to, p.a))) +
        (p.why ? '<span class="ref-note block">' + esc(tidy(p.why)) + '</span>' : '') + '</span></li>').join('') + '</ol>' +
      (now.length ? '<h3 class="sec">' + esc(App.t('Знаменосцы в {year}', { year: yearWord(year) })) + '</h3><ul class="refs">' + now.map(id => '<li><button type="button" class="chip h-' + REGCLS[H.get(id).region] + '" data-vh="' + id + '">' + esc(H.get(id).ru) + '</button></li>').join('') + '</ul>' : '') +
      (App.houseByV && App.houseByV(h.id) ? '<div class="panel-actions vs-card"><button type="button" class="btn" data-house="' + App.houseByV(h.id) + '">Карточка дома на древе</button></div>' : '') +
      '<p class="vs-src"><a href="https://awoiaf.westeros.org/index.php/' + encodeURIComponent(h.page) + '" target="_blank" rel="noopener">Статья на A Wiki of Ice and Fire ↗</a></p>';
  }
  panelContent.addEventListener('click', e => {
    if (state.view !== 'vassal') return;
    const b = e.target.closest('[data-vh]');
    if (b) { e.stopPropagation(); openHouse(b.dataset.vh, true); }
  });
  function markSel() {
    if (listEl) listEl.querySelectorAll('[data-vh]').forEach(b => b.classList.toggle('sel', b.dataset.vh === sel));
    if (gC) gC.selectAll('circle.vb').classed('sel', d => !!d.id && d.id === sel);
  }
  function openHouse(id, show) {
    if (!H.has(id)) return;
    if (pending) draw();                  // год только что сменили — сначала дорисовать его
    sel = id;
    if (built && show) {
      // дома нет в этот год — перейти к ближайшему году, где он есть
      if (last && !last.par.has(id) && !last.crown.has(id)) {
        const h = H.get(id), t = h.ex[0] != null && year < h.ex[0] ? h.ex[0] : h.ex[1] != null ? h.ex[1] - 0.01 : year;
        if (t !== year) { year = Math.max(Y0, Math.min(Y1, t)); draw(); }
      }
      if (last && last.par.has(id)) reveal(id);
    }
    if (built) markSel();
    renderPanel();
  }
  App.vOpenHouse = openHouse;
  App.hooks.view.push(v => { document.getElementById('canvas').classList.toggle('in-vassal', v === 'vassal'); if (v !== 'vassal') hideTip(); });

  App.registerView('vassal', {
    el, sel: d3.select(el), tab: document.getElementById('tab-vassal'), legend: document.getElementById('vassal-legend'),
    persons: false, links: false, fitLabel: 'Наверх', scale: 'sync', scaleMap,
    scaleMarks: () => EVS.filter(e => e.t > Y0).map(e => ({ t: e.t, label: e.name + ' · ' + yearWord(e.t) })),
    scaleMarkOn: () => { const e = atEvent(year); return e ? e.t : null; },
    ownYear: {
      get: () => year,
      set: y => setYear(snapYear(y)),
      step: (dir, fine) => fine ? stepChange(dir) : stepEvent(dir),
      label: y => yearShort(y)
    },
    get hint() { return hintText(); },
    zoomBy: () => {},
    fit: () => { if (listEl && mode === 'list') { if (listEl.scrollTo) listEl.scrollTo({ top: 0, behavior: App.reduced ? 'auto' : 'smooth' }); else listEl.scrollTop = 0; } },
    center: id => openHouse(id, true),
    panel: () => renderPanel(),
    close: () => { sel = null; if (built) markSel(); renderPanel(); },
    onShow: () => { if (!built) build(); else if (mode === 'bub') resize(true); else draw(); },
    hash: () => 'v:' + (Math.round(year * 100) / 100)
  });
  const prevStart = App.startHash;
  App.startHash = h => {
    if (h.startsWith('v:')) { App.render(); const y = parseFloat(h.slice(2)); if (isFinite(y)) year = Math.max(Y0, Math.min(Y1, y)); App.setView('vassal'); return true; }
    return prevStart ? prevStart(h) : false;
  };

  /* ——— Для проверок ——— */
  App.vOpenAll = on => openAll(!!on);
  App.vMode = m => { if (m && built) setMode(m); return mode; };
  App.vEvents = () => EVS.map((e, i) => ({ t: e.t, name: e.name, era: ERAS[e.era].name, n: evDiff()[i] }));
  App.smokeVassal = () => {
    App.setView('vassal');
    const out = {};
    const at = (y, id) => { const S = snapshot(y); return S.par.has(id) ? S.par.get(id) : (S.crown.has(id) ? 'корона' : 'нет'); };
    out.vHouses = V_HOUSES.length;
    out.vChanges = changes().length;
    out.vEvents = EVS.length;
    const m0 = mode;
    setMode('list');
    setYear(100); draw();
    out.vRealms100 = el.querySelectorAll('.vs-realm').length;
    out.vCards100 = el.querySelectorAll('.vs-card').length;
    out.vRowsClosed100 = el.querySelectorAll('.vs-list-view .vs-row').length;
    openAll(true);
    out.vRowsOpen100 = el.querySelectorAll('.vs-list-view .vs-row').length;
    openAll(false);
    setMode('bub');
    out.vCircles100 = el.querySelectorAll('#vs-bub circle.vb').length;
    setMode('list');
    out.vMartell100 = at(100, 'martell');
    out.vMartell200 = at(200, 'martell');
    out.vTully5bc = at(-5, 'tully');
    out.vHightower130 = at(130, 'hightower');
    out.vFrey299end = at(299.9, 'frey');
    out.vStark299 = at(299.3, 'stark');
    out.vConnington300 = at(300.9, 'connington');
    out.vTarg290 = at(290, 'targaryen');
    out.vBracken2995 = at(299.5, 'bracken');
    setYear(299.7); draw();
    openHouse('umber', true);
    out.vPanel = (document.querySelector('#panel h2') || {}).textContent;
    out.vPeriods = document.querySelectorAll('#panel .vs-periods li').length;
    out.vUmberShown = !!el.querySelector('.vs-list-view [data-vh="umber"]');
    App.closeView();
    openAll(false);
    setMode(m0);
    setYear(298);
    App.setView('people');
    return out;
  };
})();
