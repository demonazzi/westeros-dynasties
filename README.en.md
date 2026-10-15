# Westeros Dynasties

An interactive family tree of the Targaryens and the houses of Westeros: 12 great and 34 minor houses, 1,031 people,
27 dragons. Tabs: tree, dragons, timeline, ancestry, list, allegiances, house cards. Russian and English.

Русская версия: [README.md](README.md). The project was written in Russian first: code comments, `data/README.md`
and the source strings are in Russian; this file covers what you need to edit it.

The page is a single HTML file with no server: `index.html` in the root (published by GitHub Pages). Everything is
inside the file, d3 and fonts included: the page loads nothing from the network and works offline.

## Embedding

```html
<iframe src="https://demonazzi.github.io/westeros-dynasties/?lang=en#h:stk" style="width:100%;height:800px;border:0"></iframe>
```

| address | opens |
|---|---|
| `#robb` | a person on the tree (id from `data/people/*.json`) |
| `#h:stk` | a house card (house code from `data/meta.json`) |
| `#dragons`, `#d:balerion` | dragons, a specific dragon |
| `#t:robb`, `#k:robb`, `#l:robb` | timeline, ancestry, list — with a person selected |
| `#v:130` | allegiances in 130 AC |
| `?lang=en`, `?lang=ru` | language |

## Build and checks

Requires Python 3 and Node.js 18+.

```
python3 tools/build.py        # → index.html, dist/targaryen-tree.html, dist/artifact.html
```
The build stops and says what is wrong if data and texts do not match.

Checks (for the browser ones, once: `cd tools && npm install && npx playwright install chromium`):
```
node tools/validate.js        # data: references to people, band roots, duplicates
node tools/data.js --check    # data/ and texts/ match
node tools/smoke.js           # every tab opens; output must contain "errors": []
node tools/check-labels.js    # labels and gap lines do not overlap cards
node tools/check-time.js      # timeline: lifespans and marriages within bounds
node tools/check-minor.js     # minor houses and the filter
node tools/check-vassal.js    # Allegiances tab
node tools/check-house.js     # house card
node tools/check-i18n.js      # English version
node tools/check-tips.js      # tooltips on lines
node tools/check-export.js    # "Save as image": PNG and SVG, screen and branch
node tools/check-scale.js     # time scale (run on its own)
node tools/check-links.js     # lines between houses: hover, click, passing through other cards (≈10 minutes)
```

## What is where

```
data/meta.json            houses, tree bands, gap lines, order of people files
data/people/<house>.json  people (fields: data/README.md, in Russian; the main ones are below)
data/dragons.json         dragons
data/screen.json          actors in the adaptations
data/vassals.json         allegiances — built from research/vassal/*.json, do not edit by hand
texts/                    long texts (Markdown): people/<house>.md, vassals.md (houses), dragons.md, screen*.md
texts/en/                 the same in English + data.json (translations of short strings from data/)
src/                      code: app-core.js (tree, card, search), app-mod-*.js (tabs and modules),
                          app-mod-route.js (paths of lines between houses),
                          app-mod-sigils.js (sigils), styles.css (house colours), i18n/en.json (English interface),
                          vendor/d3.min.js and fonts/ — embedded into the page at build time
tools/                    build, checks, text and translation sync
research/                 raw collection and one-off scripts; do not re-run (except research/vassal/)
```

`data/meta.json` is hand-formatted, one record per line: edit it in a text editor, do not re-save it through a JSON
formatter. `data/people/*.json` can be edited either way.

## How to change things

After any edit: `node tools/validate.js`, `python3 tools/build.py`, open `dist/targaryen-tree.html`.
Russian is the source language: `name`, notes and texts in `data/` are Russian; English comes from `en` fields,
`texts/en/` and the translation files.

### Names

