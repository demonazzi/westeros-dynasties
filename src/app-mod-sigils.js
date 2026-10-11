/* Гербы домов — собственная упрощённая отрисовка по описаниям из книг (поле и фигура в геральдических цветах).
   Щит 64×76, как у медальонов в карточках. App.sigilSVG(дом, x, y, ширина) возвращает вложенный <svg>. */
(function () {
  const App = window.App;
  const SHIELD = 'M6 12 H58 V40 C58 57 46 67 32 73 C18 67 6 57 6 40 Z';
  const INNER = 'M10.5 16.5 H53.5 V40 C53.5 54 43.5 62.5 32 68 C20.5 62.5 10.5 54 10.5 40 Z';
  /* Фигуры: функция получает цвета поля и фигуры, возвращает разметку внутри щита. */
  const dragon = (f, c) =>
    // крылья, тело, три шеи с головами и хвост
    '<path d="M25 47 L9 27 L13 45 Z M39 47 L55 27 L51 45 Z" fill="' + c + '" opacity=".8"/>' +
    '<path d="M24 48 C24 42 40 42 40 48 C40 55 24 55 24 48 Z" fill="' + c + '"/>' +
    '<path d="M27 45 C24 39 21 36 19 31 M32 44 V27 M37 45 C40 39 43 36 45 31" stroke="' + c + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M14.5 29.5 L20.5 27 L22 32 Z M29 22 L35 22 L32 28 Z M49.5 29.5 L43.5 27 L42 32 Z" fill="' + c + '"/>' +
    '<path d="M36 53 C40 57 36 61 41 63" stroke="' + c + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
  const FIG = {
    targ: dragon,
    bf: dragon,
    // серебряный морской конёк
    vel: (f, c) =>
      '<path d="M35 22 C29 21 25 25 21 26 C25 28 29 28 31 29 C35 33 36 37 33 42 C30 47 31 53 35 56 C38 58 40 55 38 53" stroke="' + c + '" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M38 27 L43 29 L39 32 L44 35 L38 37 L42 41 L36 42" fill="' + c + '"/>' +
      '<circle cx="33" cy="24.5" r="1.4" fill="' + f + '"/>',
    // коронованный олень
    bar: (f, c) =>
      '<path d="M28 31 C26 26 23 23 19 19 M22.5 22.5 L16 23 M20.5 20.5 L21 14 M36 31 C38 26 41 23 45 19 M41.5 22.5 L48 23 M43.5 20.5 L43 14" stroke="' + c + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M26.5 31 H37.5 L35.5 45 L32 51 L28.5 45 Z" fill="' + c + '"/>' +
      '<path d="M26.5 32 L20 30.5 L25 36.5 Z M37.5 32 L44 30.5 L39 36.5 Z" fill="' + c + '"/>' +
      '<path d="M27.5 29 L28.5 24.5 L30.5 27 L32 23.5 L33.5 27 L35.5 24.5 L36.5 29 Z" fill="' + c + '"/>' +
      '<circle cx="29.6" cy="37" r="1.2" fill="' + f + '"/><circle cx="34.4" cy="37" r="1.2" fill="' + f + '"/>',
    // луна и сокол
    arr: (f, c) =>
      '<circle cx="30" cy="43" r="15" fill="' + c + '"/><circle cx="36.5" cy="37" r="13" fill="' + f + '"/>' +
      '<path d="M27 30 C30 26.5 33.5 26.5 35.5 29.5 C37.5 24 42.5 21.5 49 22 C44.5 25 42 29 39.5 32.5 L38 37 L35.5 33.5 C33 31.5 30 30.5 27 30 Z" fill="' + c + '"/>',
    // две башни Близнецов, соединённые мостом
    fry: (f, c) =>
      '<path d="M16 59 V30 H27 V59 Z M15 30.5 V24 H18 V27 H20.3 V24 H22.7 V27 H25 V24 H28 V30.5 Z M37 59 V30 H48 V59 Z M36 30.5 V24 H39 V27 H41.3 V24 H43.7 V27 H46 V24 H49 V30.5 Z" fill="' + c + '"/>' +
      '<path d="M27 39.5 H37 V46.5 C35.2 43.6 28.8 43.6 27 46.5 Z" fill="' + c + '"/>' +
      '<path d="M20.5 34 h2 v4.5 h-2 Z M41.5 34 h2 v4.5 h-2 Z M19.5 59 V54 C19.5 51.6 23.5 51.6 23.5 54 V59 Z M40.5 59 V54 C40.5 51.6 44.5 51.6 44.5 54 V59 Z" fill="' + f + '"/>' +
      '<path d="M12 63.5 C16 61.5 20 65.5 24 63.5 S32 61.5 36 63.5 S44 65.5 48 63.5 S52 62 53 63" stroke="' + c + '" stroke-width="1.6" fill="none" opacity=".7"/>',
    // освежёванный человек на бледно-розовом поле с каплями крови (Болтоны)
    blt: (f, c) => {
      const drop = (x, y) => '<path d="M' + x + ' ' + y + ' c0 -1.6 1.3 -3.2 1.3 -3.2 s1.3 1.6 1.3 3.2 a1.3 1.3 0 0 1 -2.6 0 Z" fill="' + c + '"/>';
      return '<circle cx="32" cy="24.5" r="4.2" fill="' + c + '"/>' +
        '<path d="M28.3 29.5 H35.7 L36.6 44 H34.6 L33.6 57 H30.4 L29.4 44 H27.4 Z" fill="' + c + '"/>' +
        '<path d="M28.6 31 L17 22 M35.4 31 L47 22 M30.6 56 L26.5 65 M33.4 56 L37.5 65" stroke="' + c + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M29.5 34 H34.5 M29.5 38 H34.5" stroke="' + f + '" stroke-width=".9" opacity=".7"/>' +
        drop(15, 32) + drop(47.5, 33) + drop(19, 48) + drop(44, 47) + drop(23, 59) + drop(40.5, 60);
    },
    // ревущий великан в шкуре с разорванными серебряными цепями на огненно-красном (Амберы)
    umb: (f, c) =>
      '<circle cx="32" cy="24" r="5" fill="' + c + '"/><ellipse cx="32" cy="26" rx="1.7" ry="1.3" fill="' + f + '"/>' +
      '<path d="M23.5 30.5 H40.5 L42.5 48 H21.5 Z" fill="' + c + '"/>' +
      '<path d="M24.5 47 H30 V63 H24.5 Z M34 47 H39.5 V63 H34 Z" fill="' + c + '"/>' +
      '<path d="M24 32.5 L14.5 20.5 M40 32.5 L49.5 20.5" stroke="' + c + '" stroke-width="4.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M22 37 L42 41 M23 43 L41 39" stroke="#7E5A36" stroke-width="1.1" opacity=".8"/>' +
      '<g fill="none" stroke="#D9DBDE" stroke-width="1.5"><ellipse cx="12.3" cy="17.8" rx="2.3" ry="1.4" transform="rotate(45 12.3 17.8)"/>' +
      '<ellipse cx="9.4" cy="14.6" rx="2.3" ry="1.4" transform="rotate(45 9.4 14.6)"/><ellipse cx="51.7" cy="17.8" rx="2.3" ry="1.4" transform="rotate(-45 51.7 17.8)"/>' +
      '<ellipse cx="54.6" cy="14.6" rx="2.3" ry="1.4" transform="rotate(-45 54.6 14.6)"/></g>',
    // белое солнце с лучами на чёрном (Карстарки)
    kar: (f, c) => {
      let rays = '';
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8, r1 = 9.5, r2 = i % 2 ? 15 : 19, w = 0.16;
        const p = (r, d) => (32 + Math.cos(a + d) * r).toFixed(1) + ' ' + (40 + Math.sin(a + d) * r).toFixed(1);
        rays += 'M' + p(r1, -w) + ' L' + p(r2, 0) + ' L' + p(r1, w) + ' Z ';
      }
      return '<path d="' + rays + '" fill="' + c + '"/><circle cx="32" cy="40" r="8" fill="' + c + '"/>';
    },
    // белый водяной с чёрным трезубцем на сине-зелёном (Мандерли)
    man: (f, c) =>
      '<path d="M39 17 V54" stroke="#15181A" stroke-width="2.2"/><path d="M35 23 V17.5 M39 23 V15 M43 23 V17.5 M34.5 23 H43.5" stroke="#15181A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="27.5" cy="23.5" r="4.1" fill="' + c + '"/><path d="M24 22 C23 26 24 28 25.5 29.5 M31 22 C32 26 31 28 29.5 29.5" stroke="#1F4A3A" stroke-width="1.6" fill="none"/>' +
      '<path d="M23.5 29 H31.5 L31 39 C31 45 35 49 41 51.5 C46 53.5 47 58.5 43.5 61 L48.5 65 H41.5 L39.5 61 C35 59 25.5 53 24.5 41 Z" fill="' + c + '"/>' +
      '<path d="M31 31.5 L39 30.5" stroke="' + c + '" stroke-width="2.6" stroke-linecap="round"/>',
    // чёрный медведь в зелёном лесу (Мормонты)
    mor: (f, c) =>
      '<path d="M13 60 L17 48 L21 60 Z M43 60 L47 46 L51 60 Z M16 46 L19 37 L22 46 Z" fill="#6E9A63" opacity=".75"/>' +
      '<path d="M21 61 C19 52 21 42 26.5 36 C25 32 25.5 27 29.5 25.5 C30.5 22.5 33.5 22.5 34.5 24.5 C38.5 24.5 41.5 27.5 40.5 31.5 C44.5 35.5 46 43.5 44 51 L46 61 H40 L39 54 C36 56 30 56 27.5 54 L26.5 61 Z" fill="' + c + '"/>' +
      '<circle cx="29.5" cy="24" r="2" fill="' + c + '"/><circle cx="36" cy="24.5" r="2" fill="' + c + '"/><circle cx="34.5" cy="28" r=".9" fill="' + f + '"/>',
    // красный вздыбленный жеребец на золотом щитке, поле коричневое (Бракены)
    brk: (f, c) =>
      '<path d="M17 21 H47 V40 C47 52 40 58 32 62 C24 58 17 52 17 40 Z" fill="#D9A63A"/>' +
      '<path d="M37.5 24.5 C34.5 24 32.5 26 31 28.5 L28.5 33 C26.5 36.5 25.5 40 25 44 L22 50 L24.5 51 L27.5 46 L29 50.5 L27 56 L29.5 56.5 L32 50 C34 47.5 35 44 35 41 L38.5 44.5 L36.5 49 L39 49.5 L41.5 44 L38 38.5 C38.5 35.5 39.5 33 41 31.5 L43.5 33.5 L44.5 31 C42.5 28 40.5 25.5 37.5 24.5 Z" fill="' + c + '"/>' +
      '<path d="M33 27.5 L30 25 L33.5 25.5" stroke="' + c + '" stroke-width="1.6" fill="none"/>',
    // серебряный орёл с распростёртыми крыльями на индиго (Маллистеры)
    mal: (f, c) =>
      '<path d="M32 26 C30 26 29 27.5 29.5 29 L31 31 L29 31.5 L32 33.5 L35 31.5 L33 31 L34.5 29 C35 27.5 34 26 32 26 Z" fill="' + c + '"/>' +
      '<path d="M29 34 C24 29 17 28 11 30 C14 32 15 34 14 36 C17 35 18 37 17 39 C21 38 23 40 22.5 42 C26 41 28 40 29.5 41 Z M35 34 C40 29 47 28 53 30 C50 32 49 34 50 36 C47 35 46 37 47 39 C43 38 41 40 41.5 42 C38 41 36 40 34.5 41 Z" fill="' + c + '"/>' +
      '<path d="M28.5 33 H35.5 L35 47 L37.5 54 L32 51.5 L26.5 54 L29 47 Z" fill="' + c + '"/>' +
      '<path d="M29.5 50 L27 57 M34.5 50 L37 57" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round"/>',
    // волнистые полосы зелёного, белого и жёлтого (Баттервеллы)
    btw: (f, c) => {
      const cols = [f, c, '#E2B93B', f, c, '#E2B93B', f, c];
      let out = '';
      cols.forEach((col, i) => {
        const y = 12 + i * 8;
        out += '<path d="M4 ' + (y + 8) + ' C10 ' + (y + 5) + ' 14 ' + (y + 11) + ' 20 ' + (y + 8) + ' S30 ' + (y + 5) + ' 36 ' + (y + 8) + ' S46 ' + (y + 11) + ' 52 ' + (y + 8) + ' S60 ' + (y + 6) + ' 62 ' + (y + 8) + ' V' + (y + 20) + ' H4 Z" fill="' + col + '"/>';
      });
      return out;
    },
    // розовая танцующая дева в вихре белого шёлка на синем (Пайперы)
    pip: (f, c) =>
      '<path d="M14 50 C20 38 30 30 44 27 C38 33 32 36 28 44 C35 40 44 40 50 46 C42 45 34 49 26 58 C25 52 20 50 14 50 Z" fill="#F4F3EF" opacity=".9"/>' +
      '<circle cx="33" cy="22.5" r="3.4" fill="' + c + '"/>' +
      '<path d="M31 26.5 H35 L37 36 L42 50 C38 52 30 52 25 50 L30 36 Z" fill="' + c + '"/>' +
      '<path d="M31.5 28 L22 23 M34.5 28 L43 33" stroke="' + c + '" stroke-width="2.3" stroke-linecap="round"/>' +
      '<path d="M30.5 50.5 L29 60 M34.5 50.5 L38 59" stroke="' + c + '" stroke-width="2.3" stroke-linecap="round"/>',
    // ступенчатая белая башня, увенчанная огнём
    hgt: (f, c) =>
      '<path d="M20 63 H44 V58 H20 Z M22 57 H42 L41 45 H23 Z M21 45 H43 V42 H21 Z M25 41 H39 L38 32 H26 Z M24 32 H40 V29.5 H24 Z M27.5 29 H36.5 L35.5 24.5 H28.5 Z" fill="' + c + '"/>' +
      '<path d="M30 50 h4 v5 h-4 Z M30.6 35 h2.8 v3.6 h-2.8 Z" fill="' + f + '"/>' +
      '<path d="M32 12 C35 16 37 19 35.5 22.5 C34.8 24 33.5 24.6 32 24.6 C30.5 24.6 29.2 24 28.5 22.5 C27 19 29.5 16.5 32 12 Z" fill="#F08A2C"/>' +
      '<path d="M32 17 C33.6 19.4 34 21 33 22.6 C32.4 23.4 31.6 23.4 31 22.6 C30 21 30.5 19.2 32 17 Z" fill="#FFD25A"/>',
    // красное солнце, пронзённое золотым копьём
    mar: (f, c) => {
      let rays = '';
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6, a1 = a - 0.16, a2 = a + 0.16;
        rays += 'M' + (32 + Math.cos(a1) * 11).toFixed(1) + ' ' + (40 + Math.sin(a1) * 11).toFixed(1) + ' L' + (32 + Math.cos(a) * 17).toFixed(1) + ' ' + (40 + Math.sin(a) * 17).toFixed(1) + ' L' + (32 + Math.cos(a2) * 11).toFixed(1) + ' ' + (40 + Math.sin(a2) * 11).toFixed(1) + ' Z ';
      }
      return '<path d="' + rays + '" fill="' + c + '"/><circle cx="32" cy="40" r="10.5" fill="' + c + '"/>' +
        '<path d="M15 60 L47 22" stroke="#E8B530" stroke-width="2.6" stroke-linecap="round"/><path d="M47 22 L44 30 L50.5 25 Z" fill="#E8B530"/>';
    },
    // мёртвое чардрево в кольце воронов
    bw: (f, c) =>
      '<path d="M32 62 V38 M32 46 L24 36 M24 36 L19 33 M24 36 L23 29 M32 41 L40 32 M40 32 L46 30 M40 32 L40 25 M32 38 L31 27" stroke="' + c + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
      '<path d="M15 24 l3 -2 l3 2 l3 -2 l-1 3 l-5 1 Z M44 20 l3 -2 l3 2 l3 -2 l-1 3 l-5 1 Z M13 45 l3 -2 l3 2 l3 -2 l-1 3 l-5 1 Z M44 47 l3 -2 l3 2 l3 -2 l-1 3 l-5 1 Z M29 17 l3 -2 l3 2 l3 -2 l-1 3 l-5 1 Z" fill="#16121A"/>',
    // голова льва в гриве
    lan: (f, c) => {
      let mane = '';
      for (let i = 0; i < 11; i++) {
        const a = -Math.PI / 2 + (i - 5) * 0.52;
        mane += '<ellipse cx="' + (32 + Math.cos(a) * 12.5).toFixed(1) + '" cy="' + (38 + Math.sin(a) * 12.5).toFixed(1) + '" rx="6" ry="7.5" transform="rotate(' + (a * 180 / Math.PI + 90).toFixed(0) + ' ' + (32 + Math.cos(a) * 12.5).toFixed(1) + ' ' + (38 + Math.sin(a) * 12.5).toFixed(1) + ')" fill="' + c + '"/>';
      }
      return mane + '<path d="M17 50 C20 58 26 62 32 64 C38 62 44 58 47 50 Z" fill="' + c + '"/>' +
        '<path d="M24 30 C27 26 37 26 40 30 C43 35 41 45 38 51 C36 55 34 57 32 57 C30 57 28 55 26 51 C23 45 21 35 24 30 Z" fill="' + c + '" stroke="' + f + '" stroke-width="1.3"/>' +
        '<path d="M26.5 37 L30.5 38.5 L27 39.5 Z M37.5 37 L33.5 38.5 L37 39.5 Z" fill="' + f + '"/>' +
        '<path d="M29.5 47 H34.5 L32 50.5 Z" fill="' + f + '"/><path d="M32 50.5 V53 M29 53.5 C30.5 55 33.5 55 35 53.5" stroke="' + f + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    },
    // прыгающая форель над волнами синего и красного
    tul: (f, c) =>
      '<path d="M6 46 C14 42 18 50 26 46 C34 42 38 50 46 46 C52 43 55 46 58 45 V73 H6 Z" fill="#9B2A2A"/>' +
      '<path d="M6 56 C14 52 18 60 26 56 C34 52 38 60 46 56 C52 53 55 56 58 55" stroke="#2F4FA0" stroke-width="4" fill="none"/>' +
      '<path d="M18 44 C22 30 38 24 46 30 C40 32 30 36 22 46 Z" fill="' + c + '"/>' +
      '<path d="M28 31 L31 25.5 L34 29 Z M27 40 L25 45 L30 41.5 Z" fill="' + c + '"/>' +
      '<circle cx="30" cy="35" r=".9" fill="#2F4FA0"/><circle cx="35" cy="31.5" r=".9" fill="#2F4FA0"/><circle cx="25" cy="39" r=".9" fill="#2F4FA0"/>' +
      '<path d="M18 44 L12 46 L15 40 Z" fill="' + c + '"/><path d="M44 29.5 L50 25 L49 32 Z" fill="' + c + '"/>' +
      '<circle cx="41.5" cy="30" r="1.2" fill="#2F4FA0"/>',
    // голова лютоволка
    stk: (f, c) =>
      '<path d="M21 28 L25 16 L30 27 L34 27 L39 16 L43 28 C46 33 46 39 42 44 L35 55 C33.5 57.5 30.5 57.5 29 55 L22 44 C18 39 18 33 21 28 Z" fill="' + c + '"/>' +
      '<path d="M26.5 35 L30 37.5 L26.8 38.3 Z M37.5 35 L34 37.5 L37.2 38.3 Z" fill="' + f + '"/>' +
      '<path d="M30 50 L34 50 L32 53 Z" fill="' + f + '"/><path d="M32 40 V48" stroke="' + f + '" stroke-width="1" opacity=".6"/>',
    // драконье яйцо
    seed: (f, c) =>
      '<path d="M32 18 C41 18 47 34 47 44 C47 54 40 61 32 61 C24 61 17 54 17 44 C17 34 23 18 32 18 Z" fill="' + c + '"/>' +
      '<path d="M21 40 q4 -4 8 0 q4 -4 8 0 q4 -4 8 0 M19 49 q4 -4 8 0 q4 -4 8 0 q4 -4 8 0 M23 57 q4 -3.5 8 0 q4 -3.5 8 0" stroke="' + f + '" stroke-width="1.5" fill="none" opacity=".7"/>',
    // золотая роза на зелёном
    tyr: (f, c) => {
      let petals = '';
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; petals += '<circle cx="' + (32 + Math.cos(a) * 7.5).toFixed(1) + '" cy="' + (35 + Math.sin(a) * 7.5).toFixed(1) + '" r="6.8" fill="' + c + '"/>'; }
      return '<path d="M32 44 V62" stroke="' + c + '" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M32 54 C27 50 22 51 20 55 C25 57 29 56 32 54 Z M32 50 C37 46 42 47 44 51 C39 53 35 52 32 50 Z" fill="' + c + '"/>' +
        petals + '<circle cx="32" cy="35" r="4.2" fill="' + f + '" opacity=".55"/><circle cx="32" cy="35" r="2.2" fill="' + c + '"/>';
    },
    // золотой кракен на чёрном
    gry: (f, c) => {
      let arms = '';
      [[-15, 8], [-9, 14], [-3, 18], [3, 18], [9, 14], [15, 8]].forEach(([dx, dy], i) => {
        const x0 = 32 + dx * 0.35, y0 = 38, x1 = 32 + dx, y1 = 46 + dy, cx = x0 + dx * 0.9 * (i % 2 ? -0.4 : 0.6), cy = y0 + dy * 0.6;
        arms += 'M' + x0.toFixed(1) + ' ' + y0 + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' ';
      });
      return '<path d="' + arms + '" stroke="' + c + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
        '<path d="M22 32 C22 22 42 22 42 32 C42 38 37 41 32 41 C27 41 22 38 22 32 Z" fill="' + c + '"/>' +
        '<circle cx="28" cy="34" r="1.5" fill="' + f + '"/><circle cx="36" cy="34" r="1.5" fill="' + f + '"/>';
    },
    // зелёная рука на белом
    gar: (f, c) =>
      '<path d="M24 62 L24 44 C24 41 22 38 21 35 L19 31 C18 29 20 27.5 22 29 L26 34 L26 22 C26 19.5 29.5 19.5 29.5 22 L29.5 32 L29.5 18.5 C29.5 16 33 16 33 18.5 L33 32 L33 20 C33 17.5 36.5 17.5 36.5 20 L36.5 33 L36.5 24 C36.5 21.5 40 21.5 40 24 L40 45 C40 52 38 56 38 62 Z" fill="' + c + '"/>',
    // упрощённо: золотая ладья на чёрном (полный герб Хоаров сложнее — с вороном, сосной и виноградом)
    hoa: (f, c) =>
      '<path d="M14 46 H50 C48 53 43 57 32 57 C21 57 16 53 14 46 Z" fill="' + c + '"/>' +
      '<path d="M32 20 V46" stroke="' + c + '" stroke-width="2.2"/>' +
      '<path d="M33.5 22 C40 26 42 34 40 42 H33.5 Z M30.5 24 C25 28 24 35 25.5 42 H30.5 Z" fill="' + c + '" opacity=".85"/>' +
      '<path d="M14 46 C11 42 12 39 15 38 M50 46 C53 42 52 39 49 38" stroke="' + c + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
    // прочие дома — простое стропило
    oth: (f, c) => '<path d="M12 50 L32 28 L52 50 L46 50 L32 35 L18 50 Z" fill="' + c + '"/>'
  };
  FIG.dur = FIG.bar;
  App.sigilSVG = (house, x, y, w, extraClass) => {
    const h = HOUSES[house] || HOUSES.oth;
    if (!h.sigil) return ''; // у малых домов гербов нет
    const f = h.sigil.field, c = h.sigil.charge;
    const fig = (FIG[house] || FIG.oth)(f, c);
    const hgt = w * 76 / 64;
    return '<svg class="sigil' + (extraClass ? ' ' + extraClass : '') + '" x="' + (x || 0) + '" y="' + (y || 0) + '" width="' + w + '" height="' + hgt.toFixed(1) + '" viewBox="0 0 64 76" aria-hidden="true">' +
      '<defs><clipPath id="sg-' + house + '-' + Math.round(w) + '"><path d="' + SHIELD + '"/></clipPath></defs>' +
      '<path d="' + SHIELD + '" fill="' + f + '"/>' +
      '<g clip-path="url(#sg-' + house + '-' + Math.round(w) + ')">' + fig + '</g>' +
      '<path d="' + INNER + '" fill="none" stroke="' + c + '" stroke-opacity=".35" stroke-width="1"/>' +
      '<path d="' + SHIELD + '" fill="none" stroke="var(--hc)" stroke-width="2.4"/>' +
      '</svg>';
  };
})();
