// ============================================================
// data.js — Acceso a los datos del álbum (días, notas, eventos, ajustes)
// Toda la app pasa por aquí para leer/escribir datos estructurados.
// Los archivos binarios en sí viven en IndexedDB (ver storage.js);
// aquí solo se guardan referencias (refId) a esos archivos.
// ============================================================
import { lsGet, lsSet, genId, idbDelete } from './storage.js';

const DAYS_KEY = 'days';
const NOTES_KEY = 'notes';
const EVENTS_KEY = 'events';
const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS = {
  coupleName: 'Nuestro Álbum',
  relationshipDate: '',
  dashboardMessage: 'Cada día contigo es una página más de nuestra historia. 💛',
  kissCount: 0,
  hugCount: 0,
  bucketList: [],
  theme: 'rosa',
  template: 'romantica',
  lang: 'es',
  dateFormat: 'DD/MM/YYYY',
  animations: true,
  inactivityLockMinutes: 10,
  notifications: true
};

// ---------------- Settings ----------------
export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...lsGet(SETTINGS_KEY, {}) };
}
export function saveSettings(patch) {
  const current = getSettings();
  const updated = { ...current, ...patch };
  lsSet(SETTINGS_KEY, updated);
  return updated;
}

// ---------------- Days (calendar content) ----------------
export function getAllDays() {
  return lsGet(DAYS_KEY, {});
}

export function getDay(dateIso) {
  const days = getAllDays();
  return days[dateIso] || { date: dateIso, comment: '', media: [] };
}

export function saveDay(dateIso, dayData) {
  const days = getAllDays();
  days[dateIso] = { ...dayData, date: dateIso };
  lsSet(DAYS_KEY, days);
  return days[dateIso];
}

export async function deleteDayMediaItem(dateIso, mediaItemId) {
  const day = getDay(dateIso);
  const item = day.media.find(m => m.id === mediaItemId);
  if (item && item.source === 'file' && item.refId) {
    try { await idbDelete(item.refId); } catch (e) { console.warn('No se pudo borrar el archivo', e); }
  }
  day.media = day.media.filter(m => m.id !== mediaItemId);
  saveDay(dateIso, day);
  return day;
}

export function addDayMediaItem(dateIso, item) {
  const day = getDay(dateIso);
  const newItem = { id: genId(), isMain: day.media.length === 0, order: day.media.length, ...item };
  day.media = [...day.media, newItem];
  saveDay(dateIso, day);
  return day;
}

export function setMainMedia(dateIso, mediaItemId) {
  const day = getDay(dateIso);
  day.media = day.media.map(m => ({ ...m, isMain: m.id === mediaItemId }));
  saveDay(dateIso, day);
  return day;
}

export function reorderDayMedia(dateIso, orderedIds) {
  const day = getDay(dateIso);
  const map = new Map(day.media.map(m => [m.id, m]));
  day.media = orderedIds.map((id, idx) => ({ ...map.get(id), order: idx })).filter(Boolean);
  saveDay(dateIso, day);
  return day;
}

export function dayHasContent(day) {
  return !!(day && ((day.media && day.media.length) || (day.comment && day.comment.trim())));
}

export function getMainPhoto(day) {
  if (!day || !day.media) return null;
  return day.media.find(m => m.isMain && m.kind === 'photo') || day.media.find(m => m.kind === 'photo') || null;
}

// ---------------- Gallery favorites ----------------
const GALLERY_FAV_KEY = 'gallery_favorites';

export function getGalleryFavorites() {
  return lsGet(GALLERY_FAV_KEY, []);
}
export function toggleGalleryFavorite(mediaId) {
  const favs = getGalleryFavorites();
  const idx = favs.indexOf(mediaId);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(mediaId);
  lsSet(GALLERY_FAV_KEY, favs);
  return favs;
}

// ---------------- Notes ----------------
export function getNotes() {
  return lsGet(NOTES_KEY, []);
}
export function saveNote(note) {
  const notes = getNotes();
  if (note.id) {
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) { notes[idx] = note; lsSet(NOTES_KEY, notes); return note; }
  }
  note.id = genId();
  note.createdAt = Date.now();
  notes.unshift(note);
  lsSet(NOTES_KEY, notes);
  return note;
}
export function deleteNote(id) {
  lsSet(NOTES_KEY, getNotes().filter(n => n.id !== id));
}

// ---------------- Events ----------------
export function getEvents() {
  return lsGet(EVENTS_KEY, []);
}
export function saveEvent(ev) {
  const events = getEvents();
  if (ev.id) {
    const idx = events.findIndex(e => e.id === ev.id);
    if (idx >= 0) { events[idx] = ev; lsSet(EVENTS_KEY, events); return ev; }
  }
  ev.id = genId();
  ev.createdAt = Date.now();
  events.push(ev);
  lsSet(EVENTS_KEY, events);
  return ev;
}
export async function deleteEvent(id) {
  const events = getEvents();
  const ev = events.find(e => e.id === id);
  if (ev && ev.media) {
    for (const m of ev.media) {
      if (m.source === 'file' && m.refId) { try { await idbDelete(m.refId); } catch {} }
    }
  }
  lsSet(EVENTS_KEY, events.filter(e => e.id !== id));
}

// ---------------- Music playlist ----------------
const PLAYLIST_KEY = 'playlist';

export function getPlaylist() {
  return lsGet(PLAYLIST_KEY, []);
}
export function savePlaylist(list) {
  lsSet(PLAYLIST_KEY, list);
  return list;
}
export function addTrackToPlaylist(track) {
  const list = getPlaylist();
  list.push({ id: genId(), ...track });
  savePlaylist(list);
  return list;
}
export async function removeTrackFromPlaylist(id) {
  const list = getPlaylist();
  const track = list.find(t => t.id === id);
  if (track && track.source === 'file' && track.refId) {
    try { await idbDelete(track.refId); } catch {}
  }
  savePlaylist(list.filter(t => t.id !== id));
}

// ---------------- Backup / export-import ----------------
export function exportAllStructuredData() {
  return {
    days: getAllDays(),
    notes: getNotes(),
    events: getEvents(),
    settings: getSettings(),
    exportedAt: new Date().toISOString()
  };
}

export function importStructuredData(data) {
  if (data.days) lsSet(DAYS_KEY, data.days);
  if (data.notes) lsSet(NOTES_KEY, data.notes);
  if (data.events) lsSet(EVENTS_KEY, data.events);
  if (data.settings) lsSet(SETTINGS_KEY, data.settings);
}
