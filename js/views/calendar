// ============================================================
// views/calendar.js — Calendario interactivo con multimedia por día
// ============================================================
import { getAllDays, getDay, saveDay, addDayMediaItem, deleteDayMediaItem, setMainMedia, reorderDayMedia, dayHasContent, getMainPhoto } from '../data.js';
import { mediaItemFromFile, mediaItemFromLink, resolveMediaSrc } from '../media.js';
import { openModal, closeModal, toast, isoDate, pad2, escapeHtml } from '../ui.js';
import { getLang } from '../i18n.js';

let currentYear, currentMonth; // month: 0-11
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_ES = ['L','M','X','J','V','S','D'];
const DOW_EN = ['M','T','W','T','F','S','S'];

export function destroy() {}

export function init(container) {
  const now = new Date();
  if (currentYear === undefined) { currentYear = now.getFullYear(); currentMonth = now.getMonth(); }
  render(container);
}

function render(container) {
  const lang = getLang();
  const months = lang === 'en' ? MONTHS_EN : MONTHS_ES;
  const dow = lang === 'en' ? DOW_EN : DOW_ES;

  container.innerHTML = `
    <div class="cal-toolbar">
      <button class="icon-btn" id="cal-prev">‹</button>
      <h3>${months[currentMonth]} ${currentYear}</h3>
      <button class="icon-btn" id="cal-next">›</button>
      <button class="btn btn-ghost" id="cal-today" style="margin-left:auto">${lang === 'en' ? 'Today' : 'Hoy'}</button>
    </div>
    <div class="cal-grid" id="cal-grid">
      ${dow.map(d => `<div class="cal-dow">${d}</div>`).join('')}
    </div>
  `;

  container.querySelector('#cal-prev').addEventListener('click', () => { shiftMonth(-1); render(container); });
  container.querySelector('#cal-next').addEventListener('click', () => { shiftMonth(1); render(container); });
  container.querySelector('#cal-today').addEventListener('click', () => {
    const n = new Date(); currentYear = n.getFullYear(); currentMonth = n.getMonth(); render(container);
  });

  renderGrid(container.querySelector('#cal-grid'), container);
}

function shiftMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
}

async function renderGrid(grid, container) {
  const firstDay = new Date(currentYear, currentMonth, 1);
  // Lunes = 0
  let startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const allDays = getAllDays();
  const todayIsoStr = isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  let html = '';
  for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoDate(currentYear, currentMonth, d);
    const day = allDays[iso];
    const has = dayHasContent(day);
    const isToday = iso === todayIsoStr;
    html += `<button class="cal-day ${has ? 'has-content' : ''} ${isToday ? 'today' : ''}" data-date="${iso}">
      <img class="cal-day-thumb" data-thumb="${iso}" alt="" loading="lazy" decoding="async">
      <span class="cal-day-num">${d}</span>
      ${has ? '<span class="cal-day-dot"></span>' : ''}
    </button>`;
  }
  grid.insertAdjacentHTML('beforeend', html);

  grid.querySelectorAll('.cal-day[data-date]').forEach(btn => {
    btn.addEventListener('click', () => openDayModal(btn.dataset.date, container));
  });

  // Cargar miniaturas de forma asíncrona (foto principal si existe)
  for (const [iso, day] of Object.entries(allDays)) {
    const main = getMainPhoto(day);
    if (!main) continue;
    const imgEl = grid.querySelector(`img[data-thumb="${iso}"]`);
    if (!imgEl) continue;
    resolveMediaSrc(main).then(src => { if (src) imgEl.src = src; }).catch(() => {});
  }
}

