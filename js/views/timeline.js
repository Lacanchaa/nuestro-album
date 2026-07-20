// ============================================================
// views/timeline.js — "Nuestra Historia" / Álbum Diario:
// todos los recuerdos en orden, con un carrusel horizontal de
// fotos por cada día (scroll táctil, con rueda y por arrastre).
// ============================================================
import { getAllDays, getEvents, dayHasContent } from '../data.js';
import { resolveMediaSrc } from '../media.js';
import { escapeHtml, fmtDate, openImageLightbox } from '../ui.js';
import { getLang } from '../i18n.js';

export function destroy() {}

export function init(container) {
  render(container);
}

async function render(container) {
  const lang = getLang();
  container.innerHTML = `<div class="timeline" id="timeline-list"><p style="color:var(--text-muted)">${lang === 'en' ? 'Loading…' : 'Cargando…'}</p></div>`;

  const days = getAllDays();
  const events = getEvents();

  const items = [];
  for (const [iso, day] of Object.entries(days)) {
    if (dayHasContent(day)) items.push({ date: iso, kind: 'day', data: day });
  }
  for (const ev of events) {
    items.push({ date: ev.date, kind: 'event', data: ev });
  }
  items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const list = container.querySelector('#timeline-list');
  if (!items.length) {
    list.outerHTML = `<div class="empty-state">
      <div class="empty-state-mark">〜</div>
      <p>${lang === 'en' ? 'Your story starts here. Add memories in the Calendar or Events.' : 'Vuestra historia empieza aquí. Añadid recuerdos en el Calendario o en Eventos.'}</p>
    </div>`;
    return;
  }

  list.innerHTML = '';
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'tl-item';
    el.style.animationDelay = `${Math.min(i, 12) * 40}ms`;

    if (item.kind === 'day') {
      const photos = (item.data.media || []).filter(m => m.kind === 'photo').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      el.innerHTML = `
        <div class="tl-date">📅 ${fmtDate(item.date, lang)}</div>
        <div class="tl-card">
          ${item.data.comment ? `<p>${escapeHtml(item.data.comment)}</p>` : `<p style="color:var(--text-muted)">${lang === 'en' ? 'A day to remember' : 'Un día para recordar'}</p>`}
          ${photos.length ? `
            <div class="tl-media-wrap">
              <button type="button" class="tl-media-nav prev" aria-label="${lang === 'en' ? 'Scroll left' : 'Desplazar a la izquierda'}">‹</button>
              <div class="tl-media" id="tl-media-${item.date}" tabindex="0"></div>
              <button type="button" class="tl-media-nav next" aria-label="${lang === 'en' ? 'Scroll right' : 'Desplazar a la derecha'}">›</button>
            </div>
          ` : ''}
        </div>
      `;
      list.appendChild(el);
      if (photos.length) setupDayCarousel(el, item.date, photos);
    } else {
      const ev = item.data;
      el.innerHTML = `
        <div class="tl-date">✧ ${fmtDate(ev.date, lang)}</div>
        <div class="tl-card">
          <div class="tl-title">${escapeHtml(ev.title)}</div>
          ${ev.description ? `<p>${escapeHtml(ev.description)}</p>` : ''}
          ${ev.location ? `<p style="color:var(--text-muted);font-size:13px">📍 ${escapeHtml(ev.location)}</p>` : ''}
        </div>
      `;
      list.appendChild(el);
    }
  });
}

// Carga las fotos del carrusel, activa el desplazamiento horizontal por
// arrastre (ratón/touch), la rueda del ratón y las flechas de navegación.
function setupDayCarousel(root, dateKey, photos) {
  const mediaEl = root.querySelector(`#tl-media-${dateKey}`);
  const prevBtn = root.querySelector('.tl-media-nav.prev');
  const nextBtn = root.querySelector('.tl-media-nav.next');

  // Inserta las imágenes con animación de aparición escalonada y carga progresiva
  photos.forEach((p, idx) => {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.style.animationDelay = `${idx * 60}ms`;
    mediaEl.appendChild(img);
    resolveMediaSrc(p).then(src => {
      if (!src) { img.remove(); return; }
      img.src = src;
      img.addEventListener('click', () => openImageLightbox(src));
    }).catch(() => img.remove());
  });

  function updateNavVisibility() {
    const canScroll = mediaEl.scrollWidth > mediaEl.clientWidth + 4;
    prevBtn.classList.toggle('is-visible', canScroll && mediaEl.scrollLeft > 4);
    nextBtn.classList.toggle('is-visible', canScroll && mediaEl.scrollLeft < mediaEl.scrollWidth - mediaEl.clientWidth - 4);
  }

  const scrollByAmount = () => Math.max(160, mediaEl.clientWidth * 0.7);
  prevBtn.addEventListener('click', () => mediaEl.scrollBy({ left: -scrollByAmount(), behavior: 'smooth' }));
  nextBtn.addEventListener('click', () => mediaEl.scrollBy({ left: scrollByAmount(), behavior: 'smooth' }));
  mediaEl.addEventListener('scroll', updateNavVisibility, { passive: true });
  window.addEventListener('resize', updateNavVisibility, { passive: true });

  // Rueda vertical del ratón → desplazamiento horizontal (comodidad en escritorio)
  mediaEl.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    mediaEl.scrollLeft += e.deltaY;
    e.preventDefault();
  }, { passive: false });

  // Arrastrar para desplazar (ratón); el touch nativo ya funciona vía overflow-x
  let isDown = false, startX = 0, startScroll = 0, moved = false;
  mediaEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // el navegador ya gestiona el touch nativamente
    isDown = true; moved = false;
    startX = e.clientX; startScroll = mediaEl.scrollLeft;
    mediaEl.classList.add('dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    mediaEl.scrollLeft = startScroll - dx;
  });
  window.addEventListener('pointerup', () => {
    isDown = false;
    mediaEl.classList.remove('dragging');
  });
  mediaEl.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);

  setTimeout(updateNavVisibility, 50);
}
