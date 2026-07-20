(function () {
"use strict";

const supabaseClient = window.supabaseClient;

if (!supabaseClient) {
console.error("Supabase no está conectado");
return;
}

console.log("Supabase conectado correctamente");

// ================================
// HASH
// ================================

function generateSalt() {
const array = new Uint8Array(16);

```
crypto.getRandomValues(array);

return Array.from(array)
  .map(function (byte) {
    return byte.toString(16).padStart(2, "0");
  })
  .join("");
```

}

async function hashValue(value, salt) {
const encoder = new TextEncoder();

```
const keyMaterial =
  await crypto.subtle.importKey(
    "raw",
    encoder.encode(value),
    {
      name: "PBKDF2"
    },
    false,
    ["deriveBits"]
  );

const hash =
  await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

return Array.from(new Uint8Array(hash))
  .map(function (byte) {
    return byte.toString(16).padStart(2, "0");
  })
  .join("");
```

}

async function createPasswordHash(password) {
const salt = generateSalt();

```
const hash =
  await hashValue(
    password,
    salt
  );

return salt + ":" + hash;
```

}

async function verifyPassword(
password,
storedHash
) {
if (!storedHash) {
return false;
}

```
const parts =
  storedHash.split(":");

if (parts.length !== 2) {
  return false;
}

const salt = parts[0];
const originalHash = parts[1];

const newHash =
  await hashValue(
    password,
    salt
  );

return newHash === originalHash;
```

}

async function createSecurityAnswerHash(
answer
) {
const salt =
generateSalt();

```
const hash =
  await hashValue(
    answer
      .trim()
      .toLowerCase(),
    salt
  );

return salt + ":" + hash;
```

}

// ================================
// SESIÓN
// ================================

function saveSession(user) {
const session = {
id: user.id,
username: user.username,
display_name: user.display_name
};

```
localStorage.setItem(
  "loggedUser",
  JSON.stringify(session)
);
```

}

function getLoggedUser() {
const raw =
localStorage.getItem(
"loggedUser"
);

```
if (!raw) {
  return null;
}

try {
  const user =
    JSON.parse(raw);

  if (
    !user ||
    !user.id ||
    !user.username
  ) {
    return null;
  }

  return user;

} catch (error) {
  console.error(
    "Error leyendo sesión:",
    error
  );

  localStorage.removeItem(
    "loggedUser"
  );

  return null;
}
```

}

// ================================
// PANTALLAS
// ================================

function showApp() {
const auth =
document.getElementById(
"screen-auth"
);

```
const app =
  document.getElementById(
    "screen-app"
  );

if (auth) {
  auth.classList.add(
    "hidden"
  );
}

if (app) {
  app.classList.remove(
    "hidden"
  );
}
```

}

function showAuth() {
const auth =
document.getElementById(
"screen-auth"
);

```
const app =
  document.getElementById(
    "screen-app"
  );

if (auth) {
  auth.classList.remove(
    "hidden"
  );
}

if (app) {
  app.classList.add(
    "hidden"
  );
}
```

}

// ================================
// REGISTRO
// ================================

const registerForm =
document.getElementById(
"form-register"
);

if (registerForm) {

```
registerForm.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    const displayNameElement =
      document.getElementById(
        "reg-displayname"
      );

    const usernameElement =
      document.getElementById(
        "reg-username"
      );

    const passwordElement =
      document.getElementById(
        "reg-password"
      );

    const password2Element =
      document.getElementById(
        "reg-password2"
      );

    const secQuestionElement =
      document.getElementById(
        "reg-secquestion"
      );

    const secAnswerElement =
      document.getElementById(
        "reg-secanswer"
      );

    const errorElement =
      document.getElementById(
        "register-error"
      );

    if (
      !usernameElement ||
      !passwordElement ||
      !password2Element ||
      !secQuestionElement ||
      !secAnswerElement ||
      !errorElement
    ) {
      console.error(
        "Faltan elementos del formulario de registro"
      );

      return;
    }

    const displayName =
      displayNameElement
        ? displayNameElement.value.trim()
        : "";

    const username =
      usernameElement.value
        .trim()
        .toLowerCase();

    const password =
      passwordElement.value;

    const password2 =
      password2Element.value;

    const secQuestion =
      secQuestionElement.value.trim();

    const secAnswer =
      secAnswerElement.value
        .trim()
        .toLowerCase();

    if (username.length < 3) {
      errorElement.textContent =
        "El usuario debe tener al menos 3 caracteres";

      return;
    }

    if (password.length < 6) {
      errorElement.textContent =
        "La contraseña debe tener al menos 6 caracteres";

      return;
    }

    if (password !== password2) {
      errorElement.textContent =
        "Las contraseñas no coinciden";

      return;
    }

    if (
      !secQuestion ||
      !secAnswer
    ) {
      errorElement.textContent =
        "Completa la pregunta y respuesta de seguridad";

      return;
    }

    try {

      errorElement.textContent =
        "Creando cuenta...";

      const searchResult =
        await supabaseClient
          .from("profiles")
          .select("id")
          .eq(
            "username",
            username
          )
          .maybeSingle();

      if (searchResult.error) {
        throw searchResult.error;
      }

      if (searchResult.data) {
        errorElement.textContent =
          "Ese nombre de usuario ya está registrado";

        return;
      }

      const passwordHash =
        await createPasswordHash(
          password
        );

      const securityAnswerHash =
        await createSecurityAnswerHash(
          secAnswer
        );

      const insertResult =
        await supabaseClient
          .from("profiles")
          .insert({
            username: username,
            display_name:
              displayName || username,
            password_hash:
              passwordHash,
            security_question:
              secQuestion,
            security_answer_hash:
              securityAnswerHash
          })
          .select()
          .single();

      if (insertResult.error) {
        throw insertResult.error;
      }

      console.log(
        "Usuario registrado:",
        insertResult.data
      );

      saveSession(
        insertResult.data
      );

      registerForm.reset();

      errorElement.textContent =
        "";

      alert(
        "Cuenta creada correctamente"
      );

      showApp();

    } catch (error) {

      console.error(
        "Error al registrar usuario:",
        error
      );

      errorElement.textContent =
        error.message ||
        "Error al crear la cuenta";
    }
  }
);
```

}

// ================================
// LOGIN
// ================================

const loginForm =
document.getElementById(
"form-login"
);

if (loginForm) {

```
loginForm.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    const usernameElement =
      document.getElementById(
        "login-username"
      );

    const passwordElement =
      document.getElementById(
        "login-password"
      );

    const errorElement =
      document.getElementById(
        "login-error"
      );

    if (
      !usernameElement ||
      !passwordElement ||
      !errorElement
    ) {
      console.error(
        "Faltan elementos del formulario de login"
      );

      return;
    }

    const username =
      usernameElement.value
        .trim()
        .toLowerCase();

    const password =
      passwordElement.value;

    if (
      !username ||
      !password
    ) {
      errorElement.textContent =
        "Introduce tu usuario y contraseña";

      return;
    }

    try {

      errorElement.textContent =
        "Iniciando sesión...";

      const searchResult =
        await supabaseClient
          .from("profiles")
          .select(
            "id, username, display_name, password_hash"
          )
          .eq(
            "username",
            username
          )
          .maybeSingle();

      if (searchResult.error) {
        throw searchResult.error;
      }

      if (!searchResult.data) {
        errorElement.textContent =
          "Usuario o contraseña incorrectos";

        return;
      }

      const correct =
        await verifyPassword(
          password,
          searchResult.data.password_hash
        );

      if (!correct) {
        errorElement.textContent =
          "Usuario o contraseña incorrectos";

        return;
      }

      saveSession(
        searchResult.data
      );

      console.log(
        "Inicio de sesión correcto:",
        searchResult.data.username
      );

      errorElement.textContent =
        "";

      showApp();

    } catch (error) {

      console.error(
        "Error al iniciar sesión:",
        error
      );

      errorElement.textContent =
        "Usuario o contraseña incorrectos";
    }
  }
);
```

}

// ================================
// RESTAURAR SESIÓN
// ================================

const loggedUser =
getLoggedUser();

if (
loggedUser &&
loggedUser.username
) {

```
console.log(
  "Sesión restaurada:",
  loggedUser.username
);

showApp();
```

} else {

```
showAuth();
```

}

// ================================
// CERRAR SESIÓN
// ================================

const logoutButton =
document.getElementById(
"btn-logout"
);

if (logoutButton) {

```
logoutButton.addEventListener(
  "click",
  function () {

    localStorage.removeItem(
      "loggedUser"
    );

    showAuth();
  }
);
```

}

})();