async function openDayModal(dateIso, container) {
  const lang = getLang();
  const day = getDay(dateIso);

  const overlay = openModal(`
    <div class="modal-head">
      <h3>${new Date(dateIso + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
      <button class="modal-close" id="day-modal-close">✕</button>
    </div>

    <label class="field">
      <span>${lang === 'en' ? 'Comment' : 'Comentario'}</span>
      <textarea id="day-comment" rows="3" placeholder="${lang === 'en' ? 'Write something about this day…' : 'Escribe algo sobre este día…'}">${escapeHtml(day.comment || '')}</textarea>
    </label>

    <div style="margin-top:14px">
      <div class="card-title">${lang === 'en' ? 'Photos & videos' : 'Fotos y vídeos'}</div>
      <div class="day-media-grid" id="day-media-grid"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
        <label class="btn btn-ghost" style="cursor:pointer">
          📷 ${lang === 'en' ? 'Add photos' : 'Añadir fotos'}
          <input type="file" id="input-photos" accept="image/*" multiple class="hidden">
        </label>
        <label class="btn btn-ghost" style="cursor:pointer">
          🎬 ${lang === 'en' ? 'Add local video' : 'Añadir vídeo local'}
          <input type="file" id="input-video" accept="video/*" class="hidden">
        </label>
        <button class="btn btn-ghost" id="btn-add-video-link">🔗 ${lang === 'en' ? 'Video link' : 'Enlace de vídeo'}</button>
      </div>
    </div>

    <div style="margin-top:14px">
      <div class="card-title">${lang === 'en' ? 'Audio' : 'Audio'}</div>
      <div id="day-audio-list"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
        <label class="btn btn-ghost" style="cursor:pointer">
          🎵 ${lang === 'en' ? 'Upload audio' : 'Subir audio'}
          <input type="file" id="input-audio" accept="audio/*" class="hidden">
        </label>
        <button class="btn btn-ghost" id="btn-add-audio-link">🔗 ${lang === 'en' ? 'Audio link' : 'Enlace de audio'}</button>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn btn-primary" id="btn-save-day">${lang === 'en' ? 'Save day' : 'Guardar día'}</button>
    </div>
  `, { wide: true });

  overlay.querySelector('#day-modal-close').addEventListener('click', closeModal);

  async function refreshMediaGrid() {
    const fresh = getDay(dateIso);
    const mediaGrid = overlay.querySelector('#day-media-grid');
    const visual = fresh.media.filter(m => m.kind === 'photo' || m.kind === 'video').sort((a,b) => a.order - b.order);
    mediaGrid.innerHTML = '';
    for (const item of visual) {
      const src = item.kind === 'photo' ? await resolveMediaSrc(item) : (item.source === 'file' ? await resolveMediaSrc(item) : '');
      const thumbSrc = item.kind === 'video' ? '' : src;
      const wrap = document.createElement('div');
      wrap.className = `day-media-thumb ${item.isMain ? 'is-main' : ''}`;
      wrap.draggable = true;
      wrap.dataset.id = item.id;
      wrap.innerHTML = thumbSrc
        ? `<img src="${thumbSrc}" alt="">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--accent-soft);font-size:22px">🎬</div>`;
      wrap.innerHTML += `
        <button class="rm-btn" data-id="${item.id}" title="${lang === 'en' ? 'Remove' : 'Eliminar'}">✕</button>
        ${item.kind === 'photo' ? `<button class="main-btn" data-id="${item.id}">${item.isMain ? '★' : '☆'}</button>` : ''}
      `;
      mediaGrid.appendChild(wrap);
    }

    mediaGrid.querySelectorAll('.rm-btn').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteDayMediaItem(dateIso, b.dataset.id);
      refreshMediaGrid();
    }));
    mediaGrid.querySelectorAll('.main-btn').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      setMainMedia(dateIso, b.dataset.id);
      refreshMediaGrid();
    }));

    // Reordenar por arrastre simple
    let dragId = null;
    mediaGrid.querySelectorAll('.day-media-thumb').forEach(el => {
      el.addEventListener('dragstart', () => { dragId = el.dataset.id; });
      el.addEventListener('dragover', (e) => e.preventDefault());
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragId || dragId === el.dataset.id) return;
        const ids = Array.from(mediaGrid.querySelectorAll('.day-media-thumb')).map(x => x.dataset.id);
        const from = ids.indexOf(dragId), to = ids.indexOf(el.dataset.id);
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        reorderDayMedia(dateIso, ids);
        refreshMediaGrid();
      });
    });
  }

  async function refreshAudioList() {
    const fresh = getDay(dateIso);
    const list = overlay.querySelector('#day-audio-list');
    const audios = fresh.media.filter(m => m.kind === 'audio');
    if (!audios.length) {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:13px">${lang === 'en' ? 'No audio yet.' : 'Sin audio todavía.'}</p>`;
      return;
    }
    list.innerHTML = '';
    for (const item of audios) {
      const src = await resolveMediaSrc(item);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
      row.innerHTML = `<audio src="${src}" controls style="flex:1;height:34px"></audio>
        <button class="icon-btn small rm-audio" data-id="${item.id}">✕</button>`;
      list.appendChild(row);
    }
    list.querySelectorAll('.rm-audio').forEach(b => b.addEventListener('click', async () => {
      await deleteDayMediaItem(dateIso, b.dataset.id);
      refreshAudioList();
    }));
  }

  refreshMediaGrid();
  refreshAudioList();

  overlay.querySelector('#input-photos').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      try {
        const item = await mediaItemFromFile(f, 'photo');
        addDayMediaItem(dateIso, item);
      } catch (err) { toast(lang === 'en' ? 'Could not load photo' : 'No se pudo cargar la foto', 'error'); }
    }
    refreshMediaGrid();
    e.target.value = '';
  });

  overlay.querySelector('#input-video').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const item = await mediaItemFromFile(f, 'video');
      addDayMediaItem(dateIso, item);
      refreshMediaGrid();
    } catch { toast(lang === 'en' ? 'Could not load video' : 'No se pudo cargar el vídeo', 'error'); }
    e.target.value = '';
  });

  overlay.querySelector('#input-audio').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const item = await mediaItemFromFile(f, 'audio');
      addDayMediaItem(dateIso, item);
      refreshAudioList();
    } catch { toast(lang === 'en' ? 'Could not load audio' : 'No se pudo cargar el audio', 'error'); }
    e.target.value = '';
  });

  overlay.querySelector('#btn-add-video-link').addEventListener('click', () => {
    const url = prompt(lang === 'en' ? 'Paste a YouTube, Vimeo or Drive link:' : 'Pega un enlace de YouTube, Vimeo o Drive:');
    if (!url) return;
    if (!isValidUrl(url)) { toast(lang === 'en' ? 'Invalid link' : 'Enlace no válido', 'error'); return; }
    addDayMediaItem(dateIso, mediaItemFromLink(url, 'video'));
    refreshMediaGrid();
  });

  overlay.querySelector('#btn-add-audio-link').addEventListener('click', () => {
    const url = prompt(lang === 'en' ? 'Paste an audio link:' : 'Pega un enlace de audio:');
    if (!url) return;
    if (!isValidUrl(url)) { toast(lang === 'en' ? 'Invalid link' : 'Enlace no válido', 'error'); return; }
    addDayMediaItem(dateIso, mediaItemFromLink(url, 'audio'));
    refreshAudioList();
  });

  overlay.querySelector('#btn-save-day').addEventListener('click', () => {
    const comment = overlay.querySelector('#day-comment').value.slice(0, 2000);
    const fresh = getDay(dateIso);
    saveDay(dateIso, { ...fresh, comment });
    toast(lang === 'en' ? 'Day saved' : 'Día guardado', 'success');
    closeModal();
    render(container);
  });
}

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}
