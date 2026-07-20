// ============================================================
// app.js — Orquestador principal de la aplicación
// DATOS Y CONFIGURACIÓN SEPARADOS POR USUARIO
// ============================================================

import * as auth from './auth.js';

import {
  getSettings,
  saveSettings
} from './data.js';

import {
  toast
} from './ui.js';

import {
  getLang,
  setLang,
  applyTranslations,
  t
} from './i18n.js';

import {
  applyTheme
} from './theme.js';

import {
  startFx,
  stopFx,
  isFxRunning
} from './fx.js';

import {
  initPlayer
} from './music.js';

import * as viewDashboard from './views/dashboard.js';
import * as viewCalendar from './views/calendar.js';
import * as viewTimeline from './views/timeline.js';
import * as viewEvents from './views/events.js';
import * as viewNotes from './views/notes.js';
import * as viewGallery from './views/gallery.js';
import * as viewSettings from './views/settings.js';


// ============================================================
// VISTAS
// ============================================================

const VIEWS = {
  dashboard: viewDashboard,
  calendar: viewCalendar,
  timeline: viewTimeline,
  events: viewEvents,
  notes: viewNotes,
  gallery: viewGallery,
  settings: viewSettings
};


// ============================================================
// ESTADO GLOBAL
// ============================================================

let activeView = null;
let inactivityTimer = null;
let inactivityWatchersInstalled = false;
let authFormsInstalled = false;
let navInstalled = false;
let topbarInstalled = false;
let playerInitialized = false;


// ============================================================
// PANTALLAS
// ============================================================

function showScreen(id) {
  document
    .querySelectorAll('.screen')
    .forEach(screen => {
      screen.classList.add('hidden');
    });

  const screen = document.getElementById(id);

  if (screen) {
    screen.classList.remove('hidden');
  }
}


// ============================================================
// BOOT
// ============================================================

function boot() {
  if (auth.isAuthenticated()) {
    enterApp();
  } else {
    showScreen('screen-auth');
    applyTranslations();
  }

  wireAuthForms();
  wireUnlockForm();
}


// ============================================================
// FORMULARIOS DE AUTENTICACIÓN
// ============================================================

