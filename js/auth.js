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
    crypto.getRandomValues(array);

    return Array.from(array)
      .map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      })
      .join("");
  }

  async function hashValue(value, salt) {
    const encoder = new TextEncoder();

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
  }

  async function createPasswordHash(password) {
    const salt = generateSalt();
    const hash = await hashValue(password, salt);

    return salt + ":" + hash;
  }

  async function verifyPassword(password, storedHash) {
    if (!storedHash) {
      return false;
    }

    const parts = storedHash.split(":");

    if (parts.length !== 2) {
      return false;
    }

    const salt = parts[0];
    const originalHash = parts[1];

    const newHash =
      await hashValue(password, salt);

    return newHash === originalHash;
  }

  async function createSecurityAnswerHash(answer) {
    const salt = generateSalt();

    const hash =
      await hashValue(
        answer.trim().toLowerCase(),
        salt
      );

    return salt + ":" + hash;
  }

  // ================================
  // SESIÓN
  // ================================

  function saveSession(user) {
    localStorage.setItem(
      "loggedUser",
      JSON.stringify({
        id: user.id,
        username: user.username,
        display_name: user.display_name
      })
    );
  }

  function getLoggedUser() {
    const raw =
      localStorage.getItem(
        "loggedUser"
      );

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
  }

  // ================================
  // MOSTRAR APP
  // ================================

  function showApp() {
    const screenAuth =
      document.getElementById(
        "screen-auth"
      );

    const screenApp =
      document.getElementById(
        "screen-app"
      );

    if (screenAuth) {
      screenAuth.classList.add(
        "hidden"
      );
    }

    if (screenApp) {
      screenApp.classList.remove(
        "hidden"
      );
    }
  }

  // ================================
  // MOSTRAR LOGIN
  // ================================

  function showAuth() {
    const screenAuth =
      document.getElementById(
        "screen-auth"
      );

    const screenApp =
      document.getElementById(
        "screen-app"
      );

    if (screenAuth) {
      screenAuth.classList.remove(
        "hidden"
      );
    }

    if (screenApp) {
      screenApp.classList.add(
        "hidden"
      );
    }
  }

  // ================================
  // REGISTRO
  // ================================

  const registerForm =
    document.getElementById(
      "form-register"
    );

  if (registerForm) {
    registerForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        console.log(
          "Botón registro presionado"
        );

        const displayName =
          document
            .getElementById(
              "reg-displayname"
            )
            ?.value
            .trim() || "";

        const username =
          document
            .getElementById(
              "reg-username"
            )
            ?.value
            .trim()
            .toLowerCase() || "";

        const password =
          document
            .getElementById(
              "reg-password"
            )
            ?.value || "";

        const password2 =
          document
            .getElementById(
              "reg-password2"
            )
            ?.value || "";

        const secQuestion =
          document
            .getElementById(
              "reg-secquestion"
            )
            ?.value
            .trim() || "";

        const secAnswer =
          document
            .getElementById(
              "reg-secanswer"
            )
            ?.value
            .trim()
            .toLowerCase() || "";

        const errorElement =
          document.getElementById(
            "register-error"
          );

        if (!errorElement) {
          console.error(
            "No existe register-error"
          );

          return;
        }

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

          const {
            data: existingUser,
            error: searchError
          } =
            await supabaseClient
              .from("profiles")
              .select("id")
              .eq(
                "username",
                username
              )
              .maybeSingle();

          if (searchError) {
            throw searchError;
          }

          if (existingUser) {
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

          const {
            data: newUser,
            error: insertError
          } =
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

          if (insertError) {
            throw insertError;
          }

          console.log(
            "Usuario registrado:",
            newUser
          );

          saveSession(
            newUser
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
  }

  // ================================
  // LOGIN
  // ================================

  const loginForm =
    document.getElementById(
      "form-login"
    );

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        const username =
          document
            .getElementById(
              "login-username"
            )
            ?.value
            .trim()
            .toLowerCase() || "";

        const password =
          document
            .getElementById(
              "login-password"
            )
            ?.value || "";

        const errorElement =
          document.getElementById(
            "login-error"
          );

        if (
          !username ||
          !password
        ) {
          if (errorElement) {
            errorElement.textContent =
              "Introduce tu usuario y contraseña";
          }

          return;
        }

        try {
          if (errorElement) {
            errorElement.textContent =
              "Iniciando sesión...";
          }

          const {
            data: user,
            error: searchError
          } =
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

          if (searchError) {
            throw searchError;
          }

          if (!user) {
            if (errorElement) {
              errorElement.textContent =
                "Usuario o contraseña incorrectos";
            }

            return;
          }

          const passwordCorrect =
            await verifyPassword(
              password,
              user.password_hash
            );

          if (!passwordCorrect) {
            if (errorElement) {
              errorElement.textContent =
                "Usuario o contraseña incorrectos";
            }

            return;
          }

          saveSession(
            user
          );

          console.log(
            "Inicio de sesión correcto:",
            user.username
          );

          if (errorElement) {
            errorElement.textContent =
              "";
          }

          showApp();

        } catch (error) {
          console.error(
            "Error al iniciar sesión:",
            error
          );

          if (errorElement) {
            errorElement.textContent =
              "Usuario o contraseña incorrectos";
          }
        }
      }
    );
  }

  // ================================
  // RESTAURAR SESIÓN
  // ================================

  const loggedUser =
    getLoggedUser();

  if (loggedUser) {
    console.log(
      "Sesión restaurada:",
      loggedUser.username
    );

    showApp();

  } else {
    showAuth();
  }

  // ================================
  // CERRAR SESIÓN
  // ================================

  const logoutButton =
    document.getElementById(
      "logout"
    );

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      function () {
        localStorage.removeItem(
          "loggedUser"
        );

        showAuth();
      }
    );
  }

})();
