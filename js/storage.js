/* ============================================================
storage.js — Persistencia local + sincronización con Supabase

DATOS ESTRUCTURADOS:

* Se mantienen en LocalStorage para que la aplicación actual
  siga funcionando sin cambios.
* Se sincronizan automáticamente con Supabase.

MULTIMEDIA:

* Se mantiene en IndexedDB.

TABLA SUPABASE:
user_storage

Columnas necesarias:

* id
* user_id
* storage_key
* data
* updated_at

============================================================ */

// ============================================================
// CONFIGURACIÓN
// ============================================================

const LS_PREFIX =
"album_";

const SESSION_KEY =
"loggedUser";

const IDB_NAME =
"album_media_db";

const IDB_STORE =
"media";

const IDB_VERSION =
1;

let dbPromise =
null;

// ============================================================
// SUPABASE
// ============================================================

const supabaseClient =
window.supabaseClient;

// ============================================================
// OBTENER USUARIO ACTUAL
// ============================================================

function getCurrentUser() {

try {

```
const raw =
  localStorage.getItem(
    SESSION_KEY
  );


if (!raw) {

  return null;

}


const user =
  JSON.parse(
    raw
  );


if (
  !user ||
  !user.id
) {

  return null;

}


return user;
```

}

catch (error) {

```
console.error(
  "Error leyendo usuario actual:",
  error
);


return null;
```

}

}

// ============================================================
// OBTENER ID DEL USUARIO
// ============================================================

function getCurrentUserId() {

const user =
getCurrentUser();

return user
? user.id
: null;

}

// ============================================================
// SINCRONIZAR CON SUPABASE
// ============================================================
//
// Esta función se ejecuta en segundo plano.
// No bloquea la aplicación.
//
// ============================================================

async function syncToSupabase(
key,
value
) {

try {

```
if (!supabaseClient) {

  console.warn(
    "Supabase no está conectado"
  );


  return false;

}


const userId =
  getCurrentUserId();


if (!userId) {

  console.warn(
    "No hay usuario conectado"
  );


  return false;

}


const {
  error
} =
  await supabaseClient
    .from(
      "user_storage"
    )
    .upsert(

      {

        user_id:
          userId,

        storage_key:
          key,

        data:
          value,

        updated_at:
          new Date()
            .toISOString()

      },

      {

        onConflict:
          "user_id,storage_key"

      }

    );


if (error) {

  console.error(
    "Error sincronizando con Supabase:",
    error
  );


  return false;

}


console.log(
  "Datos sincronizados:",
  key
);


return true;
```

}

catch (error) {

```
console.error(
  "Error de sincronización:",
  error
);


return false;
```

}

}

// ============================================================
// CARGAR DATOS DESDE SUPABASE
// ============================================================
//
// Se utiliza cuando el usuario inicia sesión.
// Los datos descargados reemplazan la copia local.
//
// ============================================================

export async function syncFromSupabase() {

try {

```
if (!supabaseClient) {

  return false;

}


const userId =
  getCurrentUserId();


if (!userId) {

  return false;

}


const {
  data,
  error
} =
  await supabaseClient
    .from(
      "user_storage"
    )
    .select(
      "storage_key,data"
    )
    .eq(
      "user_id",
      userId
    );


if (error) {

  console.error(
    "Error cargando datos desde Supabase:",
    error
  );


  return false;

}


for (
  const item
  of data || []
) {

  localStorage.setItem(

    LS_PREFIX +
      item.storage_key,

    JSON.stringify(
      item.data
    )

  );

}


console.log(
  "Datos del usuario cargados desde Supabase"
);


return true;
```

}

catch (error) {

```
console.error(
  "Error sincronizando datos:",
  error
);


return false;
```

}

}

// ============================================================
// LOCALSTORAGE + SUPABASE
// ============================================================

// ---------------- OBTENER ----------------

export function lsGet(
key,
fallback = null
) {

try {

```
const raw =
  localStorage.getItem(
    LS_PREFIX +
      key
  );


if (
  raw === null
) {

  return fallback;

}


return JSON.parse(
  raw
);
```

}

catch (error) {

```
console.error(
  "storage.lsGet error:",
  key,
  error
);


return fallback;
```

}

}

// ---------------- GUARDAR ----------------

export function lsSet(
key,
value
) {

try {

```
localStorage.setItem(

  LS_PREFIX +
    key,

  JSON.stringify(
    value
  )

);


// Sincroniza sin bloquear
syncToSupabase(
  key,
  value
);


return true;
```

}

catch (error) {

```
console.error(
  "storage.lsSet error:",
  key,
  error
);


return false;
```

}

}

// ---------------- ELIMINAR ----------------

export function lsRemove(
key
) {

try {

```
localStorage.removeItem(

  LS_PREFIX +
    key

);


const userId =
  getCurrentUserId();


if (
  supabaseClient &&
  userId
) {

  supabaseClient

    .from(
      "user_storage"
    )

    .delete()

    .eq(
      "user_id",
      userId
    )

    .eq(
      "storage_key",
      key
    )

    .then(

      function ({
        error
      }) {

        if (error) {

          console.error(
            "Error eliminando dato de Supabase:",
            error
          );

        }

      }

    );

}
```

}

catch (error) {

```
console.error(
  "storage.lsRemove error:",
  key,
  error
);
```

}

}

