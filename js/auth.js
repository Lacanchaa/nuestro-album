// ============================================================
// auth.js — Autenticación local (usuario + contraseña con hash)
// No es criptografía de nivel bancario, pero evita guardar
// contraseñas en texto plano y es coherente con una app 100% local.
// ============================================================
import { lsGet, lsSet, lsRemove } from './storage.js';

const USERS_KEY = 'users';
const SESSION_KEY = 'session';

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
  return lsGet(USERS_KEY, {});
}
function saveUsers(users) {
  lsSet(USERS_KEY, users);
}

export function usernameExists(username) {
  const users = getUsers();
  return !!users[username.toLowerCase()];
}

export async function registerUser({ username, password, displayName, secQuestion, secAnswer }) {
  username = (username || '').trim().toLowerCase();
  if (username.length < 3) throw new Error('El usuario debe tener al menos 3 caracteres');
  if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
  if (!secQuestion || !secAnswer) throw new Error('Completa la pregunta de seguridad');
  const users = getUsers();
  if (users[username]) throw new Error('Ese usuario ya existe');

  const salt = randomSalt();
  const passHash = await sha256(salt + password);
  const secAnswerHash = await sha256(salt + secAnswer.trim().toLowerCase());

  users[username] = {
    username,
    displayName: displayName?.trim() || username,
    salt,
    passHash,
    secQuestion: secQuestion.trim(),
    secAnswerHash,
    createdAt: Date.now()
  };
  saveUsers(users);
  return users[username];
}

export async function loginUser({ username, password, remember }) {
  username = (username || '').trim().toLowerCase();
  const users = getUsers();
  const user = users[username];
  if (!user) throw new Error('Usuario o contraseña incorrectos');
  const hash = await sha256(user.salt + password);
  if (hash !== user.passHash) throw new Error('Usuario o contraseña incorrectos');

  const session = { username, loggedInAt: Date.now(), remember: !!remember };
  lsSet(SESSION_KEY, session);
  if (!remember) {
    sessionStorage.setItem('album_session_temp', '1');
  }
  return user;
}

export function logoutUser() {
  lsRemove(SESSION_KEY);
  sessionStorage.removeItem('album_session_temp');
}

export function getSession() {
  const session = lsGet(SESSION_KEY, null);
  if (!session) return null;
  // Si no se pidió "mantener sesión", solo es válida durante esta pestaña
  if (!session.remember && !sessionStorage.getItem('album_session_temp')) {
    lsRemove(SESSION_KEY);
    return null;
  }
  return session;
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const users = getUsers();
  return users[session.username] || null;
}

export function isAuthenticated() {
  return !!getSession();
}

export async function changePassword({ username, currentPassword, newPassword }) {
  username = (username || '').trim().toLowerCase();
  const users = getUsers();
  const user = users[username];
  if (!user) throw new Error('Usuario no encontrado');
  const hash = await sha256(user.salt + currentPassword);
  if (hash !== user.passHash) throw new Error('La contraseña actual no es correcta');
  if (!newPassword || newPassword.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
  const salt = randomSalt();
  user.passHash = await sha256(salt + newPassword);
  user.salt = salt;
  users[username] = user;
  saveUsers(users);
  return true;
}

export async function changeUsername({ oldUsername, newUsername }) {
  oldUsername = oldUsername.trim().toLowerCase();
  newUsername = newUsername.trim().toLowerCase();
  if (newUsername.length < 3) throw new Error('El usuario debe tener al menos 3 caracteres');
  const users = getUsers();
  if (!users[oldUsername]) throw new Error('Usuario no encontrado');
  if (users[newUsername]) throw new Error('Ese nombre de usuario ya está en uso');
  const user = { ...users[oldUsername], username: newUsername };
  delete users[oldUsername];
  users[newUsername] = user;
  saveUsers(users);
  const session = getSession();
  if (session) {
    session.username = newUsername;
    lsSet(SESSION_KEY, session);
  }
  return user;
}

export function getSecurityQuestion(username) {
  username = (username || '').trim().toLowerCase();
  const users = getUsers();
  const user = users[username];
  if (!user) throw new Error('Usuario no encontrado');
  return user.secQuestion;
}

export async function recoverPassword({ username, answer, newPassword }) {
  username = (username || '').trim().toLowerCase();
  const users = getUsers();
  const user = users[username];
  if (!user) throw new Error('Usuario no encontrado');
  const answerHash = await sha256(user.salt + answer.trim().toLowerCase());
  if (answerHash !== user.secAnswerHash) throw new Error('La respuesta no es correcta');
  if (!newPassword || newPassword.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
  const salt = randomSalt();
  user.salt = salt;
  user.passHash = await sha256(salt + newPassword);
  users[username] = user;
  saveUsers(users);
  return true;
}

export function updateDisplayName(username, displayName) {
  username = username.trim().toLowerCase();
  const users = getUsers();
  if (!users[username]) return;
  users[username].displayName = displayName;
  saveUsers(users);
}
