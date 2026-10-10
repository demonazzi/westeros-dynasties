# Brief: noble houses of one region and whom they actually served, ~10 BC – 300 AC

This data feeds a "Vassalage" tab in an interactive Westeros map of houses. The user moves a year
slider and sees which house is sworn to whom at that moment (FACTUAL allegiance, including wartime
side changes). Accuracy of the liege and its changes over time matters most. Do not invent: record
only what A Wiki of Ice and Fire (AWOIAF) states; when unsure, leave the field empty and say so in `note`.

## Sources
- Primary: AWOIAF, https://awoiaf.westeros.org/index.php/<Page> — the region category page
  `Category:Houses_from_<Region>` lists every house page of the region; each house page has an
  infobox (Seat, Region, Overlord(s) with book tags like "(AGOT)", "(ADWD)", Founded, Extinct) and a
  History section with war sides.
- Russian names: 7kingdoms.ru. The category `https://7kingdoms.ru/wiki/Категория:Дома_<регион>` lists
  houses as plural Russian page titles (e.g. "Болтоны", "Флинты во Вдовьем Дозоре"). For the North it is
  `Категория:Дома_Севера`. Find the right category for your region (e.g. Дома_Речных_земель,
  Дома_Долины, Дома_Западных_земель, Дома_Простора, Дома_Штормовых_земель, Дома_Дорна,
  Дома_Железных_островов, Дома_Королевских_земель — verify the exact title; open the region article if needed).
  Match each English house to its Russian title. If a house is not on 7kingdoms.ru, transliterate it the
  way 7kingdoms does (plural "-ы"/"-и", e.g. Mooton → Мутоны) and mark `ru_src: "translit"`.
- Use the WebFetch tool for every page (the shell has no internet). Fetch house pages in parallel batches
  (several WebFetch calls in one message). Ask WebFetch for the infobox fields verbatim plus every
  sentence about allegiance, rebellions, wars, extinction, attainder, with years.

## Which houses to include
- Every house page in the AWOIAF region category that existed as a noble/landed house at any time
  between 10 BC and 300 AC, or whose period is unknown but is mentioned in the novels, The World of Ice
  and Fire, Fire & Blood or the Dunk and Egg novellas.
- Exclude: anything from games/TV/Telltale ("(Telltale)", adaptation-only), legendary or ancient houses
  extinct long before the Conquest (e.g. Barrow Kings, Greystark, Marsh Kings), wildlings/peoples beyond
  the Wall (Thenn, Magnar), mountain clans that are not houses, Essos houses.
- Cadet branches with their own page are separate houses (e.g. "Flint of Widow's Watch").

## Output — write ONE JSON file (UTF-8) with the Write tool to the path given in your task
```json
{
  "region": "north",
  "region_ru": "Север",
  "ru_category": "https://7kingdoms.ru/wiki/Категория:Дома_Севера",
  "houses": [
    {
      "en": "Bolton",                       // AWOIAF page title without "House " (e.g. "Flint of Widow's Watch")
      "page": "House_Bolton",               // AWOIAF page slug
      "ru": "Болтоны",                      // plural Russian title from 7kingdoms.ru
      "ru_src": "7k",                       // "7k" or "translit"
      "seat_en": "Dreadfort",               // null if unknown
      "seat_ru": "Дредфорт",                // 7kingdoms-style Russian name of the seat, null if unknown
      "great": false,                       // true only for the ruling/great house of the region (see below)
      "from": null,                         // year the house came into being IF after 10 BC (e.g. raised in 1 AC), else null
      "to": null,                           // year it became extinct / was attainted / lost its lands IF before 300 AC, else null
      "liege": "Stark",                     // direct overlord as stated in the infobox for the main period (earliest tag);
                                            // the en name of another house (any region), or a special id below
      "allegiance": [                       // every FACTUAL change of direct overlord AWOIAF states, chronological
        { "from": 130, "to": 131, "liege": "greens", "why": "лорд Манфрид перешёл к зелёным", "src": "House_Mooton" }
      ],
      "note": ""                            // short Russian note if something is uncertain or special
    }
  ]
}
```
Years: AC as positive integers, BC as negative (2 BC = -2). `from`/`to` inclusive years; `to` null = still
in force at 300 AC. If AWOIAF gives no year, infer the year of the named event from the war periods below
and say so in `why` ("год по началу Танца").

### Special liege ids (use exactly these)
- `throne` — the Iron Throne / the reigning king (from Aegon's landing, 2 BC). Houses of the crownlands
  sworn directly to the king use `throne`. In rebellions, the loyalist side is `throne`.
- `blacks` / `greens` — Rhaenyra's / Aegon II's side in the Dance of the Dragons (129–131 AC).
- `blackfyre` — Daemon Blackfyre's side in the First Blackfyre Rebellion (196 AC); later Blackfyre
  risings (212, 219, 236, 260) also `blackfyre` with their year.
- `rebels` — Robert Baratheon's side in Robert's Rebellion (282–283 AC).
- `robb` — Robb Stark, King in the North and the Trident (298–299 AC).
- `renly` — King Renly (298–299); `stannis` — King Stannis (298–300).
- `balon` — Balon Greyjoy as king (289 and 299); `euron` — Euron Greyjoy as king (300).
- `aegon_young` — "Young Griff" Aegon and the Golden Company (300).
- `neutral` — openly stayed out of a war; `independent` — sovereign / no liege.
- Before the Conquest use the king's house: `Stark`, `Arryn`, `Lannister`, `Gardener`, `Durrandon`,
  `Hoare` (Kingdom of the Isles and the Rivers), `Martell` (Dorne), `Targaryen` (Dragonstone).

Per-house wartime sides belong in `allegiance` as segments with the special ids, e.g. a riverlands house
that fought for the greens: `{ "from": 129, "to": 131, "liege": "greens" }`; one that kept its oath to
its lord need not be listed (the lord's side is handled separately). Record every switch, siege
surrender, attainder, change of lord paramount (e.g. Riverlands houses under House Baelish or Frey after
299, northern houses under House Bolton after the Red Wedding).

### Great houses
Mark `great: true` only for: Stark, Arryn, Lannister, Tully, Tyrell, Baratheon (of Storm's End),
Martell, Greyjoy, Targaryen, and the pre-Conquest royal houses Gardener, Durrandon, Hoare. For them just
fill names/seat and `liege: null`; their top-level allegiance is researched separately.

## Reporting back
After writing the file, reply with a short summary only: counts (pages in category, included, excluded
and why), houses where the liege/changes were unclear, and anything the coordinator should check.
Do not paste the JSON.
