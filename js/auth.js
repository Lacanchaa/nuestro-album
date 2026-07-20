(function () {
  "use strict";

  const supabaseClient = window.supabaseClient;

  if (!supabaseClient) {
    console.error("Supabase no está conectado");
    return;
  }

  console.log("Supabase conectado correctamente");


  // =====================================================
  // FUNCIONES PARA HASH DE CONTRASEÑA
  // =====================================================

  function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);

    return Array.from(array)
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }


  async function hashPassword(password, salt) {
    const encoder = new TextEncoder();

    const keyMaterial =
      await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
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
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }


  // =====================================================
  // MOSTRAR / OCULTAR PANTALLAS
  // =====================================================

  function showApp() {
    const screenAuth =
      document.getElementById("screen-auth");

    const screenApp =
      document.getElementById("screen-app");

    if (screenAuth) {
      screenAuth.classList.add("hidden");
    }

    if (screenApp) {
      screenApp.classList.remove("hidden");
    }
  }


  function showAuth() {
    const screenAuth =
      document.getElementById("screen-auth");

    const screenApp =
      document.getElementById("screen-app");

    if (screenAuth) {
      screenAuth.classList.remove("hidden");
    }

    if (screenApp) {
      screenApp.classList.add("hidden");
    }
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

        console.log("Botón registro presionado");

        const displayName =
          document
            .getElementById("reg-displayname")
            ?.value
            .trim() || "";

        const username =
          document
            .getElementById("reg-username")
            ?.value
            .trim()
            .toLowerCase() || "";

        const password =
          document
            .getElementById("reg-password")
            ?.value || "";

        const password2 =
          document
            .getElementById("reg-password2")
            ?.value || "";

        const secQuestion =
          document
            .getElementById("reg-secquestion")
            ?.value
            .trim() || "";

        const secAnswer =
          document
            .getElementById("reg-secanswer")
            ?.value
            .trim()
            .toLowerCase() || "";

        const errorElement =
          document.getElementById("register-error");


        // =========================
        // VALIDACIONES
        // =========================

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


          // =========================
          // VERIFICAR USUARIO EXISTENTE
          // =========================

          const {
            data: existingUser,
            error: searchError
          } =
            await supabaseClient
              .from("profiles")
              .select("id")
              .eq("username", username)
              .maybeSingle();


          if (searchError) {
            throw searchError;
          }


          if (existingUser) {
            errorElement.textContent =
              "Ese nombre de usuario ya está registrado";

            return;
          }


          // =========================
          // GENERAR HASH
          // =========================

          const salt =
            generateSalt();

          const passwordHash =
            await hashPassword(
              password,
              salt
            );


          // =========================
          // GUARDAR EN PROFILES
          // =========================

          const {
            data,
            error
          } =
            await supabaseClient
              .from("profiles")
              .insert({

                username: username,

                password_hash:
                  passwordHash,

                password_salt:
                  salt,

                display_name:
                  displayName || username,

                security_question:
                  secQuestion,

                security_answer:
                  secAnswer

              })
              .select()
              .single();


          if (error) {
            throw error;
          }


          console.log(
            "Usuario registrado correctamente:",
            data
          );


          // =========================
          // GUARDAR SESIÓN
          // =========================

          localStorage.setItem(
            "loggedUser",
            JSON.stringify({

              id: data.id,

              username:
                data.username,

              display_name:
                data.display_name

            })
          );


          errorElement.textContent =
            "";

          alert(
            "Cuenta creada correctamente"
          );


          registerForm.reset();


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


        const username =
          document
            .getElementById("login-username")
            ?.value
            .trim()
            .toLowerCase() || "";


        const password =
          document
            .getElementById("login-password")
            ?.value || "";


        const errorElement =
          document.getElementById("login-error");


        if (!username || !password) {

          if (errorElement) {

            errorElement.textContent =
              "Introduce tu usuario y contraseña";

          }

          return;

        }


        try {

          errorElement.textContent =
            "Iniciando sesión...";


          // =========================
          // BUSCAR USUARIO
          // =========================

          const {
            data: user,
            error
          } =
            await supabaseClient
              .from("profiles")
              .select("*")
              .eq("username", username)
              .maybeSingle();


          if (error) {
            throw error;
          }


          if (!user) {

            errorElement.textContent =
              "Usuario o contraseña incorrectos";

            return;

          }


          // =========================
          // COMPROBAR CONTRASEÑA
          // =========================

          const passwordHash =
            await hashPassword(
              password,
              user.password_salt
            );


          if (
            passwordHash !==
            user.password_hash
          ) {

            errorElement.textContent =
              "Usuario o contraseña incorrectos";

            return;

          }


          // =========================
          // GUARDAR SESIÓN
          // =========================

          localStorage.setItem(
            "loggedUser",
            JSON.stringify({

              id: user.id,

              username:
                user.username,

              display_name:
                user.display_name

            })
          );


          console.log(
            "Inicio de sesión correcto:",
            user.username
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

  }


  // =====================================================
  // MANTENER SESIÓN AL RECARGAR
  // =====================================================

  const loggedUser =
    localStorage.getItem(
      "loggedUser"
    );


  if (loggedUser) {

    try {

      const user =
        JSON.parse(loggedUser);


      if (user && user.username) {

        console.log(
          "Sesión restaurada:",
          user.username
        );


        showApp();

      }

    } catch (error) {

      console.error(
        "Error al restaurar sesión:",
        error
      );


      localStorage.removeItem(
        "loggedUser"
      );

      showAuth();

    }

  } else {

    showAuth();

  }


  // =====================================================
  // CERRAR SESIÓN
  // =====================================================

  const logoutButton =
    document.getElementById("logout");


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
