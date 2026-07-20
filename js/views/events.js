// ============================================================
// views/events.js
// ============================================================
import { getEvents, saveEvent, deleteEvent } from '../data.js';
import { mediaItemFromFile, mediaItemFromLink, resolveMediaSrc } from '../media.js';
import { openModal, closeModal, toast, escapeHtml, fmtDate } from '../ui.js';
import { getLang } from '../i18n.js';

const TYPES = [
  { id: 'aniversario', es: 'Aniversario', en: 'Anniversary', icon: '💍' },
  { id: 'cumpleanos', es: 'Cumpleaños', en: 'Birthday', icon: '🎂' },
  { id: 'viaje', es: 'Viaje', en: 'Trip', icon: '✈️' },
  { id: 'primera_cita', es: 'Primera cita', en: 'First date', icon: '🌹' },
  { id: 'primer_beso', es: 'Primer beso', en: 'First kiss', icon: '💋' },
  { id: 'pedida', es: 'Pedida', en: 'Proposal', icon: '💎' },
  { id: 'otro', es: 'Otro', en: 'Other', icon: '✧' }
];

export function destroy() {}

export function init(container) {
  render(container);
}

function typeLabel(id, lang) {
  const t = TYPES.find(x => x.id === id) || TYPES[TYPES.length - 1];
  return `${t.icon} ${lang === 'en' ? t.en : t.es}`;
}

