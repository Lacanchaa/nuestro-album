// ============================================================
// views/gallery.js
// ============================================================
import { getAllDays, getGalleryFavorites, toggleGalleryFavorite } from '../data.js';
import { resolveMediaSrc } from '../media.js';
import { fmtDate, openImageLightbox } from '../ui.js';
import { getLang } from '../i18n.js';

export function destroy() {}

export function init(container) {
  render(container);
}

function collectPhotos() {
  const days = getAllDays();
  const out = [];
  for (const [iso, day] of Object.entries(days)) {
    for (const m of (day.media || [])) {
      if (m.kind === 'photo') out.push({ ...m, date: iso });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function render(container) {
  const lang = getLang();
  container.innerHTML = `
    <div class="toolbar-row">
      <input type="text" class="input-search" id="gal-search" placeholder="${lang === 'en' ? 'Search by date (YYYY-MM-DD)…' : 'Buscar por fecha (AAAA-MM-DD)…'}">
      <select class="select-filter" id="gal-sort">
        <option value="desc">${lang === 'en' ? 'Newest first' : 'Más recientes primero'}</option>
        <option value="asc">${lang === 'en' ? 'Oldest first' : 'Más antiguas primero'}</option>
      </select>
      <select class="select-filter" id="gal-fav">
        <option value="">${lang === 'en' ? 'All photos' : 'Todas las fotos'}</option>
        <option value="fav">${lang === 'en' ? 'Favorites only' : 'Solo favoritas'}</option>
      </select>
    </div>
    <div class="gallery-grid" id="gallery-grid"></div>
  `;

  const searchEl = container.querySelector('#gal-search');
  const sortEl = container.querySelector('#gal-sort');
  const favEl = container.querySelector('#gal-fav');

  async function refresh() {
    let list = collectPhotos();
    const q = searchEl.value.trim();
    if (q) list = list.filter(p => p.date.includes(q));
    const favs = getGalleryFavorites();
    if (favEl.value === 'fav') list = list.filter(p => favs.includes(p.id));
    list.sort((a, b) => sortEl.value === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

    const grid = container.querySelector('#gallery-grid');
    if (!list.length) {
      grid.outerHTML = `<div class="empty-state" id="gallery-grid-empty">
        <div class="empty-state-mark">▣</div>
        <p>${lang === 'en' ? 'No photos match your search yet.' : 'Aún no hay fotos que coincidan.'}</p>
      </div>`;
      return;
    }
    grid.innerHTML = list.map(p => `<div class="gallery-item" data-id="${p.id}" data-date="${p.date}">
      <button class="gallery-fav" data-fav="${p.id}">${favs.includes(p.id) ? '★' : '☆'}</button>
    </div>`).join('');

    for (const p of list) {
      const el = grid.querySelector(`.gallery-item[data-id="${p.id}"]`);
      resolveMediaSrc(p).then(src => {
        if (!src) return;
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = src;
        img.alt = p.date;
        img.title = fmtDate(p.date, lang);
        img.addEventListener('click', () => openImageLightbox(src));
        el.prepend(img);
      }).catch(() => {});
    }

    grid.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleGalleryFavorite(b.dataset.fav);
      refresh();
    }));
  }

  searchEl.addEventListener('input', refresh);
  sortEl.addEventListener('change', refresh);
  favEl.addEventListener('change', refresh);

  refresh();
}
