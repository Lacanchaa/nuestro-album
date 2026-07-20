function getUsers() {
  return lsGet(USERS_KEY, {});
}

function saveUsers(users) {
  lsSet(USERS_KEY, users);
}


/* =========================================================
   SUPABASE - REGISTRO DE USUARIOS
   ========================================================= */

async function registerUser({
  username,
  password,
  displayName,
  secQuestion,
  secAnswer
}) {

  username = (username || "").trim().toLowerCase();

  displayName = (displayName || "").trim();

  secQuestion = (secQuestion || "").trim();

  secAnswer = (secAnswer || "").trim();


  if (username.length < 3) {
    throw new Error(
      "El usuario debe tener al menos 3 caracteres"
    );
  }


  if (!password || password.length < 6) {
    throw new Error(
      "La contraseña debe tener al menos 6 caracteres"
    );
  }


  if (!secQuestion || !secAnswer) {
    throw new Error(
      "Completa la pregunta y respuesta de seguridad"
    );
  }


  // Convertimos el nombre de usuario en un email interno
  // porque Supabase Auth utiliza email y contraseña.
  const email =
    username + "@nuestroalbum.app";


  const supabaseClient =
    window.supabaseClient;


  if (!supabaseClient) {
    throw new Error(
      "Supabase no está conectado"
    );
  }


  const {
    data,
    error
  } = await supabaseClient.auth.signUp({

    email: email,

    password: password,

    options: {

      data: {

        username: username,

        display_name:
          displayName || username,

        security_question:
          secQuestion,

        security_answer:
          secAnswer.toLowerCase()

      }

    }

  });


  if (error) {

    console.error(
      "Error al registrar usuario:",
      error
    );

    throw new Error(
      error.message
    );

  }


  if (!data || !data.user) {

    throw new Error(
      "Supabase no devolvió el usuario creado"
    );

  }


  // Guardamos únicamente datos básicos locales
  // para que el resto de la aplicación pueda
  // seguir utilizando getCurrentUser().
  const localUser = {

    username: username,

    displayName:
      displayName || username,

    email: email,

    secQuestion: secQuestion,

    createdAt: Date.now(),

    supabaseId:
      data.user.id

  };


  const users =
    getUsers();


  users[username] =
    localUser;


  saveUsers(users);


  return localUser;

}


/* =========================================================
   SUPABASE - INICIO DE SESIÓN
   ========================================================= */

async function loginUser({
  username,
  password,
  remember
}) {

  username =
    (username || "")
      .trim()
      .toLowerCase();


  if (!username || !password) {

    throw new Error(
      "Introduce usuario y contraseña"
    );

  }


  const email =
    username + "@nuestroalbum.app";


  const supabaseClient =
    window.supabaseClient;


  if (!supabaseClient) {

    throw new Error(
      "Supabase no está conectado"
    );

  }


  const {
    data,
    error
  } =
    await supabaseClient.auth.signInWithPassword({

      email: email,

      password: password

    });


  if (error) {

    console.error(
      "Error al iniciar sesión:",
      error
    );

    throw new Error(
      "Usuario o contraseña incorrectos"
    );

  }


  const users =
    getUsers();


  const user =
    users[username] || {

      username: username,

      displayName:
        data.user.user_metadata
          ?.display_name || username,

      email: email,

      supabaseId:
        data.user.id

    };


  const session = {

    username: username,

    loggedInAt: Date.now(),

    remember: !!remember

  };


  lsSet(
    SESSION_KEY,
    session
  );


  if (!remember) {

    sessionStorage.setItem(
      "album_session_temp",
      "1"
    );

  }


  return user;

}
