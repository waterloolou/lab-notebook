// localStorage-backed persistence for lab notebook entries.
//
// v1 limitation: entries live only in this browser's localStorage. There is
// no backend and no sync between devices/browsers -- see README.md.

const STORAGE_KEY = 'lab-notebook.entries.v1';

/**
 * @typedef {Object} Entry
 * @property {string} id
 * @property {string} title
 * @property {string} date - YYYY-MM-DD
 * @property {string} notes
 * @property {string[]} tags
 * @property {number} createdAt - epoch ms, used as a stable tie-breaker
 */

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Read all entries from localStorage. Returns [] if empty or corrupt. */
export function getEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Lab notebook: failed to parse stored entries, resetting.', err);
    return [];
  }
}

/** Persist the full entry list back to localStorage. */
function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Normalize a comma-separated tags string into a clean array of lowercase tags. */
export function parseTags(tagsString) {
  return (tagsString || '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    // de-dupe case-insensitively while preserving first-seen casing
    .filter((t, i, arr) => arr.findIndex((o) => o.toLowerCase() === t.toLowerCase()) === i);
}

/**
 * Create a new entry and persist it.
 * @param {{title: string, date: string, notes: string, tags: string[]}} data
 * @returns {Entry} the created entry
 */
export function addEntry(data) {
  const entries = getEntries();
  const entry = {
    id: generateId(),
    title: data.title.trim(),
    date: data.date,
    notes: data.notes || '',
    tags: data.tags || [],
    createdAt: Date.now(),
  };
  entries.push(entry);
  saveEntries(entries);
  return entry;
}

/**
 * Update an existing entry by id and persist it.
 * @param {string} id
 * @param {{title: string, date: string, notes: string, tags: string[]}} data
 * @returns {Entry|null} the updated entry, or null if id was not found
 */
export function updateEntry(id, data) {
  const entries = getEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  entries[idx] = {
    ...entries[idx],
    title: data.title.trim(),
    date: data.date,
    notes: data.notes || '',
    tags: data.tags || [],
  };
  saveEntries(entries);
  return entries[idx];
}

/** Delete an entry by id. */
export function deleteEntry(id) {
  const entries = getEntries().filter((e) => e.id !== id);
  saveEntries(entries);
}

/** Collect the set of distinct tags across all entries, sorted alphabetically. */
export function getAllTags() {
  const tagSet = new Set();
  for (const entry of getEntries()) {
    for (const tag of entry.tags || []) tagSet.add(tag);
  }
  return [...tagSet].sort((a, b) => a.localeCompare(b));
}
