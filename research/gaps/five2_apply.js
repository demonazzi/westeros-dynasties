/* Пробелы в родословной Тиреллов, Арренов, Веларионов, Грейджоев и Старков по A Wiki of Ice and Fire.
   Запуск один раз: node research/gaps/five2_apply.js "$PWD" (повторно не запускать — он добавляет записи). */
const fs = require('fs'), path = require('path');
const REPO = process.argv[2];
const D = require(path.join(REPO, 'tools', 'data.js'));
const FILES = ['tyr', 'arr', 'vel', 'gry', 'stk'];
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

/* ——— Тиреллы ——— */
before('martyn_t', [
  { id: 'bertrand_son', name: 'Сын', full: 'Старший сын Бертранда Тирелла', p: 'bertrand', par: ['bertrand', 'жена не названа'], wiki: 'Bertrand Tyrell',
    t: 'Старший законный сын и наследник лорда Бертранда Тирелла, брат Мартина; имя его неизвестно.' }
]);
after('martyn_t', [
  { id: 'bertrand_bast', name: 'Бастарды', full: 'Внебрачные сыновья Бертранда Тирелла', group: 1, k: 'R', p: 'bertrand', par: ['bertrand'], wiki: 'Bertrand Tyrell',
    t: 'Несколько буйных внебрачных сыновей лорда Бертранда Тирелла, единокровных братьев Мартина; имена их неизвестны.' }
]);
after('mina', [
  { id: 'horas', name: 'Хорас Редвин', full: 'Сир Хорас Редвин', en: 'Horas Redwyne', hs: 'oth', h: 'Редвинов', p: 'mina', par: ['Пакстер Редвин', 'mina'], b: 'не позднее 282',
    t: 'Сын лорда Пакстера Редвина и Мины Тирелл, старший из близнецов; Хоббер — его брат-близнец.' },
  { id: 'hobber', name: 'Хоббер Редвин', full: 'Сир Хоббер Редвин', en: 'Hobber Redwyne', hs: 'oth', h: 'Редвинов', p: 'mina', par: ['Пакстер Редвин', 'mina'], b: 'не позднее 282',
    t: 'Сын лорда Пакстера Редвина и Мины Тирелл, младший из близнецов, брат Хораса.' },
  { id: 'desmera', name: 'Десмера Редвин', en: 'Desmera Redwyne', fem: 1, hs: 'oth', h: 'Редвинов', p: 'mina', par: ['Пакстер Редвин', 'mina'], b: '283',
    t: 'Дочь лорда Пакстера Редвина и Мины Тирелл, родилась в 283 году.' }
]);

/* ——— Аррены ——— */
after('rymond', [
  { id: 'hubert_sons', name: 'Сыновья', full: 'Другие сыновья Хьюберта Аррена', group: 1, p: 'hubert', par: ['hubert', 'дама из дома Ройсов'], wiki: 'Hubert Arryn',
    t: 'У лорда Хьюберта Аррена и его жены из дома Ройсов было шесть сыновей; Дарнольд и Раймонд, вероятно, двое из них. Имена остальных неизвестны.' }
]);
after('isembard', [
  { id: 'isembard_sons', name: 'Сыновья', full: 'Сыновья Изембарда Аррена', group: 1, p: 'isembard', par: ['isembard', 'жена не названа'], wiki: 'Isembard Arryn',
    t: 'Сыновья Изембарда Аррена из Чаячьего города, которых заключили под стражу вместе с ним; имена их неизвестны.' }
]);
before('robert_a', [
  { id: 'jon_a_dau', name: 'Дочь', full: 'Мертворождённая дочь Джона Аррена', fem: 1, p: 'jon_a', par: ['jon_a', 'Джейна Ройс'], d: 'при рождении', wiki: 'Jon Arryn',
    t: 'Дочь Джона Аррена от первой жены, Джейны Ройс: Джейна умерла в родах, девочка родилась мёртвой.' },
  { id: 'jon_a_kids', name: 'Двое детей', full: 'Мертворождённые дети Джона Аррена и Лизы Талли', group: 1, p: 'jon_a', par: ['jon_a', 'lysa'], d: 'при рождении', wiki: 'Lysa Arryn',
    t: 'Двое детей Джона Аррена и Лизы Талли, родившиеся мёртвыми; кроме того, у Лизы было пять выкидышей, прежде чем родился Роберт.' }
]);

/* ——— Веларионы ——— */
after('victor', [
  { id: 'daemon_v_daus', name: 'Дочери', full: 'Дочери Деймона Велариона', fem: 1, group: 1, p: 'daemon_v', par: ['daemon_v', 'жена не названа'], wiki: 'Daemon Velaryon (son of Aethan)',
    t: 'Не меньше четырёх дочерей лорда Деймона Велариона; три из них умерли в 59 году от Дрожи. Имена их неизвестны.' }
]);
after('laena_a', [
  { id: 'alyn_kids', name: 'Дети', full: 'Другие дети Элина Велариона и Бейлы', group: 1, p: 'alyn', par: ['alyn', 'baela'], wiki: 'Alyn Velaryon',
    t: 'Другие дети лорда Элина Велариона и Бейлы Таргариен, кроме дочери Лейны; сколько их было и как их звали, неизвестно.' }
]);

