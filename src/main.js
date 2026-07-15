import {
  getEntries,
  addEntry,
  updateEntry,
  deleteEntry,
  getAllTags,
  parseTags,
  renameTag,
  deleteTag,
  exportEntries,
  importEntries,
} from './storage.js';

// ---- DOM refs ----
const listEl = document.getElementById('entry-list');
const emptyStateEl = document.getElementById('empty-state');
const noResultsStateEl = document.getElementById('no-results-state');
const entryCountEl = document.getElementById('entry-count');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const tagFiltersEl = document.getElementById('tag-filters');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const newEntryBtn = document.getElementById('new-entry-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');

const formOverlay = document.getElementById('entry-form-overlay');
const form = document.getElementById('entry-form');
const formTitleEl = document.getElementById('entry-form-title');
const titleInput = document.getElementById('entry-title-input');
const dateInput = document.getElementById('entry-date-input');
const notesInput = document.getElementById('entry-notes-input');
const tagsInput = document.getElementById('entry-tags-input');
const cancelBtn = document.getElementById('entry-cancel-btn');
const deleteBtn = document.getElementById('entry-delete-btn');
const printEntryBtn = document.getElementById('entry-print-btn');
const printPaneEl = document.getElementById('print-pane');

// ---- App state (in-memory view state, not persisted) ----
let searchQuery = '';
let activeTag = null;
let sortMode = 'date-desc';
let editingId = null; // id of entry currently open in the form, or null for "new"

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- Rendering ----

function sortEntries(entries) {
  const sorted = entries.slice();
  if (sortMode === 'date-asc') {
    sorted.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  } else if (sortMode === 'title-asc') {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // date-desc (default): reverse-chronological, tie-broken by creation order
    sorted.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }
  return sorted;
}

function getFilteredEntries() {
  const entries = getEntries();
  const q = searchQuery.trim().toLowerCase();

  const filtered = entries.filter((e) => {
    if (activeTag && !(e.tags || []).some((t) => t.toLowerCase() === activeTag.toLowerCase())) {
      return false;
    }
    if (q && !(e.title.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q))) {
      return false;
    }
    return true;
  });

  return sortEntries(filtered);
}

function renderTagFilters() {
  const tags = getAllTags();
  tagFiltersEl.innerHTML = '';
  for (const tag of tags) {
    const wrap = document.createElement('span');
    wrap.className = 'tag-filter-item';

    const filterBtn = document.createElement('button');
    filterBtn.type = 'button';
    filterBtn.className = 'tag-chip' + (tag === activeTag ? ' active' : '');
    filterBtn.textContent = tag;
    filterBtn.title = `Filter by "${tag}"`;
    filterBtn.addEventListener('click', () => {
      activeTag = activeTag === tag ? null : tag;
      render();
    });

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'tag-action-btn';
    renameBtn.textContent = '✎'; // pencil
    renameBtn.title = `Rename tag "${tag}" everywhere`;
    renameBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const next = prompt(`Rename tag "${tag}" to:`, tag);
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed || trimmed.toLowerCase() === tag.toLowerCase()) return;
      renameTag(tag, trimmed);
      if (activeTag && activeTag.toLowerCase() === tag.toLowerCase()) activeTag = trimmed;
      render();
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tag-action-btn tag-action-danger';
    removeBtn.textContent = '×'; // times
    removeBtn.title = `Remove tag "${tag}" from all entries`;
    removeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!confirm(`Remove tag "${tag}" from all entries? The entries themselves are kept.`)) return;
      deleteTag(tag);
      if (activeTag && activeTag.toLowerCase() === tag.toLowerCase()) activeTag = null;
      render();
    });

    wrap.appendChild(filterBtn);
    wrap.appendChild(renameBtn);
    wrap.appendChild(removeBtn);
    tagFiltersEl.appendChild(wrap);
  }
  clearFiltersBtn.classList.toggle('hidden', !activeTag && !searchQuery);
}

function renderEntryCount(all, filtered) {
  if (all.length === 0) {
    entryCountEl.textContent = '';
    return;
  }
  const noun = (n) => (n === 1 ? 'entry' : 'entries');
  entryCountEl.textContent =
    filtered.length === all.length
      ? `${all.length} ${noun(all.length)}`
      : `${filtered.length} of ${all.length} ${noun(all.length)}`;
}

