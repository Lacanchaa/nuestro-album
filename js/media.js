// ============================================================
// media.js — Resolución de multimedia (archivo local en IndexedDB o enlace externo)
// ============================================================
import { idbGet, saveMediaFile, genId } from './storage.js';
import { toEmbedUrl } from './ui.js';

// Devuelve una URL usable en <img>/<video>/<audio> para un item {source, refId, url}
export async function resolveMediaSrc(item) {
  if (item.source === 'link') return item.url;
  if (item.source === 'file' && item.refId) {
    const rec = await idbGet(item.refId);
    return rec ? rec.data : '';
  }
  return '';
}

// Crea un item de media a partir de un <input type=file>, guardándolo en IndexedDB
export async function mediaItemFromFile(file, kind) {
  const rec = await saveMediaFile(file, { kind });
  return { id: genId(), kind, source: 'file', refId: rec.id, name: file.name, addedAt: Date.now() };
}

// Crea un item de media a partir de una URL externa (video o audio)
export function mediaItemFromLink(url, kind) {
  return { id: genId(), kind, source: 'link', url: url.trim(), addedAt: Date.now() };
}

export function renderMediaEmbed(item, srcResolved) {
  if (item.kind === 'video') {
    if (item.source === 'link') {
      const embed = toEmbedUrl(item.url);
      if (embed) {
        return `<iframe src="${embed}" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px" allowfullscreen></iframe>`;
      }
      return `<video src="${item.url}" controls style="width:100%;border-radius:8px"></video>`;
    }
    return `<video src="${srcResolved}" controls style="width:100%;border-radius:8px"></video>`;
  }
  if (item.kind === 'audio') {
    return `<audio src="${srcResolved || item.url}" controls style="width:100%"></audio>`;
  }
  // photo
  return `<img src="${srcResolved}" alt="" style="width:100%;border-radius:8px;object-fit:cover">`;
}
