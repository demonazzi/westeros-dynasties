# English version: files and format

This covers only the translation files. How to edit the data (names, relations, marriages, houses, dragons,
allegiances) is in the root [README.en.md](../../README.en.md).

The site is Russian first; the English version comes from dictionaries and parallel texts. It opens with `?lang=en`
or the **EN** button. Anything without an English string falls back to Russian.

| What | File |
|---|---|
| Interface: buttons, tabs, legends, tooltips | `src/i18n/en.json` |
| Short data strings: house names, words and seats, nicknames, notes on marriages, people without a card, allegiance reasons, gap notes | `texts/en/data.json` |
| Long texts about people, houses, dragons, screen-vs-book differences | `texts/en/people/<house>.md`, `vassals.md`, `dragons.md`, `screen.md`, `screen-dragons.md` |

Names of people and dragons come from the `en` field in `data/`, not from these files.
English texts are translations of the Russian ones; only a few dozen added later by an AI are marked `✎`.

## Interface — `src/i18n/en.json`

`"Russian string": "English"`. Edit only the values; the key is how the site finds the string.
```json
"Показать на древе": "Show on tree",
"видно {n} из {all}": "{n} of {all} shown",
"дом|дома|домов": "house|houses"
```
Placeholders in braces must stay (they may move). A key with three forms split by `|` is a Russian plural; the value
has two forms, singular and plural.

## Data strings — `texts/en/data.json`

```json
"Утёс Кастерли · «Услышь мой рёв!»": { "en": "Casterly Rock · \"Hear Me Roar!\"", "ctx": "дом lan.motto" }
```
Edit only `en`. `ctx` says where the string is used (person or house id and field); one translation covers every place.
An empty `en` shows the Russian string. Years in data are translated automatically and never appear here.

## Texts — `texts/en/**/*.md`

```markdown
### joy_hill · Joy Hill ✎
Text — lines under the heading.
```
- The heading `### id · Name` is technical: do not change the id; the name is filled in from `en`. Sections are created
  by `node tools/data.js --sync`; do not add, delete or reorder them by hand.
- `✎` at the end of the heading marks an AI draft, labelled on the site; remove it and the label disappears.
- Plain text, no Markdown. One paragraph for a person; houses may have several, separated by a blank line.
- An empty section shows the Russian text with a note that there is no translation yet.

## After editing

```
node tools/data.js --check     # texts and data/ match
python3 tools/build.py
node tools/check-i18n.js       # English switches on and picks up translations
```

## Where new strings come from

```
node tools/i18n-keys.js        # new interface strings → src/i18n/en.json (existing translations are kept)
node tools/i18n-data.js        # new data strings → texts/en/data.json
node tools/data.js --sync      # new people, houses, dragons → empty sections in texts/ and texts/en/
```
`i18n-keys.js` also lists "composite" labels where Russian is glued to a name or a year; build those in code with
`App.t('… {name} …', { name })`.
