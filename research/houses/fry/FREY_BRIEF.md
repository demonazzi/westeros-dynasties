# Brief: members of House Frey for an interactive family tree (Russian UI)

The tree ("Династии Вестероса") shows Westeros noble families by generation. We are adding House Frey of the Twins
(a vassal house of the Tullys). The work is split between several agents; YOU process only the pages listed in
your task. Accuracy of parentage and years matters most. Never invent: if A Wiki of Ice and Fire (AWOIAF) does not
state something, leave it empty and say so in `note`.

## Files (all in the folder given in your task)
- `ids.txt` — ALL Frey people being added, one per line: `id | AWOIAF title | AWOIAF page slug`. Use these ids for
  every Frey you reference (parents, spouses, children), even those processed by other agents. Never make new ids
  for people in this table.
- `existing_ids.txt` — people already on the tree (`id | house | Russian name | English name | born | died`).
  Link by id when a Frey married or was betrothed to one of them (e.g. `edmure` — Edmure Tully, `genna` — Genna
  Lannister, `robb`, `arya`, `hoster` — Hoster Tully, `catelyn`, `lysa`, `brynden_t` …). Check the file, do not guess.

## Sources
- Primary: AWOIAF, `https://awoiaf.westeros.org/index.php/<slug>`. Each character page has an infobox (Born, Died,
  Father, Mother, Spouse, Issue, Title) and a History section. Use the WebFetch tool (the shell has no internet);
  fetch several pages in parallel in one message. Ask WebFetch for the infobox fields verbatim plus key facts with years.
- Russian names: 7kingdoms.ru — ONLY for spelling, never as a source of facts. Pages: `https://7kingdoms.ru/wiki/<Имя_Фамилия>`
  (e.g. `Уолдер_Фрей`, `Лотар_Фрей`, `Рослин_Фрей`); the house article `https://7kingdoms.ru/wiki/Дом_Фреев` and the
  category of Frey characters list many members — fetch them first to collect spellings in bulk. If a person has no
  7kingdoms page, transliterate the way 7kingdoms does and set `ru_src: "translit"`.
  Disambiguated people get a distinguishing `full`, e.g. «Уолдер Фрей, сын Меррета», «Уолда Фрей, дочь Эдвина».

## Rules
- Every person in your list gets one entry. Lady Butterwell is a Frey by birth (daughter of Lord Frey); "Lord Frey"
  (id `fr_lord`) is Walder Frey's unnamed father — keep them.
- Spouses who married INTO House Frey (Perra Royce, Cyrenna Swann, Amarei Crakehall, Alyssa Blackwood, Sarya Whent,
  Bethany Rosby, Annara Farring, Joyeuse Erenford, and the wives of Walder's sons and grandsons) are NOT entries:
  list them only inside the Frey's `spouses`, as Russian text (7kingdoms spelling, e.g. «Перра Ройс»).
- Mothers: `mother` is the id of a Frey (rare) or the Russian name text of the mother (e.g. «Перра Ройс»), or null.
- If a parent is not in ids.txt and is unnamed (e.g. "a son of Lord Frey"), put Russian text describing them in
  `father`/`mother` (e.g. «брат лорда Фрея, отца Уолдера») and explain in `note`. Do not invent ids.
- `issue`: the children exactly in the order AWOIAF lists them in the person's infobox/family section (ids from
  ids.txt where possible, otherwise English names). This decides the order of siblings on the tree.
- Bastards (surname Rivers) have `k: "R"`.
- Years are AC numbers in strings; "≈" for approximate (e.g. "≈246"); "256 или 257" when AWOIAF gives two years; BC negative.
  If AWOIAF gives only a range ("born between 230 and 236"), write "≈233" and put the range in `note`.
- `alive300`: true if alive at the end of the published books (A Dance with Dragons / The Winds of Winter sample
  chapters only if AWOIAF treats them as canon events — say so in `note`).

## Output — ONE JSON file, path given in your task. Write it EARLY (after ~8 people) and REWRITE after every batch.
```json
{
  "part": 1,
  "people": [
    {
      "id": "lothar_fr", "page": "Lothar_Frey", "en": "Lothar Frey",
      "ru": "Лотар Фрей", "ru_src": "7k", "full": "", "al": ["Хромой Лотар"], "fem": false,
      "father": "walder_fr", "mother": "Алисса Блэквуд",
      "b": "≈256", "d": null, "alive300": true, "k": "T", "lord": "",
      "spouses": [ { "who": "Леонелла Леффорд", "en": "Leonella Lefford", "note": "", "type": "m" } ],
      "issue": ["tysane_fr", "walda_fr_lothar", "emberlei_fr", "leana_fr"],
      "unc": false, "note": "", "t": "…", "screen": null
    }
  ]
}
```
Field meanings as in the example: `al` — Russian epithets/aliases; spouse `type` m = marriage, b = betrothal,
l = liaison; spouse `note` — «299 г.» if the year is known (only the year, nothing else with «г.»);
`lord` — years as Lord of the Crossing if any; `unc` — parentage uncertain.

### Russian description `t` — a DRAFT the owner will edit
2–4 sentences, 150–500 characters (shorter for people with little information — never pad), plain neutral
encyclopedic Russian, past tense; who the person is (whose child, which line of Walder Frey's sprawling family),
their role in events (the Red Wedding, the siege of Riverrun, the Dance of the Dragons …), key relationships.
No meta phrases ("на вики", "AWOIAF", "в источниках", "в книгах не сказано" is OK only when it is the point),
no English words, years as «в 299 году». Use 7kingdoms spellings for all names and places
(Близнецы, Риверран, Красная свадьба, Сигард …). Example of the house style:
«Сын Хостера и наследник Риверрана, заботящийся о жителях своих земель, но не всегда понимающий общие планы
командования. Во время войны удерживал переправы против Тайвина, вызвав недовольство Робба. Его брак с Рослин Фрей
должен был восстановить союз, но свадьба превратилась в расправу.»

### Screen `screen` — only for characters who appear in «Игра престолов» (2011–2019), «Дом Дракона» (с 2022) or
«Рыцарь Семи Королевств» (2026); otherwise null:
`{ "a": [["got", "Дэвид Брэдли", "David Bradley"]], "df": "…" }` — series id (got / hotd / kotsk), actor in Russian
(as on Russian Wikipedia / Kinopoisk), actor in original; `df` — 1–3 Russian sentences, main differences of the
show from the books (a draft), "" if none notable. Verify the cast on the AWOIAF page or Wikipedia, do not guess.

## Reporting back
Reply with a short summary only: how many people written, uncertain parentage, anything you could not verify,
and any person in your list who turned out not to be a Frey by birth. Do not paste the JSON.
