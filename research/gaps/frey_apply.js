/* Пробелы в родословной Фреев по A Wiki of Ice and Fire (сверка — research/houses/fry/part_*.json: дети, которых
   сбор назвал, но в древо не внёс). Русские имена — 7kingdoms.ru (страницы матерей: Перриана, Литен, Морья, Мейгель, Кира Фрей).
   Запуск один раз: node research/gaps/frey_apply.js "$PWD" (повторно не запускать — он добавляет записи). */
const fs = require('fs'), path = require('path');
const REPO = process.argv[2];
const D = require(path.join(REPO, 'tools', 'data.js'));
const F = 'fry';
const J = JSON.parse(fs.readFileSync(path.join(D.DATA, 'people', F + '.json'), 'utf8'));
const GLOBAL = new Set(D.load().PEOPLE.map(p => p.id));
const TEXT = {};
let added = 0;
const find = id => { for (const g of J.groups) { const i = g.people.findIndex(p => p.id === id); if (i >= 0) return { g, i, p: g.people[i] }; } throw new Error('нет ' + id); };
const prep = r => {
  if (GLOBAL.has(r.id)) throw new Error('уже есть ' + r.id);
  GLOBAL.add(r.id); TEXT[r.id] = r.t; delete r.t; added++;
  return D.orderKeys(Object.assign({ hs: F, k: 'T' }, r), D.PERSON_KEYS);
};
const after = (id, recs) => { const x = find(id); x.g.people.splice(x.i + 1, 0, ...recs.map(prep)); };