function wireAuthForms() {
  if (authFormsInstalled) return;

  authFormsInstalled = true;

  // ----------------------------------------------------------
  // CAMBIAR ENTRE LOGIN / REGISTRO / RECUPERACIÓN
  // ----------------------------------------------------------

  document
    .querySelectorAll('[data-goto]')
    .forEach(button => {

      button.addEventListener('click', () => {

        const target = button.dataset.goto;

        [
          'login',
          'register',
          'recover'
        ].forEach(name => {

          const form =
            document.getElementById(
              `form-${name}`
            );

          if (form) {
            form.classList.toggle(
              'hidden',
              name !== target
            );
          }
        });

        clearAuthErrors();
      });
    });


  // ----------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------

  const loginForm =
    document.getElementById(
      'form-login'
    );

  if (loginForm) {

    loginForm.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        const username =
          document
            .getElementById(
              'login-username'
            )
            ?.value
            .trim();

        const password =
          document
            .getElementById(
              'login-password'
            )
            ?.value;

        const remember =
          document
            .getElementById(
              'login-remember'
            )
            ?.checked;

        const errorElement =
          document.getElementById(
            'login-error'
          );

        try {

          await auth.loginUser({
            username,
            password,
            remember
          });

          if (errorElement) {
            errorElement.textContent = '';
          }

          enterApp();

        } catch (error) {

          if (errorElement) {
            errorElement.textContent =
              error.message ||
              'Usuario o contraseña incorrectos';
          }
        }
      }
    );
  }


  // ----------------------------------------------------------
  // REGISTRO
  // ----------------------------------------------------------

  const registerForm =
    document.getElementById(
      'form-register'
    );

  if (registerForm) {

    registerForm.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        const displayName =
          document
            .getElementById(
              'reg-displayname'
            )
            ?.value
            .trim();

        const username =
          document
            .getElementById(
              'reg-username'
            )
            ?.value
            .trim();

        const password =
          document
            .getElementById(
              'reg-password'
            )
            ?.value;

        const password2 =
          document
            .getElementById(
              'reg-password2'
            )
            ?.value;

        const secQuestion =
          document
            .getElementById(
              'reg-secquestion'
            )
            ?.value
            .trim();

        const secAnswer =
          document
            .getElementById(
              'reg-secanswer'
            )
            ?.value
            .trim();

        const errorElement =
          document.getElementById(
            'register-error'
          );

        if (password !== password2) {

          if (errorElement) {
            errorElement.textContent =
              getLang() === 'en'
                ? 'Passwords do not match'
                : 'Las contraseñas no coinciden';
          }

          return;
        }

        try {

          await auth.registerUser({
            username,
            password,
            displayName,
            secQuestion,
            secAnswer
          });

          await auth.loginUser({
            username,
            password,
            remember: true
          });

          if (errorElement) {
            errorElement.textContent = '';
          }

          toast(
            getLang() === 'en'
              ? 'Account created'
              : 'Cuenta creada',
            'success'
          );

          enterApp();

        } catch (error) {

          if (errorElement) {
            errorElement.textContent =
              error.message ||
              'Error al crear la cuenta';
          }
        }
      }
    );
  }


  // ----------------------------------------------------------
  // RECUPERAR CONTRASEÑA - PASO 1
  // ----------------------------------------------------------

  const recoverStep1 =
    document.getElementById(
      'rec-step1-btn'
    );

  if (recoverStep1) {

    recoverStep1.addEventListener(
      'click',
      () => {

        const username =
          document
            .getElementById(
              'rec-username'
            )
            ?.value
            .trim();

        const errorElement =
          document.getElementById(
            'recover-error'
          );

        try {

          const question =
            auth.getSecurityQuestion(
              username
            );

          const questionLabel =
            document.getElementById(
              'rec-question-label'
            );

          if (questionLabel) {
            questionLabel.textContent =
              question;
          }

          document
            .getElementById(
              'rec-step2'
            )
            ?.classList
            .remove(
              'hidden'
            );

          recoverStep1.classList.add(
            'hidden'
          );

          document
            .getElementById(
              'rec-step2-btn'
            )
            ?.classList
            .remove(
              'hidden'
            );

          if (errorElement) {
            errorElement.textContent = '';
          }

        } catch (error) {

          if (errorElement) {
            errorElement.textContent =
              error.message;
          }
        }
      }
    );
  }


  // ----------------------------------------------------------
  // RECUPERAR CONTRASEÑA - PASO 2
  // ----------------------------------------------------------

  const recoverStep2 =
    document.getElementById(
      'rec-step2-btn'
    );

  if (recoverStep2) {

    recoverStep2.addEventListener(
      'click',
      async () => {

        const username =
          document
            .getElementById(
              'rec-username'
            )
            ?.value
            .trim();

        const answer =
          document
            .getElementById(
              'rec-answer'
            )
            ?.value;

        const newPassword =
          document
            .getElementById(
              'rec-newpass'
            )
            ?.value;

        const errorElement =
          document.getElementById(
            'recover-error'
          );

        const successElement =
          document.getElementById(
            'recover-ok'
          );

        try {

          await auth.recoverPassword({
            username,
            answer,
            newPassword
          });

          if (errorElement) {
            errorElement.textContent = '';
          }

          if (successElement) {

            successElement.textContent =
              getLang() === 'en'
                ? 'Password updated. You can sign in now.'
                : 'Contraseña actualizada. Ya puedes entrar.';

            setTimeout(() => {

              document
                .querySelector(
                  '[data-goto="login"]'
                )
                ?.click();

              successElement.textContent = '';

            }, 1600);
          }

        } catch (error) {

          if (errorElement) {
            errorElement.textContent =
              error.message;
          }
        }
      }
    );
  }
}


// ============================================================
// LIMPIAR ERRORES
// ============================================================

function clearAuthErrors() {

  [
    'login-error',
    'register-error',
    'recover-error',
    'recover-ok'
  ].forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = '';
    }
  });
}


// ============================================================
// BLOQUEO POR INACTIVIDAD
// ============================================================

