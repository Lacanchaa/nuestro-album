// ============================================================
// theme.js — Aplica el tema visual seleccionado (data-theme en <html>)
// ============================================================
export function applyTheme(themeId) {
  document.documentElement.setAttribute('data-theme', themeId || 'rosa');
}
