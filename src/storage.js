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

/** De-dupe a tag array case-insensitively, preserving first-seen casing and order. */
function dedupeTags(tags) {
  return tags.filter((t, i, arr) => arr.findIndex((o) => o.toLowerCase() === t.toLowerCase()) === i);
}

/** Normalize a comma-separated tags string into a clean, de-duped array of tags. */
export function parseTags(tagsString) {
  return dedupeTags(
    (tagsString || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  );
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

/**
 * Rename a tag across every entry that has it (case-insensitive match on
 * oldTag). If the new name collides with a tag an entry already has, the
 * duplicate collapses rather than producing two copies of the same tag.
 */
export function renameTag(oldTag, newTag) {
  const trimmedNew = (newTag || '').trim();
  if (!trimmedNew) return;
  const entries = getEntries();
  for (const entry of entries) {
    if (!entry.tags || entry.tags.length === 0) continue;
    if (!entry.tags.some((t) => t.toLowerCase() === oldTag.toLowerCase())) continue;
    entry.tags = dedupeTags(
      entry.tags.map((t) => (t.toLowerCase() === oldTag.toLowerCase() ? trimmedNew : t))
    );
  }
  saveEntries(entries);
}

/** Remove a tag (case-insensitive) from every entry that has it. Entries themselves are untouched otherwise. */
export function deleteTag(tag) {
  const entries = getEntries();
  for (const entry of entries) {
    if (!entry.tags || entry.tags.length === 0) continue;
    entry.tags = entry.tags.filter((t) => t.toLowerCase() !== tag.toLowerCase());
  }
  saveEntries(entries);
}

/** Build a JSON-serializable snapshot of all entries for download/backup. */
export function exportEntries() {
  return {
    format: 'digital-lab-notebook-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: getEntries(),
  };
}

function isValidImportedEntry(e) {
  return (
    e &&
    typeof e === 'object' &&
    typeof e.title === 'string' &&
    e.title.trim().length > 0 &&
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date)
  );
}

/**
 * Import entries from a previously exported JSON string. Accepts either the
 * wrapped `{ entries: [...] }` export format or a bare array. Entries that
 * already exist (matched by id) are skipped rather than duplicated, so
 * re-importing the same backup file is safe. Malformed entries (missing
 * title/date) are skipped and counted, not thrown.
 *
 * @param {string} jsonText
 * @returns {{added: number, skipped: number}}
 * @throws {Error} if jsonText is not valid JSON or not a recognizable export shape
 */
export function importEntries(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error('That file is not valid JSON.');
  }

  const incoming = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.entries)
      ? parsed.entries
      : null;

  if (!incoming) {
    throw new Error('That file does not look like a Digital Lab Notebook export (expected an array of entries).');
  }

  const entries = getEntries();
  const existingIds = new Set(entries.map((e) => e.id));
  let added = 0;
  let skipped = 0;

  for (const raw of incoming) {
    if (!isValidImportedEntry(raw)) {
      skipped++;
      continue;
    }
    if (raw.id && existingIds.has(raw.id)) {
      skipped++; // already present -- treat as a duplicate from a repeat import
      continue;
    }
    const id = raw.id && !existingIds.has(raw.id) ? raw.id : generateId();
    existingIds.add(id);
    entries.push({
      id,
      title: raw.title.trim(),
      date: raw.date,
      notes: typeof raw.notes === 'string' ? raw.notes : '',
      tags: Array.isArray(raw.tags) ? dedupeTags(raw.tags.filter((t) => typeof t === 'string' && t.trim())) : [],
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    });
    added++;
  }

  saveEntries(entries);
  return { added, skipped };
}
