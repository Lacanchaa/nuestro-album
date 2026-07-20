// ============================================================
// media.js — Multimedia por usuario
// ============================================================

import {
  idbGet,
  saveMediaFile,
  genId
} from './storage.js';

import {
  toEmbedUrl
} from './ui.js';

// ------------------------------------------------------------
// RESOLVER MEDIA
// ------------------------------------------------------------

export async function resolveMediaSrc(item) {

  if (!item) {
    return '';
  }

  if (item.source === 'link') {
    return item.url || '';
  }

  if (
    item.source === 'file' &&
    item.refId
  ) {
    const record = await idbGet(item.refId);

    return record
      ? record.data
      : '';
  }

  return '';
}

// ------------------------------------------------------------
// ARCHIVO LOCAL
// ------------------------------------------------------------

export async function mediaItemFromFile(
  file,
  kind
) {
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
// ENLACE EXTERNO
// ------------------------------------------------------------

export function mediaItemFromLink(
  url,
  kind
) {
  return {
    id: genId(),

    kind,

    source: 'link',

    url: url.trim(),

    addedAt: Date.now()
  };
}

// ------------------------------------------------------------
// RENDER MEDIA
// ------------------------------------------------------------

export function renderMediaEmbed(
  item,
  srcResolved
) {
  if (item.kind === 'video') {

    if (item.source === 'link') {

      const embed = toEmbedUrl(
        item.url
      );

      if (embed) {

        return `
          <iframe
            src="${embed}"
            style="
              width:100%;
              aspect-ratio:16/9;
              border:0;
              border-radius:8px
            "
            allowfullscreen>
          </iframe>
        `;
      }

      return `
        <video
          src="${item.url}"
          controls
          style="
            width:100%;
            border-radius:8px
          ">
        </video>
      `;
    }

    return `
      <video
        src="${srcResolved}"
        controls
        style="
          width:100%;
          border-radius:8px
        ">
      </video>
    `;
  }

  if (item.kind === 'audio') {

    return `
      <audio
        src="${srcResolved || item.url}"
        controls
        style="width:100%">
      </audio>
    `;
  }

  return `
    <img
      src="${srcResolved}"
      alt=""
      style="
        width:100%;
        border-radius:8px;
        object-fit:cover
      ">
  `;
}