// сын Форреста Фрея и Сабиты Випрен — лорд Переправы после отца
after('forrest_fr', [
  { id: 'forrest_son', name: 'Сын', full: 'Сын Форреста Фрея', p: 'forrest_fr', par: ['forrest_fr', 'sabitha_fr'], wiki: 'Forrest Frey',
    t: 'Сын сира Форреста Фрея и Сабиты Випрен; после смерти отца в 130 г. стал лордом Переправы. Имя его неизвестно.' }
]);
// другие дочери безымянного лорда Фрея, отца Уолдера: «по меньшей мере три дочери, все замужем»
after('lady_butterwell', [
  { id: 'fr_lord_daughters', name: 'Дочери', full: 'Другие дочери лорда Фрея, отца Уолдера', group: 1, fem: 1, p: 'fr_lord', par: ['fr_lord', 'жена не названа'], wiki: 'Lady Butterwell',
    t: 'У лорда Фрея, отца Уолдера, было по меньшей мере три дочери, все замужние; кроме леди Баттервелл, имена и судьбы их неизвестны.' }
]);
// дети дочерей и внучек лорда Уолдера, вышедших замуж в другие дома
after('perriane_fr', [
  { id: 'harys_haigh', name: 'Харис Хэй', en: 'Harys Haigh', hs: 'oth', h: 'Хэев', p: 'perriane_fr', par: ['perriane_fr', 'Леслин Хэй'],
    t: 'Сын сира Леслина Хэя и Перрианы Фрей, внук лорда Уолдера Фрея.' },
  { id: 'donnel_haigh', name: 'Доннел Хэй', en: 'Donnel Haigh', hs: 'oth', h: 'Хэев', p: 'perriane_fr', par: ['perriane_fr', 'Леслин Хэй'],
    t: 'Сын сира Леслина Хэя и Перрианы Фрей, внук лорда Уолдера Фрея.' },
  { id: 'alyn_haigh', name: 'Алин Хэй', en: 'Alyn Haigh', hs: 'oth', h: 'Хэев', p: 'perriane_fr', par: ['perriane_fr', 'Леслин Хэй'],
    t: 'Сын сира Леслина Хэя и Перрианы Фрей, внук лорда Уолдера Фрея.' }
]);
after('lythene_fr', [
  { id: 'elyana_vypren', name: 'Элиана Випрен', en: 'Elyana Vypren', fem: 1, hs: 'oth', h: 'Випренов', p: 'lythene_fr', par: ['lythene_fr', 'Люциас Випрен'],
    t: 'Дочь лорда Люциаса Випрена и Литен Фрей, внучка лорда Уолдера Фрея.' },
  { id: 'damon_vypren', name: 'Дамон Випрен', en: 'Damon Vypren', hs: 'oth', h: 'Випренов', p: 'lythene_fr', par: ['lythene_fr', 'Люциас Випрен'],
    t: 'Сын лорда Люциаса Випрена и Литен Фрей, внук лорда Уолдера Фрея.' }
]);
after('morya_fr', [
  { id: 'robert_brax', name: 'Роберт Бракс', full: 'Роберт Бракс, сын Флемента', en: 'Robert Brax', hs: 'oth', h: 'Браксов', p: 'morya_fr', par: ['morya_fr', 'Флемент Бракс'], wiki: 'Robert Brax (son of Flement)',
    t: 'Сын сира Флемента Бракса и Морьи Фрей, внук лорда Уолдера Фрея.' },
  { id: 'walder_brax', name: 'Уолдер Бракс', en: 'Walder Brax', hs: 'oth', h: 'Браксов', p: 'morya_fr', par: ['morya_fr', 'Флемент Бракс'],
    t: 'Сын сира Флемента Бракса и Морьи Фрей, внук лорда Уолдера Фрея.' },
  { id: 'jon_brax', name: 'Джон Бракс', en: 'Jon Brax', hs: 'oth', h: 'Браксов', p: 'morya_fr', par: ['morya_fr', 'Флемент Бракс'],
    t: 'Сын сира Флемента Бракса и Морьи Фрей, внук лорда Уолдера Фрея.' }
]);
after('maegelle_fr', [
  { id: 'marianne_vance', name: 'Марианна Вэнс', en: 'Marianne Vance', fem: 1, hs: 'oth', h: 'Вэнсов', p: 'maegelle_fr', par: ['maegelle_fr', 'Дафин Вэнс'],
    t: 'Дочь сира Дафина Вэнса и Мейгель Фрей, правнучка лорда Уолдера Фрея.' },
  { id: 'walder_vance', name: 'Уолдер Вэнс', en: 'Walder Vance', hs: 'oth', h: 'Вэнсов', p: 'maegelle_fr', par: ['maegelle_fr', 'Дафин Вэнс'],
    t: 'Сын сира Дафина Вэнса и Мейгель Фрей, правнук лорда Уолдера Фрея.' },
  { id: 'patrek_vance', name: 'Патрек Вэнс', en: 'Patrek Vance', hs: 'oth', h: 'Вэнсов', p: 'maegelle_fr', par: ['maegelle_fr', 'Дафин Вэнс'],
    t: 'Сын сира Дафина Вэнса и Мейгель Фрей, правнук лорда Уолдера Фрея.' }
]);
after('kyra_fr', [
  { id: 'walder_goodbrook', name: 'Уолдер Гудбрук', en: 'Walder Goodbrook', hs: 'oth', h: 'Гудбруков', p: 'kyra_fr', par: ['kyra_fr', 'Гарс Гудбрук'],
    t: 'Сын сира Гарса Гудбрука и Киры Фрей, правнук лорда Уолдера Фрея.' },
  { id: 'jeyne_goodbrook', name: 'Джейн Гудбрук', en: 'Jeyne Goodbrook', fem: 1, hs: 'oth', h: 'Гудбруков', p: 'kyra_fr', par: ['kyra_fr', 'Гарс Гудбрук'],
    t: 'Дочь сира Гарса Гудбрука и Киры Фрей, правнучка лорда Уолдера Фрея.' }
]);
// мертворождённые и умершие во младенчестве
after('danwell_fr', [
  { id: 'danwell_stillborn', name: 'Мертворождённые', full: 'Мертворождённые дети Данвелла Фрея', group: 1, p: 'danwell_fr', par: ['danwell_fr', 'Винафрея Уэнт'], d: 'при рождении', wiki: 'Danwell Frey',
    t: 'У сира Данвелла Фрея и Винафреи Уэнт было много мертворождённых детей и выкидышей; живых детей у них нет.' }
]);
after('walder_fr_merrett', [
  { id: 'merrett_dau_sb', name: 'Дочь', full: 'Мертворождённая дочь Меррета Фрея', fem: 1, p: 'merrett_fr', par: ['merrett_fr', 'Марийя Дарри'], d: 'при рождении', wiki: 'Merrett Frey',
    t: 'Мертворождённая дочь Меррета Фрея и Марийи Дарри.' },
  { id: 'merrett_dau_inf', name: 'Дочь', full: 'Дочь Меррета Фрея, умершая в младенчестве', fem: 1, p: 'merrett_fr', par: ['merrett_fr', 'Марийя Дарри'], d: 'в младенчестве', wiki: 'Merrett Frey',
    t: 'Дочь Меррета Фрея и Марийи Дарри, умершая в младенчестве.' }
]);
// внебрачные дети Чёрного Уолдера
after('walder_fr_ryman', [
  { id: 'black_walder_bast', name: 'Бастарды', full: 'Внебрачные дети Уолдера Фрея, сына Римана', group: 1, k: 'R', p: 'walder_fr_ryman', par: ['walder_fr_ryman'], wiki: 'Walder Frey (son of Ryman)',
    t: 'Уолдер Фрей, сын Римана, не женат, но у него есть внебрачные дети; имена их неизвестны.' }
]);

D.writeJson('people/' + F + '.json', J);
// тексты: черновики Claude (✎)
const texts = new Map(Object.entries(TEXT).map(([id, text]) => [id, { text, ai: true }]));
const w = D.sync({ people: texts });
console.log('добавлено', added, '· файлы:', w.join(', '));
