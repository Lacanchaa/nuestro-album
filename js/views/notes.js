// ============================================================
// views/notes.js
// ============================================================
import { getNotes, saveNote, deleteNote } from '../data.js';
import { openModal, closeModal, toast, escapeHtml } from '../ui.js';
import { getLang } from '../i18n.js';

const COLORS = ['#F3D9DE', '#E1D9F5', '#D3EAF2', '#F0E1B3', '#E2CFAE', '#D6EFD9'];

export function destroy() {}

export function init(container) {
  render(container);
}

function render(container) {
  const lang = getLang();
  container.innerHTML = `
    <div class="toolbar-row">
      <input type="text" class="input-search" id="notes-search" placeholder="${lang === 'en' ? 'Search notes…' : 'Buscar notas…'}">
      <select class="select-filter" id="notes-filter-cat">
        <option value="">${lang === 'en' ? 'All categories' : 'Todas las categorías'}</option>
      </select>
      <select class="select-filter" id="notes-filter-fav">
        <option value="">${lang === 'en' ? 'All notes' : 'Todas'}</option>
        <option value="fav">${lang === 'en' ? 'Favorites only' : 'Solo favoritas'}</option>
      </select>
      <button class="btn btn-primary" id="btn-new-note">+ ${lang === 'en' ? 'New note' : 'Nueva nota'}</button>
    </div>
    <div class="grid-cards" id="notes-grid"></div>
  `;

  const searchEl = container.querySelector('#notes-search');
  const catEl = container.querySelector('#notes-filter-cat');
  const favEl = container.querySelector('#notes-filter-fav');

  const notes = getNotes();
  const cats = [...new Set(notes.map(n => n.category).filter(Boolean))];
  catEl.innerHTML += cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  function refresh() {
    const q = searchEl.value.trim().toLowerCase();
    const cat = catEl.value;
    const favOnly = favEl.value === 'fav';
    let list = getNotes();
    if (q) list = list.filter(n => (n.text || '').toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q)));
    if (cat) list = list.filter(n => n.category === cat);
    if (favOnly) list = list.filter(n => n.favorite);
    renderGrid(list);
  }

  function renderGrid(list) {
    const grid = container.querySelector('#notes-grid');
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-mark">✎</div>
        <p>${lang === 'en' ? 'No notes yet. Write your first one!' : 'Aún no hay notas. ¡Escribe la primera!'}</p>
      </div>`;
      return;
    }
    grid.innerHTML = list.map(n => `
      <div class="note-card priority-${n.priority || 'low'}" style="background:${n.color || 'var(--bg-elevated)'};border:1px solid var(--border)">
        <div class="note-top">
          <span class="note-tag">${escapeHtml(n.category || (lang === 'en' ? 'General' : 'General'))}</span>
          <button class="note-fav" data-id="${n.id}" data-action="fav">${n.favorite ? '★' : '☆'}</button>
        </div>
        <div class="note-body">${escapeHtml(n.text)}</div>
        ${(n.tags && n.tags.length) ? `<div style="display:flex;gap:4px;flex-wrap:wrap">${n.tags.map(t => `<span class="note-tag" style="background:rgba(0,0,0,.06)">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <div class="note-meta">
          <span>${new Date(n.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES')}</span>
          <span>
            <button data-id="${n.id}" data-action="edit" title="${lang === 'en' ? 'Edit' : 'Editar'}">✎</button>
            <button data-id="${n.id}" data-action="delete" title="${lang === 'en' ? 'Delete' : 'Eliminar'}">🗑</button>
          </span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-action="fav"]').forEach(b => b.addEventListener('click', () => {
      const note = getNotes().find(n => n.id === b.dataset.id);
      if (note) { saveNote({ ...note, favorite: !note.favorite }); refresh(); }
    }));
    grid.querySelectorAll('[data-action="delete"]').forEach(b => b.addEventListener('click', () => {
      if (confirm(lang === 'en' ? 'Delete this note?' : '¿Eliminar esta nota?')) { deleteNote(b.dataset.id); refresh(); }
    }));
    grid.querySelectorAll('[data-action="edit"]').forEach(b => b.addEventListener('click', () => {
      openNoteForm(getNotes().find(n => n.id === b.dataset.id), refresh);
    }));
  }

  searchEl.addEventListener('input', refresh);
  catEl.addEventListener('change', refresh);
  favEl.addEventListener('change', refresh);
  container.querySelector('#btn-new-note').addEventListener('click', () => openNoteForm(null, refresh));

  refresh();
}