function wireUnlockForm() {

  const unlockForm =
    document.getElementById(
      'form-unlock'
    );

  if (!unlockForm) return;

  unlockForm.addEventListener(
    'submit',
    async event => {

      event.preventDefault();

      const user =
        auth.getCurrentUser();

      const password =
        document
          .getElementById(
            'unlock-password'
          )
          ?.value;

      const errorElement =
        document.getElementById(
          'unlock-error'
        );

      if (!user) {

        showScreen(
          'screen-auth'
        );

        return;
      }

      try {

        await auth.loginUser({
          username: user.username,
          password,
          remember: true
        });

        if (errorElement) {
          errorElement.textContent = '';
        }

        const passwordInput =
          document.getElementById(
            'unlock-password'
          );

        if (passwordInput) {
          passwordInput.value = '';
        }

        showScreen(
          'screen-app'
        );

        resetInactivityTimer();

      } catch (error) {

        if (errorElement) {
          errorElement.textContent =
            error.message;
        }
      }
    }
  );
}


function resetInactivityTimer() {

  if (inactivityTimer) {
    clearTimeout(
      inactivityTimer
    );
  }

  const settings =
    getSettings();

  const minutes =
    Number(
      settings.inactivityLockMinutes
    );

  if (!minutes || minutes <= 0) {
    return;
  }

  inactivityTimer =
    setTimeout(() => {

      showScreen(
        'screen-lock'
      );

      applyTranslations();

    }, minutes * 60 * 1000);
}


function wireInactivityWatchers() {

  if (inactivityWatchersInstalled) {
    return;
  }

  inactivityWatchersInstalled = true;

  [
    'mousemove',
    'keydown',
    'click',
    'scroll',
    'touchstart'
  ].forEach(eventName => {

    document.addEventListener(
      eventName,
      () => {

        const appScreen =
          document.getElementById(
            'screen-app'
          );

        if (
          appScreen &&
          !appScreen.classList.contains(
            'hidden'
          )
        ) {
          resetInactivityTimer();
        }
      },
      {
        passive: true
      }
    );
  });

  window.addEventListener(
    'lockminutes-changed',
    resetInactivityTimer
  );
}


// ============================================================
// ENTRAR A LA APP
// ============================================================

function enterApp() {

  const user =
    auth.getCurrentUser();

  if (!user) {

    showScreen(
      'screen-auth'
    );

    return;
  }

  /*
   * getSettings() obtiene exclusivamente
   * los datos del usuario actualmente conectado.
   */

  const settings =
    getSettings();

  applyTheme(
    settings.theme
  );

  setLang(
    settings.lang || 'es'
  );

  const brandName =
    document.getElementById(
      'brand-couple-name'
    );

  if (brandName) {

    brandName.textContent =
      settings.coupleName ||
      'Nuestro Álbum';
  }

  const welcome =
    document.getElementById(
      'auth-welcome'
    );

  if (welcome) {

    welcome.textContent =
      `${t('welcomeTitle')}, ${
        user.displayName ||
        user.username
      }`;
  }

  showScreen(
    'screen-app'
  );

  applyTranslations();

  wireNav();
  wireTopbar();

  if (!playerInitialized) {

    initPlayer();

    playerInitialized = true;
  }

  resetInactivityTimer();

  wireInactivityWatchers();

  navigateTo(
    'dashboard'
  );
}


// ============================================================
// NAVEGACIÓN
// ============================================================

function wireNav() {

  if (navInstalled) {
    return;
  }

  navInstalled = true;

  const sidebar =
    document.getElementById(
      'sidebar'
    );

  const backdrop =
    document.getElementById(
      'sidebar-backdrop'
    );

  function closeSidebar() {

    sidebar?.classList.remove(
      'open'
    );

    backdrop?.classList.remove(
      'show'
    );
  }

  document
    .querySelectorAll(
      '.nav-item'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          navigateTo(
            button.dataset.view
          );

          closeSidebar();
        }
      );
    });

  backdrop?.addEventListener(
    'click',
    closeSidebar
  );

  const logoutButton =
    document.getElementById(
      'btn-logout'
    );

  logoutButton?.addEventListener(
    'click',
    () => {

      if (
        activeView &&
        VIEWS[activeView]?.destroy
      ) {
        VIEWS[activeView].destroy();
      }

      if (inactivityTimer) {

        clearTimeout(
          inactivityTimer
        );

        inactivityTimer = null;
      }

      stopFx();

      auth.logoutUser();

      activeView = null;

      showScreen(
        'screen-auth'
      );

      document
        .querySelector(
          '[data-goto="login"]'
        )
        ?.click();

      applyTranslations();
    }
  );
}


