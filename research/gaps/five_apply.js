/* Пробелы в родословной Ланнистеров, Хайтауэров, Мартеллов, Талли и Блэквудов по A Wiki of Ice and Fire.
   Запуск один раз: node research/gaps/five_apply.js "$PWD" (повторно не запускать — он добавляет записи). */
const fs = require('fs'), path = require('path');
const REPO = process.argv[2];
const D = require(path.join(REPO, 'tools', 'data.js'));
const FILES = ['lan', 'hgt', 'mar', 'tul', 'bw'];
const J = Object.fromEntries(FILES.map(f => [f, JSON.parse(fs.readFileSync(path.join(D.DATA, 'people', f + '.json'), 'utf8'))]));
const GLOBAL = new Set(D.load().PEOPLE.map(p => p.id));
const TEXT = {};
let added = 0;
const find = id => { for (const f of FILES) for (const g of J[f].groups) { const i = g.people.findIndex(p => p.id === id); if (i >= 0) return { f, g, i, p: g.people[i] }; } throw new Error('нет ' + id); };
const prep = (f, r) => {
  if (GLOBAL.has(r.id)) throw new Error('уже есть ' + r.id);
  GLOBAL.add(r.id); TEXT[r.id] = r.t; delete r.t; added++;
  return D.orderKeys(Object.assign({ hs: f, k: 'T' }, r), D.PERSON_KEYS);
};
const after = (id, recs) => { const x = find(id); x.g.people.splice(x.i + 1, 0, ...recs.map(r => prep(x.f, r))); };
const before = (id, recs) => { const x = find(id); x.g.people.splice(x.i, 0, ...recs.map(r => prep(x.f, r))); };
const set = (id, o) => Object.assign(find(id).p, o);

