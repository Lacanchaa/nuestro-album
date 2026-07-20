// ============================================================
// i18n.js — Sistema multilenguaje con cambio instantáneo
// ============================================================
import { lsGet, lsSet } from './storage.js';

const DICT = {
  es: {
    loading: 'Preparando vuestros recuerdos…',
    welcomeTitle: 'Bienvenidos de nuevo',
    welcomeSub: 'Vuestra historia os espera',
    username: 'Usuario', password: 'Contraseña', confirmPassword: 'Confirmar contraseña',
    staySignedIn: 'Mantener sesión iniciada', signIn: 'Entrar', createAccount: 'Crear cuenta',
    forgotPassword: 'Olvidé mi contraseña', backToLogin: 'Volver a entrar',
    displayName: 'Vuestro nombre / apodo', securityQuestion: 'Pregunta de seguridad',
    securityAnswer: 'Respuesta', newPassword: 'Nueva contraseña', continueBtn: 'Continuar',
    resetPassword: 'Restablecer contraseña', lockedTitle: 'Sesión bloqueada',
    lockedSub: 'Introduce tu contraseña para continuar', unlock: 'Desbloquear', signOut: 'Cerrar sesión',
    navDashboard: 'Inicio', navCalendar: 'Calendario', navTimeline: 'Nuestra Historia',
    navEvents: 'Eventos', navNotes: 'Notas', navGallery: 'Galería', navSettings: 'Ajustes',
    noTrack: 'Sin música',
  },
  en: {
    loading: 'Getting your memories ready…',
    welcomeTitle: 'Welcome back',
    welcomeSub: 'Your story is waiting',
    username: 'Username', password: 'Password', confirmPassword: 'Confirm password',
    staySignedIn: 'Keep me signed in', signIn: 'Sign in', createAccount: 'Create account',
    forgotPassword: 'Forgot password', backToLogin: 'Back to sign in',
    displayName: 'Your name / nickname', securityQuestion: 'Security question',
    securityAnswer: 'Answer', newPassword: 'New password', continueBtn: 'Continue',
    resetPassword: 'Reset password', lockedTitle: 'Session locked',
    lockedSub: 'Enter your password to continue', unlock: 'Unlock', signOut: 'Sign out',
    navDashboard: 'Home', navCalendar: 'Calendar', navTimeline: 'Our Story',
    navEvents: 'Events', navNotes: 'Notes', navGallery: 'Gallery', navSettings: 'Settings',
    noTrack: 'No track',
  }
};

let currentLang = lsGet('lang', 'es');

export function getLang() { return currentLang; }

export function setLang(lang) {
  if (!DICT[lang]) lang = 'es';
  currentLang = lang;
  lsSet('lang', lang);
  applyTranslations();
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

export function t(key) {
  return (DICT[currentLang] && DICT[currentLang][key]) || DICT.es[key] || key;
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
}
