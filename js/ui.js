// ============================================================
// ui.js — Helpers de interfaz reutilizables (toasts, modales, fechas)
// ============================================================

export function toast(message, type = 'info', duration = 3200) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export function openModal(innerHtml, { wide = false, onMount = null } = {}) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal-overlay';
  overlay.innerHTML = `<div class="modal-box ${wide ? 'wide' : ''}">${innerHtml}</div>`;
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.getElementById('modal-root').appendChild(overlay);
  document.addEventListener('keydown', escCloseHandler);
  if (onMount) onMount(overlay.querySelector('.modal-box'));
  return overlay;
}

function escCloseHandler(e) {
  if (e.key === 'Escape') closeModal();
}

export function openImageLightbox(src) {
  if (!src) return;
  openModal(`
    <button class="modal-close" id="lightbox-close" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.5);color:#fff;border-radius:50%;width:36px;height:36px">✕</button>
    <img src="${src}" alt="" style="width:100%;max-height:80vh;object-fit:contain;border-radius:12px;display:block">
  `, { wide: true, onMount: (box) => { box.style.padding = '10px'; box.style.position = 'relative'; box.style.background = 'transparent'; box.style.boxShadow = 'none'; } });
  document.getElementById('lightbox-close').addEventListener('click', closeModal);
}

export function closeModal() {
  const existing = document.getElementById('active-modal-overlay');
  if (existing) existing.remove();
  document.removeEventListener('keydown', escCloseHandler);
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtDate(dateStr, lang = 'es') {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function pad2(n) { return String(n).padStart(2, '0'); }

export function isoDate(y, m, d) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

export function todayIso() {
  const n = new Date();
  return isoDate(n.getFullYear(), n.getMonth(), n.getDate());
}

// Extrae YouTube/Vimeo id y devuelve una URL embebible, o null si no aplica
export function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let id = u.searchParams.get('v');
      if (!id && u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}
