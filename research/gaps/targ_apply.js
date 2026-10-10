/* Пробелы в родословной Таргариенов по A Wiki of Ice and Fire: безымянные, мертворождённые и внебрачные дети. */
const fs = require('fs'), path = require('path');
const REPO = process.argv[2];
const D = require(path.join(REPO, 'tools', 'data.js'));
const file = path.join(D.DATA, 'people', 'targ.json');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const G = t => { const g = j.groups.find(g => g.title === t); if (!g) throw new Error('нет группы ' + t); return g; };
const all = () => j.groups.flatMap(g => g.people);
const GLOBAL = new Set(D.load().PEOPLE.map(p => p.id));
const get = id => { const p = all().find(p => p.id === id); if (!p) throw new Error('нет ' + id); return p; };
const mk = o => D.orderKeys(Object.assign({ k: 'T' }, o), D.PERSON_KEYS);
const TEXT = {};
let added = 0;
function after(id, recs) {
  const g = j.groups.find(g => g.people.some(p => p.id === id));
  const i = g.people.findIndex(p => p.id === id);
  recs.forEach(r => { if (GLOBAL.has(r.id) || all().some(p => p.id === r.id)) throw new Error('уже есть ' + r.id); });
  g.people.splice(i + 1, 0, ...recs.map(r => { TEXT[r.id] = r.t; delete r.t; added++; return mk(r); }));
}
function before(id, recs) {
  const g = j.groups.find(g => g.people.some(p => p.id === id));
  const i = g.people.findIndex(p => p.id === id);
  g.people.splice(i, 0, ...recs.map(r => { TEXT[r.id] = r.t; delete r.t; added++; return mk(r); }));
}
function group(afterTitle, title, recs) {
  const i = j.groups.findIndex(g => g.title === afterTitle);
  j.groups.splice(i + 1, 0, { title, people: recs.map(r => { TEXT[r.id] = r.t; delete r.t; added++; return mk(r); }) });
}

// Владыки Драконьего Камня
after('elaena_l', [
  { id: 'gaemon_dau', name: 'Дочь', full: 'Младшая дочь Гейемона Славного', fem: 1, pre: 1, p: 'gaemon', par: ['gaemon', 'daenys'], wiki: 'Gaemon Targaryen (son of Aenar)',
    t: 'Младшая дочь Гейемона Славного и Дейенис Сновидицы, сестра Эйгона и Элейны; имя её не сохранилось. Она вышла замуж за мелкого лорда, и один из её потомков был среди претендентов на Великом совете 101 года.' }
]);

// Мейгор I
group('Завоеватели', 'Дети Мейгора I', [
  { id: 'maegor_son44', name: 'Сын', full: 'Мертворождённый сын Мейгора I и Алис Харроуэй', p: 'maegor1', par: ['maegor1', 'Алис Харроуэй'], b: '44', d: '44', wiki: 'Alys Harroway',
    t: 'Сын Мейгора I и королевы Алис Харроуэй, родившийся мёртвым и уродливым, без глаз, в 44 году. Королева Тианна сказала королю, что ребёнок не от него, а в 48 году призналась, что сама отравила его в утробе.' },
  { id: 'maegor_child48', name: 'Ребёнок', full: 'Мертворождённый ребёнок Мейгора I и Джейн Вестерлинг', p: 'maegor1', par: ['maegor1', 'Джейн Вестерлинг'], b: '47/48', d: '47/48', wiki: 'Jeyne Westerling (wife of Maegor I)',
    t: 'Ребёнок Мейгора I и королевы Джейн Вестерлинг, родившийся мёртвым на три месяца раньше срока, без рук и ног и с признаками обоих полов. Позднее королева Тианна призналась, что отравила его в утробе.' },
  { id: 'maegor_son48', name: 'Сын', full: 'Мертворождённый сын Мейгора I и Элинор Костейн', p: 'maegor1', par: ['maegor1', 'Элинор Костейн'], b: '48', d: '48', wiki: 'Elinor Costayne',
    t: 'Сын Мейгора I и королевы Элинор Костейн, родившийся мёртвым в начале 48 года; говорили, что он был без глаз и с маленькими крыльями.' },
  { id: 'maegor_bastard', name: 'Латник', full: 'Латник, называвший себя бастардом Мейгора I', k: 'R', p: 'maegor1', par: ['maegor1 (по словам матери)', 'дочь трактирщика'], unc: 1, wiki: 'Maegor I Targaryen',
    t: 'Рыжий латник, заявивший права на трон на Великом совете 101 года как бастард Мейгора I. Единственным доказательством была его мать, старая дочь трактирщика, рассказавшая, что Мейгор когда-то её изнасиловал; лорды поверили в насилие, но не в то, что от него родился ребёнок. Имя латника неизвестно.' }
]);