/* ——— Ланнистеры ——— */
// Лайман — сын Лорена лишь «предположительно»; у Лорена были и другие сыновья, старший женат на Редвин
set('lyman', { p: 'loren', par: ['loren (предположительно)'], unc: 1 });
after('lyman', [
  { id: 'loren_sons', name: 'Сыновья', full: 'Другие сыновья Лорена Ланнистера', group: 1, p: 'loren', par: ['loren', 'жена не названа'], wiki: 'Loren I Lannister',
    t: 'Другие сыновья Лорена Последнего; все родились уже после того, как он преклонил колено перед Эйгоном. Старший из них, наследник, был женат на девушке из дома Редвинов; имена сыновей неизвестны.' }
]);
set('tymond', { par: ['lyman (вероятно)'], unc: 1 });
after('tymond', [
  { id: 'lyman_sons', name: 'Сыновья', full: 'Законные сыновья Лаймана Ланнистера', group: 1, p: 'lyman', par: ['lyman', 'Джокаста Тарбек'], wiki: 'Lyman Lannister',
    t: 'Законные сыновья лорда Лаймана Ланнистера и леди Джокасты Тарбек. Один из младших ухаживал за Джейн Вестерлинг, когда в 47 году на ней женился король Мейгор; имена сыновей неизвестны.' },
  { id: 'tyler_hill', name: 'Тайлер Хилл', full: 'Сир Тайлер Хилл', en: 'Tyler Hill', k: 'R', p: 'lyman', par: ['lyman'], b: 'не позднее 28', d: 'не ранее 50',
    t: 'Внебрачный сын лорда Лаймана Ланнистера, рыцарь. Под его знаменем пятьсот ланнистерских воинов присоединились к Эйгону Некоронованному в борьбе с Мейгором; позднее Лайман предлагал в мужья Рейене, вдове Мейгора, то его, то одного из законных сыновей.' }
]);
before('loreon', [
  { id: 'cerelle_l', name: 'Серелла Ланнистер', full: 'Серелла Ланнистер, дочь Джейсона', en: 'Cerelle Lannister', fem: 1, p: 'jason_l', par: ['jason_l', 'Джоанна Уэстерлинг'], wiki: 'Cerelle Lannister (daughter of Jason)',
    t: 'Одна из пяти дочерей лорда Джейсона Ланнистера и Джоанны Уэстерлинг, сестра Лореона.' },
  { id: 'tyshara', name: 'Тишара Ланнистер', en: 'Tyshara Lannister', fem: 1, p: 'jason_l', par: ['jason_l', 'Джоанна Уэстерлинг'], b: '103–121',
    t: 'Одна из пяти дочерей лорда Джейсона Ланнистера и Джоанны Уэстерлинг, сестра Лореона; жила в годы правления Эйгона III.' },
  { id: 'jason_l_daus', name: 'Три дочери', full: 'Три другие дочери Джейсона Ланнистера', fem: 1, group: 1, p: 'jason_l', par: ['jason_l', 'Джоанна Уэстерлинг'], wiki: 'Jason Lannister',
    t: 'Ещё три законные дочери лорда Джейсона Ланнистера и Джоанны Уэстерлинг, сёстры Сереллы, Тишары и Лореона; имена их неизвестны.' }
]);
after('loreon', [
  { id: 'jason_l_bast', name: 'Дочери-бастарды', full: 'Внебрачные дочери Джейсона Ланнистера', fem: 1, group: 1, k: 'R', p: 'jason_l', par: ['jason_l', 'любимая наложница Джейсона'], wiki: 'Jason Lannister',
    t: 'Внебрачные дочери лорда Джейсона Ланнистера от его любимой наложницы. Когда Далтон Грейджой разорял Ланниспорт, их вместе с матерью увезли на Железные острова; имена их неизвестны.' }
]);
before('tytos_l', [
  { id: 'tywald', name: 'Тайвальд Ланнистер', full: 'Сир Тайвальд Ланнистер', en: 'Tywald Lannister', p: 'gerold', par: ['gerold', 'Роанна Веббер'], b: '211–219', d: '233',
    t: 'Старший сын лорда Джерольда Золотого и Роанны Веббер, близнец Тиона. Умер в 233 году от ран, полученных при штурме Старпайка во время мятежа Пиков.' },
  { id: 'tion_l', name: 'Тион Ланнистер', full: 'Сир Тион Ланнистер', en: 'Tion Lannister', p: 'gerold', par: ['gerold', 'Роанна Веббер'], b: '211–219', d: '236', sp: [['Эллин Рейн']],
    t: 'Второй сын лорда Джерольда Золотого и Роанны Веббер, близнец Тайвальда, муж Эллин Рейн. Погиб в 236 году в битве у моста через Вендуотер во время Четвёртого восстания Блэкфайров.' }
]);
set('jason_g', { sp: [['Элис Стакспир', 'первая жена; умерла в родах'], ['Марла Престер', 'вторая жена']] });
set('joanna', { par: ['jason_g', 'Марла Престер'] });
before('joanna', [
  { id: 'damon_l', name: 'Дамон Ланнистер', full: 'Дамон Ланнистер, сын Джейсона', en: 'Damon Lannister', p: 'jason_g', par: ['jason_g', 'Элис Стакспир'], b: '244/245', sp: [['Элла Ланнистер']], wiki: 'Damon Lannister (son of Jason)',
    t: 'Сын сира Джейсона Ланнистера от первой жены, Элис Стакспир, умершей при его рождении; единокровный брат Джоанны и Стаффорда.' }
]);
after('joanna', [
  { id: 'stafford', name: 'Стаффорд Ланнистер', full: 'Сир Стаффорд Ланнистер', en: 'Stafford Lannister', p: 'jason_g', par: ['jason_g', 'Марла Престер'], b: '245–253', d: '299', sp: [['Миранда Леффорд']],
    t: 'Сын сира Джейсона Ланнистера и Марлы Престер, брат Джоанны и шурин лорда Тайвина. Погиб в 299 году в битве при Окскроссе, где собирал новое войско.' },
  { id: 'jason_g_sons', name: 'Двое сыновей', full: 'Двое младших сыновей Джейсона Ланнистера', group: 1, p: 'jason_g', par: ['jason_g', 'Марла Престер'], wiki: 'Jason Lannister (son of Gerold)',
    t: 'Ещё двое сыновей сира Джейсона Ланнистера и Марлы Престер, младшие братья Джоанны и Стаффорда; имена их неизвестны.' },
  { id: 'jason_g_daus', name: 'Две дочери', full: 'Две младшие дочери Джейсона Ланнистера', fem: 1, group: 1, p: 'jason_g', par: ['jason_g', 'Марла Престер'], wiki: 'Jason Lannister (son of Gerold)',
    t: 'Ещё две дочери сира Джейсона Ланнистера и Марлы Престер, младшие сёстры Джоанны; имена их неизвестны.' }
]);
after('lancel', [
  { id: 'willem_l', name: 'Виллем Ланнистер', en: 'Willem Lannister', p: 'kevan', par: ['kevan', 'Дорна Свифт'], b: '285–287', d: '299',
    t: 'Сын сира Кивана Ланнистера и Дорны Свифт, близнец Мартина, оруженосец. Погиб в 299 году в Риверране.' },
  { id: 'martyn_l', name: 'Мартин Ланнистер', full: 'Мартин Ланнистер, сын Кивана', en: 'Martyn Lannister', p: 'kevan', par: ['kevan', 'Дорна Свифт'], b: '285–287',
    t: 'Сын сира Кивана Ланнистера и Дорны Свифт, близнец Виллема, оруженосец.' },
  { id: 'janei', name: 'Жанея Ланнистер', en: 'Janei Lannister', fem: 1, p: 'kevan', par: ['kevan', 'Дорна Свифт'], b: '296/297',
    t: 'Младший ребёнок и единственная дочь сира Кивана Ланнистера и Дорны Свифт.' }
]);
set('tygett', { sp: [['Дарлесса Марбранд']] });
after('gerion', [
  { id: 'tyrek', name: 'Тирек Ланнистер', en: 'Tyrek Lannister', p: 'tygett', par: ['tygett', 'Дарлесса Марбранд'], b: '286', d: '299', sp: [['Эрмесанда Хейфорд']],
    t: 'Единственный сын сира Тигетта Ланнистера и Дарлессы Марбранд, оруженосец короля Роберта. В 299 году пропал во время бунта в Королевской Гавани; скорее всего, погиб.' },
  { id: 'joy_hill', name: 'Джой Хилл', en: 'Joy Hill', fem: 1, k: 'R', p: 'gerion', par: ['gerion', 'Бриони'], b: '288',
    t: 'Внебрачная дочь Гериона Ланнистера от простолюдинки Бриони, родилась в 288 году.' }
]);