In `data/people/<house>.json`: `name` — name on the card (Russian), `full` — full name with an epithet or title,
`en` — English name (shown in the English version and used to find the person on A Wiki of Ice and Fire),
`al` — other names for search, `wiki` — exact wiki page title if `en` is ambiguous.
Then `node tools/data.js --sync` updates the names in the text headings.

### Parents and place on the tree

- `p` — whom the person hangs under on the tree (id). To move them, change `p`.
- `par` — both parents: an id, or plain text for a parent without a card; notes in brackets after an id:
  `["aegon4 (по слухам)", "Лукас Лотстон (официально)", "falena"]` (по слухам = rumoured, официально = officially).
- `rp` — a rumoured parent from another house (drawn as a separate line); `unc: 1` — unconfirmed parentage
  (dashed line to the parent).
- Children are drawn in the order of records in the file.
- A person with no parent on the tree is a band root: remove `p` and add them to `data/meta.json` → `bands` →
  their house → `roots`: `["id", column]`. The column is the generation, roughly the birth year:

  | column | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 19 | 20 |
  |---|---|---|---|---|---|---|---|---|---|
  | year | −20 | 34 | 88 | 123 | 172 | 198 | 245 | 269 | 286 |

### Marriages, betrothals, affairs

`sp`: `[[who, note, type]]`. "Who" is an id (then a line is drawn) or a name as text (a spouse without a card).
Type: `m` — marriage (default), `b` — betrothal, `l` — affair. "N г." in the note is read as the year of marriage.
A person's card lists only their own `sp`, so record the marriage on both spouses. `wd` — wards (list of ids).

### Years

`b` — birth, `d` — death; counted from the Conquest, negative before it. Allowed: `"256–263"`, `"245/246"`
(one of two), `"не ранее 101"` (in or after), `"не позднее 283"` (in or before), `"≈286"`, `"в детстве"` (in childhood),
`"в младенчестве"` (in infancy), `"при рождении"` (at birth). Without a death year: `alive: 1` — alive at the end of
the books; `ls: 280` — the last year the person is known to be alive.

### Gaps in a line

A dotted line between two people of one house when the lords in between are not named — `data/meta.json` → `gaps`:
`{"house":"stk","from":"id","to":"id","years":"≈ 40 лет","note":"label"}`. `from` must be to the left of `to`;
`node tools/check-labels.js` reports a line crossing another card.

### Allegiances (who served whom)

The source is `research/vassal/<region>.json`, array `houses`. Per house: `en`, `page` (wiki page; the house id is
made from it: `House_Mallister` → `mallister`), `ru`, `seat_en`, `seat_ru`, `great`, `from`/`to` (years the house
existed), `liege` — default liege (English house name or `throne`), `allegiance` — periods with a different liege:
`{"from":129,"to":131,"liege":"blacks","why":"reason (Russian)"}`. Special lieges: `throne`, `blacks`, `greens`,
`blackfyre`, `rebels`, `robb`, `renly`, `stannis`, `balon`, `euron`, `aegon_young`, `neutral`, `independent`.
Claimants, great houses and milestones are in `research/vassal/top.json`. After editing:
```
node tools/vassals-build.js   # rebuilds data/vassals.json and lists anything it could not resolve
node tools/data.js --sync     # text sections for new houses in texts/vassals.md
```

### A new person

1. Add a record to the right group in `data/people/<house>.json`: at least `id` (Latin, unique), `name`, `en`,
   `hs` (house code; may be omitted for Targaryens), `k` (`T` — regular, `K` king, `C` claimant, `R` bastard), `p`, `par`.
2. `node tools/data.js --sync` — empty text sections appear in `texts/people/<house>.md` and `texts/en/people/<house>.md`.
3. `node tools/i18n-data.js` — new Russian strings (names without cards, notes) go to `texts/en/data.json` with an
   empty `en`; fill it in.

### A new house

1. `data/meta.json` → `houses`: `"code": {"v":"house id in allegiances","name":"Дом …","band":"band label",
   "motto":"Замок · «Девиз»","sigil":{"field":"#field colour","charge":"#charge colour"}}`.
