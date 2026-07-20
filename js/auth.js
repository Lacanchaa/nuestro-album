(function () {
  "use strict";

  console.log("AUTH.JS CARGADO");

  const supabaseClient = window.supabaseClient;

  if (!supabaseClient) {
    console.error("ERROR: Supabase no está conectado.");
    return;
  }

  console.log("SUPABASE CONECTADO");

  const formRegister = document.getElementById("form-register");
  const formLogin = document.getElementById("form-login");

  // =========================
  // REGISTRO
  // =========================

  if (formRegister) {

    formRegister.addEventListener("submit", async function (event) {

      event.preventDefault();

      console.log("BOTÓN REGISTRO PRESIONADO");

      const displayName =
        document.getElementById("reg-displayname").value.trim();

      const username =
        document.getElementById("reg-username").value.trim();

      const password =
        document.getElementById("reg-password").value;

      const password2 =
        document.getElementById("reg-password2").value;


      if (password !== password2) {

        document.getElementById("register-error").textContent =
          "Las contraseñas no coinciden.";

        return;

      }


      const email =
        username.toLowerCase() + "@nuestroalbum.app";


      console.log("CREANDO USUARIO:", email);


      const result =
        await supabaseClient.auth.signUp({

          email: email,

          password: password,

          options: {

            data: {

              display_name: displayName,

              username: username

            }

          }

        });


      console.log("RESPUESTA SUPABASE:", result);


      if (result.error) {

        document.getElementById("register-error").textContent =
          result.error.message;

        console.error(
          "ERROR DE SUPABASE:",
          result.error
        );

        return;

      }


      alert(
        "Usuario creado correctamente."
      );

    });

  }


  // =========================
  // LOGIN
  // =========================

  if (formLogin) {

    formLogin.addEventListener("submit", async function (event) {

      event.preventDefault();

      const username =
        document.getElementById("login-username").value.trim();

      const password =
        document.getElementById("login-password").value;


      const email =
        username.toLowerCase() + "@nuestroalbum.app";


      const result =
        await supabaseClient.auth.signInWithPassword({

          email: email,

          password: password

        });


      if (result.error) {

        document.getElementById("login-error").textContent =
          result.error.message;

        return;

      }


      window.location.reload();

    });

  }


})();
