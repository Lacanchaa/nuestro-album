// ============================================================
// music.js — Reproductor global por usuario
// ============================================================

import {
getPlaylist,
addTrackToPlaylist,
removeTrackFromPlaylist
} from './data.js';

import {
mediaItemFromFile,
mediaItemFromLink,
resolveMediaSrc
} from './media.js';

import {
openModal,
closeModal,
toast,
escapeHtml
} from './ui.js';

import { getLang } from './i18n.js';

// ============================================================
// VARIABLES
// ============================================================

let audioEl = null;
let toggleBtn = null;
let trackNameEl = null;
let seekEl = null;
let volumeEl = null;
let shuffleBtn = null;
let repeatBtn = null;
let listBtn = null;
let playerBar = null;

let currentIndex = -1;
let shuffle = false;
let repeatMode = 'off';

// off | one | all

let initialized = false;

// ============================================================
// INICIALIZAR REPRODUCTOR
// ============================================================

export async function initPlayer() {

// Evitar que se agreguen eventos duplicados
if (initialized) return;

audioEl = document.getElementById('mp-audio');
toggleBtn = document.getElementById('mp-toggle');
trackNameEl = document.getElementById('mp-track-name');
seekEl = document.getElementById('mp-seek');
volumeEl = document.getElementById('mp-volume');
shuffleBtn = document.getElementById('mp-shuffle');
repeatBtn = document.getElementById('mp-repeat');
listBtn = document.getElementById('mp-list');
playerBar = document.getElementById('music-player');

// Si el HTML no tiene el reproductor,
// no rompemos toda la aplicación
if (
!audioEl ||
!toggleBtn ||
!trackNameEl ||
!seekEl ||
!volumeEl ||
!shuffleBtn ||
!repeatBtn ||
!listBtn ||
!playerBar
) {
console.warn(
'Reproductor de música: faltan elementos HTML'
);

```
return;
```

}

initialized = true;

// Volumen inicial
audioEl.volume = 0.7;

if (volumeEl.value === '') {
volumeEl.value = 0.7;
}

// ----------------------------------------------------------
// Eventos
// ----------------------------------------------------------

toggleBtn.addEventListener(
'click',
togglePlay
);

volumeEl.addEventListener(
'input',
() => {

```
  audioEl.volume =
    Number(volumeEl.value);

}
```

);

seekEl.addEventListener(
'input',
() => {

```
  if (
    audioEl.duration &&
    Number.isFinite(audioEl.duration)
  ) {

    audioEl.currentTime =
      (
        Number(seekEl.value) / 100
      ) * audioEl.duration;

  }

}
```

);

audioEl.addEventListener(
'timeupdate',
updateProgress
);

audioEl.addEventListener(
'ended',
handleEnded
);

audioEl.addEventListener(
'play',
() => {

```
  toggleBtn.textContent = '⏸';

}
```

);

audioEl.addEventListener(
'pause',
() => {

```
  toggleBtn.textContent = '▶';

}
```

);

shuffleBtn.addEventListener(
'click',
() => {

```
  shuffle = !shuffle;

  shuffleBtn.style.color =
    shuffle
      ? 'var(--accent)'
      : '';

}
```

);

repeatBtn.addEventListener(
'click',
() => {

```
  if (repeatMode === 'off') {

    repeatMode = 'all';

  } else if (repeatMode === 'all') {

    repeatMode = 'one';

  } else {

    repeatMode = 'off';

  }


  repeatBtn.textContent =
    repeatMode === 'one'
      ? '↻¹'
      : '↻';


  repeatBtn.style.color =
    repeatMode !== 'off'
      ? 'var(--accent)'
      : '';

}
```

);

listBtn.addEventListener(
'click',
openPlaylistModal
);

// ----------------------------------------------------------
// Cargar playlist del usuario actual
// ----------------------------------------------------------

try {

```
const list =
  await getPlaylist();

if (
  Array.isArray(list) &&
  list.length > 0
) {

  playerBar.classList.remove(
    'hidden'
  );

}
```

} catch (error) {

```
console.error(
  'Error cargando playlist:',
  error
);
```

}

}

// ============================================================
// PROGRESO
// ============================================================

function updateProgress() {

if (
!audioEl ||
!seekEl ||
!audioEl.duration ||
!Number.isFinite(audioEl.duration)
) {

```
return;
```

}

seekEl.value =
(
audioEl.currentTime /
audioEl.duration
) * 100;

}

// ============================================================
// CUANDO TERMINA UNA CANCIÓN
// ============================================================

function handleEnded() {

if (repeatMode === 'one') {

```
audioEl.currentTime = 0;

audioEl.play().catch(
  () => {}
);

return;
```

}

playNext();

}

// ============================================================
// CARGAR UNA CANCIÓN
// ============================================================

async function loadTrack(index) {

try {

```
const list =
  await getPlaylist();


if (
  !Array.isArray(list) ||
  list.length === 0
) {

  return;

}


if (
  index < 0 ||
  index >= list.length
) {

  return;

}


const track =
  list[index];


const src =
  await resolveMediaSrc(track);


if (!src) {

  toast(
    getLang() === 'en'
      ? 'Could not load track'
      : 'No se pudo cargar la pista',
    'error'
  );

  return;

}


currentIndex =
  index;


audioEl.src =
  src;


audioEl.load();


trackNameEl.textContent =
  track.name ||
  track.url ||
  'Track';


playerBar.classList.remove(
  'hidden'
);


await audioEl.play();
```

} catch (error) {

```
console.error(
  'Error cargando pista:',
  error
);


toast(
  getLang() === 'en'
    ? 'Could not play this track'
    : 'No se pudo reproducir esta pista',
  'error'
);
```

}

}

// ============================================================
// PLAY / PAUSE
// ============================================================

async function togglePlay() {

try {

```
const list =
  await getPlaylist();


if (
  !Array.isArray(list) ||
  list.length === 0
) {

  toast(
    getLang() === 'en'
      ? 'Add songs to the playlist first'
      : 'Añade canciones a la playlist primero',
    'info'
  );


  openPlaylistModal();


  return;

}


if (
  currentIndex === -1
) {

  await loadTrack(0);


  return;

}


if (
  audioEl.paused
) {

  await audioEl.play();


} else {

  audioEl.pause();

}
```

} catch (error) {

```
console.error(
  'Error en reproducción:',
  error
);
```

}

}

// ============================================================
// REPRODUCIR AUDIO DESDE UN DÍA / EVENTO
// ============================================================

export async function playFromDay(track) {

try {

```
if (!track) return;


const src =
  await resolveMediaSrc(track);


if (!src) {

  toast(
    getLang() === 'en'
      ? 'Could not load audio'
      : 'No se pudo cargar el audio',
    'error'
  );


  return;

}


audioEl.src =
  src;


audioEl.load();


trackNameEl.textContent =
  track.name ||
  track.url ||
  'Track';


playerBar.classList.remove(
  'hidden'
);


// -1 indica que no pertenece a la playlist
currentIndex = -1;


await audioEl.play();
```

} catch (error) {

```
console.error(
  'Error reproduciendo audio:',
  error
);
```

}

}

// ============================================================
// SIGUIENTE CANCIÓN
// ============================================================

async function playNext() {

try {

```
const list =
  await getPlaylist();


if (
  !Array.isArray(list) ||
  list.length === 0
) {

  return;

}


let nextIndex;


if (shuffle) {

  if (list.length === 1) {

    nextIndex = 0;

  } else {

    do {

      nextIndex =
        Math.floor(
          Math.random() *
          list.length
        );

    } while (
      nextIndex === currentIndex
    );

  }

} else {

  nextIndex =
    currentIndex + 1;

}


if (
  nextIndex >= list.length
) {

  if (
    repeatMode === 'all'
  ) {

    nextIndex = 0;

  } else {

    toggleBtn.textContent =
      '▶';


    return;

  }

}


await loadTrack(
  nextIndex
);
```

} catch (error) {

```
console.error(
  'Error reproduciendo siguiente pista:',
  error
);
```

}

}

// ============================================================
// MODAL DE PLAYLIST
// ============================================================

async function openPlaylistModal() {

const lang =
getLang();

const overlay =
openModal(`

```
  <div class="modal-head">

    <h3>
      ${
        lang === 'en'
          ? 'Playlist'
          : 'Lista de reproducción'
      }
    </h3>


    <button
      class="modal-close"
      id="pl-close"
    >
      ✕
    </button>

  </div>


  <div
    id="pl-list"
  >
    <p>
      ${
        lang === 'en'
          ? 'Loading...'
          : 'Cargando...'
      }
    </p>
  </div>


  <div
    style="
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-top:12px
    "
  >

    <label
      class="btn btn-ghost"
      style="cursor:pointer"
    >

      🎵

      ${
        lang === 'en'
          ? 'Upload song'
          : 'Subir canción'
      }


      <input
        type="file"
        id="pl-input-file"
        accept="audio/*"
        class="hidden"
      >

    </label>


    <button
      class="btn btn-ghost"
      id="pl-add-link"
    >

      🔗

      ${
        lang === 'en'
          ? 'Add link'
          : 'Añadir enlace'
      }

    </button>

  </div>

`
```

);

if (!overlay) return;

const closeButton =
overlay.querySelector(
'#pl-close'
);

if (closeButton) {

```
closeButton.addEventListener(
  'click',
  closeModal
);
```

}

// ----------------------------------------------------------
// REFRESCAR LISTA
// ----------------------------------------------------------

async function refresh() {

```
const box =
  overlay.querySelector(
    '#pl-list'
  );


if (!box) return;


try {

  const list =
    await getPlaylist();


  if (
    !Array.isArray(list) ||
    list.length === 0
  ) {

    box.innerHTML = `

      <p
        style="
          color:var(--text-muted);
          font-size:13px
        "
      >

        ${
          lang === 'en'
            ? 'No songs yet.'
            : 'Sin canciones todavía.'
        }

      </p>

    `;


    return;

  }


  box.innerHTML =
    list.map(
      (track, index) => `

        <div
          style="
            display:flex;
            align-items:center;
            gap:8px;
            padding:8px 0;
            border-bottom:1px solid var(--border)
          "
        >

          <button
            class="link-btn"
            data-play="${index}"
          >

            ${
              index === currentIndex
                ? '▶'
                : '♪'
            }

          </button>


          <span
            style="
              flex:1;
              font-size:13.5px
            "
          >

            ${
              escapeHtml(
                track.name ||
                track.url ||
                'Track'
              )
            }

          </span>


          <button
            class="icon-btn small"
            data-rm="${track.id}"
          >

            ✕

          </button>

        </div>

      `
    )
    .join('');


  // Botones de reproducir

  box
    .querySelectorAll(
      '[data-play]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          async () => {

            await loadTrack(
              Number(
                button.dataset.play
              )
            );


            await refresh();

          }
        );

      }
    );


  // Botones de eliminar

  box
    .querySelectorAll(
      '[data-rm]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          async () => {

            try {

              await removeTrackFromPlaylist(
                button.dataset.rm
              );


              // Si eliminamos la canción actual
              const newList =
                await getPlaylist();


              if (
                currentIndex >=
                newList.length
              ) {

                currentIndex =
                  newList.length - 1;

              }


              await refresh();


            } catch (error) {

              console.error(
                'Error eliminando canción:',
                error
              );


              toast(
                lang === 'en'
                  ? 'Could not remove track'
                  : 'No se pudo eliminar la canción',
                'error'
              );

            }

          }
        );

      }
    );


} catch (error) {

  console.error(
    'Error cargando playlist:',
    error
  );


  box.innerHTML = `

    <p
      style="
        color:var(--danger,#c00)
      "
    >

      ${
        lang === 'en'
          ? 'Could not load playlist.'
          : 'No se pudo cargar la playlist.'
      }

    </p>

  `;

}
```

}

await refresh();

// ----------------------------------------------------------
// SUBIR ARCHIVO
// ----------------------------------------------------------

const fileInput =
overlay.querySelector(
'#pl-input-file'
);

if (fileInput) {

```
fileInput.addEventListener(
  'change',
  async event => {

    const file =
      event.target.files?.[0];


    if (!file) return;


    try {

      const item =
        await mediaItemFromFile(
          file,
          'audio'
        );


      await addTrackToPlaylist(
        item
      );


      await refresh();


      toast(
        lang === 'en'
          ? 'Song added'
          : 'Canción añadida',
        'success'
      );


    } catch (error) {

      console.error(
        'Error añadiendo canción:',
        error
      );


      toast(
        lang === 'en'
          ? 'Could not add song'
          : 'No se pudo añadir la canción',
        'error'
      );

    }


    event.target.value =
      '';

  }
);
```

}

// ----------------------------------------------------------
// AÑADIR ENLACE
// ----------------------------------------------------------

const linkButton =
overlay.querySelector(
'#pl-add-link'
);

if (linkButton) {

```
linkButton.addEventListener(
  'click',
  async () => {

    const url =
      prompt(
        lang === 'en'
          ? 'Paste a direct audio link:'
          : 'Pega un enlace directo de audio:'
      );


    if (!url) return;


    const cleanUrl =
      url.trim();


    if (!cleanUrl) return;


    try {

      const item =
        mediaItemFromLink(
          cleanUrl,
          'audio'
        );


      await addTrackToPlaylist(
        item
      );


      await refresh();


      toast(
        lang === 'en'
          ? 'Song added'
          : 'Canción añadida',
        'success'
      );


    } catch (error) {

      console.error(
        'Error añadiendo enlace:',
        error
      );


      toast(
        lang === 'en'
          ? 'Could not add link'
          : 'No se pudo añadir el enlace',
        'error'
      );

    }

  }
);
```

}

}
