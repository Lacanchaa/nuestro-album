// ============================================================
// storage.js — Capa única de persistencia local
// LocalStorage: datos estructurados (usuarios, días, notas, eventos, ajustes…)
// IndexedDB:    archivos multimedia (fotos, audios locales) como base64
// Diseñado para poder sustituirse en el futuro por Firebase sin tocar
// el resto de la app: basta con reimplementar estas mismas funciones.
// ============================================================

const LS_PREFIX = 'album_';
const IDB_NAME = 'album_media_db';
const IDB_STORE = 'media';
const IDB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// ---------------- LocalStorage (JSON) ----------------
export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error('storage.lsGet error', key, err);
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('storage.lsSet error', key, err);
    return false;
  }
}

export function lsRemove(key) {
  localStorage.removeItem(LS_PREFIX + key);
}

export function lsAllKeysRaw() {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LS_PREFIX)) {
      out[k.slice(LS_PREFIX.length)] = localStorage.getItem(k);
    }
  }
  return out;
}

// ---------------- IndexedDB (archivos) ----------------
export function genId() {
  return 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

export async function idbPut(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function idbClear() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Convierte un File/Blob a base64 (data URL) para guardarlo en IndexedDB
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Archivo vacío'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Guarda un archivo (File) en IndexedDB y devuelve el id de referencia
export async function saveMediaFile(file, meta = {}) {
  const base64 = await fileToBase64(file);
  const id = genId();
  const record = {
    id,
    kind: meta.kind || 'photo', // photo | video | audio
    mime: file.type,
    name: file.name || '',
    data: base64,
    createdAt: Date.now(),
    ...meta
  };
  await idbPut(record);
  return record;
}
