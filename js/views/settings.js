// ============================================================
// views/settings.js
// ============================================================
import { getSettings, saveSettings, exportAllStructuredData, importStructuredData } from '../data.js';
import { getCurrentUser, changePassword, changeUsername } from '../auth.js';
import { idbGetAll, idbPut } from '../storage.js';
import { toast } from '../ui.js';
import { getLang, setLang, t } from '../i18n.js';
import { applyTheme } from '../theme.js';

export function destroy() {}

const THEMES = ['light', 'dark', 'rosa', 'lavanda', 'celeste', 'rojo', 'dorado', 'vintage', 'minimal'];
const THEME_SWATCH_COLOR = {
  light: '#B98452', dark: '#2A2329', rosa: '#C1798A', lavanda: '#8B77C2',
  celeste: '#5FA3C0', rojo: '#B8443B', dorado: '#B8912E', vintage: '#9C6B45', minimal: '#1B1B1B'
};
const TEMPLATES = [
  { id: 'romantica', es: 'Romántica', en: 'Romantic' },
  { id: 'sakura', es: 'Sakura', en: 'Sakura' },
  { id: 'nocturna', es: 'Nocturna', en: 'Night' },
  { id: 'pastel', es: 'Pastel', en: 'Pastel' },
  { id: 'navidad', es: 'Navidad', en: 'Christmas' },
  { id: 'san_valentin', es: 'San Valentín', en: 'Valentine' },
  { id: 'verano', es: 'Verano', en: 'Summer' },
  { id: 'invierno', es: 'Invierno', en: 'Winter' }
];

export function init(container) {
  render(container);
}

