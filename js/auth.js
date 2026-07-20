// ============================================================
// auth.js — Autenticación con Supabase
// Datos y sesión separados por usuario
// ============================================================

const supabaseClient = window.supabaseClient;

if (!supabaseClient) {
throw new Error('Supabase no está conectado');
}

// ============================================================
// HASH DE CONTRASEÑA
// ============================================================

function generateSalt() {
const array = new Uint8Array(16);

crypto.getRandomValues(array);

return Array.from(array)
.map(byte => byte.toString(16).padStart(2, '0'))
.join('');
}

async function hashValue(value, salt) {
const encoder = new TextEncoder();

const keyMaterial = await crypto.subtle.importKey(
'raw',
encoder.encode(value),
{
name: 'PBKDF2'
},
false,
['deriveBits']
);

const hash = await crypto.subtle.deriveBits(
{
name: 'PBKDF2',
salt: encoder.encode(salt),
iterations: 100000,
hash: 'SHA-256'
},
keyMaterial,
256
);

return Array.from(new Uint8Array(hash))
.map(byte => byte.toString(16).padStart(2, '0'))
.join('');
}

async function createPasswordHash(password) {
const salt = generateSalt();

const hash = await hashValue(
password,
salt
);

return `${salt}:${hash}`;
}

async function verifyPassword(
password,
storedHash
) {
if (!storedHash) {
return false;
}

const parts =
storedHash.split(':');

if (parts.length !== 2) {
return false;
}

const salt =
parts[0];

const originalHash =
parts[1];

const newHash =
await hashValue(
password,
salt
);

return newHash === originalHash;
}

// ============================================================
// SESIÓN
// ============================================================

function saveSession(user) {
if (!user || !user.id) {
throw new Error(
'No se puede guardar una sesión inválida'
);
}

const session = {
id: user.id,
username: user.username,
displayName:
user.display_name ||
user.displayName ||
user.username
};

localStorage.setItem(
'loggedUser',
JSON.stringify(session)
);
}

export function getLoggedUser() {
const raw =
localStorage.getItem(
'loggedUser'
);

if (!raw) {
return null;
}

try {
return JSON.parse(raw);
} catch (error) {
console.error(
'Error leyendo sesión:',
error
);

```
localStorage.removeItem(
  'loggedUser'
);

return null;
```

}
}

export function getCurrentUser() {
return getLoggedUser();
}

export function isAuthenticated() {
return !!getLoggedUser();
}

export function logoutUser() {
localStorage.removeItem(
'loggedUser'
);
}

// ============================================================
// REGISTRO
// ============================================================

export async function registerUser({
username,
password,
displayName,
secQuestion,
secAnswer
}) {
const cleanUsername =
String(username || '')
.trim()
.toLowerCase();

const cleanDisplayName =
String(displayName || '')
.trim();

const cleanQuestion =
String(secQuestion || '')
.trim();

const cleanAnswer =
String(secAnswer || '')
.trim()
.toLowerCase();

if (cleanUsername.length < 3) {
throw new Error(
'El usuario debe tener al menos 3 caracteres'
);
}

if (password.length < 6) {
throw new Error(
'La contraseña debe tener al menos 6 caracteres'
);
}

if (!cleanQuestion || !cleanAnswer) {
throw new Error(
'Completa la pregunta y respuesta de seguridad'
);
}

// Comprobar si el usuario ya existe
const {
data: existingUser,
error: searchError
} = await supabaseClient
.from('profiles')
.select('id')
.eq('username', cleanUsername)
.maybeSingle();

if (searchError) {
throw searchError;
}

if (existingUser) {
throw new Error(
'Ese usuario ya existe'
);
}

// Crear hashes
const passwordHash =
await createPasswordHash(
password
);

const securityAnswerHash =
await createPasswordHash(
cleanAnswer
);

// Crear perfil
const {
data: user,
error: insertError
} = await supabaseClient
.from('profiles')
.insert({
username: cleanUsername,


  display_name:
    cleanDisplayName ||
    cleanUsername,

  password_hash:
    passwordHash,

  security_question:
    cleanQuestion,

  security_answer_hash:
    securityAnswerHash
})
.select()
.single();

if (insertError) {
throw insertError;
}

// Crear almacenamiento exclusivo del usuario
const {
error: storageError
} = await supabaseClient
.from('user_storage')
.insert({
user_id: user.id
});

if (storageError) {
console.error(
'Error creando user_storage:',
storageError
);

```
/*
 * No detenemos el registro porque el usuario
 * ya fue creado correctamente.
 */
```

}

saveSession(user);

return user;
}

// ============================================================
// LOGIN
// ============================================================

export async function loginUser({
username,
password
}) {
const cleanUsername =
String(username || '')
.trim()
.toLowerCase();

if (!cleanUsername || !password) {
throw new Error(
'Introduce tu usuario y contraseña'
);
}

const {
data: user,
error
} = await supabaseClient
.from('profiles')
.select(`       id,
      username,
      display_name,
      password_hash
    `)
.eq(
'username',
cleanUsername
)
.maybeSingle();

if (error) {
throw error;
}

if (!user) {
throw new Error(
'Usuario o contraseña incorrectos'
);
}

const correct =
await verifyPassword(
password,
user.password_hash
);

if (!correct) {
throw new Error(
'Usuario o contraseña incorrectos'
);
}

saveSession(user);

return getCurrentUser();
}

// ============================================================
// PREGUNTA DE SEGURIDAD
// ============================================================

export async function getSecurityQuestion(
username
) {
const cleanUsername =
String(username || '')
.trim()
.toLowerCase();

if (!cleanUsername) {
throw new Error(
'Introduce un nombre de usuario'
);
}

const {
data,
error
} = await supabaseClient
.from('profiles')
.select(
'security_question'
)
.eq(
'username',
cleanUsername
)
.maybeSingle();

if (error) {
throw error;
}

if (!data) {
throw new Error(
'Usuario no encontrado'
);
}

return data.security_question;
}

// ============================================================
// RECUPERAR CONTRASEÑA
// ============================================================

export async function recoverPassword({
username,
answer,
newPassword
}) {
const cleanUsername =
String(username || '')
.trim()
.toLowerCase();

const cleanAnswer =
String(answer || '')
.trim()
.toLowerCase();

if (!cleanUsername) {
throw new Error(
'Introduce un nombre de usuario'
);
}

if (!cleanAnswer) {
throw new Error(
'Introduce la respuesta de seguridad'
);
}

if (!newPassword || newPassword.length < 6) {
throw new Error(
'La nueva contraseña debe tener al menos 6 caracteres'
);
}

const {
data: user,
error
} = await supabaseClient
.from('profiles')
.select(`       id,
      security_answer_hash
    `)
.eq(
'username',
cleanUsername
)
.maybeSingle();

if (error) {
throw error;
}

if (!user) {
throw new Error(
'Usuario no encontrado'
);
}

const correct =
await verifyPassword(
cleanAnswer,
user.security_answer_hash
);

if (!correct) {
throw new Error(
'La respuesta de seguridad no es correcta'
);
}

const newPasswordHash =
await createPasswordHash(
newPassword
);

const {
error: updateError
} = await supabaseClient
.from('profiles')
.update({
password_hash:
newPasswordHash
})
.eq(
'id',
user.id
);

if (updateError) {
throw updateError;
}

return true;
}