2. Same file → `bands`: `{"house":"code","liege":"great house code","roots":[["id",column]]}` (`liege` only for a minor
   house, whose band takes the liege's colour), and add the code to `people_files`.
3. `data/people/code.json`: `{"title":"…","about":"…","groups":[{"title":"…","people":[…]}]}`.
4. Sigil: a function in the `FIG` map in `src/app-mod-sigils.js` (draws the charge inside a 64×76 shield); without
   one the house gets a plain shield. A great house's band colour is the `--code` and `--code-tint` variables at the
   top of `src/styles.css` (in three places: the base and two dark variants).
5. If the house is not in the allegiances yet, add it to `research/vassal/<region>.json` and run `node tools/vassals-build.js`.
6. `node tools/data.js --sync`, `node tools/i18n-data.js` (translate the name, band label and words), build,
   `node tools/check-minor.js`, `node tools/check-labels.js`.

### Texts

Texts live in `texts/` (Russian) and `texts/en/` (English); the format is in `texts/en/README.md`. A section starts
with `### id · Name`; leave that line as is and write below it. `✎` at the end of that line marks an AI-written draft
(labelled on the page); remove it once the text has been checked.

### Interface labels

In code through `App.t('Russian string')`. After changes `node tools/i18n-keys.js` adds new strings to
`src/i18n/en.json`; put the English there (the key is the Russian string, the value the English one).

### Dragons

`data/dragons.json`: `origins` — where dragons come from (`{"id","name","y"}`), `groups` — groups of dragons,
`fights` — fights `{"a","b","y","place","both"}` (`a`, `b` — dragon ids, `both: 1` — both died).

Dragon fields: `id`, `name`, `en`, `sex` (`f`/`m`), `o` — origin (id from `origins`), `par` — parent dragon;
`h` — year hatched (`ha: 1` — approximate), `hl` — its label; `d` — year of death (the fraction only orders events
within one year), `dl` — its label, `dk` — year of death when the exact one is unknown, `dx` — last year known alive,
`alive: 1` — alive at the end of the books; `r` — riders: `[id or name, from year, to year, how, 1 — start approximate]`;
`bond` — a bond without flight: `[id, how]`; `col` — two colours, main and accent; `cs` — where the colouring comes
from (`book`, `art` — artist with Martin's team, `ill` — illustrations, `name` — from the name);
`colour`, `size` — in words; `ev` — events `[year, text]`.

A person's `dr` field is the dragon label on their card. A new dragon: add a record to a group, then
`node tools/data.js --sync` (sections in `texts/dragons.md` and `texts/screen-dragons.md`) and `node tools/i18n-data.js`.

### Adaptations

`data/screen.json`: `series` — the shows (`got`, `hotd`, `kotsk`), `groups` — roles `{"id": person id, "a": [[show, actor in Russian,
actor's original name, note]]}`. Screen-vs-book differences are texts in `texts/screen.md` (people) and
`texts/screen-dragons.md` (dragons).

## Where the data comes from

Facts — A Wiki of Ice and Fire (awoiaf.westeros.org), after the books and official histories. Russian names —
7kingdoms.ru. English texts were written separately, not translated from the Russian ones; only a few dozen added later by an AI are marked `✎`.

## License

[MIT](LICENSE): the code, data, texts and the built page may be used, changed and redistributed in any way, including
commercially, as long as the attribution is kept — "© 2026 demonazzi" and the license text (for an embedded page,
a link to this repository is enough).

The world, characters and names of A Song of Ice and Fire belong to George R. R. Martin; the license covers only the
work of this project. The embedded d3 7.8.5 (`src/vendor/d3.min.js`, ISC license) and the Alegreya, Alegreya Sans
and Forum fonts (`src/fonts/`, SIL Open Font License, license texts alongside) are under their own licenses.