function render(container) {
  const lang = getLang();
  const settings = getSettings();
  const user = getCurrentUser();

  container.innerHTML = `
    <div class="settings-grid">

      <div class="card settings-section">
        <h3>${lang === 'en' ? 'Profile' : 'Perfil'}</h3>
        <div class="auth-form">
          <label class="field"><span>${lang === 'en' ? 'Album name' : 'Nombre del álbum'}</span>
            <input type="text" id="set-couple-name" value="${escVal(settings.coupleName)}"></label>
          <label class="field"><span>${lang === 'en' ? 'Relationship start date' : 'Fecha de inicio de la relación'}</span>
            <input type="date" id="set-rel-date" value="${settings.relationshipDate || ''}"></label>
          <button class="btn btn-primary" id="btn-save-profile">${lang === 'en' ? 'Save profile' : 'Guardar perfil'}</button>
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === 'en' ? 'Language & format' : 'Idioma y formato'}</h3>
        <div class="auth-form">
          <label class="field"><span>${lang === 'en' ? 'Language' : 'Idioma'}</span>
            <select id="set-lang"><option value="es" ${lang==='es'?'selected':''}>Español</option><option value="en" ${lang==='en'?'selected':''}>English</option></select></label>
          <label class="field"><span>${lang === 'en' ? 'Date format' : 'Formato de fecha'}</span>
            <select id="set-dateformat">
              <option value="DD/MM/YYYY" ${settings.dateFormat==='DD/MM/YYYY'?'selected':''}>DD/MM/YYYY</option>
              <option value="MM/DD/YYYY" ${settings.dateFormat==='MM/DD/YYYY'?'selected':''}>MM/DD/YYYY</option>
              <option value="YYYY-MM-DD" ${settings.dateFormat==='YYYY-MM-DD'?'selected':''}>YYYY-MM-DD</option>
            </select></label>
          <label class="checkbox-field"><input type="checkbox" id="set-notifications" ${settings.notifications ? 'checked':''}><span>${lang === 'en' ? 'Enable notifications' : 'Activar notificaciones'}</span></label>
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === 'en' ? 'Theme' : 'Tema'}</h3>
        <div class="theme-swatches" id="theme-swatches">
          ${THEMES.map(th => `<button type="button" class="theme-swatch ${settings.theme===th?'active':''}" data-theme="${th}" style="background:${THEME_SWATCH_COLOR[th]}" title="${th}"></button>`).join('')}
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === 'en' ? 'Templates' : 'Plantillas'}</h3>
        <div class="template-list" id="template-list">
          ${TEMPLATES.map(tp => `<button type="button" class="template-chip ${settings.template===tp.id?'active':''}" data-template="${tp.id}">${lang==='en'?tp.en:tp.es}</button>`).join('')}
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === 'en' ? 'Bucket list' : 'Lista de deseos'}</h3>
        <div id="bucket-list"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input type="text" class="input-search" id="bucket-input" placeholder="${lang === 'en' ? 'Add a wish…' : 'Añadir un deseo…'}">
          <button class="btn btn-ghost" id="bucket-add">+</button>
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === 'en' ? 'Account security' : 'Seguridad de la cuenta'}</h3>
        <div class="auth-form">
          <label class="field"><span>${lang === 'en' ? 'Username' : 'Usuario'}</span>
            <input type="text" id="set-username" value="${escVal(user?.username || '')}"></label>
          <button class="btn btn-ghost" id="btn-change-username">${lang === 'en' ? 'Update username' : 'Actualizar usuario'}</button>
          <hr style="border:none;border-top:1px solid var(--border);margin:6px 0">
          <label class="field"><span>${lang === 'en' ? 'Current password' : 'Contraseña actual'}</span><input type="password" id="set-cur-pass"></label>
          <label class="field"><span>${lang === 'en' ? 'New password' : 'Nueva contraseña'}</span><input type="password" id="set-new-pass"></label>
          <button class="btn btn-ghost" id="btn-change-pass">${lang === 'en' ? 'Change password' : 'Cambiar contraseña'}</button>
          <hr style="border:none;border-top:1px solid var(--border);margin:6px 0">
          <label class="field"><span>${lang === 'en' ? 'Auto-lock after inactivity (minutes, 0 = off)' : 'Bloqueo por inactividad (minutos, 0 = desactivado)'}</span>
            <input type="number" min="0" max="120" id="set-lock-minutes" value="${settings.inactivityLockMinutes}"></label>
          <button class="btn btn-ghost" id="btn-save-lock">${lang === 'en' ? 'Save' : 'Guardar'}</button>
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === 'en' ? 'Backup' : 'Copia de seguridad'}</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:10px">${lang === 'en' ? 'Export everything (data + media) to a file, or restore from one.' : 'Exporta todo (datos + multimedia) a un archivo, o restaura desde uno.'}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost" id="btn-export">⬇ ${lang === 'en' ? 'Export backup' : 'Exportar copia'}</button>
          <label class="btn btn-ghost" style="cursor:pointer">⬆ ${lang === 'en' ? 'Import backup' : 'Importar copia'}
            <input type="file" id="input-import" accept=".json" class="hidden"></label>
        </div>
      </div>

    </div>
  `;

  // Perfil
  container.querySelector('#btn-save-profile').addEventListener('click', () => {
    saveSettings({
      coupleName: container.querySelector('#set-couple-name').value.trim() || 'Nuestro Álbum',
      relationshipDate: container.querySelector('#set-rel-date').value
    });
    document.getElementById('brand-couple-name').textContent = getSettings().coupleName;
    toast(lang === 'en' ? 'Profile saved' : 'Perfil guardado', 'success');
  });

  // Idioma / formato
  container.querySelector('#set-lang').addEventListener('change', (e) => {
    saveSettings({ lang: e.target.value });
    setLang(e.target.value);
    render(container);
  });
  container.querySelector('#set-dateformat').addEventListener('change', (e) => saveSettings({ dateFormat: e.target.value }));
  container.querySelector('#set-notifications').addEventListener('change', (e) => saveSettings({ notifications: e.target.checked }));

  // Tema
  container.querySelectorAll('#theme-swatches .theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      saveSettings({ theme: btn.dataset.theme });
      applyTheme(btn.dataset.theme);
      container.querySelectorAll('#theme-swatches .theme-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Plantillas
  container.querySelectorAll('#template-list .template-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      saveSettings({ template: btn.dataset.template });
      container.querySelectorAll('#template-list .template-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      toast(lang === 'en' ? 'Template applied' : 'Plantilla aplicada', 'success');
    });
  });

  // Bucket list
  function renderBucket() {
    const s = getSettings();
    const list = container.querySelector('#bucket-list');
    if (!s.bucketList.length) {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:13px">${lang === 'en' ? 'No wishes yet.' : 'Sin deseos todavía.'}</p>`;
      return;
    }
    list.innerHTML = s.bucketList.map((item, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
        <input type="checkbox" data-idx="${i}" class="bucket-check" ${item.done ? 'checked' : ''}>
        <span style="flex:1;${item.done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${escVal(item.text)}</span>
        <button class="icon-btn small bucket-del" data-idx="${i}">✕</button>
      </div>
    `).join('');
    list.querySelectorAll('.bucket-check').forEach(cb => cb.addEventListener('change', () => {
      const st = getSettings();
      st.bucketList[+cb.dataset.idx].done = cb.checked;
      saveSettings({ bucketList: st.bucketList });
      renderBucket();
    }));
    list.querySelectorAll('.bucket-del').forEach(b => b.addEventListener('click', () => {
      const st = getSettings();
      st.bucketList.splice(+b.dataset.idx, 1);
      saveSettings({ bucketList: st.bucketList });
      renderBucket();
    }));
  }
  container.querySelector('#bucket-add').addEventListener('click', () => {
    const input = container.querySelector('#bucket-input');
    const val = input.value.trim();
    if (!val) return;
    const st = getSettings();
    st.bucketList.push({ text: val, done: false });
    saveSettings({ bucketList: st.bucketList });
    input.value = '';
    renderBucket();
  });
  renderBucket();

  // Seguridad
  container.querySelector('#btn-change-username').addEventListener('click', async () => {
    const newU = container.querySelector('#set-username').value.trim();
    try {
      await changeUsername({ oldUsername: user.username, newUsername: newU });
      toast(lang === 'en' ? 'Username updated' : 'Usuario actualizado', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
  container.querySelector('#btn-change-pass').addEventListener('click', async () => {
    const cur = container.querySelector('#set-cur-pass').value;
    const nw = container.querySelector('#set-new-pass').value;
    try {
      await changePassword({ username: user.username, currentPassword: cur, newPassword: nw });
      toast(lang === 'en' ? 'Password changed' : 'Contraseña cambiada', 'success');
      container.querySelector('#set-cur-pass').value = '';
      container.querySelector('#set-new-pass').value = '';
    } catch (err) { toast(err.message, 'error'); }
  });
  container.querySelector('#btn-save-lock').addEventListener('click', () => {
    const minutes = Math.max(0, Math.min(120, +container.querySelector('#set-lock-minutes').value || 0));
    saveSettings({ inactivityLockMinutes: minutes });
    toast(lang === 'en' ? 'Saved' : 'Guardado', 'success');
    window.dispatchEvent(new CustomEvent('lockminutes-changed', { detail: minutes }));
  });

  // Backup
  container.querySelector('#btn-export').addEventListener('click', async () => {
    try {
      const structured = exportAllStructuredData();
      const media = await idbGetAll();
      const payload = { structured, media, appVersion: 1 };
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nuestro-album-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast(lang === 'en' ? 'Backup exported' : 'Copia exportada', 'success');
    } catch (err) {
      console.error(err);
      toast(lang === 'en' ? 'Export failed' : 'No se pudo exportar', 'error');
    }
  });

  container.querySelector('#input-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload.structured) throw new Error('invalid');
      if (!confirm(lang === 'en' ? 'This will replace your current data. Continue?' : 'Esto reemplazará tus datos actuales. ¿Continuar?')) return;
      importStructuredData(payload.structured);
      if (Array.isArray(payload.media)) {
        for (const rec of payload.media) await idbPut(rec);
      }
      toast(lang === 'en' ? 'Backup restored. Reloading…' : 'Copia restaurada. Recargando…', 'success');
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      console.error(err);
      toast(lang === 'en' ? 'Invalid backup file' : 'Archivo de copia no válido', 'error');
    }
    e.target.value = '';
  });
}

function escVal(v) {
  const div = document.createElement('div');
  div.textContent = v || '';
  return div.innerHTML;
}
