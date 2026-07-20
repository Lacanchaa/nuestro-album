// ============================================================
// data.js — Datos separados por usuario
// ============================================================

import { getCurrentUser } from './auth.js';

const supabaseClient = window.supabaseClient;

function requireUser() {
  const user = getCurrentUser();

  if (!user || !user.id) {
    throw new Error('No hay un usuario conectado');
  }

  return user;
}

export async function getUserStorage() {
  const user = requireUser();

  const { data, error } =
    await supabaseClient
      .from('user_storage')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { data: newStorage, error: insertError } =
      await supabaseClient
        .from('user_storage')
        .insert({
          user_id: user.id,
          days: {},
          notes: [],
          events: [],
          settings: {},
          gallery_favorites: [],
          playlist: []
        })
        .select()
        .single();

    if (insertError) throw insertError;

    return newStorage;
  }

  return data;
}

export async function saveUserStorage(patch) {
  const user = requireUser();

  const { data, error } =
    await supabaseClient
      .from('user_storage')
      .update(patch)
      .eq('user_id', user.id)
      .select()
      .single();

  if (error) throw error;

  return data;
}

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------

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

export async function getSettings() {
  const storage = await getUserStorage();

  return {
    ...DEFAULT_SETTINGS,
    ...(storage.settings || {})
  };
}

export async function saveSettings(patch) {
  const current = await getSettings();

  const updated = {
    ...current,
    ...patch
  };

  await saveUserStorage({
    settings: updated
  });

  return updated;
}

// ------------------------------------------------------------
// PLAYLIST
// ------------------------------------------------------------

export async function getPlaylist() {
  const storage = await getUserStorage();

  return storage.playlist || [];
}

export async function savePlaylist(list) {
  await saveUserStorage({
    playlist: list
  });

  return list;
}

export async function addTrackToPlaylist(track) {
  const list = await getPlaylist();

  list.push(track);

  await savePlaylist(list);

  return list;
}

export async function removeTrackFromPlaylist(id) {
  const list = await getPlaylist();

  const updated = list.filter(
    track => track.id !== id
  );

  await savePlaylist(updated);

  return updated;
}
