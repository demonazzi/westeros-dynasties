/* Метаданные: дома, полосы, пропуски поколений, пол, поисковые запросы для вики. */

/* Полосы домов сверху вниз: корень ветви и колонка поколения, чтобы современники стояли рядом. */
const BANDS = [
  { house: 'vel', roots: [['daemon_v0', 5], ['valaena', 5], ['lucerys_v', 18]] },
  { house: 'targ', roots: [['aenar', 0], ['dragonseeds', 11]] },
  { house: 'hgt', roots: [['manfred_h', 6], ['hgt_lord8', 8], ['leyton', 18]] },
  { house: 'tyr', roots: [['harlen', 6], ['bertrand', 8], ['matthos', 10], ['lyonel_t', 12], ['leo_t', 15], ['tyr_lord17', 17], ['olenna', 18], ['quentin', 18], ['victor_t', 18], ['normund', 19]] },
  { house: 'mar', roots: [['meria', 6], ['qoren', 10], ['dorne_p14', 14], ['dorne_p19', 19], ['lewyn', 19]] },
  { house: 'bw', roots: [['bw_lord10', 10], ['melissa_bw', 14], ['melantha', 16], ['betha', 17], ['tytos_bw', 18]] },
  { house: 'bar', roots: [['orys', 6], ['lord_b208', 15]] },
  { house: 'lan', roots: [['loren', 6], ['lyman', 8], ['lan_lord10', 10], ['tya', 16], ['gerold', 16]] },
  { house: 'arr', roots: [['sharra', 5], ['hubert', 6], ['joffrey_a', 10], ['isembard', 10], ['donnel', 14], ['alys_r', 15], ['jasper', 17], ['denys', 19]] },
  { house: 'tul', roots: [['edmyn', 6], ['grover', 9], ['elmo', 11], ['tul_lord17', 17]] },
  { house: 'stk', roots: [['torrhen', 6], ['cregan', 11], ['brandon_c', 14]] },
  { house: 'gry', roots: [['vickon', 6], ['gry_lord10', 10], ['alton', 13], ['torwyn', 14], ['loron', 15], ['dagon', 16], ['alannys', 19], ['quenton_c', 19], ['dagon_d', 19]] }
];

/* sigil: геральдические цвета щита (поле и фигура) — у щита свой фон, поэтому цвета фиксированные. */
const HOUSES = {
  targ: { name: 'Дом Таргариенов', band: 'Таргариены', motto: 'Драконий Камень · «Пламя и кровь»', sigil: { field: '#16121A', charge: '#D02B35' } },
  vel:  { name: 'Дом Веларионов', band: 'Веларионы', motto: 'Дрифтмарк · «Старый, верный, отважный»', sigil: { field: '#0E6B64', charge: '#EEF3F1' } },
  bar:  { name: 'Дом Баратеонов', band: 'Баратеоны', motto: 'Штормовой Предел · «Нам ярость»', sigil: { field: '#E0A920', charge: '#17130F' } },
  bf:   { name: 'Дом Блэкфайров', sigil: { field: '#B3202A', charge: '#16121A' } },
  arr:  { name: 'Дом Арренов', band: 'Аррены', motto: 'Орлиное Гнездо · «Высокий как честь»', sigil: { field: '#7DB2E2', charge: '#FBF8EF' } },
  hgt:  { name: 'Дом Хайтауэров', band: 'Хайтауэры', motto: 'Староместо · «Мы освещаем путь»', sigil: { field: '#7F8582', charge: '#FBF8F0' } },
  mar:  { name: 'Дом Мартеллов', band: 'Мартеллы', motto: 'Солнечное Копьё · «Непреклонные, несгибаемые, несдающиеся»', sigil: { field: '#E2731E', charge: '#9E1B24' } },
  bw:   { name: 'Дом Блэквудов', band: 'Блэквуды', motto: 'Древорон · девиз в книгах не назван', sigil: { field: '#8E1C1F', charge: '#F4F1EA' } },
  lan:  { name: 'Дом Ланнистеров', band: 'Ланнистеры', motto: 'Утёс Кастерли · «Услышь мой рёв!»', sigil: { field: '#8E1B22', charge: '#E6B530' } },
  tul:  { name: 'Дом Талли', band: 'Талли', motto: 'Риверран · «Семья, долг, честь»', sigil: { field: '#2F4FA0', charge: '#DCE1EA' } },
  stk:  { name: 'Дом Старков', band: 'Старки', motto: 'Винтерфелл · «Зима близко»', sigil: { field: '#E6E9EC', charge: '#46515C' } },
  oth:  { name: 'Другие дома', sigil: { field: '#85848A', charge: '#FAF9FB' } },
  tyr:  { name: 'Дом Тиреллов', band: 'Тиреллы', motto: 'Хайгарден · «Вырастая — крепнем»', sigil: { field: '#2E6B33', charge: '#E3B53B' } },
  gry:  { name: 'Дом Грейджоев', band: 'Грейджои', motto: 'Пайк · «Мы не сеем»', sigil: { field: '#17161A', charge: '#D4AF37' } },
  /* Гербы королевских домов до Завоевания — для вкладки «Вассалитет» (на древе их нет) */
  gar:  { name: 'Дом Гарднеров', sigil: { field: '#F2F0E8', charge: '#3C7A3A' } },
  dur:  { name: 'Дом Дюррандонов', sigil: { field: '#E0A920', charge: '#17130F' } },
  hoa:  { name: 'Дом Хоаров', sigil: { field: '#17161A', charge: '#D4AF37' } }
};

