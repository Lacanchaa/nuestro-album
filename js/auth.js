(function () {
  "use strict";

  const supabase = window.supabaseClient;

  if (!supabase) {
    console.error("Supabase no está conectado.");
    return;
  }

  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");

  const loginError = document.getElementById("login-error");
  const registerError = document.getElementById("register-error");

  function showError(element, message) {
    if (element) {
      element.textContent = message;
    }
  }

  // =========================
  // REGISTRO
  // =========================

  if (formRegister) {
    formRegister.addEventListener("submit", async function (event) {
      event.preventDefault();

      const displayName =
        document.getElementById("reg-displayname").value.trim();

      const username =
        document.getElementById("reg-username").value.trim();

      const password =
        document.getElementById("reg-password").value;

      const password2 =
        document.getElementById("reg-password2").value;

      if (password !== password2) {
        showError(
          registerError,
          "Las contraseñas no coinciden."
        );
        return;
      }

      const email = username.toLowerCase() + "@nuestroalbum.app";

      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            display_name: displayName,
            username: username
          }
        }
      });

      if (error) {
        showError(
          registerError,
          error.message
        );
        return;
      }

      alert("Cuenta creada correctamente.");

      if (window.showAuthForm) {
        window.showAuthForm("login");
      }
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

      const email = username.toLowerCase() + "@nuestroalbum.app";

      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        showError(
          loginError,
          "Usuario o contraseña incorrectos."
        );
        return;
      }

      console.log("Sesión iniciada:", data.user);

      window.location.reload();
    });
  }


  // =========================
  // CERRAR SESIÓN
  // =========================

  const logoutButton =
    document.getElementById("btn-logout");

  if (logoutButton) {
    logoutButton.addEventListener("click", async function () {

      await supabase.auth.signOut();

      window.location.reload();

    });
  }


  // =========================
  // COMPROBAR SESIÓN
  // =========================

  supabase.auth.getSession().then(function (result) {

    const session = result.data.session;

    const loading =
      document.getElementById("screen-loading");

    const auth =
      document.getElementById("screen-auth");

    const app =
      document.getElementById("screen-app");


    if (loading) {
      loading.classList.add("hidden");
    }


    if (session) {

      if (auth) {
        auth.classList.add("hidden");
      }

      if (app) {
        app.classList.remove("hidden");
      }

    } else {

      if (auth) {
        auth.classList.remove("hidden");
      }

      if (app) {
        app.classList.add("hidden");
      }

    }

  });

})();
