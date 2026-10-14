/* Дом Дондаррионов (Чёрный Приют, Дорнийские марки), знаменосцы Баратеонов. По A Wiki of Ice and Fire
   (House Dondarrion и страницы людей); русские имена, замок и прозвища — по 7kingdoms.ru («Дондаррионы», «Берик Дондаррион»).
   Только книжные люди: сериальные Берик, сын Саймона, Арлан, Отор и др. не вносятся. Лорды без имени и родства
   (гость Золотой свадьбы 49 г., лорд 82 г., хозяин турнира 246/247 г.) — тоже нет: их не к кому привязать.
   Тексты стоявшие строкой «Джена Дондаррион» (у Бейелора Сломи Копьё и его сыновей) и «Берик Дондаррион» (у Аллирии Дейн)
   становятся карточками. Одноразовый: node research/houses/gen_dnd.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'tools', 'data.js'));
const GLOBAL = new Set(D.load().PEOPLE.map(p => p.id));
const TEXT = {}, TEXT_EN = {};
const mk = r => {
  if (GLOBAL.has(r.id)) throw new Error('уже есть ' + r.id);
  GLOBAL.add(r.id); TEXT[r.id] = r.t; TEXT_EN[r.id] = r.te; delete r.t; delete r.te;
  return D.orderKeys(Object.assign({ hs: 'dnd', k: 'T' }, r), D.PERSON_KEYS);
};

const H = { liege: 'bar', title: 'Дондаррионы', about: 'Дом Дондаррионов (Чёрный Приют в Дорнийских марках), знаменосцы Баратеонов.',
  name: 'Дом Дондаррионов', band: 'Дондаррионы', motto: 'Чёрный Приют', v: 'dondarrion',
  // «на чёрном поле, усеянном серебряными четырёхконечными звёздами, раздвоенная пурпурная молния»
  sigil: { field: '#16151A', charge: '#8E5BC7' },
  roots: [['bastard_bh', 6], ['harmon_d', 7], ['dnd_lord54', 7], ['jena_d', 14], ['dnd_lord206', 14], ['beric', 19]] };
const groups = [
  { title: 'Штормовые короли и Таргариены', people: [
    { id: 'bastard_bh', name: 'Бастард из Чёрного Приюта', en: 'Bastard of Blackhaven', k: 'R', d: '-2', wiki: 'Bastard of Blackhaven',
      t: 'Внебрачный сын из дома Дондаррионов, служивший Аргилаку Дюррандону, последнему Штормовому королю. Погиб в 2 г. до З. в Последнем Шторме, когда пламя Мераксес накрыло передовой отряд Аргилака; имя его неизвестно.',
      te: 'An illegitimate son of House Dondarrion who served Argilac Durrandon, the last Storm King. He died in 2 BC at the Last Storm, when Meraxes\'s fire engulfed Argilac\'s vanguard; his name is unknown.' },
    { id: 'harmon_d', name: 'Хармон Дондаррион', full: 'Хармон Дондаррион, Безносый', en: 'Harmon Dondarrion', al: ['Безносый'],
      t: 'Лорд Чёрного Приюта при Эйнисе I. Считал воинство Короля-Стервятника сбродом, но в 37 г. оно захватило Чёрный Приют, и Король-Стервятник отрезал Хармону нос. Позже Хармон повёл марочных лордов на «Охоту на Стервятника», в которой тот был схвачен.',
      te: 'Lord of Blackhaven under Aenys I. He dismissed the Vulture King\'s host as a rabble, but in 37 AC it took Blackhaven and the Vulture King cut off Harmon\'s nose. Later Harmon led the marcher lords in the Vulture Hunt that captured him.' },
    { id: 'dnd_lord54', name: 'Лорд Дондаррион', full: 'Лорд Дондаррион, отец Саймона', wiki: 'Simon Dondarrion',
      t: 'Лорд Чёрного Приюта в начале правления Джейехериса I, отец Саймона; имя его неизвестно.',
      te: 'Lord of Blackhaven early in the reign of Jaehaerys I and father of Simon; his name is unknown.' },
    { id: 'simon_d', name: 'Саймон Дондаррион', full: 'Сир Саймон Дондаррион', en: 'Simon Dondarrion', p: 'dnd_lord54', par: ['dnd_lord54'], b: 'не позднее 40',
      t: 'Лорд Чёрного Приюта при Джейехерисе I, славный рыцарь и певец. В 54 г. так очаровал короля и королеву песнями, что они задержались в Чёрном Приюте дольше задуманного; в 55 г. выиграл турнир в честь окончания Драконьего логова, а в 61 г., в Третью дорнийскую войну, повёл марочных рыцарей в Красные горы против Короля-Стервятника.',
      te: 'Lord of Blackhaven under Jaehaerys I, a celebrated knight and singer. In 54 AC his songs so charmed the king and queen that they lingered at Blackhaven longer than planned; in 55 AC he won the tourney marking the completion of the Dragonpit, and in 61 AC, during the Third Dornish War, he led marcher knights into the Red Mountains against the Vulture King.' }
  ] },
  { title: 'При Дейероне II', people: [
    { id: 'jena_d', name: 'Джена Дондаррион', en: 'Jena Dondarrion', fem: 1, b: '131–181', d: '183 или позже', sp: [['baelor_b']],
      t: 'Жена принца Бейелора Сломи Копьё, мать Валарра и Матариса. Как она связана с другими Дондаррионами, неизвестно.',
      te: 'Wife of Prince Baelor Breakspear and mother of Valarr and Matarys. How she was related to the other Dondarrions is unknown.' },
    { id: 'dnd_lord206', name: 'Лорд Дондаррион', full: 'Лорд Дондаррион, отец Манфреда', wiki: 'Manfred Dondarrion',
      t: 'Лорд Чёрного Приюта при Дейероне II, отец Манфреда. В 206 г. вместе с лордом Кароном выбил очередного Короля-Стервятника из Красных гор; имя его неизвестно.',
      te: 'Lord of Blackhaven under Daeron II and father of Manfred. In 206 AC, together with Lord Caron, he drove another Vulture King out of the Red Mountains; his name is unknown.' },
    { id: 'manfred_d', name: 'Манфред Дондаррион', full: 'Сир Манфред Дондаррион', en: 'Manfred Dondarrion', p: 'dnd_lord206', par: ['dnd_lord206'],
      t: 'Сын и наследник лорда Дондарриона при Дейероне II; в 206 г. сражался вместе с отцом против Короля-Стервятника. На турнире в Эшфорде в 209 г. отказался поручиться за рыцарство Дункана Высокого и не откликнулся, когда тот искал седьмого рыцаря для суда семерых.',
      te: 'Son and heir of Lord Dondarrion under Daeron II; in 206 AC he fought beside his father against the Vulture King. At the Ashford tourney in 209 AC he refused to vouch for Duncan the Tall\'s knighthood and ignored his call for a seventh knight in the trial of seven.' }
  ] },
  { title: 'Конец третьего века', people: [
    { id: 'beric', name: 'Берик Дондаррион', full: 'Берик Дондаррион, Лорд-Молния', en: 'Beric Dondarrion', al: ['Лорд-Молния', 'Лорд-покойник'], b: '276/277', d: '299',
      sp: [['allyria', 'помолвка', 'b']],
      t: 'Лорд Чёрного Приюта, жених Аллирии Дейн, взявший её племянника Эдрика в оруженосцы. После турнира десницы Эддард Старк послал его покарать Григора Клигана; отряд попал в засаду, Берик был смертельно ранен, но Торос из Мира вернул его к жизни. Возглавил Братство без знамён в Речных землях, умирал и воскресал не раз, а в 299 г. отдал последнюю жизнь, чтобы вернуть Кейтилин Старк.',
      te: 'Lord of Blackhaven, betrothed to Allyria Dayne, whose nephew Edric became his squire. After the Hand\'s tourney Eddard Stark sent him to bring Gregor Clegane to justice; his party was ambushed and Beric was mortally wounded, but Thoros of Myr brought him back. He led the Brotherhood Without Banners in the riverlands, died and returned several times, and in 299 AC gave his last life to bring back Catelyn Stark.' }
  ] }
];
D.writeJson('people/dnd.json', { title: H.title, about: H.about, groups: groups.map(g => ({ title: g.title, people: g.people.map(mk) })) });

// meta.json — строковыми вставками, как всегда
const mf = path.join(D.DATA, 'meta.json');
let ms = fs.readFileSync(mf, 'utf8');
ms = ms.replace('"swn","pen","stw"]', '"swn","pen","stw","dnd"]');
ms = ms.replace(/(\{"house":"stw","liege":"targ","roots":[^\n]*\})/, '$1,\n    {"house":"dnd","liege":"' + H.liege + '","roots":' + JSON.stringify(H.roots) + '}');
ms = ms.replace(/("stw": \{"v":"stokeworth"[^\n]*\})/, '$1,\n    "dnd": ' + JSON.stringify({ v: H.v, name: H.name, band: H.band, motto: H.motto, sigil: H.sigil }));
['"stw","dnd"]', '{"house":"dnd"', '"dnd": {"v":"dondarrion"'].forEach(s => { if (!ms.includes(s)) throw new Error('meta.json: не вставилось ' + s); });
fs.writeFileSync(mf, ms);

// строки «Джена Дондаррион» и «Берик Дондаррион» → карточки
const TXT = { 'Джена Дондаррион': 'jena_d', 'Берик Дондаррион': 'beric' };
const used = new Set();
JSON.parse(ms).people_files.filter(f => f !== 'dnd').forEach(f => {
  const j = JSON.parse(fs.readFileSync(path.join(D.DATA, 'people', f + '.json'), 'utf8'));
  let changed = false;
  const c = r => (TXT[r] ? (used.add(r), changed = true, TXT[r]) : r);
  j.groups.forEach(g => g.people.forEach(p => {
    if (p.par) p.par = p.par.map(c);
    if (p.sp) p.sp = p.sp.map(s => [c(s[0])].concat(s.slice(1)));
  }));
  if (changed) D.writeJson('people/' + f + '.json', j);
});
Object.keys(TXT).forEach(t => { if (!used.has(t)) console.log('не встретилось:', t); });

const ov = new Map(Object.entries(TEXT).map(([id, text]) => [id, { text, ai: true }]));
console.log('людей:', Object.keys(TEXT).length, '· файлы:', D.sync({ people: ov }).join(', '));
// английские тексты — прямо в texts/en/people/dnd.md (sync создал пустые разделы)
const ef = path.join(D.TEXTS_EN, 'people', 'dnd.md');
let es = fs.readFileSync(ef, 'utf8');
Object.entries(TEXT_EN).forEach(([id, te]) => { es = es.replace(new RegExp('^(### ' + id + ' · [^\\n]*?)\\s*✎?\\n', 'm'), (m, h) => h + ' ✎\n' + te + '\n'); });
fs.writeFileSync(ef, es);
