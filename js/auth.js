(function () {
  "use strict";

  const supabaseClient = window.supabaseClient;

  if (!supabaseClient) {
    console.error("Supabase no está conectado");
    return;
  }

  console.log("Supabase conectado correctamente");

  // =========================
  // REGISTRO
  // =========================

  const registerForm = document.getElementById("form-register");

  if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      console.log("Botón registro presionado");

      const displayName =
        document.getElementById("reg-displayname")?.value.trim() || "";

      const username =
        document.getElementById("reg-username")?.value.trim().toLowerCase() || "";

      const password =
        document.getElementById("reg-password")?.value || "";

      const password2 =
        document.getElementById("reg-password2")?.value || "";

      const secQuestion =
        document.getElementById("reg-secquestion")?.value.trim() || "";

      const secAnswer =
        document.getElementById("reg-secanswer")?.value.trim() || "";

      const errorElement =
        document.getElementById("register-error");

      if (!errorElement) {
        console.error("No existe el elemento register-error");
        return;
      }

      // Validar usuario
      if (username.length < 3) {
        errorElement.textContent =
          "El usuario debe tener al menos 3 caracteres";
        return;
      }

      // Validar contraseña
      if (password.length < 6) {
        errorElement.textContent =
          "La contraseña debe tener al menos 6 caracteres";
        return;
      }

      // Confirmar contraseña
      if (password !== password2) {
        errorElement.textContent =
          "Las contraseñas no coinciden";
        return;
      }

      // Validar seguridad
      if (!secQuestion || !secAnswer) {
        errorElement.textContent =
          "Completa la pregunta y respuesta de seguridad";
        return;
      }

      try {
        /*
         * Supabase Auth necesita un email válido.
         * El usuario seguirá escribiendo solamente:
         *
         * arias
         *
         * Internamente se transforma en:
         *
         * arias@example.com
         */

        const email = username + "@example.com";

        console.log("Creando usuario:", email);

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

        console.log("Respuesta Supabase:", {
          data: data,
          error: error
        });

        if (error) {
          throw error;
        }

        console.log(
          "Usuario creado correctamente:",
          data.user
        );

        errorElement.textContent = "";

        alert("Cuenta creada correctamente");

        registerForm.reset();

        const loginButton =
          document.querySelector(
            '[data-goto="login"]'
          );

        if (loginButton) {
          loginButton.click();
        }

      } catch (error) {
        console.error(
          "Error al crear usuario:",
          error
        );

        errorElement.textContent =
          error.message ||
          "Error al crear la cuenta";
      }
    });
  }


  // =========================
  // LOGIN
  // =========================

  const loginForm =
    document.getElementById("form-login");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
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
        /*
         * Debe ser exactamente el mismo formato
         * usado durante el registro.
         */

        const email =
          username + "@example.com";

        console.log(
          "Intentando iniciar sesión:",
          email
        );

        const {
          data,
          error
        } =
          await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
          });

        if (error) {
          throw error;
        }

        console.log(
          "Inicio de sesión correcto:",
          data.user
        );

        if (errorElement) {
          errorElement.textContent = "";
        }

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
    });
  }

})();