// Внуки Джейехериса I
after('aegon_b', [
  { id: 'saera_sons', name: 'Сыновья', full: 'Внебрачные сыновья Саэры', group: 1, k: 'R', p: 'saera', par: ['разные отцы, один из них — триарх Волантиса', 'saera'], wiki: 'Saera Targaryen',
    t: 'Не меньше трёх внебрачных сыновей принцессы Саэры, рождённых в Волантисе от разных отцов, одним из которых был триарх. Говорили, что один из них был вылитый король Джейехерис в юности; имена их неизвестны.' },
  { id: 'gael_son', name: 'Сын', full: 'Мертворождённый сын Гаэль', k: 'R', p: 'gael', par: ['странствующий певец', 'gael'], b: '99', d: '99', wiki: 'Gael Targaryen',
    t: 'Внебрачный сын принцессы Гаэль от странствующего певца, родившийся мёртвым в 99 году. После этого Гаэль, не вынеся горя, вошла в воды Черноводного залива и утонула.' }
]);

// Визерис I
before('rhaenyra', [
  { id: 'viserys1_son', name: 'Сын', full: 'Сын Визериса I и Эйммы Аррен', p: 'viserys1', par: ['viserys1', 'aemma'], b: '93–97', d: 'в младенчестве', wiki: 'Viserys I Targaryen',
    t: 'Сын Визериса I и Эйммы Аррен, родившийся в первые годы их брака, ещё до Рейениры, и умерший в колыбели; имя его не сохранилось.' }
]);
after('daeron_d', [
  { id: 'trystane_tf', name: 'Тристан Труфайр', en: 'Trystane Truefyre', k: 'R', p: 'viserys1', par: ['viserys1 (по словам сира Перкина Блохи)'], unc: 1, b: '114', d: '130',
    t: 'Оруженосец сира Перкина Блохи, родился в 114 году. Во время Танца драконов Перкин объявил его внебрачным сыном короля Визериса I; так ли это, неизвестно. Умер в 130 году в Королевской Гавани.' }
]);