function openNoteForm(existing, onSaved) {
  const lang = getLang();
  const overlay = openModal(`
    <div class="modal-head">
      <h3>${existing ? (lang === 'en' ? 'Edit note' : 'Editar nota') : (lang === 'en' ? 'New note' : 'Nueva nota')}</h3>
      <button class="modal-close" id="note-close">✕</button>
    </div>
    <div class="auth-form">
      <label class="field">
        <span>${lang === 'en' ? 'Text' : 'Texto'}</span>
        <textarea id="note-text" rows="4" required>${escapeHtml(existing?.text || '')}</textarea>
      </label>
      <label class="field">
        <span>${lang === 'en' ? 'Category' : 'Categoría'}</span>
        <input type="text" id="note-cat" value="${escapeHtml(existing?.category || '')}" placeholder="${lang === 'en' ? 'e.g. Travel' : 'Ej. Viajes'}">
      </label>
      <label class="field">
        <span>${lang === 'en' ? 'Tags (comma separated)' : 'Etiquetas (separadas por coma)'}</span>
        <input type="text" id="note-tags" value="${escapeHtml((existing?.tags || []).join(', '))}">
      </label>
      <label class="field">
        <span>${lang === 'en' ? 'Priority' : 'Prioridad'}</span>
        <select id="note-priority">
          <option value="low" ${existing?.priority === 'low' || !existing ? 'selected' : ''}>${lang === 'en' ? 'Low' : 'Baja'}</option>
          <option value="medium" ${existing?.priority === 'medium' ? 'selected' : ''}>${lang === 'en' ? 'Medium' : 'Media'}</option>
          <option value="high" ${existing?.priority === 'high' ? 'selected' : ''}>${lang === 'en' ? 'High' : 'Alta'}</option>
        </select>
      </label>
      <div class="field">
        <span>${lang === 'en' ? 'Color' : 'Color'}</span>
        <div class="theme-swatches" id="note-colors">
          ${COLORS.map(c => `<button type="button" class="theme-swatch" data-color="${c}" style="background:${c}"></button>`).join('')}
        </div>
      </div>
      <label class="checkbox-field">
        <input type="checkbox" id="note-fav" ${existing?.favorite ? 'checked' : ''}>
        <span>${lang === 'en' ? 'Mark as favorite' : 'Marcar como favorita'}</span>
      </label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="note-save">${lang === 'en' ? 'Save' : 'Guardar'}</button>
    </div>
  `);

  let selectedColor = existing?.color || COLORS[0];
  const colorButtons = overlay.querySelectorAll('#note-colors .theme-swatch');
  colorButtons.forEach(b => {
    if (b.dataset.color === selectedColor) b.classList.add('active');
    b.addEventListener('click', () => {
      selectedColor = b.dataset.color;
      colorButtons.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });

  overlay.querySelector('#note-close').addEventListener('click', closeModal);
  overlay.querySelector('#note-save').addEventListener('click', () => {
    const text = overlay.querySelector('#note-text').value.trim();
    if (!text) { toast(lang === 'en' ? 'Note text is required' : 'El texto de la nota es obligatorio', 'error'); return; }
    const tags = overlay.querySelector('#note-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    saveNote({
      ...(existing || {}),
      text,
      category: overlay.querySelector('#note-cat').value.trim(),
      tags,
      priority: overlay.querySelector('#note-priority').value,
      color: selectedColor,
      favorite: overlay.querySelector('#note-fav').checked
    });
    toast(lang === 'en' ? 'Note saved' : 'Nota guardada', 'success');
    closeModal();
    onSaved();
  });
}
