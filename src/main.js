import { getEntries, addEntry, updateEntry, deleteEntry, getAllTags, parseTags } from './storage.js';

// ---- DOM refs ----
const listEl = document.getElementById('entry-list');
const emptyStateEl = document.getElementById('empty-state');
const noResultsStateEl = document.getElementById('no-results-state');
const searchInput = document.getElementById('search-input');
const tagFiltersEl = document.getElementById('tag-filters');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const newEntryBtn = document.getElementById('new-entry-btn');

const formOverlay = document.getElementById('entry-form-overlay');
const form = document.getElementById('entry-form');
const formTitleEl = document.getElementById('entry-form-title');
const titleInput = document.getElementById('entry-title-input');
const dateInput = document.getElementById('entry-date-input');
const notesInput = document.getElementById('entry-notes-input');
const tagsInput = document.getElementById('entry-tags-input');
const cancelBtn = document.getElementById('entry-cancel-btn');
const deleteBtn = document.getElementById('entry-delete-btn');

// ---- App state (in-memory view state, not persisted) ----
let searchQuery = '';
let activeTag = null;
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

function getFilteredEntries() {
  const entries = getEntries();
  const q = searchQuery.trim().toLowerCase();

  return entries
    .filter((e) => {
      if (activeTag && !(e.tags || []).some((t) => t.toLowerCase() === activeTag.toLowerCase())) {
        return false;
      }
      if (q && !(e.title.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q))) {
        return false;
      }
      return true;
    })
    // reverse-chronological by date, tie-broken by creation order
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
}

function renderTagFilters() {
  const tags = getAllTags();
  tagFiltersEl.innerHTML = '';
  for (const tag of tags) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tag-chip' + (tag === activeTag ? ' active' : '');
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      activeTag = activeTag === tag ? null : tag;
      render();
    });
    tagFiltersEl.appendChild(btn);
  }
  clearFiltersBtn.classList.toggle('hidden', !activeTag && !searchQuery);
}

function renderList() {
  const all = getEntries();
  const filtered = getFilteredEntries();

  // Clear previously rendered entry cards (but keep the two state <p> elements).
  listEl.querySelectorAll('.entry-card').forEach((el) => el.remove());

  emptyStateEl.classList.toggle('hidden', all.length !== 0);
  noResultsStateEl.classList.toggle('hidden', !(all.length !== 0 && filtered.length === 0));

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

// ---- Wiring ----

newEntryBtn.addEventListener('click', openNewForm);
cancelBtn.addEventListener('click', closeForm);
deleteBtn.addEventListener('click', handleDelete);
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

clearFiltersBtn.addEventListener('click', () => {
  searchQuery = '';
  activeTag = null;
  searchInput.value = '';
  render();
});

// ---- Init ----
render();