// Эйгон II и Эймонд
after('maelor', [
  { id: 'aegon2_son', name: 'Сын', full: 'Внебрачный сын Эйгона II', k: 'R', p: 'aegon2', par: ['aegon2 (по словам Грибка)', 'девушка с Шёлковой улицы'], unc: 1, b: '123', wiki: 'Aegon II Targaryen',
    t: 'По словам шута Грибка, у принца Эйгона, будущего Эйгона II, был внебрачный сын от девушки с Шёлковой улицы, чью невинность принц купил на торгах. Мальчик родился в 123 году; имя его неизвестно.' },
  { id: 'aegon2_dau', name: 'Дочь', full: 'Внебрачная дочь Эйгона II', fem: 1, k: 'R', p: 'aegon2', par: ['aegon2 (по словам Грибка)', 'служанка королевы Алисенты'], unc: 1, b: '123', wiki: 'Aegon II Targaryen',
    t: 'По словам шута Грибка, у принца Эйгона, будущего Эйгона II, была внебрачная дочь от одной из служанок его матери, королевы Алисенты. Девочка родилась в 123 году; имя её неизвестно.' },
  { id: 'gaemon_ph', name: 'Геймон Белокурый', en: 'Gaemon Palehair', k: 'R', p: 'aegon2', par: ['aegon2 (по словам матери)', 'Эсси', 'среброволосый гребец из Лисса (по признанию матери)'], unc: 1, b: '126', d: '135',
    t: 'Сын шлюхи Эсси, родился в 126 году. Мать выдавала его за бастарда Эйгона II, и в 130 году, в Луну трёх королей, его провозгласили королём в Королевской Гавани; под пыткой Эсси призналась, что его отцом был среброволосый гребец из Лисса. Умер от яда в 135 году в Красном замке.' }
]);
group('Дети Эйгона II', 'Сын Эймонда', [
  { id: 'aemond_son', name: 'Сын', full: 'Сын Алис Риверс, мнимый сын Эймонда', k: 'R', p: 'aemond', par: ['aemond (по словам матери)', 'Алис Риверс'], unc: 1, wiki: "Alys Rivers's son",
    t: 'Сын Алис Риверс, которая утверждала, что зачала его от принца Эймонда Одноглазого. В 132 году она выдавала мальчика за законного сына Эймонда; имя его и дальнейшая судьба неизвестны.' }
]);

// Элейна и её дети от Роннела Пенроза; сыновья Визериса Пламма
after('viserys_pl', [
  { id: 'robin_pn', name: 'Робин Пенроз', en: 'Robin Penrose', hs: 'oth', h: 'Пенрозов', p: 'elaena_b', par: ['Роннел Пенроз', 'elaena_b'], b: '184–197',
    t: 'Единственный сын и старший ребёнок лорда Роннела Пенроза и принцессы Элейны; родился между 184 и 197 годами.' },
  { id: 'laena_pn', name: 'Лейна Пенроз', en: 'Laena Penrose', fem: 1, hs: 'oth', h: 'Пенрозов', p: 'elaena_b', par: ['Роннел Пенроз', 'elaena_b'], b: '185–198',
    t: 'Старшая дочь лорда Роннела Пенроза и принцессы Элейны; родилась между 185 и 198 годами.' },
  { id: 'jocelyn_pn', name: 'Джоселин Пенроз', en: 'Jocelyn Penrose', fem: 1, hs: 'oth', h: 'Пенрозов', p: 'elaena_b', par: ['Роннел Пенроз', 'elaena_b'], b: '186–199',
    t: 'Вторая дочь лорда Роннела Пенроза и принцессы Элейны; родилась между 186 и 199 годами.' },
  { id: 'joy_pn', name: 'Джой Пенроз', en: 'Joy Penrose', fem: 1, hs: 'oth', h: 'Пенрозов', p: 'elaena_b', par: ['Роннел Пенроз', 'elaena_b'], b: '187–200',
    t: 'Третья и младшая дочь лорда Роннела Пенроза и принцессы Элейны; родилась между 187 и 200 годами.' },
  { id: 'plumm_sons', name: 'Сыновья', full: 'Сыновья Визериса Пламма', group: 1, hs: 'oth', h: 'Пламмов', p: 'viserys_pl', par: ['viserys_pl', 'жена не названа'], wiki: 'Viserys Plumm',
    t: 'Сын или сыновья Визериса Пламма от жены, чьё имя неизвестно; сколько их было и как их звали, неизвестно.' }
]);