/* ——— Грейджои ——— */
after('robin_g', [
  { id: 'quellon_dau', name: 'Дочь', full: 'Мертворождённая дочь Квеллона Грейджоя', fem: 1, p: 'quellon', par: ['quellon', 'Леди Пайпер'], d: 'при рождении', wiki: 'Quellon Greyjoy',
    t: 'Дочь лорда Квеллона Грейджоя и его третьей жены из дома Пайперов, родившаяся мёртвой уже после смерти отца.' }
]);
after('aeron', [
  { id: 'euron_bast', name: 'Бастарды', full: 'Внебрачные сыновья Эурона Грейджоя', group: 1, k: 'R', p: 'euron', par: ['euron', 'шлюхи и пленницы'], wiki: 'Euron Greyjoy',
    t: 'Не меньше трёх внебрачных сыновей Эурона Вороньего Глаза от шлюх и пленниц, до которых ему нет дела; одному из них около десяти лет. Имена их неизвестны.' },
  { id: 'victarion_dau', name: 'Дочь', full: 'Мертворождённая дочь Виктариона Грейджоя', fem: 1, p: 'victarion', par: ['victarion', 'первая жена Виктариона'], d: 'при рождении', wiki: 'Victarion Greyjoy',
    t: 'Дочь Виктариона Грейджоя от первой жены: жена умерла в родах, девочка родилась мёртвой.' }
]);

/* ——— Старки ——— */
before('torrhen_d', [
  { id: 'torrhen_sons', name: 'Сыновья', full: 'Сыновья Торрхена Старка', group: 1, p: 'torrhen', par: ['torrhen', 'жена не названа'], wiki: 'Torrhen Stark',
    t: 'Несколько сыновей Торрхена Старка, Короля, преклонившего колено. Они не любили власть Таргариенов, кое-кто говорил о мятеже, и на свадьбу сестры с Роннелом Арреном, по письмам из Цитадели, не приехали; имена их неизвестны.' }
]);
after('edric_c', [
  { id: 'lyanna_c', name: 'Лианна Старк', full: 'Лианна Старк, дочь Кригана', en: 'Lyanna Stark', fem: 1, p: 'cregan', par: ['cregan', 'Линара Старк'], b: '138–181', wiki: 'Lyanna Stark (daughter of Cregan)',
    t: 'Единственная дочь лорда Кригана Старка от третьей жены, Линары Старк.' }
]);
after('serena_c', [
  { id: 'torrhen_e', name: 'Торрхен Старк', full: 'Торрхен Старк, сын Эдрика', en: 'Torrhen Stark', p: 'edric_c', par: ['edric_c', 'serena_c'], wiki: 'Edric Stark (son of Cregan)',
    t: 'Сын Эдрика Старка и Серены Старк, близнец Кригарда.' },
  { id: 'cregard', name: 'Кригард Старк', en: 'Cregard Stark', p: 'edric_c', par: ['edric_c', 'serena_c'],
    t: 'Сын Эдрика Старка и Серены Старк, близнец Торрхена.' },
  { id: 'arrana', name: 'Аррана Старк', en: 'Arrana Stark', fem: 1, p: 'edric_c', par: ['edric_c', 'serena_c'],
    t: 'Дочь Эдрика Старка и Серены Старк.' },
  { id: 'argelle_s', name: 'Аргелла Старк', en: 'Argelle Stark', fem: 1, p: 'edric_c', par: ['edric_c', 'serena_c'],
    t: 'Дочь Эдрика Старка и Серены Старк.' }
]);
set('brandon_c', { sp: [['Алис Карстарк']] });
after('beron', [
  { id: 'arsa', name: 'Арса Старк', en: 'Arsa Stark', fem: 1, p: 'brandon_c', par: ['brandon_c', 'Алис Карстарк'], b: '173–213',
    t: 'Дочь Брандона Старка, сына Кригана, и Алис Карстарк; сестра Родвелла и Берона.' },
  { id: 'lonnel_snow', name: 'Лоннел Сноу', en: 'Lonnel Snow', k: 'R', p: 'brandon_c', par: ['brandon_c', 'Уилла Фенн'], b: '152–195',
    t: 'Внебрачный сын Брандона Старка, сына Кригана, от Уиллы Фенн.' }
]);
set('beron', { sp: [['Лорра Ройс']] });
after('artos', [
  { id: 'berena', name: 'Берена Старк', en: 'Berena Stark', fem: 1, p: 'beron', par: ['beron', 'Лорра Ройс'],
    t: 'Дочь лорда Берона Старка и Лорры Ройс.' },
  { id: 'alysanne_s', name: 'Алисанна Старк', full: 'Алисанна Старк, дочь Берона', en: 'Alysanne Stark', fem: 1, p: 'beron', par: ['beron', 'Лорра Ройс'], wiki: 'Beron Stark',
    t: 'Дочь лорда Берона Старка и Лорры Ройс.' },
  { id: 'errold', name: 'Эррольд Старк', en: 'Errold Stark', p: 'beron', par: ['beron', 'Лорра Ройс'],
    t: 'Сын лорда Берона Старка и Лорры Ройс.' },
  { id: 'rodrik_b', name: 'Родрик Старк', full: 'Родрик Старк, сын Берона', en: 'Rodrik Stark', p: 'beron', par: ['beron', 'Лорра Ройс'], wiki: 'Beron Stark',
    t: 'Сын лорда Берона Старка и Лорры Ройс.' }
]);
after('edwyle', [
  { id: 'jocelyn_s', name: 'Джослин Старк', en: 'Jocelyn Stark', fem: 1, p: 'willam_s', par: ['willam_s', 'melantha'], sp: [['Бенедикт Ройс']],
    t: 'Дочь лорда Уиллама Старка и Меланты Блэквуд, сестра Эдвила; жена Бенедикта Ройса.' }
]);

FILES.forEach(f => { J[f].groups.forEach(g => { g.people = g.people.map(p => D.orderKeys(p, D.PERSON_KEYS)); }); D.writeJson('people/' + f + '.json', J[f]); });
const ov = new Map(Object.entries(TEXT).map(([id, text]) => [id, { text, ai: true }]));
console.log('добавлено', added, '· файлы:', D.sync({ people: ov }).join(', '));
