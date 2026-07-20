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

    crypto.getRandomValues(array);

    return Array.from(array)
      .map(byte => byte.toString(16).padStart(2, "0"))
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
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }


  async function createPasswordHash(password) {

    const salt =
      generateSalt();

    const hash =
      await hashValue(
        password,
        salt
      );


    // Guardamos salt y hash juntos
    return `${salt}:${hash}`;
  }


  async function verifyPassword(password, storedHash) {

    const parts =
      storedHash.split(":");


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


  // =====================================================
  // HASH DE RESPUESTA DE SEGURIDAD
  // =====================================================

  async function createSecurityAnswerHash(answer) {

    const salt =
      generateSalt();

    const hash =
      await hashValue(
        answer.toLowerCase().trim(),
        salt
      );


    return `${salt}:${hash}`;
  }


  // =====================================================
  // PANTALLAS
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


        const securityQuestion =
          document
            .getElementById("reg-secquestion")
            ?.value
            .trim() || "";


        const securityAnswer =
          document
            .getElementById("reg-secanswer")
            ?.value
            .trim()
            .toLowerCase() || "";


        const errorElement =
          document.getElementById(
            "register-error"
          );


        // -------------------------
        // VALIDACIONES
        // -------------------------

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
          !securityQuestion ||
          !securityAnswer
        ) {

          errorElement.textContent =
            "Completa la pregunta y respuesta de seguridad";

          return;
        }


        try {

          errorElement.textContent =
            "Creando cuenta...";


          // -------------------------
          // COMPROBAR USUARIO
          // -------------------------

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


          // -------------------------
          // CREAR HASH DE CONTRASEÑA
          // -------------------------

          const passwordHash =
            await createPasswordHash(
              password
            );


          // -------------------------
          // CREAR HASH DE RESPUESTA
          // -------------------------

          const securityAnswerHash =
            await createSecurityAnswerHash(
              securityAnswer
            );


          // -------------------------
          // INSERTAR USUARIO
          // -------------------------

          const {
            data,
            error
          } =
            await supabaseClient
              .from("profiles")
              .insert({

                username:

                  username,


                display_name:

                  displayName || username,


                password_hash:

                  passwordHash,


                security_question:

                  securityQuestion,


                security_answer_hash:

                  securityAnswerHash

              })
              .select()
              .single();


          if (error) {
            throw error;
          }


          console.log(
            "Usuario registrado:",
            data
          );


          // -------------------------
          // GUARDAR SESIÓN
          // -------------------------

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

        }


        catch (error) {

          console.error(
            "Error al registrar:",
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


        if (!username || !password) {

          errorElement.textContent =
            "Introduce tu usuario y contraseña";

          return;
        }


        try {

          errorElement.textContent =
            "Iniciando sesión...";


          // -------------------------
          // BUSCAR USUARIO
          // -------------------------

          const {
            data: user,
            error
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


          if (error) {
            throw error;
          }


          if (!user) {

            errorElement.textContent =
              "Usuario o contraseña incorrectos";

            return;
          }


          // -------------------------
          // COMPROBAR CONTRASEÑA
          // -------------------------

          const passwordCorrect =
            await verifyPassword(
              password,

              user.password_hash
            );


          if (!passwordCorrect) {

            errorElement.textContent =
              "Usuario o contraseña incorrectos";

            return;
          }


          // -------------------------
          // GUARDAR SESIÓN
          // -------------------------

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

        }


        catch (error) {

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
  // MANTENER SESIÓN
  // =====================================================

  const loggedUser =
    localStorage.getItem(
      "loggedUser"
    );


  if (loggedUser) {

    try {

      const user =
        JSON.parse(
          loggedUser
        );


      if (
        user &&
        user.username
      ) {

        console.log(
          "Sesión restaurada:",
          user.username
        );


        showApp();

      }

    }

    catch (error) {

      console.error(
        "Error al restaurar sesión:",
        error
      );


      localStorage.removeItem(
        "loggedUser"
      );


      showAuth();

    }

  }

  else {

    showAuth();

  }


  // =====================================================
  // CERRAR SESIÓN
  // =====================================================

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
