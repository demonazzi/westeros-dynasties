# Династии Вестероса

Интерактивное древо Таргариенов и великих домов Вестероса: древо по поколениям, драконы, хронология,
родословная, список и вассалитет. Одна страница на d3; исходники разложены по файлам и собираются в один HTML.

## Сборка и проверки

```
python3 tools/build.py            # → dist/artifact.html (для публикации) и dist/targaryen-tree.html (отдельный файл)
node tools/validate.js            # данные: ссылки, корни, дубликаты
node tools/smoke.js               # все вкладки в jsdom
node tools/check-scale.js         # шкала времени
node tools/check-labels.js        # подписи и пунктиры ни на что не наезжают
node tools/check-links.js         # связи между домами
node tools/check-vassal.js        # вкладка «Вассалитет»
node tools/shot.js имя 1440 900 "js" dark   # скриншот в shots/
```
Проверки в браузере используют Playwright с Chromium (`/opt/npm-tools/node_modules/playwright`).

## Устройство

- `src/data-meta.js` — полосы домов (BANDS), дома и гербы (HOUSES), пропуски поколений (GAPS), пол, запросы к вики.
- `src/data-people.js`, `src/data-house-*.js` — люди. Поля описаны в шапке `data-meta.js` (перед PEOPLE).
- `src/data-extra-*.js` — драконы и экранизации.
- `src/data-vassals.js` — собирается `node tools/vassals-build.js` из `research/vassal/*.json`.
- `src/app-core.js` — ядро: данные, раскладка древа, карточка, поиск, история.
- `src/app-mod-*.js` — вкладки и модули (хронология, драконы, родословная, список, вассалитет, шкала, линзы, фильтры…).
- `src/styles.css`, `src/body.html` — стили и разметка.

## Источники

- Факты — A Wiki of Ice and Fire (awoiaf.westeros.org).
- Русские имена и названия — 7kingdoms.ru (только написание, не источник фактов).
- `research/` — сырой сбор: `vassal/` для вкладки «Вассалитет», `houses/` для домов Тиреллов и Грейджоев
  (`gen_houses.py` — одноразовый генератор, после него файлы домов правились руками).

## Тексты и черновики Claude

`ai: 1` у человека — описание `t` написал Claude (черновик); у записи в `EXTRA.screen` — отличия от книг `df`.
В карточке такие тексты помечены «✎ Черновик Claude», линза «Тексты Claude» подсвечивает их на древе.
Правки из присланного файла:
```
node tools/texts-extract.js /путь/к/правленому.html /путь/edited.json
node tools/texts-merge.js /папка/с/edited.json     # переносит t и df в src; у изменённых снимает ai: 1
```
