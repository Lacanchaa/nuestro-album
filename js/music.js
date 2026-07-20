// ============================================================
// music.js — Reproductor global: play/pause, volumen, aleatorio, repetición
// ============================================================
import { getPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } from './data.js';
import { mediaItemFromFile, mediaItemFromLink, resolveMediaSrc } from './media.js';
import { openModal, closeModal, toast, escapeHtml } from './ui.js';
import { getLang } from './i18n.js';

let audioEl, toggleBtn, trackNameEl, seekEl, volumeEl, shuffleBtn, repeatBtn, listBtn, playerBar;
let currentIndex = -1;
let shuffle = false;
let repeatMode = 'off'; // off | one | all

export function initPlayer() {
  audioEl = document.getElementById('mp-audio');
  toggleBtn = document.getElementById('mp-toggle');
  trackNameEl = document.getElementById('mp-track-name');
  seekEl = document.getElementById('mp-seek');
  volumeEl = document.getElementById('mp-volume');
  shuffleBtn = document.getElementById('mp-shuffle');
  repeatBtn = document.getElementById('mp-repeat');
  listBtn = document.getElementById('mp-list');
  playerBar = document.getElementById('music-player');

  audioEl.volume = 0.7;

  toggleBtn.addEventListener('click', togglePlay);
  volumeEl.addEventListener('input', () => { audioEl.volume = +volumeEl.value; });
  seekEl.addEventListener('input', () => {
    if (audioEl.duration) audioEl.currentTime = (seekEl.value / 100) * audioEl.duration;
  });
  audioEl.addEventListener('timeupdate', () => {
    if (audioEl.duration) seekEl.value = (audioEl.currentTime / audioEl.duration) * 100;
  });
  audioEl.addEventListener('ended', () => handleEnded());
  shuffleBtn.addEventListener('click', () => {
    shuffle = !shuffle;
    shuffleBtn.style.color = shuffle ? 'var(--accent)' : '';
  });
  repeatBtn.addEventListener('click', () => {
    repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    repeatBtn.textContent = repeatMode === 'one' ? '↻¹' : '↻';
    repeatBtn.style.color = repeatMode !== 'off' ? 'var(--accent)' : '';
  });
  listBtn.addEventListener('click', openPlaylistModal);

  const list = getPlaylist();
  if (list.length) playerBar.classList.remove('hidden');
}

function handleEnded() {
  if (repeatMode === 'one') { audioEl.currentTime = 0; audioEl.play(); return; }
  playNext();
}

async function loadTrack(index) {
  const list = getPlaylist();
  if (!list.length || index < 0 || index >= list.length) return;
  currentIndex = index;
  const track = list[index];
  const src = await resolveMediaSrc(track);
  if (!src) { toast(getLang() === 'en' ? 'Could not load track' : 'No se pudo cargar la pista', 'error'); return; }
  audioEl.src = src;
  trackNameEl.textContent = track.name || track.url || 'Track';
  await audioEl.play().catch(() => {});
  toggleBtn.textContent = '⏸';
  playerBar.classList.remove('hidden');
}

function togglePlay() {
  const list = getPlaylist();
  if (!list.length) { toast(getLang() === 'en' ? 'Add songs to the playlist first' : 'Añade canciones a la playlist primero', 'info'); openPlaylistModal(); return; }
  if (currentIndex === -1) { loadTrack(0); return; }
  if (audioEl.paused) { audioEl.play(); toggleBtn.textContent = '⏸'; }
  else { audioEl.pause(); toggleBtn.textContent = '▶'; }
}

export function playFromDay(track) {
  resolveMediaSrc(track).then(src => {
    if (!src) return;
    audioEl.src = src;
    trackNameEl.textContent = track.name || 'Track';
    audioEl.play().catch(() => {});
    toggleBtn.textContent = '⏸';
    playerBar.classList.remove('hidden');
    currentIndex = -1;
  });
}

function playNext() {
  const list = getPlaylist();
  if (!list.length) return;
  let next;
  if (shuffle) next = Math.floor(Math.random() * list.length);
  else next = currentIndex + 1;
  if (next >= list.length) {
    if (repeatMode === 'all') next = 0; else { toggleBtn.textContent = '▶'; return; }
  }
  loadTrack(next);
}

function openPlaylistModal() {
  const lang = getLang();
  const overlay = openModal(`
    <div class="modal-head">
      <h3>${lang === 'en' ? 'Playlist' : 'Lista de reproducción'}</h3>
      <button class="modal-close" id="pl-close">✕</button>
    </div>
    <div id="pl-list"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <label class="btn btn-ghost" style="cursor:pointer">🎵 ${lang === 'en' ? 'Upload song' : 'Subir canción'}
        <input type="file" id="pl-input-file" accept="audio/*" class="hidden"></label>
      <button class="btn btn-ghost" id="pl-add-link">🔗 ${lang === 'en' ? 'Add link' : 'Añadir enlace'}</button>
    </div>
  `);
  overlay.querySelector('#pl-close').addEventListener('click', closeModal);

  function refresh() {
    const list = getPlaylist();
    const box = overlay.querySelector('#pl-list');
    if (!list.length) {
      box.innerHTML = `<p style="color:var(--text-muted);font-size:13px">${lang === 'en' ? 'No songs yet.' : 'Sin canciones todavía.'}</p>`;
      return;
    }
    box.innerHTML = list.map((t, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <button class="link-btn" data-play="${i}">${i === currentIndex ? '▶' : '♪'}</button>
        <span style="flex:1;font-size:13.5px">${escapeHtml(t.name || t.url || 'Track')}</span>
        <button class="icon-btn small" data-rm="${t.id}">✕</button>
      </div>
    `).join('');
    box.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => loadTrack(+b.dataset.play)));
    box.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => {
      await removeTrackFromPlaylist(b.dataset.rm);
      refresh();
    }));
  }
  refresh();

  overlay.querySelector('#pl-input-file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const item = await mediaItemFromFile(f, 'audio');
    addTrackToPlaylist(item);
    refresh();
    e.target.value = '';
  });
  overlay.querySelector('#pl-add-link').addEventListener('click', () => {
    const url = prompt(lang === 'en' ? 'Paste a direct audio link:' : 'Pega un enlace directo de audio:');
    if (!url) return;
    addTrackToPlaylist(mediaItemFromLink(url, 'audio'));
    refresh();
  });
}