/* Пропуски в родословной: от последнего известного поколения к следующему известному лорду. */
const GAPS = [
  { house: 'bar', from: 'borros', to: 'lord_b208', years: '≈ 80 лет', note: 'около трёх поколений лордов Штормового Предела в книгах не названы' },
  { house: 'vel', from: 'alyn', to: 'lucerys_v', years: '≈ 120 лет', note: 'лорды Дрифтмарка между Элином и Люцерисом в книгах не названы' },
  { house: 'arr', from: 'joffrey_a', to: 'donnel', years: '≈ 60 лет', note: 'лорды Орлиного Гнезда между Джоффри и Доннелом в книгах не названы' },
  { house: 'arr', from: 'donnel', to: 'jasper', years: '', note: 'родство Доннела и Джаспера в книгах не прослежено' },
  { house: 'hgt', from: 'manfred_h', to: 'hgt_lord8', years: '', note: 'как лорды Староместа этих лет связаны с отцом Отто, в книгах не прослежено' },
  { house: 'hgt', from: 'hgt_lord8', to: 'leyton', years: '≈ 120 лет', note: 'лорды Хайтауэр между Лайонелом и Лейтоном почти не названы' },
  { house: 'mar', from: 'meria', to: 'qoren', years: '', note: 'родство правителей Дорна до Корена в книгах не прослежено' },
  { house: 'mar', from: 'qoren', to: 'dorne_p14', years: '≈ 40 лет', note: 'правители Дорна между Алиандрой и отцом Марона не названы' },
  { house: 'mar', from: 'dorne_p14', to: 'dorne_p19', years: '≈ 60 лет', note: 'правители Дорна между Мароном и матерью Дорана не названы' },
  { house: 'lan', from: 'loren', to: 'lyman', years: '', note: 'родство Лорена и Лаймана в книгах не прослежено' },
  { house: 'lan', from: 'lyman', to: 'lan_lord10', years: '', note: 'Таймонд правил до близнецов, но что он их отец, в книгах не сказано' },
  { house: 'lan', from: 'lan_lord10', to: 'gerold', years: '≈ 70 лет', note: 'лорды Утёса между Лореоном и Джерольдом почти не названы' },
  { house: 'tul', from: 'edmyn', to: 'grover', years: '', note: 'родство лордов Риверрана в книгах не прослежено' },
  { house: 'tul', from: 'grover', to: 'elmo', years: '', note: 'Элмо — внук Гровера; его отец или мать в книгах не названы' },
  { house: 'tul', from: 'elmo', to: 'tul_lord17', years: '≈ 120 лет', note: 'лорды Риверрана между Танцем драконов и отцом Хостера почти не названы' },
  { house: 'stk', from: 'torrhen', to: 'cregan', years: '≈ 100 лет', note: 'девять лордов Винтерфелла между Торрхеном и Криганом здесь не показаны' },
  { house: 'stk', from: 'cregan', to: 'brandon_c', years: '', note: 'Брандон — младший сын Кригана; ветвь сдвинута вправо, к его ровесникам' },
  { house: 'tyr', from: 'theo', to: 'bertrand', years: '≈ 40 лет', note: 'лорды Хайгардена между Тео и Бертрандом в книгах не названы' },
  { house: 'tyr', from: 'martyn_t', to: 'matthos', years: '≈ 40 лет', note: 'наследник Бертранда не назван, родство Маттоса не указано' },
  { house: 'tyr', from: 'matthos', to: 'lyonel_t', years: '', note: 'отец Лионеля не назван, родство с Маттосом не указано' },
  { house: 'tyr', from: 'lyonel_t', to: 'leo_t', years: '≈ 35 лет', note: 'лорды Хайгардена между Лионелем и Лео Длинным Шипом не названы' },
  { house: 'tyr', from: 'leo_t', to: 'tyr_lord17', years: '≈ 25 лет', note: 'кто правил Хайгарденом между Лео Длинным Шипом и отцом Лютора, в книгах не сказано' },
  { house: 'gry', from: 'goren', to: 'gry_lord10', years: '≈ 75 лет', note: 'лорды Железных островов между Гореном и отцом Дальтона не названы' },
  { house: 'gry', from: 'toron', to: 'alton', years: '', note: 'Алтон, Торвин, Лорон и Дагон названы после Торона списком, без дат и родства' },
  { house: 'gry', from: 'alton', to: 'torwyn', years: '', note: 'порядок лордов дан списком без дат; родство не названо' },
  { house: 'gry', from: 'torwyn', to: 'loron', years: '', note: 'порядок лордов дан списком без дат; родство не названо' },
  { house: 'gry', from: 'loron', to: 'dagon', years: '', note: 'порядок лордов дан списком без дат; родство не названо' }
];

