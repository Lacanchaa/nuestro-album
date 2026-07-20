import {
  lsGet,
  lsSet,
  genId,
  idbDelete
} from './storage.js';

import {
  getCurrentUser
} from './auth.js';

const DAYS_KEY = 'days';
const NOTES_KEY = 'notes';
const EVENTS_KEY = 'events';
const SETTINGS_KEY = 'settings';
const GALLERY_FAV_KEY = 'gallery_favorites';
const PLAYLIST_KEY = 'playlist';

const DEFAULT_SETTINGS = {

  coupleName: 'Nuestro Álbum',

  relationshipDate: '',

  dashboardMessage:
    'Cada día contigo es una página más de nuestra historia. 💛',

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

// ------------------------------------------------------------
// USUARIO ACTUAL
// ------------------------------------------------------------

function getUsername() {

  const user = getCurrentUser();

  return user?.username || null;
}

// ------------------------------------------------------------
// CLAVE POR USUARIO
// ------------------------------------------------------------

function getUserKey(baseKey) {

  const username = getUsername();

  if (!username) {

    console.warn(
      `No hay usuario para guardar ${baseKey}`
    );

    return null;
  }

  return `${baseKey}_${username}`;
}

// ------------------------------------------------------------
// OBTENER DATOS
// ------------------------------------------------------------

function getUserData(
  baseKey,
  fallback
) {

  const key = getUserKey(
    baseKey
  );

  if (!key) {

    return fallback;
  }

  return lsGet(
    key,
    fallback
  );
}

// ------------------------------------------------------------
// GUARDAR DATOS
// ------------------------------------------------------------

function saveUserData(
  baseKey,
  data
) {

  const key = getUserKey(
    baseKey
  );

  if (!key) {

    return false;
  }

  return lsSet(
    key,
    data
  );
}

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------

export function getSettings() {

  return {

    ...DEFAULT_SETTINGS,

    ...getUserData(
      SETTINGS_KEY,
      {}
    )

  };
}

export function saveSettings(
  patch
) {

  const current =
    getSettings();

  const updated = {

    ...current,

    ...patch

  };

  saveUserData(
    SETTINGS_KEY,
    updated
  );

  return updated;
}

// ------------------------------------------------------------
// DÍAS
// ------------------------------------------------------------

export function getAllDays() {

  return getUserData(
    DAYS_KEY,
    {}
  );
}

export function getDay(
  dateIso
) {

  const days =
    getAllDays();

  return days[dateIso] || {

    date: dateIso,

    comment: '',

    media: []

  };
}

export function saveDay(
  dateIso,
  dayData
) {

  const days =
    getAllDays();

  days[dateIso] = {

    ...dayData,

    date: dateIso

  };

  saveUserData(
    DAYS_KEY,
    days
  );

  return days[dateIso];
}

// ------------------------------------------------------------
// PLAYLIST
// ------------------------------------------------------------

export function getPlaylist() {

  return getUserData(
    PLAYLIST_KEY,
    []
  );
}

export function savePlaylist(
  list
) {

  saveUserData(
    PLAYLIST_KEY,
    list
  );

  return list;
}

export function addTrackToPlaylist(
  track
) {

  const list =
    getPlaylist();

  list.push({

    id: genId(),

    ...track

  });

  savePlaylist(
    list
  );

  return list;
}

export async function removeTrackFromPlaylist(
  id
) {

  const list =
    getPlaylist();

  const track =
    list.find(
      item => item.id === id
    );

  if (
    track &&
    track.source === 'file' &&
    track.refId
  ) {

    try {

      await idbDelete(
        track.refId
      );

    } catch (error) {

      console.warn(
        'No se pudo eliminar el archivo',
        error
      );
    }
  }

  const updated =
    list.filter(
      item => item.id !== id
    );

  savePlaylist(
    updated
  );

  return updated;
}