/* ——— Хайтауэры ——— */
before('gwayne', [
  { id: 'otto_sons', name: 'Сыновья', full: 'Старшие сыновья Отто Хайтауэра', group: 1, p: 'otto', par: ['otto', 'жена не названа'], wiki: 'Otto Hightower',
    t: 'Сыновья сира Отто Хайтауэра, старшие братья Гвейна; сколько их было и как их звали, неизвестно.' }
]);
set('ormund_h', { sp: [['первая жена, имя не названа', 'умерла в родах'], ['Саманта Тарли', 'вторая жена']] });
after('lyonel_h', [
  { id: 'martyn_ho', name: 'Мартин Хайтауэр', full: 'Мартин Хайтауэр, сын Ормунда', en: 'Martyn Hightower', p: 'ormund_h', par: ['ormund_h', 'первая жена Ормунда'], b: '115–126', wiki: 'Martyn Hightower (son of Ormund)',
    t: 'Сын лорда Ормунда Хайтауэра от первой жены, брат Лайонела и Гармунда; оруженосец в годы правления Эйгона III.' }
]);
set('lyonel_h', { sp: [['Саманта Тарли', 'вдова отца; тринадцать лет — любовница, затем жена']] });
after('bethany_h', [
  { id: 'lyonel_kids', name: 'Шестеро детей', full: 'Дети Лионеля Хайтауэра и Саманты Тарли', group: 1, p: 'lyonel_h', par: ['lyonel_h', 'Саманта Тарли'], wiki: 'Samantha Tarly',
    t: 'Шестеро детей лорда Лайонела Хайтауэра и Саманты Тарли, вдовы его отца, рождённые за тринадцать лет их связи. Когда новый Верховный септон разрешил им пожениться, дети были узаконены; имена их неизвестны.' },
  { id: 'garmund_daus', name: 'Шесть дочерей', full: 'Шесть дочерей Гармунда Хайтауэра и Рейены', fem: 1, group: 1, p: 'garmund', par: ['garmund', 'rhaena_d'], wiki: 'Garmund Hightower',
    t: 'Шесть дочерей Гармунда Хайтауэра и принцессы Рейены, дочери Деймона, её второго мужа; имена их неизвестны.' }
]);
after('garth_h', [
  { id: 'denyse_h', name: 'Дениза Хайтауэр', en: 'Denyse Hightower', fem: 1, p: 'leyton', par: ['leyton'], sp: [['Десмонд Редвин']],
    t: 'Дочь лорда Лейтона Хайтауэра, жена сира Десмонда Редвина.' },
  { id: 'leyla_h', name: 'Лейла Хайтауэр', en: 'Leyla Hightower', fem: 1, p: 'leyton', par: ['leyton'], sp: [['Джон Каппс']],
    t: 'Дочь лорда Лейтона Хайтауэра, жена сира Джона Каппса.' },
  { id: 'alysanne_h', name: 'Алисанна Хайтауэр', en: 'Alysanne Hightower', fem: 1, p: 'leyton', par: ['leyton'], sp: [['Артур Амброз']],
    t: 'Дочь лорда Лейтона Хайтауэра, жена лорда Артура Амброза.' }
]);
after('lynesse', [
  { id: 'gunthor', name: 'Гюнтор Хайтауэр', full: 'Сир Гюнтор Хайтауэр', en: 'Gunthor Hightower', p: 'leyton', par: ['leyton'], b: '271–285', sp: [['Джейна Фоссовей']],
    t: 'Сын лорда Лейтона Хайтауэра, рыцарь, муж Джейны Фоссовей.' },
  { id: 'humfrey_h', name: 'Хамфри Хайтауэр', full: 'Сир Хамфри Хайтауэр', en: 'Humfrey Hightower', p: 'leyton', par: ['leyton'], b: '272–285',
    t: 'Младший сын лорда Лейтона Хайтауэра, рыцарь.' }
]);

