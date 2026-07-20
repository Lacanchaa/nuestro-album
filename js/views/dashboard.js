// ============================================================
// views/dashboard.js
// ============================================================
import { getSettings, saveSettings } from '../data.js';
import { getLang } from '../i18n.js';
import { toast } from '../ui.js';

let intervalId = null;

const QUOTES_ES = [
  'El amor no se mira, se siente.',
  'Contigo, hasta lo simple es especial.',
  'Cada recuerdo contigo es un tesoro.',
  'Eres mi lugar favorito.',
  'Nuestra historia, mi capítulo preferido.'
];
const QUOTES_EN = [
  'Love isn\u2019t seen, it\u2019s felt.',
  'With you, even simple things feel special.',
  'Every memory with you is a treasure.',
  'You are my favorite place.',
  'Our story, my favorite chapter.'
];

export function destroy() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

export function init(container) {
  destroy();
  const settings = getSettings();
  const lang = getLang();
  const quote = (lang === 'en' ? QUOTES_EN : QUOTES_ES)[new Date().getDate() % 5];

  container.innerHTML = `
    <div class="dash-grid">
      <div class="card">
        <div class="card-title">${lang === 'en' ? 'Right now' : 'Ahora mismo'}</div>
        <div class="dash-clock" id="dash-clock">--:--:--</div>
        <div class="dash-date" id="dash-date"></div>
      </div>

      <div class="card dash-together">
        <div class="card-title">${lang === 'en' ? 'Time together' : 'Tiempo juntos'}</div>
        <div class="together-grid" id="together-grid"></div>
      </div>

      <div class="card">
        <div class="card-title">${lang === 'en' ? 'Counters' : 'Contadores'}</div>
        <div class="counters-row">
          <div class="counter-item">
            <button class="counter-btn" id="btn-kiss" title="+1">💋</button>
            <div class="counter-val" id="kiss-val">${settings.kissCount || 0}</div>
            <div class="together-label">${lang === 'en' ? 'Kisses' : 'Besos'}</div>
          </div>
          <div class="counter-item">
            <button class="counter-btn" id="btn-hug" title="+1">🤗</button>
            <div class="counter-val" id="hug-val">${settings.hugCount || 0}</div>
            <div class="together-label">${lang === 'en' ? 'Hugs' : 'Abrazos'}</div>
          </div>
        </div>
      </div>

      <div class="card" style="grid-column: span 2">
        <div class="card-title">${lang === 'en' ? 'Message for you two' : 'Mensaje para vosotros'}</div>
        <div class="dash-message" id="dash-message-view">${escapeMsg(settings.dashboardMessage)}</div>
        <textarea class="dash-message-edit hidden" id="dash-message-edit">${settings.dashboardMessage || ''}</textarea>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn btn-ghost" id="btn-edit-msg">${lang === 'en' ? 'Edit message' : 'Editar mensaje'}</button>
          <button class="btn btn-primary hidden" id="btn-save-msg">${lang === 'en' ? 'Save' : 'Guardar'}</button>
        </div>
      </div>

      <div class="card" style="grid-column: 1 / -1">
        <div class="dash-quote">"${quote}"</div>
      </div>
    </div>
  `;

  // Reloj en tiempo real
  const clockEl = container.querySelector('#dash-clock');
  const dateEl = container.querySelector('#dash-date');
  function tick() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-ES');
    dateEl.textContent = now.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    renderTogether(container, settings.relationshipDate, lang);
  }
  tick();
  intervalId = setInterval(tick, 1000);

  // Contadores
  container.querySelector('#btn-kiss').addEventListener('click', () => {
    const s = saveSettings({ kissCount: (getSettings().kissCount || 0) + 1 });
    container.querySelector('#kiss-val').textContent = s.kissCount;
  });
  container.querySelector('#btn-hug').addEventListener('click', () => {
    const s = saveSettings({ hugCount: (getSettings().hugCount || 0) + 1 });
    container.querySelector('#hug-val').textContent = s.hugCount;
  });

  // Mensaje editable
  const viewEl = container.querySelector('#dash-message-view');
  const editEl = container.querySelector('#dash-message-edit');
  const btnEdit = container.querySelector('#btn-edit-msg');
  const btnSave = container.querySelector('#btn-save-msg');
  btnEdit.addEventListener('click', () => {
    viewEl.classList.add('hidden'); editEl.classList.remove('hidden');
    btnEdit.classList.add('hidden'); btnSave.classList.remove('hidden');
    editEl.focus();
  });
  btnSave.addEventListener('click', () => {
    const val = editEl.value.trim().slice(0, 300);
    saveSettings({ dashboardMessage: val });
    viewEl.textContent = val;
    viewEl.classList.remove('hidden'); editEl.classList.add('hidden');
    btnEdit.classList.remove('hidden'); btnSave.classList.add('hidden');
    toast(lang === 'en' ? 'Message saved' : 'Mensaje guardado', 'success');
  });
}

function escapeMsg(msg) {
  const div = document.createElement('div');
  div.textContent = msg || '';
  return div.innerHTML;
}

function renderTogether(container, relationshipDate, lang) {
  const grid = container.querySelector('#together-grid');
  if (!grid) return;
  if (!relationshipDate) {
    grid.innerHTML = `<p style="grid-column:1/-1;color:var(--text-muted);font-size:13px">
      ${lang === 'en' ? 'Set your relationship start date in Settings to see this counter.' : 'Configura la fecha de inicio de vuestra relación en Ajustes para ver este contador.'}
    </p>`;
    return;
  }
  const start = new Date(relationshipDate + 'T00:00:00');
  const now = new Date();
  if (isNaN(start) || start > now) {
    grid.innerHTML = `<p style="grid-column:1/-1;color:var(--text-muted);font-size:13px">${lang === 'en' ? 'Invalid date' : 'Fecha no válida'}</p>`;
    return;
  }
  let diffMs = now - start;
  const totalSeconds = Math.floor(diffMs / 1000);

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  let seconds = now.getSeconds() - start.getSeconds();
  if (seconds < 0) { seconds += 60; minutes--; }
  if (minutes < 0) { minutes += 60; hours--; }
  if (hours < 0) { hours += 24; days--; }
  if (days < 0) {
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months--;
  }
  if (months < 0) { months += 12; years--; }

  const labels = lang === 'en'
    ? ['Years', 'Months', 'Days', 'Hours', 'Min', 'Sec']
    : ['Años', 'Meses', 'Días', 'Horas', 'Min', 'Seg'];
  const values = [years, months, days, hours, minutes, seconds];

  // Solo reconstruye el DOM si aún no existe (cambio de idioma/vista);
  // en cada tick posterior únicamente actualiza los números, evitando
  // reflows innecesarios cada segundo.
  let nums = grid.querySelectorAll('.together-num');
  if (nums.length !== values.length) {
    grid.innerHTML = values.map((v, i) => `
      <div>
        <div class="together-num">${v}</div>
        <div class="together-label">${labels[i]}</div>
      </div>
    `).join('');
  } else {
    nums.forEach((el, i) => { el.textContent = values[i]; });
  }
}