// Эйгон IV
after('daenerys_n', [
  { id: 'naerys_twin', name: 'Сын', full: 'Мертворождённый сын Эйгона IV и Нейерис', p: 'aegon4', par: ['aegon4', 'naerys'], b: '172', d: '172', wiki: 'Naerys Targaryen',
    t: 'Сын Эйгона IV и Нейерис, близнец принцессы Дейенерис; родился мёртвым в 172 году.' },
  { id: 'naerys_last', name: 'Ребёнок', full: 'Последний ребёнок Эйгона IV и Нейерис', p: 'aegon4', par: ['aegon4', 'naerys'], b: '179', d: '179', wiki: 'Naerys Targaryen',
    t: 'Ребёнок Эйгона IV и Нейерис, при родах которого королева умерла в 179 году; по всей видимости, умер и он. Пол и имя его неизвестны.' }
]);
after('daemon_bf', [
  { id: 'alysanne_mg', name: 'Алисанна', full: 'Алисанна, дочь Эйгона IV', en: 'Alysanne', fem: 1, k: 'R', p: 'aegon4', par: ['aegon4', 'Мегетт (Весёлая Мег)'], b: '155', wiki: 'Alysanne (daughter of Aegon IV)',
    t: 'Старшая из четырёх внебрачных дочерей Эйгона IV от Мегетт, Весёлой Мег; родилась в 155 году. Когда принц Визерис положил конец этой связи, девочек отдали Вере, чтобы их воспитали септами.' },
  { id: 'lily_mg', name: 'Лили', full: 'Лили, дочь Эйгона IV', en: 'Lily', fem: 1, k: 'R', p: 'aegon4', par: ['aegon4', 'Мегетт (Весёлая Мег)'], b: '156', wiki: 'Lily',
    t: 'Вторая из четырёх внебрачных дочерей Эйгона IV от Мегетт; родилась в 156 году. Вместе с сёстрами её отдали Вере, чтобы воспитать септой.' },
  { id: 'willow_mg', name: 'Ива', full: 'Ива, дочь Эйгона IV', en: 'Willow', fem: 1, k: 'R', p: 'aegon4', par: ['aegon4', 'Мегетт (Весёлая Мег)'], b: '157', wiki: 'Willow (daughter of Aegon IV)',
    t: 'Третья из четырёх внебрачных дочерей Эйгона IV от Мегетт; родилась в 157 году. Вместе с сёстрами её отдали Вере, чтобы воспитать септой.' },
  { id: 'rosey_mg', name: 'Рози', full: 'Рози, дочь Эйгона IV', en: 'Rosey', fem: 1, k: 'R', p: 'aegon4', par: ['aegon4', 'Мегетт (Весёлая Мег)'], b: '158', wiki: 'Rosey (daughter of Aegon IV)',
    t: 'Младшая из четырёх внебрачных дочерей Эйгона IV от Мегетт; родилась в 158 году. Вместе с сёстрами её отдали Вере, чтобы воспитать септой.' },
  { id: 'bellenora', name: 'Белленора Отерис', en: 'Bellenora Otherys', fem: 1, k: 'R', p: 'aegon4', par: ['aegon4 (сомнительно)', 'Беллигер Отерис'], unc: 1, b: '161–170',
    t: 'Старшая из троих детей браавосийки Беллигер Отерис, Чёрной Жемчужины, рождённых в годы её связи с Эйгоном IV; родилась между 161 и 170 годами. Отцовство Эйгона сомнительно: говорили, что у Беллигер был муж в каждом порту.' },
  { id: 'narha', name: 'Нарха Отерис', en: 'Narha Otherys', fem: 1, k: 'R', p: 'aegon4', par: ['aegon4 (сомнительно)', 'Беллигер Отерис'], unc: 1, b: '162–171',
    t: 'Вторая из троих детей Беллигер Отерис, рождённых в годы её связи с Эйгоном IV; родилась между 162 и 171 годами. Отцовство Эйгона сомнительно.' },
  { id: 'balerion_o', name: 'Балерион Отерис', en: 'Balerion Otherys', k: 'R', p: 'aegon4', par: ['aegon4 (сомнительно)', 'Беллигер Отерис'], unc: 1, b: '163–172',
    t: 'Младший из троих детей Беллигер Отерис, рождённых в годы её связи с Эйгоном IV; родился между 163 и 172 годами. Отцовство Эйгона сомнительно.' }
]);
after('shiera', [
  { id: 'butterwell_kids', name: 'Бастарды', full: 'Бастарды Эйгона IV от дочерей лорда Баттервелла', group: 1, k: 'R', p: 'aegon4', par: ['aegon4 (по рассказам)', 'дочери лорда Баттервелла'], unc: 1, wiki: 'Aegon IV Targaryen',
    t: 'Дети, которых, по рассказам, Эйгон IV за одну ночь зачал с тремя юными дочерьми лорда Баттервелла, гостя в его замке. Сколько их было и как их звали, неизвестно.' },
  { id: 'jeyne_lt', name: 'Джейн Лотстон', en: 'Jeyne Lothston', fem: 1, hs: 'oth', h: 'Лотстонов', p: 'aegon4', par: ['Лукас Лотстон (официально)', 'Фалена Стокворт', 'aegon4 (по слухам)'], unc: 1, b: '164',
    t: 'Дочь лорда Лукаса Лотстона и Фалены Стокворт, родилась в 164 году; ходили слухи, что её настоящим отцом был Эйгон IV. Позднее она стала восьмой любовницей Эйгона.' }
]);

