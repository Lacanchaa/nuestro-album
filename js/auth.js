(function () {
"use strict";

const supabaseClient = window.supabaseClient;

if (!supabaseClient) {
console.error("Supabase no está conectado");
return;
}

console.log("Supabase conectado correctamente");

// =====================================================
// HASH
// =====================================================

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
const keyMaterial = await crypto.subtle.importKey(
  "raw",
  encoder.encode(value),
  {
    name: "PBKDF2"
  },
  false,
  ["deriveBits"]
);

const hash = await crypto.subtle.deriveBits(
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
const hash = await hashValue(password, salt);

```
return salt + ":" + hash;
```

}

async function verifyPassword(password, storedHash) {
if (!storedHash) {
return false;
}

```
const parts = storedHash.split(":");

if (parts.length !== 2) {
  return false;
}

const salt = parts[0];
const originalHash = parts[1];

const newHash = await hashValue(password, salt);

return newHash === originalHash;
```

}

async function createSecurityAnswerHash(answer) {
const salt = generateSalt();

```
const hash = await hashValue(
  answer.trim().toLowerCase(),
  salt
);

return salt + ":" + hash;
```

}

// =====================================================
// SESIÓN
// =====================================================

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
const raw = localStorage.getItem("loggedUser");

```
if (!raw) {
  return null;
}

try {
  const user = JSON.parse(raw);

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

  localStorage.removeItem("loggedUser");

  return null;
}
```

}

// =====================================================
// PANTALLAS
// =====================================================

function showApp() {
const screenAuth =
document.getElementById("screen-auth");

```
const screenApp =
  document.getElementById("screen-app");

if (screenAuth) {
  screenAuth.classList.add("hidden");
}

if (screenApp) {
  screenApp.classList.remove("hidden");
}
```

}

function showAuth() {
const screenAuth =
document.getElementById("screen-auth");

```
const screenApp =
  document.getElementById("screen-app");

if (screenAuth) {
  screenAuth.classList.remove("hidden");
}

if (screenApp) {
  screenApp.classList.add("hidden");
}
```

}

// =====================================================
// REGISTRO
// =====================================================

const registerForm =
document.getElementById("form-register");

if (registerForm) {
registerForm.addEventListener(
"submit",
async function (event) {
event.preventDefault();

```
    const displayNameInput =
      document.getElementById("reg-displayname");

    const usernameInput =
      document.getElementById("reg-username");

    const passwordInput =
      document.getElementById("reg-password");

    const password2Input =
      document.getElementById("reg-password2");

    const secQuestionInput =
      document.getElementById("reg-secquestion");

    const secAnswerInput =
      document.getElementById("reg-secanswer");

    const errorElement =
      document.getElementById("register-error");

    if (
      !displayNameInput ||
      !usernameInput ||
      !passwordInput ||
      !password2Input ||
      !secQuestionInput ||
      !secAnswerInput ||
      !errorElement
    ) {
      console.error(
        "Faltan elementos del formulario de registro"
      );

      return;
    }

    const displayName =
      displayNameInput.value.trim();

    const username =
      usernameInput.value.trim().toLowerCase();

    const password =
      passwordInput.value;

    const password2 =
      password2Input.value;

    const secQuestion =
      secQuestionInput.value.trim();

    const secAnswer =
      secAnswerInput.value.trim().toLowerCase();

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

    if (!secQuestion || !secAnswer) {
      errorElement.textContent =
        "Completa la pregunta y respuesta de seguridad";

      return;
    }

    try {
      errorElement.textContent =
        "Creando cuenta...";

      const existingUserResult =
        await supabaseClient
          .from("profiles")
          .select("id")
          .eq("username", username)
          .maybeSingle();

      if (existingUserResult.error) {
        throw existingUserResult.error;
      }

      if (existingUserResult.data) {
        errorElement.textContent =
          "Ese nombre de usuario ya está registrado";

        return;
      }

      const passwordHash =
        await createPasswordHash(password);

      const securityAnswerHash =
        await createSecurityAnswerHash(secAnswer);

      const insertResult =
        await supabaseClient
          .from("profiles")
          .insert({
            username: username,
            display_name: displayName || username,
            password_hash: passwordHash,
            security_question: secQuestion,
            security_answer_hash: securityAnswerHash
          })
          .select()
          .single();

      if (insertResult.error) {
        throw insertResult.error;
      }

      if (!insertResult.data) {
        throw new Error(
          "No se pudo crear el perfil"
        );
      }

      console.log(
        "Usuario registrado correctamente:",
        insertResult.data
      );

      saveSession(insertResult.data);

      registerForm.reset();

      errorElement.textContent = "";

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

// =====================================================
// LOGIN
// =====================================================

const loginForm =
document.getElementById("form-login");

if (loginForm) {
loginForm.addEventListener(
"submit",
async function (event) {
event.preventDefault();

```
    const usernameInput =
      document.getElementById("login-username");

    const passwordInput =
      document.getElementById("login-password");

    const errorElement =
      document.getElementById("login-error");

    if (
      !usernameInput ||
      !passwordInput ||
      !errorElement
    ) {
      console.error(
        "Faltan elementos del formulario de login"
      );

      return;
    }

    const username =
      usernameInput.value.trim().toLowerCase();

    const password =
      passwordInput.value;

    if (!username || !password) {
      errorElement.textContent =
        "Introduce tu usuario y contraseña";

      return;
    }

    try {
      errorElement.textContent =
        "Iniciando sesión...";

      const userResult =
        await supabaseClient
          .from("profiles")
          .select(
            "id, username, display_name, password_hash"
          )
          .eq("username", username)
          .maybeSingle();

      if (userResult.error) {
        throw userResult.error;
      }

      if (!userResult.data) {
        errorElement.textContent =
          "Usuario o contraseña incorrectos";

        return;
      }

      const passwordCorrect =
        await verifyPassword(
          password,
          userResult.data.password_hash
        );

      if (!passwordCorrect) {
        errorElement.textContent =
          "Usuario o contraseña incorrectos";

        return;
      }

      saveSession(userResult.data);

      console.log(
        "Inicio de sesión correcto:",
        userResult.data.username
      );

      errorElement.textContent = "";

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

// =====================================================
// RESTAURAR SESIÓN
// =====================================================

const loggedUser =
getLoggedUser();

if (
loggedUser &&
loggedUser.username
) {
console.log(
"Sesión restaurada:",
loggedUser.username
);

```
showApp();
```

} else {
showAuth();
}

// =====================================================
// CERRAR SESIÓN
// =====================================================

// Tu HTML utiliza id="btn-logout"
const logoutButton =
document.getElementById("btn-logout");

if (logoutButton) {
logoutButton.addEventListener(
"click",
function () {
localStorage.removeItem(
"loggedUser"
);

```
    showAuth();
  }
);
```

}

})();
