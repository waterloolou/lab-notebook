# Digital Lab Notebook

A lightweight electronic lab notebook for logging biology experiments and
observations. Built for a high school/undergrad student's own research or a
research club: dated entries with a title, free-text notes, and tags, plus a
searchable, filterable list view.

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
- The list view shows entries reverse-chronologically (most recent date
  first).
- Use the search box to match text in an entry's title or notes.
- Click a tag chip in the toolbar to filter the list to that tag; click it
  again (or **Clear filters**) to remove the filter.
- Click any entry card to open it for editing, or to delete it.

## Important limitation: local storage only

Entries are saved in the browser's `localStorage`, scoped to this one
browser on this one machine. There is **no backend, no database, and no
sync** -- if you open the app in a different browser, a different computer,
or in an incognito/private window, you will not see the same entries.
Clearing your browser's site data for this app will also delete all
entries. This is a deliberate v1 scope cut, not an oversight.

## Out of scope for v1 (planned v2 work)

- Multi-device / multi-user sync (would need a real backend and database)
- Export or print (e.g. PDF/CSV export of entries)
- Sharing entries or notebooks with a lab group
- Rich text / image attachments in notes (v1 notes are plain text only)

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