/* ——— Мартеллы ——— */
after('aliandra', [
  { id: 'qyle', name: 'Кайл Мартелл', en: 'Qyle Martell', p: 'qoren', par: ['qoren'], b: '116–132',
    t: 'Младший брат принцессы Алиандры, сын принца Кворена Мартелла. Во время регентства при Эйгоне III его прочили в мужья Бейле Таргариен.' },
  { id: 'coryanne', name: 'Корианна Мартелл', en: 'Coryanne Martell', fem: 1, p: 'qoren', par: ['qoren'], b: '116–132',
    t: 'Младшая сестра принцессы Алиандры, дочь принца Кворена Мартелла.' }
]);
after('maron', [
  { id: 'maron_son', name: 'Сын', full: 'Старший сын Марона Мартелла', p: 'maron', par: ['maron', 'daenerys_n'], wiki: 'Maron Martell',
    t: 'Старший сын принца Марона Мартелла и Дейенерис, дочери Эйгона IV, наследник отца; имя его неизвестно.' },
  { id: 'maron_sons', name: 'Сыновья', full: 'Младшие сыновья Марона Мартелла', group: 1, p: 'maron', par: ['maron', 'daenerys_n'], wiki: 'Maron Martell',
    t: 'Младший сын или сыновья принца Марона Мартелла и Дейенерис, дочери Эйгона IV; их число и имена неизвестны.' },
  { id: 'maron_daus', name: 'Дочери', full: 'Дочери Марона Мартелла', fem: 1, group: 1, p: 'maron', par: ['maron', 'daenerys_n'], wiki: 'Maron Martell',
    t: 'Дочери принца Марона Мартелла и Дейенерис, дочери Эйгона IV; их число и имена неизвестны.' }
]);
after('doran', [
  { id: 'mors_m', name: 'Морс Мартелл', full: 'Морс Мартелл, брат Дорана', en: 'Mors Martell', p: 'dorne_p19', par: ['dorne_p19'], b: '248–257', d: '248–258', wiki: 'Mors Martell (brother of Doran)',
    t: 'Младший брат Дорана Мартелла, умерший в колыбели.' },
  { id: 'olyvar', name: 'Оливар Мартелл', en: 'Olyvar Martell', p: 'dorne_p19', par: ['dorne_p19'], b: '248–256', d: '248–257',
    t: 'Младший брат Дорана Мартелла, умерший в колыбели. Из-за ранней смерти Морса и Оливара Доран рос единственным ребёнком, пока не родились Элия и Оберин.' }
]);

