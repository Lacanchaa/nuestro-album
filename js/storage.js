/* ============================================================
storage.js — Capa única de persistencia

DATOS ESTRUCTURADOS:
Se guardan en Supabase:
user_storage

ARCHIVOS MULTIMEDIA:
Se guardan localmente en IndexedDB.

IMPORTANTE:
lsGet, lsSet y lsRemove son ahora ASÍNCRONAS.
Deben utilizarse con await.

Ejemplo:

const datos = await lsGet("notas", []);

await lsSet("notas", datos);

await lsRemove("notas");

============================================================ */

// ============================================================
// SUPABASE
// ============================================================

const supabaseClient =
window.supabaseClient;

if (!supabaseClient) {

console.error(
"storage.js: Supabase no está conectado"
);

}

// ============================================================
// CONFIGURACIÓN
// ============================================================

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
  "storage.js: error leyendo sesión",
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
// SUPABASE STORAGE
// ============================================================

// ------------------------------------------------------------
// OBTENER DATO
// ------------------------------------------------------------

export async function lsGet(
key,
fallback = null
) {

try {

```
const userId =
  getCurrentUserId();


if (!userId) {

  console.warn(
    "lsGet: no hay usuario conectado"
  );


  return fallback;

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
      "data"
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "storage_key",
      key
    )
    .maybeSingle();


if (error) {

  console.error(
    "storage.lsGet error:",
    error
  );


  return fallback;

}


if (!data) {

  return fallback;

}


return data.data;
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

// ------------------------------------------------------------
// GUARDAR DATO
// ------------------------------------------------------------

export async function lsSet(
key,
value
) {

try {

```
const userId =
  getCurrentUserId();


if (!userId) {

  console.warn(
    "lsSet: no hay usuario conectado"
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
    "storage.lsSet error:",
    error
  );


  return false;

}


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

// ------------------------------------------------------------
// ELIMINAR DATO
// ------------------------------------------------------------

export async function lsRemove(
key
) {

try {

```
const userId =
  getCurrentUserId();


if (!userId) {

  console.warn(
    "lsRemove: no hay usuario conectado"
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
    .delete()
    .eq(
      "user_id",
      userId
    )
    .eq(
      "storage_key",
      key
    );


if (error) {

  console.error(
    "storage.lsRemove error:",
    error
  );


  return false;

}


return true;
```

}

catch (error) {

```
console.error(
  "storage.lsRemove error:",
  key,
  error
);


return false;
```

}

}

// ------------------------------------------------------------
// OBTENER TODOS LOS DATOS DEL USUARIO
// ------------------------------------------------------------

export async function lsAllKeysRaw() {

try {

```
const userId =
  getCurrentUserId();


if (!userId) {

  return {};

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
    "storage.lsAllKeysRaw error:",
    error
  );


  return {};

}


const output =
  {};


for (
  const item
  of data || []
) {

  output[
    item.storage_key
  ] =
    JSON.stringify(
      item.data
    );

}


return output;
```

}

catch (error) {

```
console.error(
  "storage.lsAllKeysRaw error:",
  error
);


return {};
```

}

}

// ============================================================
// INDEXEDDB — ARCHIVOS MULTIMEDIA
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
// GENERAR ID DE ARCHIVO
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
// BORRAR TODOS LOS ARCHIVOS
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
// FILE/BLOB → BASE64
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

  if (!file) {

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
// GUARDAR ARCHIVO MULTIMEDIA
// ============================================================

export async function saveMediaFile(
file,
meta = {}
) {

const base64 =
await fileToBase64(
file
);

const id =
genId();

const record = {

```
id:

  id,

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