// ============================================================
// BARRA SUPERIOR
// ============================================================

function wireTopbar() {

  if (topbarInstalled) {
    return;
  }

  topbarInstalled = true;

  const langSelect =
    document.getElementById(
      'lang-switch'
    );

  if (langSelect) {

    langSelect.value =
      getLang();

    langSelect.addEventListener(
      'change',
      () => {

        const lang =
          langSelect.value;

        /*
         * El idioma se guarda en los settings
         * del usuario actual.
         */

        saveSettings({
          lang
        });

        setLang(
          lang
        );

        navigateTo(
          activeView,
          true
        );

        applyTranslations();
      }
    );
  }


  const hamburger =
    document.getElementById(
      'btn-hamburger'
    );

  hamburger?.addEventListener(
    'click',
    () => {

      const sidebar =
        document.getElementById(
          'sidebar'
        );

      const backdrop =
        document.getElementById(
          'sidebar-backdrop'
        );

      if (!sidebar) return;

      const willOpen =
        !sidebar.classList.contains(
          'open'
        );

      sidebar.classList.toggle(
        'open',
        willOpen
      );

      backdrop?.classList.toggle(
        'show',
        willOpen
      );
    }
  );


  const animButton =
    document.getElementById(
      'btn-anim-toggle'
    );

  const settings =
    getSettings();

  if (
    settings.animations
  ) {

    startFx(
      settings.template
    );
  }

  animButton?.addEventListener(
    'click',
    () => {

      if (
        isFxRunning()
      ) {

        stopFx();

        saveSettings({
          animations: false
        });

      } else {

        startFx(
          getSettings().template
        );

        saveSettings({
          animations: true
        });
      }
    }
  );

  window.addEventListener(
    'langchange',
    () => {

      const title =
        document.getElementById(
          'view-title'
        );

      if (title) {

        title.textContent =
          t(
            navKeyFor(
              activeView
            )
          );
      }
    }
  );
}


// ============================================================
// TRADUCCIONES
// ============================================================

function navKeyFor(view) {

  return {

    dashboard: 'navDashboard',
    calendar: 'navCalendar',
    timeline: 'navTimeline',
    events: 'navEvents',
    notes: 'navNotes',
    gallery: 'navGallery',
    settings: 'navSettings'

  }[view] || 'navDashboard';
}


// ============================================================
// NAVEGAR
// ============================================================

function navigateTo(
  view,
  silent = false
) {

  if (!VIEWS[view]) {
    view = 'dashboard';
  }

  if (
    activeView &&
    VIEWS[activeView]?.destroy
  ) {

    VIEWS[activeView].destroy();
  }

  document
    .querySelectorAll(
      '.nav-item'
    )
    .forEach(button => {

      button.classList.toggle(
        'active',
        button.dataset.view === view
      );
    });

  document
    .querySelectorAll(
      '.view'
    )
    .forEach(section => {

      section.classList.remove(
        'active'
      );
    });

  const section =
    document.getElementById(
      `view-${view}`
    );

  if (!section) {
    return;
  }

  section.classList.add(
    'active'
  );

  const title =
    document.getElementById(
      'view-title'
    );

  if (title) {

    title.textContent =
      t(
        navKeyFor(
          view
        )
      );
  }

  activeView =
    view;

  if (
    typeof VIEWS[view].init ===
    'function'
  ) {

    VIEWS[view].init(
      section
    );
  }

  if (!silent) {

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}


// ============================================================
// INICIO
// ============================================================

window.addEventListener(
  'DOMContentLoaded',
  () => {

    setTimeout(
      () => {

        document
          .getElementById(
            'screen-loading'
          )
          ?.classList.add(
            'hidden'
          );

        boot();

      },
      350
    );
  }
);