function renderList() {
  const all = getEntries();
  const filtered = getFilteredEntries();

  // Clear previously rendered entry cards (but keep the two state <p> elements).
  listEl.querySelectorAll('.entry-card').forEach((el) => el.remove());

  emptyStateEl.classList.toggle('hidden', all.length !== 0);
  noResultsStateEl.classList.toggle('hidden', !(all.length !== 0 && filtered.length === 0));
  renderEntryCount(all, filtered);

  for (const entry of filtered) {
    const card = document.createElement('article');
    card.className = 'entry-card';
    card.dataset.id = entry.id;

    const tagsHtml = (entry.tags || [])
      .map((t) => `<span class="tag-chip small">${escapeHtml(t)}</span>`)
      .join('');

    card.innerHTML = `
      <div class="entry-card-header">
        <h3 class="entry-title">${escapeHtml(entry.title)}</h3>
        <time class="entry-date">${escapeHtml(entry.date)}</time>
      </div>
      <p class="entry-notes">${escapeHtml(entry.notes || '')}</p>
      <div class="entry-tags">${tagsHtml}</div>
    `;
    card.addEventListener('click', () => openEditForm(entry.id));
    listEl.appendChild(card);
  }
}

function render() {
  renderTagFilters();
  renderList();
}

// ---- Form handling ----

function openNewForm() {
  editingId = null;
  formTitleEl.textContent = 'New Entry';
  titleInput.value = '';
  dateInput.value = todayISO();
  notesInput.value = '';
  tagsInput.value = '';
  deleteBtn.classList.add('hidden');
  printEntryBtn.classList.add('hidden');
  formOverlay.classList.remove('hidden');
  titleInput.focus();
}

function openEditForm(id) {
  const entry = getEntries().find((e) => e.id === id);
  if (!entry) return;
  editingId = id;
  formTitleEl.textContent = 'Edit Entry';
  titleInput.value = entry.title;
  dateInput.value = entry.date;
  notesInput.value = entry.notes || '';
  tagsInput.value = (entry.tags || []).join(', ');
  deleteBtn.classList.remove('hidden');
  printEntryBtn.classList.remove('hidden');
  formOverlay.classList.remove('hidden');
  titleInput.focus();
}

function closeForm() {
  formOverlay.classList.add('hidden');
  editingId = null;
  form.reset();
}

function handleSubmit(ev) {
  ev.preventDefault();
  const data = {
    title: titleInput.value.trim(),
    date: dateInput.value || todayISO(),
    notes: notesInput.value,
    tags: parseTags(tagsInput.value),
  };
  if (!data.title) {
    titleInput.focus();
    return;
  }

  if (editingId) {
    updateEntry(editingId, data);
  } else {
    addEntry(data);
  }

  closeForm();
  render();
}

function handleDelete() {
  if (!editingId) return;
  const entry = getEntries().find((e) => e.id === editingId);
  const label = entry ? `"${entry.title}"` : 'this entry';
  if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
  deleteEntry(editingId);
  closeForm();
  render();
}

// ---- Print ----

function buildPrintHtml(entry) {
  const tagsHtml = (entry.tags || [])
    .map((t) => `<span class="tag-chip small">${escapeHtml(t)}</span>`)
    .join(' ');
  return `
    <h1>${escapeHtml(entry.title)}</h1>
    <p class="print-date">${escapeHtml(entry.date)}</p>
    <div class="print-tags">${tagsHtml}</div>
    <pre class="print-notes">${escapeHtml(entry.notes || '')}</pre>
    <p class="print-footer">Printed from Digital Lab Notebook</p>
  `;
}

function handlePrintEntry() {
  if (!editingId) return;
  const entry = getEntries().find((e) => e.id === editingId);
  if (!entry) return;
  printPaneEl.innerHTML = buildPrintHtml(entry);
  document.body.classList.add('printing-entry');
  window.print();
}

window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing-entry');
});

// ---- Export / Import ----

function handleExport() {
  const data = exportEntries();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lab-notebook-export-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function handleImportFile() {
  const file = importFileInput.files && importFileInput.files[0];
  importFileInput.value = ''; // reset so re-selecting the same file re-fires 'change'
  if (!file) return;
  try {
    const text = await file.text();
    const result = importEntries(text);
    let msg = `Imported ${result.added} new ${result.added === 1 ? 'entry' : 'entries'}.`;
    if (result.skipped > 0) {
      msg += ` Skipped ${result.skipped} ${result.skipped === 1 ? 'entry' : 'entries'} (already present or invalid).`;
    }
    alert(msg);
    render();
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
}

// ---- Wiring ----

newEntryBtn.addEventListener('click', openNewForm);
cancelBtn.addEventListener('click', closeForm);
deleteBtn.addEventListener('click', handleDelete);
printEntryBtn.addEventListener('click', handlePrintEntry);
form.addEventListener('submit', handleSubmit);

formOverlay.addEventListener('click', (ev) => {
  if (ev.target === formOverlay) closeForm();
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && !formOverlay.classList.contains('hidden')) closeForm();
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  render();
});

sortSelect.addEventListener('change', () => {
  sortMode = sortSelect.value;
  render();
});

clearFiltersBtn.addEventListener('click', () => {
  searchQuery = '';
  activeTag = null;
  searchInput.value = '';
  render();
});

exportBtn.addEventListener('click', handleExport);
importBtn.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', handleImportFile);

// ---- Init ----
render();
