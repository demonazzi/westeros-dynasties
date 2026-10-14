# Brief: death / alive status from A Wiki of Ice and Fire

You get a JSON list of characters (file `research/death/todo/part_NN.json`). Our tree has **no death year** for them.
For each one, read their page on A Wiki of Ice and Fire and report what the wiki says about their death,
or whether they are alive at the end of the published books.

## Save as you go

Usage limits can stop you at any moment. **Rewrite the output file after every 5 entries** with all entries done so far
(valid JSON array, input order). If the output file already exists when you start, keep its entries and continue
from the first id that is missing. A partial file is expected and fine.

## How to read a page

- URL: `https://awoiaf.westeros.org/index.php/<page with spaces as _>`, `page` field of the entry.
  Do **not** use `action=raw` (refused by robots.txt).
- Short titles are often disambiguation pages or fail ("Aerys", "Baelon", "Maegon", "Daemion"): use the full title,
  e.g. `Maegon_Targaryen`, `Baelon_Targaryen_(son_of_Aerys)`, `Loreon_Lannister_(son_of_Jason)`.
  A disambiguation page lists the candidates — pick the one matching `born` / `parents` / `spouses`.
- If a fetch fails, retry once with a slightly different title before giving up.
- If `page` is empty (unnamed people like "Son", "Lord Tarly"), open a parent's or spouse's page
  (`parents`, `spouses`) and look for what is said about this person there.
  If nothing is said, return `status: "unknown"`.
- If the page is missing or is a different person (check `born`, `parents`, `spouses`, `about`),
  try the obvious alternative title (e.g. `Name Surname (son of X)`); otherwise `unknown` with a note.
- **Books and the official histories only** (Fire & Blood, The World of Ice & Fire, The Rise of the Dragon, the novellas,
  appendices, released The Winds of Winter sample chapters). Ignore every "TV series" / "House of the Dragon" section.
- Do not guess and do not use your own memory of the books as the answer — only what the wiki page states.
  If you remember something the page does not say, leave it out.

## What to return

Write `research/death/done/part_NN.json` (same NN), a JSON array, **one object per input entry, same order, same ids**:

```json
{
  "id": "doran",
  "url": "https://awoiaf.westeros.org/index.php/Doran_Martell",
  "died": "",
  "status": "alive",
  "year": null,
  "kind": null,
  "year2": null,
  "last_alive": 300,
  "note": "Alive in ADWD; receives news of Quentyn's death."
}
```

- `died` — the infobox **Died** field copied verbatim (e.g. `"In 260 AC"`, `"After 260 AC"`, `"In or before 283 AC"`,
  `"In 281 AC or 282 AC"`, `"In childhood"`). Empty string if the infobox has no Died field.
- `status`:
  - `"dead"` — the page says the person died (Died field, or the text clearly says they died / were killed / were executed);
  - `"alive"` — the person is alive as of the latest published events (end of A Dance with Dragons /
    A Feast for Crows / released Winds sample chapters): they appear or are mentioned as living in the main
    series (298–300 AC) and no death is reported. Main-series characters with no Died field are usually `"alive"`;
  - `"unknown"` — a historical person whose fate the wiki does not give, or nothing found.
- `year` — the AC year of death if the page gives one (also for bounds), else `null`. BC years are negative.
- `kind` — how `year` is meant: `"exact"` (in that year), `"before"` (in or before / by / no later than),
  `"after"` (after / in or after / no earlier than), `"approx"` (circa, around), `"or"` (one of two years — put the second in `year2`),
  `"young"` (died in infancy / childhood, no year). `null` when there is no year and not young.
- `last_alive` — the latest AC year in which the page shows the person still alive (an event they took part in,
  a letter, a wedding, a child born to them). For `alive` people use 300. `null` if the page gives nothing datable.
- `note` — one short English sentence: the evidence (what the page says), or why unknown. Mention any clear
  conflict with our data (`born`, `parents`, `spouses`) here.

Keep the output strictly valid JSON. When finished, reply with one line: counts of dead / alive / unknown and any
entries you could not identify.
