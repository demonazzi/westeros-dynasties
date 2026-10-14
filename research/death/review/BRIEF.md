# Brief: check 14 claims against A Wiki of Ice and Fire

For each item open the page(s) with WebFetch (`https://awoiaf.westeros.org/index.php/<Title>`, never `action=raw`)
and answer the question **with a short verbatim quote from the page** (infobox field or sentence).
Books and official histories only, ignore TV sections, do not answer from memory.

Write `research/death/review/out.json`: an array of `{ "n": 1, "id": "...", "answer": "...", "quote": "...", "url": "..." }`,
rewritten after every 3 items. Reply at the end with one line per item.

1. `alyn` — page `Alyn_Velaryon` (or `Alyn_Velaryon,_Oakenfist`). Infobox **Father** field verbatim. How does the text describe who his father was (Laenor officially? Corlys rumoured?). Who was his mother?
2. `boremund` — `Boremund_Baratheon`. Infobox **Born** verbatim.
3. `trystane` — `Trystane_Martell`. Infobox **Born** verbatim.
4. `tymond` — `Tymond_Lannister`. Infobox **Born** and **Father** verbatim. Then `Lyman_Lannister`: **Died** verbatim, and does that page list Tymond as his son/heir? Who succeeded Lyman as Lord of Casterly Rock?
5. `lucerys_v` — `Lucerys_Velaryon_(master_of_ships)`: any spouse? Then search for a page `Renniffer_Longwaters` (or the `House_Longwaters` page): whom did Renniffer marry, and is that husband this Lucerys?
6. `titus_u` — `Titus_Peake_(son_of_Unwin)`: what exactly happened to him at/after the Battle of the Honeywine, and how did he die?
7. `mervyn` — `Mervyn_Flowers`: how did he die (135 AC)? Was he accused in a conspiracy / plot? Quote the relevant sentences.
8. `clarice` — `Clarice_Osgrey`: what was her role, and how did it end — was she removed/dismissed by Aegon III or someone else? Quote.
9. `ben_pl` — `Ben_Plumm`: what happens to him in The Winds of Winter (sample chapters)? Does Tyrion persuade him to switch sides back to Daenerys? Quote.
10. `unwin_son2` — `Unwin_Peake`: the sentence(s) about his second son's death (drowned? sailing accident?).
11. `denys_oak` — `Denys_Oakheart`: what happened between him and the Silver Fool / Prince Baelon at the 73 AC tourney at Old Oak (unhorsed? defeated?). Quote.
12. `rhaella_a` — `Rhaella_Targaryen_(daughter_of_Aegon)`: infobox **Born** verbatim.
13. `aelor` — `Aelor_Targaryen`: infobox **Born** verbatim.
14. `elyana_vypren` — `Elyana_Vypren`: infobox **Spouse** verbatim.
