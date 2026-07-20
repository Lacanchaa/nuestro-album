# Nuestro Álbum 💛

Álbum digital de recuerdos para parejas, basado en un calendario interactivo.
100% local: HTML5 + CSS3 + JavaScript ES6+ sin frameworks ni build step.

## ✨ Refactorización (esta entrega)

Se ha modernizado toda la interfaz y corregido errores, sin tocar la lógica
de negocio ni el formato de los datos guardados (tus datos existentes siguen
funcionando igual). Cambios principales:

- **Bug corregido**: en "Nuestra Historia" (el álbum diario), las fotos de
  un mismo día no se podían desplazar horizontalmente porque no tenían un
  ancho fijo dentro del contenedor flex. Ahora cada día tiene un carrusel
  horizontal real: arrastre con ratón, gesto táctil nativo, rueda del ratón,
  flechas de navegación, scroll-snap, animación de aparición y lightbox al
  pulsar una foto.
- **Diseño**: nuevo sistema de tokens (tipografía, espaciados, sombras por
  elevación, radios, transiciones) aplicado a botones, formularios, tarjetas,
  navegación, modales, toasts y estados vacíos. Se mantienen los 9 temas de
  color y las 8 plantillas.
- **Rendimiento**: el reloj del panel de inicio ya no reconstruye todo el
  DOM cada segundo, solo actualiza los números. Carga progresiva (`lazy`)
  en fotos de calendario, eventos, galería y álbum diario.
- **UX**: menú lateral móvil con fondo oscurecido y cierre táctil, sin
  parpadeo de tema al cargar la página, lightbox reutilizable para ver fotos
  en grande (álbum diario y galería).
- **Código**: eliminados imports sin usar; sin lógica ni funcionalidades
  eliminadas.

## Cómo ejecutarlo

**Simplemente abre `index.html` con doble clic.** No necesitas servidor,
ni internet (salvo para las tipografías de Google Fonts; si no hay conexión,
la app usa una tipografía de reserva y funciona igual).

Nota técnica: el código fuente está organizado en módulos ES6 dentro de
`js/*.js` (para que sea fácil de mantener y ampliar), pero `index.html`
carga `js/bundle.js`, que es esa misma lógica ya empaquetada en un único
archivo sin `type="module"`. Así evitamos el problema de CORS que impide
que los módulos ES6 carguen al abrir la página directamente desde el
disco (`file://`) en Chrome/Edge/Firefox/Safari.

Si en el futuro modificas algún archivo dentro de `js/` (no `bundle.js`),
tendrás que regenerar el bundle. Con Node.js instalado:

```bash
cd album
npm install --no-save esbuild
npx esbuild js/app.js --bundle --format=iife --outfile=js/bundle.js --target=es2018
```

## Qué incluye esta primera entrega (Módulo base)

- **Autenticación** completa: crear cuenta, iniciar sesión, mantener sesión,
  cambiar usuario/contraseña, recuperación por pregunta de seguridad.
- **Bloqueo por inactividad** configurable desde Ajustes.
- **Dashboard**: reloj en tiempo real, contador "tiempo juntos" (años → segundos),
  contadores de besos/abrazos, mensaje configurable, frase romántica del día.
- **Calendario** mensual interactivo: cada día admite fotos ilimitadas, vídeos
  (archivo local o enlace de YouTube/Vimeo/Drive), audios (archivo o enlace),
  comentario, reordenar por arrastre y elegir foto principal.
- **Nuestra Historia** (línea del tiempo): agrega automáticamente los días con
  contenido y los eventos, ordenados cronológicamente.
- **Eventos**: aniversario, cumpleaños, viaje, primera cita, primer beso,
  pedida u otro, con foto, descripción, ubicación y favoritos.
- **Notas**: categorías, etiquetas, prioridad, color y favoritos.
- **Galería**: todas las fotos del álbum con búsqueda por fecha, orden y favoritos.
- **Personalización**: 9 temas de color (claro, oscuro, rosa, lavanda, celeste,
  rojo, dorado, vintage, minimal) y 8 plantillas temáticas que además cambian
  el tipo de animación ambiental (pétalos, nieve, corazones, brillos…).
- **Multilenguaje** ES/EN con cambio instantáneo.
- **Reproductor de música global**: playlist, play/pausa, volumen, aleatorio,
  repetición (una/todas), subida de archivos o enlaces.
- **Lista de deseos (bucket list)** básica desde Ajustes.
- **Copia de seguridad**: exportar/importar todo (datos + multimedia) a un
  único archivo `.json`.
- **Almacenamiento**: `localStorage` para datos estructurados, `IndexedDB`
  para fotos/audios/vídeos locales (en base64), preparado para poder
  sustituirse por Firebase en el futuro sin tocar el resto de la app
  (basta con reimplementar `js/storage.js`).

## Arquitectura

```
album/
├── index.html
├── css/
│   ├── reset.css      (reset mínimo)
│   ├── themes.css      (variables de los 9 temas)
│   └── main.css        (estilos de toda la app)
└── js/
    ├── app.js           (router y orquestación principal)
    ├── auth.js           (registro/login/recuperación)
    ├── data.js            (acceso a días, notas, eventos, ajustes)
    ├── storage.js          (localStorage + IndexedDB)
    ├── media.js             (resolución de fotos/vídeos/audios)
    ├── music.js              (reproductor global)
    ├── theme.js               (aplicación de temas)
    ├── fx.js                   (animaciones ambientales)
    ├── i18n.js                  (multilenguaje)
    ├── ui.js                     (toasts, modales, helpers)
    └── views/
        ├── dashboard.js
        ├── calendar.js
        ├── timeline.js
        ├── events.js
        ├── notes.js
        ├── gallery.js
        └── settings.js
```

Cada vista expone `init(container)` y `destroy()`, y `app.js` hace de router
sencillo entre ellas. Todo el código está comentado y modularizado para que
sea fácil añadir el siguiente módulo sin tocar los anteriores.

## Próximos módulos (pendientes, a propósito)

Siguiendo la idea de avanzar de forma incremental y estable, quedan fuera de
esta primera entrega — y se pueden añadir uno a uno sobre esta misma base:

- Cartas y cápsulas del tiempo
- Ruleta de citas y juego de preguntas
- Mapa de lugares (requiere una librería de mapas o API externa)
- Modo sorpresa
- Buscador avanzado unificado (por persona/emoji sobre todo el álbum)
- Manifest + Service Worker para convertirlo en PWA instalable
- Integración real con Firebase (hoy la app ya está preparada para ello)

## Notas importantes

- Todo se guarda **solo en este navegador/dispositivo**. Si limpias los
  datos del navegador, perderás el álbum — usa "Exportar copia" en Ajustes
  con frecuencia.
- Los archivos multimedia se guardan como base64 en IndexedDB: cómodo para
  uso local, pero ten en cuenta que muchas fotos/vídeos pesados pueden
  acercarte a los límites de almacenamiento del navegador.
- Probado conceptualmente en Chrome, Edge, Firefox y Safari modernos
  (APIs usadas: IndexedDB, SubtleCrypto, FileReader — todas estándar y
  ampliamente soportadas).