/* Пол: для подбора слов в карточке и в поиске родства. Группы людей — без пола. */
const FEMALE = new Set([
  'daenys', 'elaena_l', 'visenya', 'rhaenys', 'rhaena_a', 'aerea', 'rhaella_a', 'alysanne', 'vaella_a',
  'daenerys_j', 'alyssa_j', 'maegelle', 'daella_j', 'saera', 'viserra', 'gael', 'rhaenys_q', 'rhaenyra', 'helaena',
  'baela', 'rhaena_d', 'visenya_r', 'jaehaera', 'daena', 'rhaena_b', 'elaena_b', 'naerys', 'daenerys_n', 'mya', 'gwenys',
  'shiera', 'calla', 'aelora', 'daenora', 'vaella_s', 'daella_m', 'rhae', 'shaera', 'rhaelle', 'rhaella', 'daenerys', 'rhaenys_r',
  'valaena', 'alyssa_v', 'lianna', 'larissa', 'daenaera', 'laena', 'laena_a', 'jeyne_w',
  'jocelyn', 'cassandra', 'maris', 'ellyn', 'floris', 'lyonel_d', 'myrcella', 'mya_stone', 'bella', 'barra', 'shireen',
  'sharra', 'elys_a', 'amanda_a', 'aemma', 'jeyne', 'alys_r', 'alys_j', 'waynwood_e', 'waynwood_y', 'waynwood_m'
]);
const GROUPS = new Set(['twins_n', 'aethan_sons', 'silent3', 'ronnel_kids', 'jeyne_br', 'waynwood_m']);

