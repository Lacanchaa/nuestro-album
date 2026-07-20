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
            .value
            .trim();

        const username =
          document
            .getElementById("reg-username")
            .value
            .trim()
            .toLowerCase();

        const password =
          document
            .getElementById("reg-password")
            .value;

        const password2 =
          document
            .getElementById("reg-password2")
            .value;

        const secQuestion =
          document
            .getElementById("reg-secquestion")
            .value
            .trim();

        const secAnswer =
          document
            .getElementById("reg-secanswer")
            .value
            .trim();

        const errorElement =
          document.getElementById(
            "register-error"
          );


        if (password !== password2) {

          errorElement.textContent =
            "Las contraseñas no coinciden";

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


        try {

          const email =
            username +
            "@nuestroalbum.app";


          const {
            data,
            error
          } =
            await supabaseClient.auth.signUp({

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

            throw error;

          }


          console.log(
            "Usuario creado:",
            data.user
          );


          errorElement.textContent =
            "";


          alert(
            "Cuenta creada correctamente"
          );


          registerForm.reset();


          document
            .querySelector(
              '[data-goto="login"]'
            )
            ?.click();


        } catch (error) {

          console.error(
            "Error al crear usuario:",
            error
          );


          errorElement.textContent =
            error.message;

        }

      }

    );

  }


  // =========================
  // LOGIN
  // =========================

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
            .value
            .trim()
            .toLowerCase();


        const password =
          document
            .getElementById(
              "login-password"
            )
            .value;


        const errorElement =
          document.getElementById(
            "login-error"
          );


        try {

          const email =
            username +
            "@nuestroalbum.app";


          const {
            data,
            error
          } =
            await supabaseClient.auth
              .signInWithPassword({

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


          errorElement.textContent =
            "";


          document
            .getElementById(
              "screen-auth"
            )
            .classList
            .add("hidden");


          document
            .getElementById(
              "screen-app"
            )
            .classList
            .remove("hidden");


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

})();
