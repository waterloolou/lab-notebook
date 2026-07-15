# Digital Lab Notebook

A lightweight electronic lab notebook for logging biology experiments and
observations. Built for a high school/undergrad student's own research or a
research club: dated entries with a title, free-text notes, and tags, a
searchable/filterable/sortable list view, JSON export/import for backup, and
print-friendly output for archiving on paper.

No build step, no framework, no npm dependencies -- plain HTML/CSS and ES
modules, served locally by a tiny zero-dependency Node static file server.

## Running it

```
node server.js
```

Then open http://localhost:8988 in a browser.

(You can also run `npm start` / `npm run dev`, which just call `node
server.js`.)

## Using it

- Click **+ New Entry** to log an experiment or observation. Title and date
  are required (date defaults to today); notes and tags are optional.
- Tags are comma-separated (e.g. `microbiology, fermentation, week-3`).
- The list view shows entries sorted by the **sort dropdown** (newest first
  by default; oldest first and title A-Z are also available). The entry
  count above the list shows how many entries are shown vs. how many exist
  in total when a search/filter is active.
- Use the search box to match text in an entry's title or notes.
- Click a tag chip in the toolbar to filter the list to that tag; click it
  again (or **Clear filters**) to remove the filter. Each tag chip also has
  a small **rename** (pencil) and **remove** (×) action that applies across
  every entry using that tag, not just the one you're editing.
- Click any entry card to open it for editing, printing, or deleting.

## Backup: export / import

Because entries only live in one browser's `localStorage` (see limitation
below), **Export** and **Import** in the header are the way to back up or
move your data:

- **Export** downloads a `lab-notebook-export-YYYY-MM-DD.json` file
  containing every entry.
- **Import** reads a previously exported JSON file back in. Import is
  additive and safe to re-run: entries already present (matched by id) are
  skipped rather than duplicated, and malformed entries are skipped and
  reported rather than crashing the import.

This is a manual, one-off backup/restore mechanism -- it is not automatic
sync. See the v2 note below.

## Printing

Open an entry and click **Print** to print just that entry (title, date,
tags, notes) on its own page, useful for a physical lab record. Printing
directly from the list view (e.g. `Ctrl+P` with no entry open) prints a
clean version of the current filtered list with buttons and form chrome
hidden.

## Important limitation: local storage only

Entries are saved in the browser's `localStorage`, scoped to this one
browser on this one machine. There is **no backend, no database, and no
automatic sync** -- if you open the app in a different browser, a different
computer, or in an incognito/private window, you will not see the same
entries. Clearing your browser's site data for this app will also delete
all entries. Use **Export** regularly if you want a durable backup or want
to move entries to another browser/machine (via **Import**). This is a
deliberate scope cut, not an oversight.

## Out of scope (planned v2 work)

- **Hosted multi-device sync** -- would need a real backend, auth, and a
  hosting decision; that's real infrastructure and ongoing cost, out of
  scope for a local-first tool. Export/Import is the current workaround.
- Sharing entries or notebooks with a lab group (depends on the same
  backend work as sync)
- Rich text / image attachments in notes (v1 notes are plain text only)
- CSV export (JSON export/import covers backup; CSV would mainly help
  opening entries in a spreadsheet, which isn't a v1 priority)

## Project layout

```
lab-notebook/
  server.js          zero-dependency static file server
  package.json        npm scripts (start/dev -> node server.js)
  index.html           app shell: list view + entry form modal
  style.css            styling
  src/
    main.js            rendering, event wiring, form logic
    storage.js          localStorage read/write helpers (CRUD)
```
