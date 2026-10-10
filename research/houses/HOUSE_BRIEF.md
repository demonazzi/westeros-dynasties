# Brief: members of one great house for an interactive family tree (Russian UI)

The tree ("Династии Вестероса") shows Westeros noble families by generation. We are adding ONE house
(given in your task). You collect its members and write one JSON file. Accuracy of parentage and years matters most.
Never invent: if A Wiki of Ice and Fire (AWOIAF) does not state something, leave it empty and say so in `note`.

## Sources
- Primary: AWOIAF, https://awoiaf.westeros.org/index.php/<Page>. Start from the house page (`House_Tyrell` /
  `House_Greyjoy`): its "Members"/"Family tree"/"Historical members" sections, and `Category:House_<Name>`.
  Each character page has an infobox (Born, Died, Father, Mother, Spouse, Issue, Title) and a History section.
- Russian names: 7kingdoms.ru (https://7kingdoms.ru/wiki/<Русское_название>). Use its spelling of the name and the
  house (e.g. «Мейс Тирелл», «Бейлон Грейджой»). Find pages by searching 7kingdoms category pages
  (e.g. `https://7kingdoms.ru/wiki/Категория:Персонажи_дома_Тиреллов` or similar — verify the real title; the house
  article usually lists members). If a person has no 7kingdoms page, transliterate the way 7kingdoms does and mark
  `ru_src: "translit"`.
- Use the WebFetch tool for every page (the shell has no internet). Fetch in parallel batches (several WebFetch calls
  in one message). Ask WebFetch for infobox fields verbatim plus key facts with years.

## Who to include
- Every person with an AWOIAF page who is a member of the house by birth (surname of the house, or a bastard of a
  house member — e.g. "Flowers" bastards of a Tyrell father, "Pyke" bastards of a Greyjoy), from the LAST generation
  before Aegon's Conquest (the lord at the time of the Conquest, his parents if named, his siblings and children)
  up to 300 AC.
- Spouses who married INTO the house: include as a full person ONLY if they are major characters (e.g. Olenna
  Redwyne for Tyrells, Alannys Harlaw for Greyjoys); otherwise list them only inside the member's `spouses`.
- Exclude: TV/game-only characters, legendary/ancient figures more than one generation before the Conquest
  (Garth Greenhand, the Grey King, old kings), people of other houses who merely served the house.
- People already on the tree (do NOT re-create them; link to their ids): see `existing_ids.txt`
  (`id | house | Russian name | English name | born | died`). Notable ones for you:
  - Tyrell: `alerie` (Alerie Hightower, wife of Mace), `willas`, `garlan`, `loras`, `margaery` (children of Mace and
    Alerie — they ARE Tyrells; list them in your JSON with `existing: "<id>"` and only fill parents/spouses/years so we
    can re-attach them under Mace; do not write a new text for them), `renly`, `joffrey_b` (King Joffrey), `tommen`.
  - Greyjoy: `eddard` (Theon was his ward), `robb`, `sansa`, `jon` etc. as needed.
  - Targaryen and other kings/lords are in the file too — link by id when a house member married or was betrothed to one.

## Output — ONE JSON file (UTF-8), written with the Write tool to the path given in your task.
Write it EARLY (after the first ~10 people) and REWRITE it after every batch, so work is not lost if you are cut off.
```json
{
  "house": "tyr",
  "house_en": "Tyrell",
  "seat_ru": "Хайгарден", "motto_ru": "«Вырастая — крепнем»",
  "ru_category": "<7kingdoms url you used>",
  "people": [
    {
      "id": "mace",                    // short snake_case latin id, unique across existing_ids.txt; add _t / _g suffix on clashes
      "page": "Mace_Tyrell",           // AWOIAF slug
      "en": "Mace Tyrell",
      "ru": "Мейс Тирелл",             // 7kingdoms spelling: given name + surname
      "ru_src": "7k",                  // "7k" or "translit"
      "full": "",                      // only if an epithet distinguishes him: "Гарт Тирелл, Гарт Толстый"
      "al": [],                        // Russian epithets/aliases: ["Королева Шипов"]
      "fem": false,
      "father": "luthor",              // id (yours or existing) or "Русское Имя" text if not a person in the tree, or null
      "mother": "olenna",              // same
      "existing": null,                // existing id if this person is already on the tree
      "b": "≈256",                     // birth year as AWOIAF gives it: "256", "≈256", "256 или 257", null if unknown; BC = negative
      "d": null,                       // death year, same format; null if alive at 300 or unknown (say which in note)
      "alive300": true,                // true if alive at the end of the published books
      "k": "T",                        // "T" ordinary, "R" bastard
      "lord": "283–300",               // years as head of the house / Lord Paramount, if any
      "spouses": [                     // every marriage/betrothal AWOIAF states
        { "who": "alerie", "en": "Alerie Hightower", "note": "", "type": "m" }   // type m = marriage, b = betrothal, l = liaison; note: "≈275 г." if year known
      ],
      "unc": false,                    // true if the parentage is uncertain / disputed in AWOIAF
      "note": "",                      // short Russian note on anything uncertain (e.g. «год рождения на вики не указан»)
      "t": "…",                        // Russian description, see below (empty for `existing` people)
      "screen": null                   // see below
    }
  ],
  "gaps": [                            // places where the line is broken: unknown generations between known lords
    { "from": "lyonel_t", "to": "leo_t", "years": "≈ 50 лет", "note": "лорды Хайгардена между … в книгах не названы" }
  ]
}
```
Years: AC as numbers in strings; "≈" for approximate. If only "born in the reign of X" is known, estimate and mark "≈".

### Russian description `t` (the most visible part — it is a DRAFT the owner will edit)
3–4 sentences, 300–550 characters, plain neutral encyclopedic Russian, past tense; what the person is known for,
their role in events, key relationships. No meta phrases ("на вики", "AWOIAF", "в источниках"), no English words,
years as «в 130 году» / «в 2 году до Завоевания». Use 7kingdoms spellings for all names and places.
Example of the house style:
«Сын Хостера и наследник Риверрана, заботящийся о жителях своих земель, но не всегда понимающий общие планы
командования. Во время войны удерживал переправы против Тайвина, вызвав недовольство Робба. Его брак с Рослин Фрей
должен был восстановить союз, но свадьба превратилась в расправу. Остался пленником и позднее был вынужден сдать Риверран.»

### Screen adaptations `screen` (only for characters who appear in «Игра престолов» (2011–2019), «Дом Дракона»
(с 2022) or «Рыцарь Семи Королевств» (2026); otherwise null)
```json
{ "a": [["got", "Диана Ригг", "Diana Rigg"]], "df": "…" }
```
`a`: series id (got / hotd / kotsk), actor in Russian (as on Russian Wikipedia / Kinopoisk), actor in original.
`df`: 1–3 Russian sentences, the main differences of the show from the books (also a draft). Empty string if none notable.

## Reporting back
Reply with a short summary only: how many people, who was excluded and why, uncertain parentage, and broken lines
(gaps). Do not paste the JSON.