/* Запросы для поиска на A Wiki of Ice and Fire, где английского имени нет или оно неоднозначно. */
const WIKI = {
  aerion_l: 'Aerion Targaryen (son of Daemion)', aegon_l: 'Aegon Targaryen (son of Gaemon)', elaena_l: 'Elaena Targaryen (daughter of Gaemon)',
  rhaena_a: 'Rhaena Targaryen (daughter of Aenys I)', aegon_u: 'Aegon Targaryen (son of Aenys I)', viserys_a: 'Viserys Targaryen (son of Aenys I)',
  rhaella_a: 'Rhaella Targaryen (daughter of Aegon)', vaella_a: 'Vaella Targaryen (daughter of Aenys I)',
  aegon_j: 'Aegon Targaryen (son of Jaehaerys I)', daenerys_j: 'Daenerys Targaryen (daughter of Jaehaerys I)', aemon_j: 'Aemon Targaryen (son of Jaehaerys I)',
  baelon_j: 'Baelon Targaryen (son of Jaehaerys I)', alyssa_j: 'Alyssa Targaryen', maegelle: 'Maegelle Targaryen', daella_j: 'Daella Targaryen (daughter of Jaehaerys I)',
  gaemon_j: 'Gaemon Targaryen (son of Jaehaerys I)', valerion: 'Valerion Targaryen', rhaenys_q: 'Rhaenys Targaryen (daughter of Aemon)',
  aegon_b: 'Aegon Targaryen (son of Baelon)', baelon_v: 'Baelon Targaryen (son of Viserys I)', son_laena: 'Laena Velaryon',
  rhaena_d: 'Rhaena Targaryen (daughter of Daemon)', visenya_r: 'Visenya Targaryen (daughter of Rhaenyra)', jaehaerys_a: 'Jaehaerys Targaryen (son of Aegon II)',
  rhaena_b: 'Rhaena Targaryen (daughter of Aegon III)', elaena_b: 'Elaena Targaryen', twins_n: 'Naerys Targaryen', daenerys_n: 'Daenerys Targaryen (daughter of Aegon IV)',
  aemon_dk: 'Aemon Targaryen (son of Viserys II)', aegon_bf: 'Aegon Blackfyre', aemon_bf: 'Aemon Blackfyre', daemon2_bf: 'Daemon II Blackfyre', haegon: 'Haegon I Blackfyre',
  daemon3_bf: 'Daemon III Blackfyre', aenys_bf: 'Aenys Blackfyre', calla: 'Calla Blackfyre', valarr: 'Valarr Targaryen', matarys: 'Matarys Targaryen',
  rhaegel: 'Rhaegel Targaryen', aelor: 'Aelor Targaryen', aelora: 'Aelora Targaryen', daenora: 'Daenora Targaryen',
  daeron_dr: 'Daeron Targaryen (son of Maekar I)', vaella_s: 'Vaella Targaryen (daughter of Daeron)', aerion_m: 'Aerion Targaryen',
  maegor_a: 'Maegor Targaryen (son of Aerion)', aemon_m: 'Aemon Targaryen (son of Maekar I)', daella_m: 'Daella Targaryen (daughter of Maekar I)', rhae: 'Rhae Targaryen',
  duncan: 'Duncan Targaryen', daeron_e: 'Daeron Targaryen (son of Aegon V)', daeron_a2: 'Daeron Targaryen (son of Aerys II)',
  rhaenys_r: 'Rhaenys Targaryen (daughter of Rhaegar)', aegon_r: 'Aegon Targaryen (son of Rhaegar)',
  daemon_v0: 'Daemon Velaryon', daemon_v: 'Daemon Velaryon (son of Aethan)', corlys_kg: 'Corlys Velaryon (son of Daemon)', laena_a: 'Laena Velaryon (daughter of Alyn)',
  aethan_sons: 'Aethan Velaryon', corlys_br1: 'Vaemond Velaryon', corlys_br2: 'Silent five', silent3: 'Silent five', longwaters: 'House Longwaters',
  orys_son: 'Rogar Baratheon', borys_b: 'Borys Baratheon', garon_b: 'Garon Baratheon', ronnal_b: 'Ronnal Baratheon', orryn_b: 'Orryn Baratheon',
  lord_b208: 'Gowen Baratheon', lyonel_d: 'Lyonel Baratheon', myrcella: 'Myrcella Baratheon', tommen: 'Tommen Baratheon', shireen: 'Shireen Baratheon',
  ronnel_k: 'Ronnel Arryn (king)', ronnel_kids: 'Ronnel Arryn (king)', jeyne_f: 'Jeyne Arryn', rodrik_s2: 'Arnold Arryn', jeyne_br: 'Jeyne Arryn',
  ronnel_j: 'Ronnel Arryn (son of Jasper)', alys_j: 'Alys Arryn (sister of Jon)', alys_r: 'Alys Arryn (wife of Rhaegel)',
  waynwood_e: 'Denys Arryn', waynwood_m: 'Alys Arryn (sister of Jon)', waynwood_y: 'Harrold Hardyng', denys_son: 'Denys Arryn', robert_a: 'Robert Arryn'
};

/* Короли, которые правят «сейчас» (на момент последней вышедшей книги). */
const NOW_YEAR = 300;