// Блэкфайры
after('daemon3_bf', [
  { id: 'haegon_sons', name: 'Сыновья', full: 'Младшие сыновья Хейгона I Блэкфайра', group: 1, k: 'B', p: 'haegon', par: ['haegon', 'мать не названа'], wiki: 'Haegon I Blackfyre',
    t: 'Младший сын или сыновья Хейгона I Блэкфайра, рождённые в изгнании; старшим его сыном был Деймон III. Имена их неизвестны.' }
]);
after('aenys_bf', [
  { id: 'daemon_bf_sons', name: 'Двое сыновей', full: 'Двое младших сыновей Деймона I Блэкфайра', group: 1, k: 'B', p: 'daemon_bf', par: ['daemon_bf', 'Рохана из Тироша'], wiki: 'Daemon I Blackfyre',
    t: 'Шестой и седьмой сыновья Деймона I Блэкфайра и Роханы из Тироша; их имена неизвестны.' }
]);
after('calla', [
  { id: 'daemon_bf_daus', name: 'Дочери', full: 'Младшие дочери Деймона I Блэкфайра', fem: 1, group: 1, k: 'B', p: 'daemon_bf', par: ['daemon_bf', 'Рохана из Тироша'], wiki: 'Daemon I Blackfyre',
    t: 'Младшая дочь или дочери Деймона I Блэкфайра и Роханы из Тироша; у Деймона было по меньшей мере две дочери, и старшей из них была Калла. Имена и число младших неизвестны.' }
]);
get('daemon3_bf').par = ['haegon', 'мать не названа'];

// Валарр
after('valarr', [
  { id: 'valarr_sons', name: 'Двое сыновей', full: 'Мертворождённые сыновья Валарра', group: 1, p: 'valarr', par: ['valarr', 'Кира из Тироша'], d: 'при рождении', wiki: 'Valarr Targaryen',
    t: 'Сыновья Валарра и Киры из Тироша: Кира рожала дважды, но оба мальчика родились мёртвыми.' }
]);

// Дочери Мейкара I
after('daella_m', [
  { id: 'daella_kids', name: 'Дети', full: 'Дети Дейеллы, дочери Мейкара I', group: 1, hs: 'oth', h: 'отца не назван', p: 'daella_m', par: ['отец не назван', 'daella_m'], wiki: 'Daella Targaryen (daughter of Maekar I)',
    t: 'Дети принцессы Дейеллы, дочери Мейкара I, рождённые в зрелые годы. Их отец, число и имена неизвестны.' }
]);
after('rhae', [
  { id: 'rhae_kids', name: 'Дети', full: 'Дети Рейе, дочери Мейкара I', group: 1, hs: 'oth', h: 'отца не назван', p: 'rhae', par: ['отец не назван', 'rhae'], wiki: 'Rhae Targaryen',
    t: 'Дети принцессы Рейе, дочери Мейкара I, рождённые в зрелые годы. Их отец, число и имена неизвестны.' }
]);

