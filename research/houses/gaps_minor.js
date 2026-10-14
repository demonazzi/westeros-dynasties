/* Пунктиры у малых домов: куски одной линии глав дома (лордов замка), между которыми в книгах никто не назван.
   Соединяются только главы дома и их наследники — жёны из других домов, бастарды, рыцари без известного места в
   линии и младшие ветви не соединяются: пунктир не должен показывать родство, которого нет. Кто был главой дома —
   по A Wiki of Ice and Fire (страницы людей и их «succession box»). Годы — по колонкам древа, приблизительно.
   Не проведены (прошли бы через чужую карточку в том же ряду): лорд Вестерлинг 43 г. → Роланд (мешает сир Гаррольд),
   Алтон Баттервелл → десница Эйгона IV (мешает Беатрис).
   Одноразовый: node research/houses/gaps_minor.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'tools', 'data.js'));
const mf = path.join(D.DATA, 'meta.json');
let ms = fs.readFileSync(mf, 'utf8');

// колонки, которые надо сдвинуть, чтобы пунктир шёл слева направо: Алан Тарли правил в Танец (позже Дональда),
// лорд Эстермонт, отец Кассаны, — поколением раньше Элдона, Хармон Безносый — раньше отца Саймона
const MOVE = [['tar', 'alan_t', 10, 11], ['est', 'est_lord17', 17, 16], ['dnd', 'harmon_d', 7, 6], ['roy', 'gunthor_r', 11, 12], ['mal', 'jorah_mal', 10, 11]];
MOVE.forEach(([h, id, a, b]) => {
  const from = '["' + id + '",' + a + ']', to = '["' + id + '",' + b + ']';
  const line = ms.match(new RegExp('\\{"house":"' + h + '"[^\\n]*\\}'))[0];
  if (!line.includes(from)) throw new Error('нет ' + from);
  ms = ms.replace(line, line.replace(from, to));
});

// порядок корней в полосе: пунктир идёт к соседу по высоте, а не через чужую карточку
const ORDER = [];
ORDER.forEach(([h, id, after]) => {
  const line = ms.match(new RegExp('\\{"house":"' + h + '"[^\\n]*\\}'))[0];
  const b = JSON.parse(line), i = b.roots.findIndex(r => r[0] === id), r = b.roots.splice(i, 1)[0];
  b.roots.splice(b.roots.findIndex(x => x[0] === after) + 1, 0, r);
  ms = ms.replace(line, line.replace(/"roots":\[.*\]\}$/, '"roots":' + JSON.stringify(b.roots) + '}'));
});
const SEAT = { tar: 'Рогова Холма', red: 'Арбора', pea: 'Звёздного Пика', oak: 'Старого Дуба', wes: 'Скалы', far: 'Светлого замка',
  day: 'Звездопада', est: 'Нефрита', swn: 'Каменного Шлема', pen: 'Пергаментов', stw: 'Стокворта', dnd: 'Чёрного Приюта', roy: 'Рунного Камня',
  cor: 'Дома Сердец', brk: 'Каменной Ограды', mal: 'Сигарда', pip: 'Розовой Девы', umb: 'Последнего Очага', man: 'Белой Гавани' };
const who = h => SEAT[h] ? 'лорды ' + SEAT[h] : 'главы дома';
const STD = h => who(h) + ' этих лет в книгах не упоминаются';
// [дом, от, к, особая подпись]
const G = [
  ['tar', 'savage_sam', 'donald'], ['tar', 'savage_sam', 'alan_t', 'лорды Рогова Холма этих лет в книгах не упоминаются; Алан, возможно, сын Дональда'],
  ['tar', 'alan_t', 'samwyle'], ['tar', 'samwyle', 'tar_lord17'],
  ['red', 'ryam', 'runceford'],
  ['pea', 'uther', 'pea_lord9'], ['pea', 'unwin', 'gormon_p'], ['pea', 'gormon_p', 'titus_p'],
  ['osg', 'ormond', 'eustace', 'главы дома этих лет в книгах не упоминаются; Юстас — последний в своей линии'],
  ['oak', 'torgen', 'oak_lord73'], ['oak', 'oak_lord73', 'arwyn', 'лорды Старого Дуба этих лет в книгах не упоминаются; Арвин — глава дома в конце века'],
  ['wes', 'roland_wl', 'gawen_w'],
  ['far', 'far_lord43', 'far_lord130'], ['far', 'far_lord130', 'far_par19'],
  ['plm', 'ossifer', 'philip_pl'],
  ['day', 'clarisse', 'day_lord17'],
  ['est', 'gunthor_e', 'est_lord17'], ['est', 'gunthor_e', 'eldon', 'приложения расходятся в родстве позднейших Эстермонтов'],
  ['swn', 'swann_lord129', 'gawen_s'], ['swn', 'gawen_s', 'manfred_s'], ['swn', 'manfred_s', 'gulian'],
  ['pen', 'ronnel', 'pen_lord18'],
  ['stw', 'alyn_s', 'stw_lord129'], ['stw', 'stw_lord129', 'tanda', 'лорды Стокворта этих лет в книгах не упоминаются; Танда — сестра Мэнли Стокворта'],
  ['dnd', 'harmon_d', 'dnd_lord54', 'Хармон, возможно, и был отцом Саймона; в книгах не сказано'], ['dnd', 'simon_d', 'dnd_lord206'], ['dnd', 'manfred_d', 'beric'],
  ['roy', 'allard', 'yorbert'], ['roy', 'rhea', 'gunthor_r', 'Гунтор правил после Реи; как они связаны, в книгах не сказано'], ['roy', 'gunthor_r', 'yohn'],
  ['cor', 'qarl', 'cor_lord9'], ['cor', 'leowyn', 'cor_lord17'],
  ['brk', 'humfrey_b', 'brk_lord13'], ['brk', 'brk_lord13', 'brk_lord16'], ['brk', 'brk_lord16', 'brk_lord18'],
  ['mal', 'raymun_mal', 'jorah_mal'], ['mal', 'jorah_mal', 'mal_lord'],
  ['pip', 'jon_p', 'petyr_p'], ['pip', 'stanton', 'pip_lord18'], ['pip', 'stanton', 'clement'],
  ['umb', 'jon_u2', 'osric'],
  ['man', 'torrhen_m', 'wyman']
];

// годы — по колонкам древа (колонка ≈ год рождения), только если промежуток заметный
const COLY = { 6: -20, 7: 7, 8: 34, 9: 61, 10: 88, 11: 105, 12: 123, 13: 148, 14: 172, 15: 185, 16: 198, 17: 222, 18: 245, 19: 269, 20: 286 };
const d0 = D.load();
const byId = new Map(d0.PEOPLE.map(p => [p.id, p]));
const meta = JSON.parse(ms);
const colOf = (h, id) => {
  const b = meta.bands.find(x => x.house === h);
  const roots = new Map(b.roots);
  let n = 0, cur = id;
  while (cur && !roots.has(cur)) { cur = (byId.get(cur) || {}).p; n++; }
  if (!cur) throw new Error(id + ' не в полосе ' + h);
  return roots.get(cur) + n;
};
const lines = G.map(([h, from, to, note]) => {
  if (!byId.has(from) || !byId.has(to)) throw new Error('нет человека ' + from + ' / ' + to);
  const a = colOf(h, from), b = colOf(h, to);
  if (b <= a) throw new Error('пунктир справа налево: ' + from + ' → ' + to);
  const yrs = COLY[b] - COLY[a];
  return '    ' + JSON.stringify({ house: h, from, to, years: yrs >= 40 ? '≈ ' + Math.round(yrs / 10) * 10 + ' лет' : '', note: note || STD(h) });
});
const exist = new Set(meta.gaps.map(g => g.house + '|' + g.from + '|' + g.to));
const add = lines.filter((l, i) => !exist.has(G[i][0] + '|' + G[i][1] + '|' + G[i][2]));
ms = ms.replace(/\n  \]\n\}\s*$/, ',\n' + add.join(',\n') + '\n  ]\n}\n');
JSON.parse(ms);
fs.writeFileSync(mf, ms);
console.log('пунктиров добавлено:', add.length);
