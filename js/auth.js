// ============================================================
// auth.js — Autenticación con Supabase
// ============================================================

const supabaseClient = window.supabaseClient;

if (!supabaseClient) {
  throw new Error('Supabase no está conectado');
}

// ------------------------------------------------------------
// Hash de contraseña
// ------------------------------------------------------------

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
    { name: 'PBKDF2' },
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
  const hash = await hashValue(password, salt);

  return `${salt}:${hash}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  const parts = storedHash.split(':');

  if (parts.length !== 2) return false;

  const salt = parts[0];
  const originalHash = parts[1];

  const newHash = await hashValue(password, salt);

  return newHash === originalHash;
}

// ------------------------------------------------------------
// Sesión
// ------------------------------------------------------------

function saveSession(user) {
  const session = {
    id: user.id,
    username: user.username,
    display_name: user.display_name
  };

  localStorage.setItem(
    'loggedUser',
    JSON.stringify(session)
  );
}

export function getLoggedUser() {
  const raw = localStorage.getItem('loggedUser');

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('loggedUser');
    return null;
  }
}

export function getCurrentUser() {
  return getLoggedUser();
}

export function isAuthenticated() {
  return !!getLoggedUser();
}

export function logoutUser() {
  localStorage.removeItem('loggedUser');
}

// ------------------------------------------------------------
// Registro
// ------------------------------------------------------------

export async function registerUser({
  username,
  password,
  displayName,
  secQuestion,
  secAnswer
}) {
  username = username.trim().toLowerCase();

  if (username.length < 3) {
    throw new Error('El usuario debe tener al menos 3 caracteres');
  }

  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  if (!secQuestion || !secAnswer) {
    throw new Error('Completa la pregunta y respuesta de seguridad');
  }

  const { data: existingUser, error: searchError } =
    await supabaseClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

  if (searchError) throw searchError;

  if (existingUser) {
    throw new Error('Ese usuario ya existe');
  }

  const passwordHash =
    await createPasswordHash(password);

  const securityAnswerHash =
    await createPasswordHash(
      secAnswer.trim().toLowerCase()
    );

  const { data: user, error } =
    await supabaseClient
      .from('profiles')
      .insert({
        username,
        display_name: displayName?.trim() || username,
        password_hash: passwordHash,
        security_question: secQuestion.trim(),
        security_answer_hash: securityAnswerHash
      })
      .select()
      .single();

  if (error) throw error;

  // Crear almacenamiento exclusivo para este usuario
  const { error: storageError } =
    await supabaseClient
      .from('user_storage')
      .insert({
        user_id: user.id
      });

  if (storageError) {
    console.error(
      'Error creando user_storage:',
      storageError
    );
  }

  saveSession(user);

  return user;
}

// ------------------------------------------------------------
// Login
// ------------------------------------------------------------

export async function loginUser({
  username,
  password
}) {
  username = username.trim().toLowerCase();

  const { data: user, error } =
    await supabaseClient
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        password_hash
      `)
      .eq('username', username)
      .maybeSingle();

  if (error) throw error;

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

  return user;
}

// ------------------------------------------------------------
// Pregunta de seguridad
// ------------------------------------------------------------

export async function getSecurityQuestion(username) {
  username = username.trim().toLowerCase();

  const { data, error } =
    await supabaseClient
      .from('profiles')
      .select('security_question')
      .eq('username', username)
      .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('Usuario no encontrado');
  }

  return data.security_question;
}

// ------------------------------------------------------------
// Recuperar contraseña
// ------------------------------------------------------------

export async function recoverPassword({
  username,
  answer,
  newPassword
}) {
  username = username.trim().toLowerCase();

  if (newPassword.length < 6) {
    throw new Error(
      'La nueva contraseña debe tener al menos 6 caracteres'
    );
  }

  const { data: user, error } =
    await supabaseClient
      .from('profiles')
      .select(`
        id,
        security_answer_hash
      `)
      .eq('username', username)
      .maybeSingle();

  if (error) throw error;

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const correct =
    await verifyPassword(
      answer.trim().toLowerCase(),
      user.security_answer_hash
    );

  if (!correct) {
    throw new Error(
      'La respuesta de seguridad no es correcta'
    );
  }

  const newPasswordHash =
    await createPasswordHash(newPassword);

  const { error: updateError } =
    await supabaseClient
      .from('profiles')
      .update({
        password_hash: newPasswordHash
      })
      .eq('id', user.id);

  if (updateError) throw updateError;

  return true;
}
