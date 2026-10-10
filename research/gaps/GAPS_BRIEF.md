# Brief: find gaps in a family tree (House Targaryen), Russian-language web page

The tree "Династии Вестероса" shows noble families of A Song of Ice and Fire. Until now only people who have their
own page on A Wiki of Ice and Fire (AWOIAF) got a card. That leaves holes: unnamed sons and daughters, children who
died in infancy or were stillborn, unnamed bastards, groups like "two daughters". The owner wants these gaps filled
with placeholder cards ("Сын", "Дочь", "Дети"…), strictly following AWOIAF. You audit a list of people and report
what is missing. You do NOT edit any project files.

## Input (folder given in your task)
- Your chunk file: one line per person already on the tree:
  `id | AWOIAF page title | Russian name | род.: parents | b= d= | супруги: spouses | дети: children`
  (`дети` lists the children the tree already shows for this person, with ids in brackets.)
- `targ_people.txt` — the whole Targaryen band in the same format (to know who exists elsewhere in the band).
- `existing_ids.txt` — every person on the tree (all houses): `id | house | Russian name | English name | born | died`.

## What to do for EVERY person in your chunk
1. Fetch the AWOIAF page (`https://awoiaf.westeros.org/index.php/<title with _>`) with WebFetch (the shell has no
   internet). Fetch several pages in parallel per message. If the title gives "(нет страницы)" or a group, skip fetching
   but still consider what you learned from relatives' pages.
2. Read: the infobox (Father, Mother, Spouse, Issue), the "Family" section diagram (the text extraction of AWOIAF
   family-tree diagrams is flattened — ask WebFetch to list every box in reading order, including "Son", "Daughter",
   "Unknown", "Stillborn", "Sons", "Two daughters", "Issue", years), and the History text (look for sentences like
   "a stillborn son", "died in the cradle", "three daughters", "fathered several bastards").
3. Compare with the `дети` already on the tree. Report every child of this person that AWOIAF states but the tree
   lacks — named or unnamed, legitimate or bastard, including stillborn and died-in-infancy. One record per child,
   or one group record when AWOIAF gives only a group ("two daughters", "several bastards", "Issue").
   Also report parentage that contradicts AWOIAF (our parents vs AWOIAF's), if any.
4. Do NOT report: people who already exist anywhere on the tree (check existing_ids.txt by English name and by role —
   e.g. a "daughter" who is in fact an existing named person); spouses who married into the family (they stay as text);
   ancestors before Aenar the Exile; anything only in TV shows, games or semi-canon; speculation by fans.
   If AWOIAF hedges ("possibly", "might have been"), report it with `"unc": true` and quote the hedge.

## Output — ONE JSON file, path given in your task. Write it early and rewrite after every batch.
```json
{
  "chunk": 1,
  "checked": ["aenar", "daenys", "..."],            // every id from your chunk you checked
  "add": [
    {
      "parent": "viserys1",                         // tree parent id (the father if he is on the tree, otherwise the mother)
      "other_parent": "aemma",                      // id, or Russian text («служанка в Утёсе Кастерли»), or null
      "kind": "son",                                // son | daughter | child | sons | daughters | children (group)
      "count": null,                                // number for groups if stated ("two daughters" → 2), else null
      "name_en": "",                                // English name if the child is named, else ""
      "name_ru": "",                                // Russian name (7kingdoms.ru spelling) if named, else ""
      "full_ru": "Сын Визериса I и Эммы Аррен",     // Russian full label in the genitive; unique and clear
      "b": "105", "d": "105",                       // years AC as strings if stated; "в младенчестве" / "в детстве" /
                                                    // "мертворождён" for such deaths; null if unknown
      "k": "T",                                     // "T" legitimate, "R" bastard
      "order_after": "rhaenyra",                    // the existing sibling this child comes right after in AWOIAF order,
                                                    // or "first" if it is the eldest, or null if unknown
      "unc": false,
      "evidence": "AWOIAF Viserys I, Family: '... a stillborn son ...'",   // short verbatim quote + page
      "t": "…"                                      // 1–2 sentence Russian draft description (see below)
    }
  ],
  "parentage_issues": [ { "id": "…", "ours": "…", "awoiaf": "…", "evidence": "…" } ],
  "notes": "anything uncertain"
}
```
### Russian text `t` (a draft the owner will edit)
1–2 sentences, plain encyclopedic Russian, past tense: whose child, what is known (born/died, how), and that the name
is not given if so. No meta phrases ("на вики", "AWOIAF"), no English words, years as «в 105 году». Use 7kingdoms
spellings for names (Визерис, Эймма Аррен, Рейенира, Деймон, Лейна Веларион, Эйгон IV …).

## Reporting back
Reply with a short summary only: how many people checked, how many additions (by kind), uncertain ones, and any
parentage issues. Do not paste the JSON.