function render(container) {
  const lang = getLang();
  container.innerHTML = `
    <div class="toolbar-row">
      <input type="text" class="input-search" id="ev-search" placeholder="${lang === 'en' ? 'Search events…' : 'Buscar eventos…'}">
      <select class="select-filter" id="ev-filter-type">
        <option value="">${lang === 'en' ? 'All types' : 'Todos los tipos'}</option>
        ${TYPES.map(t => `<option value="${t.id}">${lang === 'en' ? t.en : t.es}</option>`).join('')}
      </select>
      <button class="btn btn-primary" id="btn-new-event">+ ${lang === 'en' ? 'New event' : 'Nuevo evento'}</button>
    </div>
    <div class="grid-cards" id="events-grid"></div>
  `;

  const searchEl = container.querySelector('#ev-search');
  const typeEl = container.querySelector('#ev-filter-type');

  async function refresh() {
    const q = searchEl.value.trim().toLowerCase();
    const type = typeEl.value;
    let list = getEvents().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    if (q) list = list.filter(e => (e.title || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q));
    if (type) list = list.filter(e => e.type === type);
    await renderGrid(list);
  }

  async function renderGrid(list) {
    const grid = container.querySelector('#events-grid');
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-mark">✧</div>
        <p>${lang === 'en' ? 'No events yet. Add your first milestone!' : 'Aún no hay eventos. ¡Añade vuestro primer hito!'}</p>
      </div>`;
      return;
    }
    grid.innerHTML = list.map(e => `<div class="event-card" data-id="${e.id}"></div>`).join('');
    for (const ev of list) {
      const card = grid.querySelector(`[data-id="${ev.id}"]`);
      const photo = (ev.media || []).find(m => m.kind === 'photo');
      const imgSrc = photo ? await resolveMediaSrc(photo) : '';
      card.innerHTML = `
        ${imgSrc ? `<img src="${imgSrc}" alt="" loading="lazy" decoding="async">` : `<div style="height:140px;display:flex;align-items:center;justify-content:center;background:var(--accent-soft);font-size:34px">${(TYPES.find(t=>t.id===ev.type)||{}).icon || '✧'}</div>`}
        <div class="event-body">
          <div class="event-type">${typeLabel(ev.type, lang)}</div>
          <div class="event-title">${escapeHtml(ev.title)} ${ev.favorite ? '★' : ''}</div>
          <div class="event-date">${fmtDate(ev.date, lang)}${ev.location ? ' · ' + escapeHtml(ev.location) : ''}</div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="link-btn" data-action="edit" data-id="${ev.id}">${lang === 'en' ? 'Edit' : 'Editar'}</button>
            <button class="link-btn" data-action="delete" data-id="${ev.id}">${lang === 'en' ? 'Delete' : 'Eliminar'}</button>
          </div>
        </div>
      `;
    }
    grid.querySelectorAll('[data-action="edit"]').forEach(b => b.addEventListener('click', () => {
      openEventForm(getEvents().find(e => e.id === b.dataset.id), refresh);
    }));
    grid.querySelectorAll('[data-action="delete"]').forEach(b => b.addEventListener('click', async () => {
      if (confirm(lang === 'en' ? 'Delete this event?' : '¿Eliminar este evento?')) { await deleteEvent(b.dataset.id); refresh(); }
    }));
  }

  searchEl.addEventListener('input', refresh);
  typeEl.addEventListener('change', refresh);
  container.querySelector('#btn-new-event').addEventListener('click', () => openEventForm(null, refresh));

  refresh();
}

function openEventForm(existing, onSaved) {
  const lang = getLang();
  const overlay = openModal(`
    <div class="modal-head">
      <h3>${existing ? (lang === 'en' ? 'Edit event' : 'Editar evento') : (lang === 'en' ? 'New event' : 'Nuevo evento')}</h3>
      <button class="modal-close" id="ev-close">✕</button>
    </div>
    <div class="auth-form">
      <label class="field">
        <span>${lang === 'en' ? 'Title' : 'Título'}</span>
        <input type="text" id="ev-title" required value="${escapeHtml(existing?.title || '')}">
      </label>
      <label class="field">
        <span>${lang === 'en' ? 'Type' : 'Tipo'}</span>
        <select id="ev-type">${TYPES.map(t => `<option value="${t.id}" ${existing?.type === t.id ? 'selected' : ''}>${t.icon} ${lang === 'en' ? t.en : t.es}</option>`).join('')}</select>
      </label>
      <label class="field">
        <span>${lang === 'en' ? 'Date' : 'Fecha'}</span>
        <input type="date" id="ev-date" required value="${existing?.date || ''}">
      </label>
      <label class="field">
        <span>${lang === 'en' ? 'Location' : 'Ubicación'}</span>
        <input type="text" id="ev-location" value="${escapeHtml(existing?.location || '')}">
      </label>
      <label class="field">
        <span>${lang === 'en' ? 'Description' : 'Descripción'}</span>
        <textarea id="ev-desc" rows="3">${escapeHtml(existing?.description || '')}</textarea>
      </label>
      <label class="field">
        <span>${lang === 'en' ? 'Photo' : 'Foto'}</span>
        <input type="file" id="ev-photo" accept="image/*">
      </label>
      <label class="checkbox-field">
        <input type="checkbox" id="ev-fav" ${existing?.favorite ? 'checked' : ''}>
        <span>${lang === 'en' ? 'Mark as favorite' : 'Marcar como favorito'}</span>
      </label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="ev-save">${lang === 'en' ? 'Save' : 'Guardar'}</button>
    </div>
  `);

  overlay.querySelector('#ev-close').addEventListener('click', closeModal);
  overlay.querySelector('#ev-save').addEventListener('click', async () => {
    const title = overlay.querySelector('#ev-title').value.trim();
    const date = overlay.querySelector('#ev-date').value;
    if (!title || !date) { toast(lang === 'en' ? 'Title and date are required' : 'El título y la fecha son obligatorios', 'error'); return; }

    let media = existing?.media || [];
    const fileInput = overlay.querySelector('#ev-photo');
    if (fileInput.files[0]) {
      try {
        const item = await mediaItemFromFile(fileInput.files[0], 'photo');
        media = [...media.filter(m => m.kind !== 'photo'), item];
      } catch { toast(lang === 'en' ? 'Could not load photo' : 'No se pudo cargar la foto', 'error'); }
    }

    saveEvent({
      ...(existing || {}),
      title, date, media,
      type: overlay.querySelector('#ev-type').value,
      location: overlay.querySelector('#ev-location').value.trim(),
      description: overlay.querySelector('#ev-desc').value.trim(),
      favorite: overlay.querySelector('#ev-fav').checked
    });
    toast(lang === 'en' ? 'Event saved' : 'Evento guardado', 'success');
    closeModal();
    onSaved();
  });
}