// Эйерис II и Рейелла
after('rhaegar', [
  { id: 'shaena', name: 'Шейна', full: 'Шейна, дочь Эйериса II', fem: 1, p: 'aerys2', par: ['aerys2', 'rhaella'], b: '267', d: '267', wiki: 'Shaena Targaryen',
    t: 'Дочь короля Эйериса II и королевы Рейеллы, родилась мёртвой в 267 году, когда отец был в западных землях.' }
]);
after('daeron_a2', [
  { id: 'stillborn_a2', name: 'Ребёнок', full: 'Мертворождённый ребёнок Эйериса II и Рейеллы', p: 'aerys2', par: ['aerys2', 'rhaella'], b: '270', d: '270', wiki: 'Aerys II Targaryen',
    t: 'Ребёнок короля Эйериса II и королевы Рейеллы, родившийся мёртвым в 270 году; пол и имя его неизвестны.' },
  { id: 'aegon_a2', name: 'Эйгон', full: 'Эйгон, сын Эйериса II', p: 'aerys2', par: ['aerys2', 'rhaella'], b: '272', d: '273', wiki: 'Aegon Targaryen (son of Aerys II)',
    t: 'Сын короля Эйериса II и королевы Рейеллы; родился на два месяца раньше срока в 272 году и умер в следующем году.' },
  { id: 'jaehaerys_a2', name: 'Джейехерис', full: 'Джейехерис, сын Эйериса II', p: 'aerys2', par: ['aerys2', 'rhaella'], b: '274', d: '274', wiki: 'Jaehaerys Targaryen (son of Aerys II)',
    t: 'Сын короля Эйериса II и королевы Рейеллы; родился в 274 году и умер, не дожив до года.' }
]);
get('daeron_a2').d = '269/270';
const rg = get('rhaego'); rg.b = '299'; rg.d = '299';

// Пенроз — по написанию 7kingdoms
get('elaena_b').sp = get('elaena_b').sp.map(s => s[0] === 'Роннел Пенроуз' ? ['Роннел Пенроз'].concat(s.slice(1)) : s);
get('aerys1').sp = get('aerys1').sp.map(s => s[0] === 'Эйлинор Пенроуз' ? ['Эйлинор Пенроз'].concat(s.slice(1)) : s);

j.groups.forEach(g => { g.people = g.people.map(p => D.orderKeys(p, D.PERSON_KEYS)); });
D.writeJson('people/targ.json', j);

// ссылки на A Wiki of Ice and Fire у прежних безымянных карточек
const WIKI = {
  bar: { garon_kids: 'Garon Baratheon', ronnal_kids: 'Ronnal Baratheon', orryn_sons: 'Orryn Baratheon', boremund_daus: 'Boremund Baratheon',
    bar_lord_son1: 'Gowen Baratheon', bar_lord_son2: 'Gowen Baratheon', gowen_son: 'Gowen Baratheon', robert_twins: 'Robert I Baratheon', robert_others: 'Robert I Baratheon' },
  bw: { bw_lord10: 'Samwell Blackwood' }, gry: { gry_lord17: 'Quellon Greyjoy', gry_lord10: 'Dalton Greyjoy' },
  tul: { tul_lord17: 'Hoster Tully' }, tyr: { tyr_lord17: 'Luthor Tyrell' }
};
Object.entries(WIKI).forEach(([f, m]) => {
  const jj = JSON.parse(fs.readFileSync(path.join(D.DATA, 'people', f + '.json'), 'utf8'));
  jj.groups.forEach(g => { g.people = g.people.map(p => m[p.id] ? D.orderKeys(Object.assign(p, { wiki: m[p.id] }), D.PERSON_KEYS) : p); });
  D.writeJson('people/' + f + '.json', jj);
});

const ov = new Map(Object.entries(TEXT).map(([id, text]) => [id, { text, ai: true }]));
console.log('добавлено', added, '· файлы:', D.sync({ people: ov }).join(', '));
