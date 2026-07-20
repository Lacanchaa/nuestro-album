```js
// ============================================================
// media.js — Multimedia separado por usuario
// ============================================================

import {
  idbGet,
  saveMediaFile,
  genId
} from './storage.js';

import {
  toEmbedUrl,
  escapeHtml
} from './ui.js';

// ------------------------------------------------------------
// RESOLVER MULTIMEDIA
// ------------------------------------------------------------

export async function resolveMediaSrc(item) {
  if (!item) {
    return '';
  }

  // Enlace externo
  if (item.source === 'link') {
    return item.url || '';
  }

  // Archivo local
  if (
    item.source === 'file' &&
    item.refId
  ) {
    const record = await idbGet(item.refId);

    if (!record) {
      return '';
    }

    return record.data || '';
  }

  return '';
}

// ------------------------------------------------------------
// CREAR MEDIA DESDE ARCHIVO
// ------------------------------------------------------------

export async function mediaItemFromFile(
  file,
  kind
) {
  if (!file) {
    throw new Error(
      'No se seleccionó ningún archivo'
    );
  }

  const record = await saveMediaFile(
    file,
    {
      kind
    }
  );

  return {
    id: genId(),

    kind,

    source: 'file',

    refId: record.id,

    name: file.name,

    addedAt: Date.now()
  };
}

// ------------------------------------------------------------
// CREAR MEDIA DESDE ENLACE
// ------------------------------------------------------------

export function mediaItemFromLink(
  url,
  kind
) {
  const cleanUrl =
    (url || '').trim();

  if (!cleanUrl) {
    throw new Error(
      'La URL está vacía'
    );
  }

  return {
    id: genId(),

    kind,

    source: 'link',

    url: cleanUrl,

    addedAt: Date.now()
  };
}

// ------------------------------------------------------------
// RENDERIZAR MULTIMEDIA
// ------------------------------------------------------------

export function renderMediaEmbed(
  item,
  srcResolved
) {
  if (!item) {
    return '';
  }

  // VIDEO
  if (item.kind === 'video') {
    if (
      item.source === 'link'
    ) {
      const embed =
        toEmbedUrl(item.url);

      if (embed) {
        return `
          <iframe
            src="${escapeHtml(embed)}"
            style="
              width:100%;
              aspect-ratio:16/9;
              border:0;
              border-radius:8px;
            "
            allowfullscreen>
          </iframe>
        `;
      }

      return `
        <video
          src="${escapeHtml(item.url)}"
          controls
          style="
            width:100%;
            border-radius:8px;
          ">
        </video>
      `;
    }

    return `
      <video
        src="${escapeHtml(srcResolved)}"
        controls
        style="
          width:100%;
          border-radius:8px;
        ">
      </video>
    `;
  }

  // AUDIO
  if (item.kind === 'audio') {
    return `
      <audio
        src="${escapeHtml(
          srcResolved || item.url || ''
        )}"
        controls
        style="width:100%">
      </audio>
    `;
  }

  // FOTO
  return `
    <img
      src="${escapeHtml(srcResolved)}"
      alt=""
      style="
        width:100%;
        border-radius:8px;
        object-fit:cover;
      ">
  `;
}
```