// ============================================================
// TODAS LAS CLAVES LOCALES
// ============================================================

export function lsAllKeysRaw() {

const output =
{};

for (
let i = 0;

```
i <
localStorage.length;

i++
```

) {

```
const key =
  localStorage.key(
    i
  );


if (

  key &&

  key.startsWith(
    LS_PREFIX
  )

) {

  output[
    key.slice(
      LS_PREFIX.length
    )
  ] =
    localStorage.getItem(
      key
    );

}
```

}

return output;

}

// ============================================================
// INDEXEDDB
// ============================================================

function openDB() {

if (dbPromise) {

```
return dbPromise;
```

}

dbPromise =
new Promise(

```
  function (
    resolve,
    reject
  ) {

    const request =
      indexedDB.open(

        IDB_NAME,

        IDB_VERSION

      );


    request.onupgradeneeded =
      function () {

        const db =
          request.result;


        if (

          !db.objectStoreNames.contains(
            IDB_STORE
          )

        ) {

          db.createObjectStore(

            IDB_STORE,

            {
              keyPath:
                "id"
            }

          );

        }

      };


    request.onsuccess =
      function () {

        resolve(
          request.result
        );

      };


    request.onerror =
      function () {

        reject(
          request.error
        );

      };

  }

);
```

return dbPromise;

}

// ============================================================
// GENERAR ID
// ============================================================

export function genId() {

return (

```
"m_" +

Date.now()
  .toString(36) +

"_" +

Math.random()
  .toString(36)
  .slice(2, 9)
```

);

}

// ============================================================
// GUARDAR ARCHIVO
// ============================================================

export async function idbPut(
record
) {

const db =
await openDB();

return new Promise(

```
function (
  resolve,
  reject
) {

  const tx =
    db.transaction(

      IDB_STORE,

      "readwrite"

    );


  tx.objectStore(
    IDB_STORE
  ).put(
    record
  );


  tx.oncomplete =
    function () {

      resolve(
        record
      );

    };


  tx.onerror =
    function () {

      reject(
        tx.error
      );

    };

}
```

);

}

// ============================================================
// OBTENER ARCHIVO
// ============================================================

export async function idbGet(
id
) {

const db =
await openDB();

return new Promise(

```
function (
  resolve,
  reject
) {

  const tx =
    db.transaction(

      IDB_STORE,

      "readonly"

    );


  const request =
    tx.objectStore(
      IDB_STORE
    ).get(
      id
    );


  request.onsuccess =
    function () {

      resolve(
        request.result ||
        null
      );

    };


  request.onerror =
    function () {

      reject(
        request.error
      );

    };

}
```

);

}

// ============================================================
// ELIMINAR ARCHIVO
// ============================================================

export async function idbDelete(
id
) {

const db =
await openDB();

return new Promise(

```
function (
  resolve,
  reject
) {

  const tx =
    db.transaction(

      IDB_STORE,

      "readwrite"

    );


  tx.objectStore(
    IDB_STORE
  ).delete(
    id
  );


  tx.oncomplete =
    function () {

      resolve(
        true
      );

    };


  tx.onerror =
    function () {

      reject(
        tx.error
      );

    };

}
```

);

}

// ============================================================
// OBTENER TODOS LOS ARCHIVOS
// ============================================================

export async function idbGetAll() {

const db =
await openDB();

return new Promise(

```
function (
  resolve,
  reject
) {

  const tx =
    db.transaction(

      IDB_STORE,

      "readonly"

    );


  const request =
    tx.objectStore(
      IDB_STORE
    ).getAll();


  request.onsuccess =
    function () {

      resolve(
        request.result ||
        []
      );

    };


  request.onerror =
    function () {

      reject(
        request.error
      );

    };

}
```

);

}

// ============================================================
// BORRAR ARCHIVOS
// ============================================================

export async function idbClear() {

const db =
await openDB();

return new Promise(

```
function (
  resolve,
  reject
) {

  const tx =
    db.transaction(

      IDB_STORE,

      "readwrite"

    );


  tx.objectStore(
    IDB_STORE
  ).clear();


  tx.oncomplete =
    function () {

      resolve(
        true
      );

    };


  tx.onerror =
    function () {

      reject(
        tx.error
      );

    };

}
```

);

}

// ============================================================
// FILE → BASE64
// ============================================================

export function fileToBase64(
file
) {

return new Promise(

```
function (
  resolve,
  reject
) {

  if (
    !file
  ) {

    reject(

      new Error(
        "Archivo vacío"
      )

    );


    return;

  }


  const reader =
    new FileReader();


  reader.onload =
    function () {

      resolve(
        reader.result
      );

    };


  reader.onerror =
    function () {

      reject(
        reader.error
      );

    };


  reader.readAsDataURL(
    file
  );

}
```

);

}

// ============================================================
// GUARDAR MULTIMEDIA
// ============================================================

export async function saveMediaFile(
file,
meta = {}
) {

const base64 =
await fileToBase64(
file
);

const record = {

```
id:
  genId(),

kind:
  meta.kind ||
  "photo",

mime:
  file.type,

name:
  file.name ||
  "",

data:
  base64,

createdAt:
  Date.now(),

...meta
```

};

await idbPut(
record
);

return record;

}
