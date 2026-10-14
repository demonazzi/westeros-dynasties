# Brief: verify death claims against A Wiki of Ice and Fire

Another reader summarised wiki pages; you check their claims. Input: `research/death/verify/in_N.json`,
entries `{id, url, claimed_died, claimed_status, claimed_note}`.

For each entry open `url` with WebFetch (plain `https://awoiaf.westeros.org/index.php/<Title>`, not `action=raw`)
and ask for the **infobox "Died" field verbatim** and whether the article says the person died.
Books and official histories only; ignore TV sections. Do not use your own memory of the books.

Write `research/death/verify/out_N.json` (same N), rewritten after every 5 entries, one object per input entry, same order:

```json
{ "id": "saera", "died_page": "In or after 101 AC", "ok": true, "note": "" }
```

- `died_page` — the Died field exactly as the page shows it (with place if the field has one); `""` if the infobox has none.
- `ok` — true when `claimed_died` matches the page (ignore place names / "In" prefix differences) **and** `claimed_status` is right.
  For an empty `claimed_died`, `ok` is true only if the page text really says what `claimed_note` says.
- `note` — when `ok` is false: what is wrong, short, in English. Also note if `url` is a different person than intended.
- If the url fails, retry once with an obvious alternative title; if still failing, `ok: null` and say so.

Reply at the end with one line: how many ok / not ok / failed.
