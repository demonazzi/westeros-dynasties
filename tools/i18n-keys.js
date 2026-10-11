/* Ключи перевода интерфейса: собирает русские строки и дописывает новые в src/i18n/<язык>.json с пустым переводом
   (готовые переводы не трогает, пропавшие из исходников — убирает). Откуда берутся строки:
   · src/body.html — текст элементов и атрибуты title, placeholder, aria-label;
   · src/*.js — App.t('…'), подписи row('…'), целые подписи внутри разметки в строках ('>…<'), атрибуты title="…" и т. п.
   Данные (имена, биографии) сюда не попадают — они переводятся отдельно, через поле en и тексты.
   node tools/i18n-keys.js [язык=en] */
const fs = require('fs'), path = require('path');
const { JSDOM } = require(path.join(__dirname, 'node_modules', 'jsdom'));
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src');
const lang = process.argv[2] || 'en';
const CYR = /[А-Яа-яЁё]/;
const keys = new Set();
const add = s => { s = (s || '').replace(/\s+/g, ' ').trim(); if (s && CYR.test(s) && !/' \+|\+ '/.test(s) && s.length < 400) keys.add(s); };

// разметка
const doc = new JSDOM(fs.readFileSync(path.join(SRC, 'body.html'), 'utf8')).window.document;
const w = doc.createTreeWalker(doc.body, 4 /* SHOW_TEXT */);
for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest('script,style')) add(n.nodeValue);
doc.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el => ['title', 'placeholder', 'aria-label'].forEach(a => add(el.getAttribute(a))));

// код
const unq = s => s.replace(/\\'/g, "'").replace(/\\n/g, '\n');
fs.readdirSync(SRC).filter(f => f.endsWith('.js')).forEach(f => {
  const js = fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of js.matchAll(/App\.t\(\s*'((?:[^'\\]|\\.)*)'/g)) add(unq(m[1]));
  for (const m of js.matchAll(/\brow\(\s*'((?:[^'\\]|\\.)*)'/g)) add(unq(m[1]));
  // подпись целиком внутри тега: в одной строке кода и без признаков кода (; { } = & | !)
  for (const m of js.matchAll(/>([^<>'"+\n;{}=&|!]*[А-Яа-яЁё][^<>'"+\n;{}=&|!]*)</g)) add(m[1]);
  for (const m of js.matchAll(/\b(?:title|placeholder|aria-label)="([^"<>]*[А-Яа-яЁё][^"<>]*)"/g)) add(m[1]);
});

const file = path.join(SRC, 'i18n', lang + '.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const out = {};
[...keys].sort((a, b) => a.localeCompare(b, 'ru')).forEach(k => { out[k] = old[k] || ''; });
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
const done = Object.values(out).filter(Boolean).length;
const gone = Object.keys(old).filter(k => !(k in out)).length;
console.log(lang + ': ключей ' + keys.size + ', переведено ' + done + (gone ? ', убрано устаревших ' + gone : '') + ' → ' + path.relative(ROOT, file));