/* ——— Талли ——— */
after('edmyn', [
  { id: 'edmyn_daus', name: 'Три дочери', full: 'Три дочери Эдмина Талли', fem: 1, group: 1, p: 'edmyn', par: ['edmyn', 'жена не названа'], wiki: 'Edmyn Tully',
    t: 'Три дочери лорда Эдмина Талли. Харрен Чёрный обещал их тому, кто убьёт драконов Эйгона; позднее одна из них вышла замуж за лорда Харренхолла.' }
]);
after('grover', [
  { id: 'grover_son', name: 'Сын', full: 'Сын Гровера Талли, отец Элмо', p: 'grover', par: ['grover', 'жена не названа'], wiki: 'Grover Tully',
    t: 'Сын лорда Гровера Талли и отец сира Элмо, наследника Гровера; имя его неизвестно.' }
]);
set('elmo', { p: 'grover_son', par: ['grover_son', 'жена не названа'] });
before('catelyn', [
  { id: 'hoster_sons', name: 'Двое сыновей', full: 'Старшие сыновья Хостера Талли', group: 1, p: 'hoster', par: ['hoster', 'Миниса Уэнт'], d: 'в младенчестве', wiki: 'Hoster Tully',
    t: 'Двое старших сыновей лорда Хостера Талли и Минисы Уэнт, умершие в младенчестве ещё до рождения Кейтилин.' }
]);
after('edmure', [
  { id: 'hoster_son', name: 'Сын', full: 'Последний сын Хостера Талли', p: 'hoster', par: ['hoster', 'Миниса Уэнт'], d: 'при рождении', wiki: 'Hoster Tully',
    t: 'Шестой ребёнок лорда Хостера Талли и Минисы Уэнт: Миниса умерла в родах, и сын умер вместе с ней.' }
]);

/* ——— Блэквуды ——— */
before('lucas_bw', [
  { id: 'brynden_bw', name: 'Бринден Блэквуд', en: 'Brynden Blackwood', p: 'tytos_bw', par: ['tytos_bw', 'жена не названа'], b: 'не позднее 282',
    t: 'Старший сын и наследник лорда Титоса Блэквуда.' }
]);
after('hoster_bw', [
  { id: 'edmund_bw', name: 'Эдмунд Блэквуд', en: 'Edmund Blackwood', p: 'tytos_bw', par: ['tytos_bw', 'жена не названа'], b: '287/288',
    t: 'Сын лорда Титоса Блэквуда, младший брат Бриндена, Лукаса и Хостера.' },
  { id: 'alyn_bw', name: 'Алин Блэквуд', en: 'Alyn Blackwood', p: 'tytos_bw', par: ['tytos_bw', 'жена не названа'], b: '288–291',
    t: 'Сын лорда Титоса Блэквуда.' },
  { id: 'bethany_bw', name: 'Бетани Блэквуд', en: 'Bethany Blackwood', fem: 1, p: 'tytos_bw', par: ['tytos_bw', 'жена не названа'], b: '291/292',
    t: 'Единственная дочь лорда Титоса Блэквуда.' },
  { id: 'robert_bw', name: 'Роберт Блэквуд', en: 'Robert Blackwood', p: 'tytos_bw', par: ['tytos_bw', 'жена не названа'], b: '292–300', d: '300',
    t: 'Младший сын лорда Титоса Блэквуда, умер от болезни во время осады Древорона в 300 году.' }
]);

FILES.forEach(f => { J[f].groups.forEach(g => { g.people = g.people.map(p => D.orderKeys(p, D.PERSON_KEYS)); }); D.writeJson('people/' + f + '.json', J[f]); });
// корни полос: Лайман теперь под Лореном, Элмо — под сыном Гровера
const mf = path.join(D.DATA, 'meta.json');
let ms = fs.readFileSync(mf, "utf8").replace(',["lyman",8]', "").replace(',["elmo",11]', "");
ms = ms.split("\n").filter(l => !l.includes('"from":"loren","to":"lyman"') && !l.includes('"from":"grover","to":"elmo"')).join("\n");
fs.writeFileSync(mf, ms);
const ov = new Map(Object.entries(TEXT).map(([id, text]) => [id, { text, ai: true }]));
console.log('добавлено', added, '· файлы:', D.sync({ people: ov }).join(', '));
