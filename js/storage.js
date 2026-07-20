// ============================================================
// storage.js — Almacenamiento separado por usuario
// ============================================================

const LS_PREFIX = 'album_';

const IDB_NAME = 'album_media_db';
const IDB_STORE = 'media';
const IDB_VERSION = 1;

let dbPromise = null;

// ------------------------------------------------------------
// LOCAL STORAGE
// ------------------------------------------------------------

export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);

    if (raw === null) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch (err) {
    console.error('storage.lsGet error:', key, err);
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(
      LS_PREFIX + key,
      JSON.stringify(value)
    );

    return true;
  } catch (err) {
    console.error('storage.lsSet error:', key, err);
    return false;
  }
}

export function lsRemove(key) {
  localStorage.removeItem(LS_PREFIX + key);
}

// ------------------------------------------------------------
// ID
// ------------------------------------------------------------

export function genId() {
  return (
    'm_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).slice(2, 9)
  );
}

// ------------------------------------------------------------
// USUARIO ACTUAL
// ------------------------------------------------------------

function getCurrentUsername() {
  try {
    const raw = localStorage.getItem('album_session');

    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);

    return session?.username || null;
  } catch {
    return null;
  }
}

function getUserMediaId(id) {
  const username = getCurrentUsername();

  if (!username) {
    throw new Error('No hay un usuario autenticado');
  }

  return `${username}__${id}`;
}

// ------------------------------------------------------------
// INDEXED DB
// ------------------------------------------------------------

export function openDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(
      IDB_NAME,
      IDB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, {
          keyPath: 'id'
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// ------------------------------------------------------------
// GUARDAR ARCHIVO
// ------------------------------------------------------------

export async function idbPut(record) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      IDB_STORE,
      'readwrite'
    );

    tx.objectStore(IDB_STORE).put(record);

    tx.oncomplete = () => {
      resolve(record);
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

// ------------------------------------------------------------
// OBTENER ARCHIVO
// ------------------------------------------------------------

export async function idbGet(id) {
  const db = await openDB();

  const username = getCurrentUsername();

  if (!username) {
    return null;
  }

  const userId = `${username}__${id}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      IDB_STORE,
      'readonly'
    );

    const request = tx
      .objectStore(IDB_STORE)
      .get(userId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ------------------------------------------------------------
// ELIMINAR ARCHIVO
// ------------------------------------------------------------

export async function idbDelete(id) {
  const db = await openDB();

  const username = getCurrentUsername();

  if (!username) {
    return false;
  }

  const userId = `${username}__${id}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      IDB_STORE,
      'readwrite'
    );

    tx.objectStore(IDB_STORE).delete(userId);

    tx.oncomplete = () => {
      resolve(true);
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

// ------------------------------------------------------------
// CONVERTIR ARCHIVO A BASE64
// ------------------------------------------------------------

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Archivo vacío'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(reader.error);
    };

    reader.readAsDataURL(file);
  });
}

// ------------------------------------------------------------
// GUARDAR MEDIA DEL USUARIO ACTUAL
// ------------------------------------------------------------

export async function saveMediaFile(file, meta = {}) {
  const originalId = genId();

  const username = getCurrentUsername();

  if (!username) {
    throw new Error(
      'Debes iniciar sesión antes de guardar archivos'
    );
  }

  const id = `${username}__${originalId}`;

  const base64 = await fileToBase64(file);

  const record = {
    id,

    owner: username,

    kind: meta.kind || 'photo',

    mime: file.type,

    name: file.name || '',

    data: base64,

    createdAt: Date.now(),

    ...meta
  };

  await idbPut(record);

  return record;
}
