(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // js/storage.js
  var LS_PREFIX = "album_";
  var IDB_NAME = "album_media_db";
  var IDB_STORE = "media";
  var IDB_VERSION = 1;
  var dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  function lsGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.error("storage.lsGet error", key, err);
      return fallback;
    }
  }
  function lsSet(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error("storage.lsSet error", key, err);
      return false;
    }
  }
  function lsRemove(key) {
    localStorage.removeItem(LS_PREFIX + key);
  }
  function genId() {
    return "m_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }
  async function idbPut(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }
  async function idbGet(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
  async function idbGetAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("Archivo vac\xEDo"));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  async function saveMediaFile(file, meta = {}) {
    const base64 = await fileToBase64(file);
    const id = genId();
    const record = {
      id,
      kind: meta.kind || "photo",
      // photo | video | audio
      mime: file.type,
      name: file.name || "",
      data: base64,
      createdAt: Date.now(),
      ...meta
    };
    await idbPut(record);
    return record;
  }

  // js/auth.js
  var USERS_KEY = "users";
  var SESSION_KEY = "session";
  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function randomSalt() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function getUsers() {
    return lsGet(USERS_KEY, {});
  }
  function saveUsers(users) {
    lsSet(USERS_KEY, users);
  }
  async function registerUser({ username, password, displayName, secQuestion, secAnswer }) {
    username = (username || "").trim().toLowerCase();
    if (username.length < 3) throw new Error("El usuario debe tener al menos 3 caracteres");
    if (!password || password.length < 6) throw new Error("La contrase\xF1a debe tener al menos 6 caracteres");
    if (!secQuestion || !secAnswer) throw new Error("Completa la pregunta de seguridad");
    const users = getUsers();
    if (users[username]) throw new Error("Ese usuario ya existe");
    const salt = randomSalt();
    const passHash = await sha256(salt + password);
    const secAnswerHash = await sha256(salt + secAnswer.trim().toLowerCase());
    users[username] = {
      username,
      displayName: (displayName == null ? void 0 : displayName.trim()) || username,
      salt,
      passHash,
      secQuestion: secQuestion.trim(),
      secAnswerHash,
      createdAt: Date.now()
    };
    saveUsers(users);
    return users[username];
  }
  async function loginUser({ username, password, remember }) {
    username = (username || "").trim().toLowerCase();
    const users = getUsers();
    const user = users[username];
    if (!user) throw new Error("Usuario o contrase\xF1a incorrectos");
    const hash = await sha256(user.salt + password);
    if (hash !== user.passHash) throw new Error("Usuario o contrase\xF1a incorrectos");
    const session = { username, loggedInAt: Date.now(), remember: !!remember };
    lsSet(SESSION_KEY, session);
    if (!remember) {
      sessionStorage.setItem("album_session_temp", "1");
    }
    return user;
  }
  function logoutUser() {
    lsRemove(SESSION_KEY);
    sessionStorage.removeItem("album_session_temp");
  }
  function getSession() {
    const session = lsGet(SESSION_KEY, null);
    if (!session) return null;
    if (!session.remember && !sessionStorage.getItem("album_session_temp")) {
      lsRemove(SESSION_KEY);
      return null;
    }
    return session;
  }
  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    const users = getUsers();
    return users[session.username] || null;
  }
  function isAuthenticated() {
    return !!getSession();
  }
  async function changePassword({ username, currentPassword, newPassword }) {
    username = (username || "").trim().toLowerCase();
    const users = getUsers();
    const user = users[username];
    if (!user) throw new Error("Usuario no encontrado");
    const hash = await sha256(user.salt + currentPassword);
    if (hash !== user.passHash) throw new Error("La contrase\xF1a actual no es correcta");
    if (!newPassword || newPassword.length < 6) throw new Error("La nueva contrase\xF1a debe tener al menos 6 caracteres");
    const salt = randomSalt();
    user.passHash = await sha256(salt + newPassword);
    user.salt = salt;
    users[username] = user;
    saveUsers(users);
    return true;
  }
  async function changeUsername({ oldUsername, newUsername }) {
    oldUsername = oldUsername.trim().toLowerCase();
    newUsername = newUsername.trim().toLowerCase();
    if (newUsername.length < 3) throw new Error("El usuario debe tener al menos 3 caracteres");
    const users = getUsers();
    if (!users[oldUsername]) throw new Error("Usuario no encontrado");
    if (users[newUsername]) throw new Error("Ese nombre de usuario ya est\xE1 en uso");
    const user = { ...users[oldUsername], username: newUsername };
    delete users[oldUsername];
    users[newUsername] = user;
    saveUsers(users);
    const session = getSession();
    if (session) {
      session.username = newUsername;
      lsSet(SESSION_KEY, session);
    }
    return user;
  }
  function getSecurityQuestion(username) {
    username = (username || "").trim().toLowerCase();
    const users = getUsers();
    const user = users[username];
    if (!user) throw new Error("Usuario no encontrado");
    return user.secQuestion;
  }
  async function recoverPassword({ username, answer, newPassword }) {
    username = (username || "").trim().toLowerCase();
    const users = getUsers();
    const user = users[username];
    if (!user) throw new Error("Usuario no encontrado");
    const answerHash = await sha256(user.salt + answer.trim().toLowerCase());
    if (answerHash !== user.secAnswerHash) throw new Error("La respuesta no es correcta");
    if (!newPassword || newPassword.length < 6) throw new Error("La nueva contrase\xF1a debe tener al menos 6 caracteres");
    const salt = randomSalt();
    user.salt = salt;
    user.passHash = await sha256(salt + newPassword);
    users[username] = user;
    saveUsers(users);
    return true;
  }

  // js/data.js
  var DAYS_KEY = "days";
  var NOTES_KEY = "notes";
  var EVENTS_KEY = "events";
  var SETTINGS_KEY = "settings";
  var DEFAULT_SETTINGS = {
    coupleName: "Nuestro \xC1lbum",
    relationshipDate: "",
    dashboardMessage: "Cada d\xEDa contigo es una p\xE1gina m\xE1s de nuestra historia. \u{1F49B}",
    kissCount: 0,
    hugCount: 0,
    bucketList: [],
    theme: "rosa",
    template: "romantica",
    lang: "es",
    dateFormat: "DD/MM/YYYY",
    animations: true,
    inactivityLockMinutes: 10,
    notifications: true
  };
  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...lsGet(SETTINGS_KEY, {}) };
  }
  function saveSettings(patch) {
    const current = getSettings();
    const updated = { ...current, ...patch };
    lsSet(SETTINGS_KEY, updated);
    return updated;
  }
  function getAllDays() {
    return lsGet(DAYS_KEY, {});
  }
  function getDay(dateIso) {
    const days = getAllDays();
    return days[dateIso] || { date: dateIso, comment: "", media: [] };
  }
  function saveDay(dateIso, dayData) {
    const days = getAllDays();
    days[dateIso] = { ...dayData, date: dateIso };
    lsSet(DAYS_KEY, days);
    return days[dateIso];
  }
  async function deleteDayMediaItem(dateIso, mediaItemId) {
    const day = getDay(dateIso);
    const item = day.media.find((m) => m.id === mediaItemId);
    if (item && item.source === "file" && item.refId) {
      try {
        await idbDelete(item.refId);
      } catch (e) {
        console.warn("No se pudo borrar el archivo", e);
      }
    }
    day.media = day.media.filter((m) => m.id !== mediaItemId);
    saveDay(dateIso, day);
    return day;
  }
  function addDayMediaItem(dateIso, item) {
    const day = getDay(dateIso);
    const newItem = { id: genId(), isMain: day.media.length === 0, order: day.media.length, ...item };
    day.media = [...day.media, newItem];
    saveDay(dateIso, day);
    return day;
  }
  function setMainMedia(dateIso, mediaItemId) {
    const day = getDay(dateIso);
    day.media = day.media.map((m) => ({ ...m, isMain: m.id === mediaItemId }));
    saveDay(dateIso, day);
    return day;
  }
  function reorderDayMedia(dateIso, orderedIds) {
    const day = getDay(dateIso);
    const map = new Map(day.media.map((m) => [m.id, m]));
    day.media = orderedIds.map((id, idx) => ({ ...map.get(id), order: idx })).filter(Boolean);
    saveDay(dateIso, day);
    return day;
  }
  function dayHasContent(day) {
    return !!(day && (day.media && day.media.length || day.comment && day.comment.trim()));
  }
  function getMainPhoto(day) {
    if (!day || !day.media) return null;
    return day.media.find((m) => m.isMain && m.kind === "photo") || day.media.find((m) => m.kind === "photo") || null;
  }
  var GALLERY_FAV_KEY = "gallery_favorites";
  function getGalleryFavorites() {
    return lsGet(GALLERY_FAV_KEY, []);
  }
  function toggleGalleryFavorite(mediaId) {
    const favs = getGalleryFavorites();
    const idx = favs.indexOf(mediaId);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(mediaId);
    lsSet(GALLERY_FAV_KEY, favs);
    return favs;
  }
  function getNotes() {
    return lsGet(NOTES_KEY, []);
  }
  function saveNote(note) {
    const notes = getNotes();
    if (note.id) {
      const idx = notes.findIndex((n) => n.id === note.id);
      if (idx >= 0) {
        notes[idx] = note;
        lsSet(NOTES_KEY, notes);
        return note;
      }
    }
    note.id = genId();
    note.createdAt = Date.now();
    notes.unshift(note);
    lsSet(NOTES_KEY, notes);
    return note;
  }
  function deleteNote(id) {
    lsSet(NOTES_KEY, getNotes().filter((n) => n.id !== id));
  }
  function getEvents() {
    return lsGet(EVENTS_KEY, []);
  }
  function saveEvent(ev) {
    const events = getEvents();
    if (ev.id) {
      const idx = events.findIndex((e) => e.id === ev.id);
      if (idx >= 0) {
        events[idx] = ev;
        lsSet(EVENTS_KEY, events);
        return ev;
      }
    }
    ev.id = genId();
    ev.createdAt = Date.now();
    events.push(ev);
    lsSet(EVENTS_KEY, events);
    return ev;
  }
  async function deleteEvent(id) {
    const events = getEvents();
    const ev = events.find((e) => e.id === id);
    if (ev && ev.media) {
      for (const m of ev.media) {
        if (m.source === "file" && m.refId) {
          try {
            await idbDelete(m.refId);
          } catch (e) {
          }
        }
      }
    }
    lsSet(EVENTS_KEY, events.filter((e) => e.id !== id));
  }
  var PLAYLIST_KEY = "playlist";
  function getPlaylist() {
    return lsGet(PLAYLIST_KEY, []);
  }
  function savePlaylist(list) {
    lsSet(PLAYLIST_KEY, list);
    return list;
  }
  function addTrackToPlaylist(track) {
    const list = getPlaylist();
    list.push({ id: genId(), ...track });
    savePlaylist(list);
    return list;
  }
  async function removeTrackFromPlaylist(id) {
    const list = getPlaylist();
    const track = list.find((t2) => t2.id === id);
    if (track && track.source === "file" && track.refId) {
      try {
        await idbDelete(track.refId);
      } catch (e) {
      }
    }
    savePlaylist(list.filter((t2) => t2.id !== id));
  }
  function exportAllStructuredData() {
    return {
      days: getAllDays(),
      notes: getNotes(),
      events: getEvents(),
      settings: getSettings(),
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function importStructuredData(data) {
    if (data.days) lsSet(DAYS_KEY, data.days);
    if (data.notes) lsSet(NOTES_KEY, data.notes);
    if (data.events) lsSet(EVENTS_KEY, data.events);
    if (data.settings) lsSet(SETTINGS_KEY, data.settings);
  }

  // js/ui.js
  function toast(message, type = "info", duration = 3200) {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }
  function openModal(innerHtml, { wide = false, onMount = null } = {}) {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "active-modal-overlay";
    overlay.innerHTML = `<div class="modal-box ${wide ? "wide" : ""}">${innerHtml}</div>`;
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) closeModal();
    });
    document.getElementById("modal-root").appendChild(overlay);
    document.addEventListener("keydown", escCloseHandler);
    if (onMount) onMount(overlay.querySelector(".modal-box"));
    return overlay;
  }
  function escCloseHandler(e) {
    if (e.key === "Escape") closeModal();
  }
  function openImageLightbox(src) {
    if (!src) return;
    openModal(`
    <button class="modal-close" id="lightbox-close" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.5);color:#fff;border-radius:50%;width:36px;height:36px">\u2715</button>
    <img src="${src}" alt="" style="width:100%;max-height:80vh;object-fit:contain;border-radius:12px;display:block">
  `, { wide: true, onMount: (box) => {
      box.style.padding = "10px";
      box.style.position = "relative";
      box.style.background = "transparent";
      box.style.boxShadow = "none";
    } });
    document.getElementById("lightbox-close").addEventListener("click", closeModal);
  }
  function closeModal() {
    const existing = document.getElementById("active-modal-overlay");
    if (existing) existing.remove();
    document.removeEventListener("keydown", escCloseHandler);
  }
  function escapeHtml(str) {
    if (str === null || str === void 0) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtDate(dateStr, lang = "es") {
    if (!dateStr) return "";
    const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { year: "numeric", month: "long", day: "numeric" });
  }
  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function isoDate(y, m, d) {
    return `${y}-${pad2(m + 1)}-${pad2(d)}`;
  }

  // js/i18n.js
  var DICT = {
    es: {
      loading: "Preparando vuestros recuerdos\u2026",
      welcomeTitle: "Bienvenidos de nuevo",
      welcomeSub: "Vuestra historia os espera",
      username: "Usuario",
      password: "Contrase\xF1a",
      confirmPassword: "Confirmar contrase\xF1a",
      staySignedIn: "Mantener sesi\xF3n iniciada",
      signIn: "Entrar",
      createAccount: "Crear cuenta",
      forgotPassword: "Olvid\xE9 mi contrase\xF1a",
      backToLogin: "Volver a entrar",
      displayName: "Vuestro nombre / apodo",
      securityQuestion: "Pregunta de seguridad",
      securityAnswer: "Respuesta",
      newPassword: "Nueva contrase\xF1a",
      continueBtn: "Continuar",
      resetPassword: "Restablecer contrase\xF1a",
      lockedTitle: "Sesi\xF3n bloqueada",
      lockedSub: "Introduce tu contrase\xF1a para continuar",
      unlock: "Desbloquear",
      signOut: "Cerrar sesi\xF3n",
      navDashboard: "Inicio",
      navCalendar: "Calendario",
      navTimeline: "Nuestra Historia",
      navEvents: "Eventos",
      navNotes: "Notas",
      navGallery: "Galer\xEDa",
      navSettings: "Ajustes",
      noTrack: "Sin m\xFAsica"
    },
    en: {
      loading: "Getting your memories ready\u2026",
      welcomeTitle: "Welcome back",
      welcomeSub: "Your story is waiting",
      username: "Username",
      password: "Password",
      confirmPassword: "Confirm password",
      staySignedIn: "Keep me signed in",
      signIn: "Sign in",
      createAccount: "Create account",
      forgotPassword: "Forgot password",
      backToLogin: "Back to sign in",
      displayName: "Your name / nickname",
      securityQuestion: "Security question",
      securityAnswer: "Answer",
      newPassword: "New password",
      continueBtn: "Continue",
      resetPassword: "Reset password",
      lockedTitle: "Session locked",
      lockedSub: "Enter your password to continue",
      unlock: "Unlock",
      signOut: "Sign out",
      navDashboard: "Home",
      navCalendar: "Calendar",
      navTimeline: "Our Story",
      navEvents: "Events",
      navNotes: "Notes",
      navGallery: "Gallery",
      navSettings: "Settings",
      noTrack: "No track"
    }
  };
  var currentLang = lsGet("lang", "es");
  function getLang() {
    return currentLang;
  }
  function setLang(lang) {
    if (!DICT[lang]) lang = "es";
    currentLang = lang;
    lsSet("lang", lang);
    applyTranslations();
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
  }
  function t(key) {
    return DICT[currentLang] && DICT[currentLang][key] || DICT.es[key] || key;
  }
  function applyTranslations(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
  }

  // js/theme.js
  function applyTheme(themeId) {
    document.documentElement.setAttribute("data-theme", themeId || "rosa");
  }

  // js/fx.js
  var TEMPLATE_ICONS = {
    romantica: ["\u{1F49B}", "\u2726"],
    sakura: ["\u{1F338}"],
    nocturna: ["\u2726", "\u22C6"],
    pastel: ["\u273F", "\u2726"],
    navidad: ["\u2744"],
    san_valentin: ["\u{1F495}", "\u{1F497}"],
    verano: ["\u2600", "\u2726"],
    invierno: ["\u2744", "\u2726"]
  };
  var canvas;
  var ctx;
  var particles = [];
  var rafId = null;
  var running = false;
  var resizeHandler = null;
  function initCanvas() {
    canvas = document.getElementById("fx-canvas");
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    resize();
    resizeHandler = () => resize();
    window.addEventListener("resize", resizeHandler);
    return true;
  }
  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  function spawnParticle(icons) {
    return {
      x: Math.random() * canvas.width,
      y: -20,
      speed: 0.6 + Math.random() * 1.2,
      drift: (Math.random() - 0.5) * 0.6,
      size: 14 + Math.random() * 14,
      icon: icons[Math.floor(Math.random() * icons.length)],
      rotation: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.5 + Math.random() * 0.5
    };
  }
  function loop(icons) {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (particles.length < 40 && Math.random() < 0.4) particles.push(spawnParticle(icons));
    particles.forEach((p) => {
      p.y += p.speed;
      p.x += p.drift;
      p.rotation += p.rotSpeed;
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.font = `${p.size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(p.icon, 0, 0);
      ctx.restore();
    });
    particles = particles.filter((p) => p.y < canvas.height + 30);
    rafId = requestAnimationFrame(() => loop(icons));
  }
  function startFx(templateId = "romantica") {
    if (running) stopFx();
    if (!canvas && !initCanvas()) return;
    canvas.classList.remove("hidden");
    running = true;
    particles = [];
    const icons = TEMPLATE_ICONS[templateId] || TEMPLATE_ICONS.romantica;
    loop(icons);
  }
  function stopFx() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    particles = [];
    if (canvas) {
      ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.classList.add("hidden");
    }
  }
  function isFxRunning() {
    return running;
  }

  // js/media.js
  async function resolveMediaSrc(item) {
    if (item.source === "link") return item.url;
    if (item.source === "file" && item.refId) {
      const rec = await idbGet(item.refId);
      return rec ? rec.data : "";
    }
    return "";
  }
  async function mediaItemFromFile(file, kind) {
    const rec = await saveMediaFile(file, { kind });
    return { id: genId(), kind, source: "file", refId: rec.id, name: file.name, addedAt: Date.now() };
  }
  function mediaItemFromLink(url, kind) {
    return { id: genId(), kind, source: "link", url: url.trim(), addedAt: Date.now() };
  }

  // js/music.js
  var audioEl;
  var toggleBtn;
  var trackNameEl;
  var seekEl;
  var volumeEl;
  var shuffleBtn;
  var repeatBtn;
  var listBtn;
  var playerBar;
  var currentIndex = -1;
  var shuffle = false;
  var repeatMode = "off";
  function initPlayer() {
    audioEl = document.getElementById("mp-audio");
    toggleBtn = document.getElementById("mp-toggle");
    trackNameEl = document.getElementById("mp-track-name");
    seekEl = document.getElementById("mp-seek");
    volumeEl = document.getElementById("mp-volume");
    shuffleBtn = document.getElementById("mp-shuffle");
    repeatBtn = document.getElementById("mp-repeat");
    listBtn = document.getElementById("mp-list");
    playerBar = document.getElementById("music-player");
    audioEl.volume = 0.7;
    toggleBtn.addEventListener("click", togglePlay);
    volumeEl.addEventListener("input", () => {
      audioEl.volume = +volumeEl.value;
    });
    seekEl.addEventListener("input", () => {
      if (audioEl.duration) audioEl.currentTime = seekEl.value / 100 * audioEl.duration;
    });
    audioEl.addEventListener("timeupdate", () => {
      if (audioEl.duration) seekEl.value = audioEl.currentTime / audioEl.duration * 100;
    });
    audioEl.addEventListener("ended", () => handleEnded());
    shuffleBtn.addEventListener("click", () => {
      shuffle = !shuffle;
      shuffleBtn.style.color = shuffle ? "var(--accent)" : "";
    });
    repeatBtn.addEventListener("click", () => {
      repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
      repeatBtn.textContent = repeatMode === "one" ? "\u21BB\xB9" : "\u21BB";
      repeatBtn.style.color = repeatMode !== "off" ? "var(--accent)" : "";
    });
    listBtn.addEventListener("click", openPlaylistModal);
    const list = getPlaylist();
    if (list.length) playerBar.classList.remove("hidden");
  }
  function handleEnded() {
    if (repeatMode === "one") {
      audioEl.currentTime = 0;
      audioEl.play();
      return;
    }
    playNext();
  }
  async function loadTrack(index) {
    const list = getPlaylist();
    if (!list.length || index < 0 || index >= list.length) return;
    currentIndex = index;
    const track = list[index];
    const src = await resolveMediaSrc(track);
    if (!src) {
      toast(getLang() === "en" ? "Could not load track" : "No se pudo cargar la pista", "error");
      return;
    }
    audioEl.src = src;
    trackNameEl.textContent = track.name || track.url || "Track";
    await audioEl.play().catch(() => {
    });
    toggleBtn.textContent = "\u23F8";
    playerBar.classList.remove("hidden");
  }
  function togglePlay() {
    const list = getPlaylist();
    if (!list.length) {
      toast(getLang() === "en" ? "Add songs to the playlist first" : "A\xF1ade canciones a la playlist primero", "info");
      openPlaylistModal();
      return;
    }
    if (currentIndex === -1) {
      loadTrack(0);
      return;
    }
    if (audioEl.paused) {
      audioEl.play();
      toggleBtn.textContent = "\u23F8";
    } else {
      audioEl.pause();
      toggleBtn.textContent = "\u25B6";
    }
  }
  function playNext() {
    const list = getPlaylist();
    if (!list.length) return;
    let next;
    if (shuffle) next = Math.floor(Math.random() * list.length);
    else next = currentIndex + 1;
    if (next >= list.length) {
      if (repeatMode === "all") next = 0;
      else {
        toggleBtn.textContent = "\u25B6";
        return;
      }
    }
    loadTrack(next);
  }
  function openPlaylistModal() {
    const lang = getLang();
    const overlay = openModal(`
    <div class="modal-head">
      <h3>${lang === "en" ? "Playlist" : "Lista de reproducci\xF3n"}</h3>
      <button class="modal-close" id="pl-close">\u2715</button>
    </div>
    <div id="pl-list"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <label class="btn btn-ghost" style="cursor:pointer">\u{1F3B5} ${lang === "en" ? "Upload song" : "Subir canci\xF3n"}
        <input type="file" id="pl-input-file" accept="audio/*" class="hidden"></label>
      <button class="btn btn-ghost" id="pl-add-link">\u{1F517} ${lang === "en" ? "Add link" : "A\xF1adir enlace"}</button>
    </div>
  `);
    overlay.querySelector("#pl-close").addEventListener("click", closeModal);
    function refresh() {
      const list = getPlaylist();
      const box = overlay.querySelector("#pl-list");
      if (!list.length) {
        box.innerHTML = `<p style="color:var(--text-muted);font-size:13px">${lang === "en" ? "No songs yet." : "Sin canciones todav\xEDa."}</p>`;
        return;
      }
      box.innerHTML = list.map((t2, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <button class="link-btn" data-play="${i}">${i === currentIndex ? "\u25B6" : "\u266A"}</button>
        <span style="flex:1;font-size:13.5px">${escapeHtml(t2.name || t2.url || "Track")}</span>
        <button class="icon-btn small" data-rm="${t2.id}">\u2715</button>
      </div>
    `).join("");
      box.querySelectorAll("[data-play]").forEach((b) => b.addEventListener("click", () => loadTrack(+b.dataset.play)));
      box.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", async () => {
        await removeTrackFromPlaylist(b.dataset.rm);
        refresh();
      }));
    }
    refresh();
    overlay.querySelector("#pl-input-file").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const item = await mediaItemFromFile(f, "audio");
      addTrackToPlaylist(item);
      refresh();
      e.target.value = "";
    });
    overlay.querySelector("#pl-add-link").addEventListener("click", () => {
      const url = prompt(lang === "en" ? "Paste a direct audio link:" : "Pega un enlace directo de audio:");
      if (!url) return;
      addTrackToPlaylist(mediaItemFromLink(url, "audio"));
      refresh();
    });
  }

  // js/views/dashboard.js
  var dashboard_exports = {};
  __export(dashboard_exports, {
    destroy: () => destroy,
    init: () => init
  });
  var intervalId = null;
  var QUOTES_ES = [
    "El amor no se mira, se siente.",
    "Contigo, hasta lo simple es especial.",
    "Cada recuerdo contigo es un tesoro.",
    "Eres mi lugar favorito.",
    "Nuestra historia, mi cap\xEDtulo preferido."
  ];
  var QUOTES_EN = [
    "Love isn\u2019t seen, it\u2019s felt.",
    "With you, even simple things feel special.",
    "Every memory with you is a treasure.",
    "You are my favorite place.",
    "Our story, my favorite chapter."
  ];
  function destroy() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  function init(container) {
    destroy();
    const settings = getSettings();
    const lang = getLang();
    const quote = (lang === "en" ? QUOTES_EN : QUOTES_ES)[(/* @__PURE__ */ new Date()).getDate() % 5];
    container.innerHTML = `
    <div class="dash-grid">
      <div class="card">
        <div class="card-title">${lang === "en" ? "Right now" : "Ahora mismo"}</div>
        <div class="dash-clock" id="dash-clock">--:--:--</div>
        <div class="dash-date" id="dash-date"></div>
      </div>

      <div class="card dash-together">
        <div class="card-title">${lang === "en" ? "Time together" : "Tiempo juntos"}</div>
        <div class="together-grid" id="together-grid"></div>
      </div>

      <div class="card">
        <div class="card-title">${lang === "en" ? "Counters" : "Contadores"}</div>
        <div class="counters-row">
          <div class="counter-item">
            <button class="counter-btn" id="btn-kiss" title="+1">\u{1F48B}</button>
            <div class="counter-val" id="kiss-val">${settings.kissCount || 0}</div>
            <div class="together-label">${lang === "en" ? "Kisses" : "Besos"}</div>
          </div>
          <div class="counter-item">
            <button class="counter-btn" id="btn-hug" title="+1">\u{1F917}</button>
            <div class="counter-val" id="hug-val">${settings.hugCount || 0}</div>
            <div class="together-label">${lang === "en" ? "Hugs" : "Abrazos"}</div>
          </div>
        </div>
      </div>

      <div class="card" style="grid-column: span 2">
        <div class="card-title">${lang === "en" ? "Message for you two" : "Mensaje para vosotros"}</div>
        <div class="dash-message" id="dash-message-view">${escapeMsg(settings.dashboardMessage)}</div>
        <textarea class="dash-message-edit hidden" id="dash-message-edit">${settings.dashboardMessage || ""}</textarea>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn btn-ghost" id="btn-edit-msg">${lang === "en" ? "Edit message" : "Editar mensaje"}</button>
          <button class="btn btn-primary hidden" id="btn-save-msg">${lang === "en" ? "Save" : "Guardar"}</button>
        </div>
      </div>

      <div class="card" style="grid-column: 1 / -1">
        <div class="dash-quote">"${quote}"</div>
      </div>
    </div>
  `;
    const clockEl = container.querySelector("#dash-clock");
    const dateEl = container.querySelector("#dash-date");
    function tick() {
      const now = /* @__PURE__ */ new Date();
      clockEl.textContent = now.toLocaleTimeString(lang === "en" ? "en-US" : "es-ES");
      dateEl.textContent = now.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      renderTogether(container, settings.relationshipDate, lang);
    }
    tick();
    intervalId = setInterval(tick, 1e3);
    container.querySelector("#btn-kiss").addEventListener("click", () => {
      const s = saveSettings({ kissCount: (getSettings().kissCount || 0) + 1 });
      container.querySelector("#kiss-val").textContent = s.kissCount;
    });
    container.querySelector("#btn-hug").addEventListener("click", () => {
      const s = saveSettings({ hugCount: (getSettings().hugCount || 0) + 1 });
      container.querySelector("#hug-val").textContent = s.hugCount;
    });
    const viewEl = container.querySelector("#dash-message-view");
    const editEl = container.querySelector("#dash-message-edit");
    const btnEdit = container.querySelector("#btn-edit-msg");
    const btnSave = container.querySelector("#btn-save-msg");
    btnEdit.addEventListener("click", () => {
      viewEl.classList.add("hidden");
      editEl.classList.remove("hidden");
      btnEdit.classList.add("hidden");
      btnSave.classList.remove("hidden");
      editEl.focus();
    });
    btnSave.addEventListener("click", () => {
      const val = editEl.value.trim().slice(0, 300);
      saveSettings({ dashboardMessage: val });
      viewEl.textContent = val;
      viewEl.classList.remove("hidden");
      editEl.classList.add("hidden");
      btnEdit.classList.remove("hidden");
      btnSave.classList.add("hidden");
      toast(lang === "en" ? "Message saved" : "Mensaje guardado", "success");
    });
  }
  function escapeMsg(msg) {
    const div = document.createElement("div");
    div.textContent = msg || "";
    return div.innerHTML;
  }
  function renderTogether(container, relationshipDate, lang) {
    const grid = container.querySelector("#together-grid");
    if (!grid) return;
    if (!relationshipDate) {
      grid.innerHTML = `<p style="grid-column:1/-1;color:var(--text-muted);font-size:13px">
      ${lang === "en" ? "Set your relationship start date in Settings to see this counter." : "Configura la fecha de inicio de vuestra relaci\xF3n en Ajustes para ver este contador."}
    </p>`;
      return;
    }
    const start = /* @__PURE__ */ new Date(relationshipDate + "T00:00:00");
    const now = /* @__PURE__ */ new Date();
    if (isNaN(start) || start > now) {
      grid.innerHTML = `<p style="grid-column:1/-1;color:var(--text-muted);font-size:13px">${lang === "en" ? "Invalid date" : "Fecha no v\xE1lida"}</p>`;
      return;
    }
    let diffMs = now - start;
    const totalSeconds = Math.floor(diffMs / 1e3);
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();
    let hours = now.getHours() - start.getHours();
    let minutes = now.getMinutes() - start.getMinutes();
    let seconds = now.getSeconds() - start.getSeconds();
    if (seconds < 0) {
      seconds += 60;
      minutes--;
    }
    if (minutes < 0) {
      minutes += 60;
      hours--;
    }
    if (hours < 0) {
      hours += 24;
      days--;
    }
    if (days < 0) {
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
      months--;
    }
    if (months < 0) {
      months += 12;
      years--;
    }
    const labels = lang === "en" ? ["Years", "Months", "Days", "Hours", "Min", "Sec"] : ["A\xF1os", "Meses", "D\xEDas", "Horas", "Min", "Seg"];
    const values = [years, months, days, hours, minutes, seconds];
    let nums = grid.querySelectorAll(".together-num");
    if (nums.length !== values.length) {
      grid.innerHTML = values.map((v, i) => `
      <div>
        <div class="together-num">${v}</div>
        <div class="together-label">${labels[i]}</div>
      </div>
    `).join("");
    } else {
      nums.forEach((el, i) => {
        el.textContent = values[i];
      });
    }
  }

  // js/views/calendar.js
  var calendar_exports = {};
  __export(calendar_exports, {
    destroy: () => destroy2,
    init: () => init2
  });
  var currentYear;
  var currentMonth;
  var MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  var MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DOW_ES = ["L", "M", "X", "J", "V", "S", "D"];
  var DOW_EN = ["M", "T", "W", "T", "F", "S", "S"];
  function destroy2() {
  }
  function init2(container) {
    const now = /* @__PURE__ */ new Date();
    if (currentYear === void 0) {
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
    }
    render(container);
  }
  function render(container) {
    const lang = getLang();
    const months = lang === "en" ? MONTHS_EN : MONTHS_ES;
    const dow = lang === "en" ? DOW_EN : DOW_ES;
    container.innerHTML = `
    <div class="cal-toolbar">
      <button class="icon-btn" id="cal-prev">\u2039</button>
      <h3>${months[currentMonth]} ${currentYear}</h3>
      <button class="icon-btn" id="cal-next">\u203A</button>
      <button class="btn btn-ghost" id="cal-today" style="margin-left:auto">${lang === "en" ? "Today" : "Hoy"}</button>
    </div>
    <div class="cal-grid" id="cal-grid">
      ${dow.map((d) => `<div class="cal-dow">${d}</div>`).join("")}
    </div>
  `;
    container.querySelector("#cal-prev").addEventListener("click", () => {
      shiftMonth(-1);
      render(container);
    });
    container.querySelector("#cal-next").addEventListener("click", () => {
      shiftMonth(1);
      render(container);
    });
    container.querySelector("#cal-today").addEventListener("click", () => {
      const n = /* @__PURE__ */ new Date();
      currentYear = n.getFullYear();
      currentMonth = n.getMonth();
      render(container);
    });
    renderGrid(container.querySelector("#cal-grid"), container);
  }
  function shiftMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }
  async function renderGrid(grid, container) {
    const firstDay = new Date(currentYear, currentMonth, 1);
    let startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const allDays = getAllDays();
    const todayIsoStr = isoDate((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), (/* @__PURE__ */ new Date()).getDate());
    let html = "";
    for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoDate(currentYear, currentMonth, d);
      const day = allDays[iso];
      const has = dayHasContent(day);
      const isToday = iso === todayIsoStr;
      html += `<button class="cal-day ${has ? "has-content" : ""} ${isToday ? "today" : ""}" data-date="${iso}">
      <img class="cal-day-thumb" data-thumb="${iso}" alt="" loading="lazy" decoding="async">
      <span class="cal-day-num">${d}</span>
      ${has ? '<span class="cal-day-dot"></span>' : ""}
    </button>`;
    }
    grid.insertAdjacentHTML("beforeend", html);
    grid.querySelectorAll(".cal-day[data-date]").forEach((btn) => {
      btn.addEventListener("click", () => openDayModal(btn.dataset.date, container));
    });
    for (const [iso, day] of Object.entries(allDays)) {
      const main = getMainPhoto(day);
      if (!main) continue;
      const imgEl = grid.querySelector(`img[data-thumb="${iso}"]`);
      if (!imgEl) continue;
      resolveMediaSrc(main).then((src) => {
        if (src) imgEl.src = src;
      }).catch(() => {
      });
    }
  }
  async function openDayModal(dateIso, container) {
    const lang = getLang();
    const day = getDay(dateIso);
    const overlay = openModal(`
    <div class="modal-head">
      <h3>${(/* @__PURE__ */ new Date(dateIso + "T00:00:00")).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3>
      <button class="modal-close" id="day-modal-close">\u2715</button>
    </div>

    <label class="field">
      <span>${lang === "en" ? "Comment" : "Comentario"}</span>
      <textarea id="day-comment" rows="3" placeholder="${lang === "en" ? "Write something about this day\u2026" : "Escribe algo sobre este d\xEDa\u2026"}">${escapeHtml(day.comment || "")}</textarea>
    </label>

    <div style="margin-top:14px">
      <div class="card-title">${lang === "en" ? "Photos & videos" : "Fotos y v\xEDdeos"}</div>
      <div class="day-media-grid" id="day-media-grid"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
        <label class="btn btn-ghost" style="cursor:pointer">
          \u{1F4F7} ${lang === "en" ? "Add photos" : "A\xF1adir fotos"}
          <input type="file" id="input-photos" accept="image/*" multiple class="hidden">
        </label>
        <label class="btn btn-ghost" style="cursor:pointer">
          \u{1F3AC} ${lang === "en" ? "Add local video" : "A\xF1adir v\xEDdeo local"}
          <input type="file" id="input-video" accept="video/*" class="hidden">
        </label>
        <button class="btn btn-ghost" id="btn-add-video-link">\u{1F517} ${lang === "en" ? "Video link" : "Enlace de v\xEDdeo"}</button>
      </div>
    </div>

    <div style="margin-top:14px">
      <div class="card-title">${lang === "en" ? "Audio" : "Audio"}</div>
      <div id="day-audio-list"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
        <label class="btn btn-ghost" style="cursor:pointer">
          \u{1F3B5} ${lang === "en" ? "Upload audio" : "Subir audio"}
          <input type="file" id="input-audio" accept="audio/*" class="hidden">
        </label>
        <button class="btn btn-ghost" id="btn-add-audio-link">\u{1F517} ${lang === "en" ? "Audio link" : "Enlace de audio"}</button>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn btn-primary" id="btn-save-day">${lang === "en" ? "Save day" : "Guardar d\xEDa"}</button>
    </div>
  `, { wide: true });
    overlay.querySelector("#day-modal-close").addEventListener("click", closeModal);
    async function refreshMediaGrid() {
      const fresh = getDay(dateIso);
      const mediaGrid = overlay.querySelector("#day-media-grid");
      const visual = fresh.media.filter((m) => m.kind === "photo" || m.kind === "video").sort((a, b) => a.order - b.order);
      mediaGrid.innerHTML = "";
      for (const item of visual) {
        const src = item.kind === "photo" ? await resolveMediaSrc(item) : item.source === "file" ? await resolveMediaSrc(item) : "";
        const thumbSrc = item.kind === "video" ? "" : src;
        const wrap = document.createElement("div");
        wrap.className = `day-media-thumb ${item.isMain ? "is-main" : ""}`;
        wrap.draggable = true;
        wrap.dataset.id = item.id;
        wrap.innerHTML = thumbSrc ? `<img src="${thumbSrc}" alt="">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--accent-soft);font-size:22px">\u{1F3AC}</div>`;
        wrap.innerHTML += `
        <button class="rm-btn" data-id="${item.id}" title="${lang === "en" ? "Remove" : "Eliminar"}">\u2715</button>
        ${item.kind === "photo" ? `<button class="main-btn" data-id="${item.id}">${item.isMain ? "\u2605" : "\u2606"}</button>` : ""}
      `;
        mediaGrid.appendChild(wrap);
      }
      mediaGrid.querySelectorAll(".rm-btn").forEach((b) => b.addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteDayMediaItem(dateIso, b.dataset.id);
        refreshMediaGrid();
      }));
      mediaGrid.querySelectorAll(".main-btn").forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation();
        setMainMedia(dateIso, b.dataset.id);
        refreshMediaGrid();
      }));
      let dragId = null;
      mediaGrid.querySelectorAll(".day-media-thumb").forEach((el) => {
        el.addEventListener("dragstart", () => {
          dragId = el.dataset.id;
        });
        el.addEventListener("dragover", (e) => e.preventDefault());
        el.addEventListener("drop", (e) => {
          e.preventDefault();
          if (!dragId || dragId === el.dataset.id) return;
          const ids = Array.from(mediaGrid.querySelectorAll(".day-media-thumb")).map((x) => x.dataset.id);
          const from = ids.indexOf(dragId), to = ids.indexOf(el.dataset.id);
          ids.splice(to, 0, ids.splice(from, 1)[0]);
          reorderDayMedia(dateIso, ids);
          refreshMediaGrid();
        });
      });
    }
    async function refreshAudioList() {
      const fresh = getDay(dateIso);
      const list = overlay.querySelector("#day-audio-list");
      const audios = fresh.media.filter((m) => m.kind === "audio");
      if (!audios.length) {
        list.innerHTML = `<p style="color:var(--text-muted);font-size:13px">${lang === "en" ? "No audio yet." : "Sin audio todav\xEDa."}</p>`;
        return;
      }
      list.innerHTML = "";
      for (const item of audios) {
        const src = await resolveMediaSrc(item);
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:8px";
        row.innerHTML = `<audio src="${src}" controls style="flex:1;height:34px"></audio>
        <button class="icon-btn small rm-audio" data-id="${item.id}">\u2715</button>`;
        list.appendChild(row);
      }
      list.querySelectorAll(".rm-audio").forEach((b) => b.addEventListener("click", async () => {
        await deleteDayMediaItem(dateIso, b.dataset.id);
        refreshAudioList();
      }));
    }
    refreshMediaGrid();
    refreshAudioList();
    overlay.querySelector("#input-photos").addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        try {
          const item = await mediaItemFromFile(f, "photo");
          addDayMediaItem(dateIso, item);
        } catch (err) {
          toast(lang === "en" ? "Could not load photo" : "No se pudo cargar la foto", "error");
        }
      }
      refreshMediaGrid();
      e.target.value = "";
    });
    overlay.querySelector("#input-video").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const item = await mediaItemFromFile(f, "video");
        addDayMediaItem(dateIso, item);
        refreshMediaGrid();
      } catch (e2) {
        toast(lang === "en" ? "Could not load video" : "No se pudo cargar el v\xEDdeo", "error");
      }
      e.target.value = "";
    });
    overlay.querySelector("#input-audio").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const item = await mediaItemFromFile(f, "audio");
        addDayMediaItem(dateIso, item);
        refreshAudioList();
      } catch (e2) {
        toast(lang === "en" ? "Could not load audio" : "No se pudo cargar el audio", "error");
      }
      e.target.value = "";
    });
    overlay.querySelector("#btn-add-video-link").addEventListener("click", () => {
      const url = prompt(lang === "en" ? "Paste a YouTube, Vimeo or Drive link:" : "Pega un enlace de YouTube, Vimeo o Drive:");
      if (!url) return;
      if (!isValidUrl(url)) {
        toast(lang === "en" ? "Invalid link" : "Enlace no v\xE1lido", "error");
        return;
      }
      addDayMediaItem(dateIso, mediaItemFromLink(url, "video"));
      refreshMediaGrid();
    });
    overlay.querySelector("#btn-add-audio-link").addEventListener("click", () => {
      const url = prompt(lang === "en" ? "Paste an audio link:" : "Pega un enlace de audio:");
      if (!url) return;
      if (!isValidUrl(url)) {
        toast(lang === "en" ? "Invalid link" : "Enlace no v\xE1lido", "error");
        return;
      }
      addDayMediaItem(dateIso, mediaItemFromLink(url, "audio"));
      refreshAudioList();
    });
    overlay.querySelector("#btn-save-day").addEventListener("click", () => {
      const comment = overlay.querySelector("#day-comment").value.slice(0, 2e3);
      const fresh = getDay(dateIso);
      saveDay(dateIso, { ...fresh, comment });
      toast(lang === "en" ? "Day saved" : "D\xEDa guardado", "success");
      closeModal();
      render(container);
    });
  }
  function isValidUrl(str) {
    try {
      new URL(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  // js/views/timeline.js
  var timeline_exports = {};
  __export(timeline_exports, {
    destroy: () => destroy3,
    init: () => init3
  });
  function destroy3() {
  }
  function init3(container) {
    render2(container);
  }
  async function render2(container) {
    const lang = getLang();
    container.innerHTML = `<div class="timeline" id="timeline-list"><p style="color:var(--text-muted)">${lang === "en" ? "Loading\u2026" : "Cargando\u2026"}</p></div>`;
    const days = getAllDays();
    const events = getEvents();
    const items = [];
    for (const [iso, day] of Object.entries(days)) {
      if (dayHasContent(day)) items.push({ date: iso, kind: "day", data: day });
    }
    for (const ev of events) {
      items.push({ date: ev.date, kind: "event", data: ev });
    }
    items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const list = container.querySelector("#timeline-list");
    if (!items.length) {
      list.outerHTML = `<div class="empty-state">
      <div class="empty-state-mark">\u301C</div>
      <p>${lang === "en" ? "Your story starts here. Add memories in the Calendar or Events." : "Vuestra historia empieza aqu\xED. A\xF1adid recuerdos en el Calendario o en Eventos."}</p>
    </div>`;
      return;
    }
    list.innerHTML = "";
    items.forEach((item, i) => {
      const el = document.createElement("div");
      el.className = "tl-item";
      el.style.animationDelay = `${Math.min(i, 12) * 40}ms`;
      if (item.kind === "day") {
        const photos = (item.data.media || []).filter((m) => m.kind === "photo").sort((a, b) => {
          var _a, _b;
          return ((_a = a.order) != null ? _a : 0) - ((_b = b.order) != null ? _b : 0);
        });
        el.innerHTML = `
        <div class="tl-date">\u{1F4C5} ${fmtDate(item.date, lang)}</div>
        <div class="tl-card">
          ${item.data.comment ? `<p>${escapeHtml(item.data.comment)}</p>` : `<p style="color:var(--text-muted)">${lang === "en" ? "A day to remember" : "Un d\xEDa para recordar"}</p>`}
          ${photos.length ? `
            <div class="tl-media-wrap">
              <button type="button" class="tl-media-nav prev" aria-label="${lang === "en" ? "Scroll left" : "Desplazar a la izquierda"}">\u2039</button>
              <div class="tl-media" id="tl-media-${item.date}" tabindex="0"></div>
              <button type="button" class="tl-media-nav next" aria-label="${lang === "en" ? "Scroll right" : "Desplazar a la derecha"}">\u203A</button>
            </div>
          ` : ""}
        </div>
      `;
        list.appendChild(el);
        if (photos.length) setupDayCarousel(el, item.date, photos);
      } else {
        const ev = item.data;
        el.innerHTML = `
        <div class="tl-date">\u2727 ${fmtDate(ev.date, lang)}</div>
        <div class="tl-card">
          <div class="tl-title">${escapeHtml(ev.title)}</div>
          ${ev.description ? `<p>${escapeHtml(ev.description)}</p>` : ""}
          ${ev.location ? `<p style="color:var(--text-muted);font-size:13px">\u{1F4CD} ${escapeHtml(ev.location)}</p>` : ""}
        </div>
      `;
        list.appendChild(el);
      }
    });
  }
  function setupDayCarousel(root, dateKey, photos) {
    const mediaEl = root.querySelector(`#tl-media-${dateKey}`);
    const prevBtn = root.querySelector(".tl-media-nav.prev");
    const nextBtn = root.querySelector(".tl-media-nav.next");
    photos.forEach((p, idx) => {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = "";
      img.style.animationDelay = `${idx * 60}ms`;
      mediaEl.appendChild(img);
      resolveMediaSrc(p).then((src) => {
        if (!src) {
          img.remove();
          return;
        }
        img.src = src;
        img.addEventListener("click", () => openImageLightbox(src));
      }).catch(() => img.remove());
    });
    function updateNavVisibility() {
      const canScroll = mediaEl.scrollWidth > mediaEl.clientWidth + 4;
      prevBtn.classList.toggle("is-visible", canScroll && mediaEl.scrollLeft > 4);
      nextBtn.classList.toggle("is-visible", canScroll && mediaEl.scrollLeft < mediaEl.scrollWidth - mediaEl.clientWidth - 4);
    }
    const scrollByAmount = () => Math.max(160, mediaEl.clientWidth * 0.7);
    prevBtn.addEventListener("click", () => mediaEl.scrollBy({ left: -scrollByAmount(), behavior: "smooth" }));
    nextBtn.addEventListener("click", () => mediaEl.scrollBy({ left: scrollByAmount(), behavior: "smooth" }));
    mediaEl.addEventListener("scroll", updateNavVisibility, { passive: true });
    window.addEventListener("resize", updateNavVisibility, { passive: true });
    mediaEl.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      mediaEl.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });
    let isDown = false, startX = 0, startScroll = 0, moved = false;
    mediaEl.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = mediaEl.scrollLeft;
      mediaEl.classList.add("dragging");
    });
    window.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      mediaEl.scrollLeft = startScroll - dx;
    });
    window.addEventListener("pointerup", () => {
      isDown = false;
      mediaEl.classList.remove("dragging");
    });
    mediaEl.addEventListener("click", (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);
    setTimeout(updateNavVisibility, 50);
  }

  // js/views/events.js
  var events_exports = {};
  __export(events_exports, {
    destroy: () => destroy4,
    init: () => init4
  });
  var TYPES = [
    { id: "aniversario", es: "Aniversario", en: "Anniversary", icon: "\u{1F48D}" },
    { id: "cumpleanos", es: "Cumplea\xF1os", en: "Birthday", icon: "\u{1F382}" },
    { id: "viaje", es: "Viaje", en: "Trip", icon: "\u2708\uFE0F" },
    { id: "primera_cita", es: "Primera cita", en: "First date", icon: "\u{1F339}" },
    { id: "primer_beso", es: "Primer beso", en: "First kiss", icon: "\u{1F48B}" },
    { id: "pedida", es: "Pedida", en: "Proposal", icon: "\u{1F48E}" },
    { id: "otro", es: "Otro", en: "Other", icon: "\u2727" }
  ];
  function destroy4() {
  }
  function init4(container) {
    render3(container);
  }
  function typeLabel(id, lang) {
    const t2 = TYPES.find((x) => x.id === id) || TYPES[TYPES.length - 1];
    return `${t2.icon} ${lang === "en" ? t2.en : t2.es}`;
  }
  function render3(container) {
    const lang = getLang();
    container.innerHTML = `
    <div class="toolbar-row">
      <input type="text" class="input-search" id="ev-search" placeholder="${lang === "en" ? "Search events\u2026" : "Buscar eventos\u2026"}">
      <select class="select-filter" id="ev-filter-type">
        <option value="">${lang === "en" ? "All types" : "Todos los tipos"}</option>
        ${TYPES.map((t2) => `<option value="${t2.id}">${lang === "en" ? t2.en : t2.es}</option>`).join("")}
      </select>
      <button class="btn btn-primary" id="btn-new-event">+ ${lang === "en" ? "New event" : "Nuevo evento"}</button>
    </div>
    <div class="grid-cards" id="events-grid"></div>
  `;
    const searchEl = container.querySelector("#ev-search");
    const typeEl = container.querySelector("#ev-filter-type");
    async function refresh() {
      const q = searchEl.value.trim().toLowerCase();
      const type = typeEl.value;
      let list = getEvents().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      if (q) list = list.filter((e) => (e.title || "").toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q));
      if (type) list = list.filter((e) => e.type === type);
      await renderGrid2(list);
    }
    async function renderGrid2(list) {
      const grid = container.querySelector("#events-grid");
      if (!list.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-mark">\u2727</div>
        <p>${lang === "en" ? "No events yet. Add your first milestone!" : "A\xFAn no hay eventos. \xA1A\xF1ade vuestro primer hito!"}</p>
      </div>`;
        return;
      }
      grid.innerHTML = list.map((e) => `<div class="event-card" data-id="${e.id}"></div>`).join("");
      for (const ev of list) {
        const card = grid.querySelector(`[data-id="${ev.id}"]`);
        const photo = (ev.media || []).find((m) => m.kind === "photo");
        const imgSrc = photo ? await resolveMediaSrc(photo) : "";
        card.innerHTML = `
        ${imgSrc ? `<img src="${imgSrc}" alt="" loading="lazy" decoding="async">` : `<div style="height:140px;display:flex;align-items:center;justify-content:center;background:var(--accent-soft);font-size:34px">${(TYPES.find((t2) => t2.id === ev.type) || {}).icon || "\u2727"}</div>`}
        <div class="event-body">
          <div class="event-type">${typeLabel(ev.type, lang)}</div>
          <div class="event-title">${escapeHtml(ev.title)} ${ev.favorite ? "\u2605" : ""}</div>
          <div class="event-date">${fmtDate(ev.date, lang)}${ev.location ? " \xB7 " + escapeHtml(ev.location) : ""}</div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="link-btn" data-action="edit" data-id="${ev.id}">${lang === "en" ? "Edit" : "Editar"}</button>
            <button class="link-btn" data-action="delete" data-id="${ev.id}">${lang === "en" ? "Delete" : "Eliminar"}</button>
          </div>
        </div>
      `;
      }
      grid.querySelectorAll('[data-action="edit"]').forEach((b) => b.addEventListener("click", () => {
        openEventForm(getEvents().find((e) => e.id === b.dataset.id), refresh);
      }));
      grid.querySelectorAll('[data-action="delete"]').forEach((b) => b.addEventListener("click", async () => {
        if (confirm(lang === "en" ? "Delete this event?" : "\xBFEliminar este evento?")) {
          await deleteEvent(b.dataset.id);
          refresh();
        }
      }));
    }
    searchEl.addEventListener("input", refresh);
    typeEl.addEventListener("change", refresh);
    container.querySelector("#btn-new-event").addEventListener("click", () => openEventForm(null, refresh));
    refresh();
  }
  function openEventForm(existing, onSaved) {
    const lang = getLang();
    const overlay = openModal(`
    <div class="modal-head">
      <h3>${existing ? lang === "en" ? "Edit event" : "Editar evento" : lang === "en" ? "New event" : "Nuevo evento"}</h3>
      <button class="modal-close" id="ev-close">\u2715</button>
    </div>
    <div class="auth-form">
      <label class="field">
        <span>${lang === "en" ? "Title" : "T\xEDtulo"}</span>
        <input type="text" id="ev-title" required value="${escapeHtml((existing == null ? void 0 : existing.title) || "")}">
      </label>
      <label class="field">
        <span>${lang === "en" ? "Type" : "Tipo"}</span>
        <select id="ev-type">${TYPES.map((t2) => `<option value="${t2.id}" ${(existing == null ? void 0 : existing.type) === t2.id ? "selected" : ""}>${t2.icon} ${lang === "en" ? t2.en : t2.es}</option>`).join("")}</select>
      </label>
      <label class="field">
        <span>${lang === "en" ? "Date" : "Fecha"}</span>
        <input type="date" id="ev-date" required value="${(existing == null ? void 0 : existing.date) || ""}">
      </label>
      <label class="field">
        <span>${lang === "en" ? "Location" : "Ubicaci\xF3n"}</span>
        <input type="text" id="ev-location" value="${escapeHtml((existing == null ? void 0 : existing.location) || "")}">
      </label>
      <label class="field">
        <span>${lang === "en" ? "Description" : "Descripci\xF3n"}</span>
        <textarea id="ev-desc" rows="3">${escapeHtml((existing == null ? void 0 : existing.description) || "")}</textarea>
      </label>
      <label class="field">
        <span>${lang === "en" ? "Photo" : "Foto"}</span>
        <input type="file" id="ev-photo" accept="image/*">
      </label>
      <label class="checkbox-field">
        <input type="checkbox" id="ev-fav" ${(existing == null ? void 0 : existing.favorite) ? "checked" : ""}>
        <span>${lang === "en" ? "Mark as favorite" : "Marcar como favorito"}</span>
      </label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="ev-save">${lang === "en" ? "Save" : "Guardar"}</button>
    </div>
  `);
    overlay.querySelector("#ev-close").addEventListener("click", closeModal);
    overlay.querySelector("#ev-save").addEventListener("click", async () => {
      const title = overlay.querySelector("#ev-title").value.trim();
      const date = overlay.querySelector("#ev-date").value;
      if (!title || !date) {
        toast(lang === "en" ? "Title and date are required" : "El t\xEDtulo y la fecha son obligatorios", "error");
        return;
      }
      let media = (existing == null ? void 0 : existing.media) || [];
      const fileInput = overlay.querySelector("#ev-photo");
      if (fileInput.files[0]) {
        try {
          const item = await mediaItemFromFile(fileInput.files[0], "photo");
          media = [...media.filter((m) => m.kind !== "photo"), item];
        } catch (e) {
          toast(lang === "en" ? "Could not load photo" : "No se pudo cargar la foto", "error");
        }
      }
      saveEvent({
        ...existing || {},
        title,
        date,
        media,
        type: overlay.querySelector("#ev-type").value,
        location: overlay.querySelector("#ev-location").value.trim(),
        description: overlay.querySelector("#ev-desc").value.trim(),
        favorite: overlay.querySelector("#ev-fav").checked
      });
      toast(lang === "en" ? "Event saved" : "Evento guardado", "success");
      closeModal();
      onSaved();
    });
  }

  // js/views/notes.js
  var notes_exports = {};
  __export(notes_exports, {
    destroy: () => destroy5,
    init: () => init5
  });
  var COLORS = ["#F3D9DE", "#E1D9F5", "#D3EAF2", "#F0E1B3", "#E2CFAE", "#D6EFD9"];
  function destroy5() {
  }
  function init5(container) {
    render4(container);
  }
  function render4(container) {
    const lang = getLang();
    container.innerHTML = `
    <div class="toolbar-row">
      <input type="text" class="input-search" id="notes-search" placeholder="${lang === "en" ? "Search notes\u2026" : "Buscar notas\u2026"}">
      <select class="select-filter" id="notes-filter-cat">
        <option value="">${lang === "en" ? "All categories" : "Todas las categor\xEDas"}</option>
      </select>
      <select class="select-filter" id="notes-filter-fav">
        <option value="">${lang === "en" ? "All notes" : "Todas"}</option>
        <option value="fav">${lang === "en" ? "Favorites only" : "Solo favoritas"}</option>
      </select>
      <button class="btn btn-primary" id="btn-new-note">+ ${lang === "en" ? "New note" : "Nueva nota"}</button>
    </div>
    <div class="grid-cards" id="notes-grid"></div>
  `;
    const searchEl = container.querySelector("#notes-search");
    const catEl = container.querySelector("#notes-filter-cat");
    const favEl = container.querySelector("#notes-filter-fav");
    const notes = getNotes();
    const cats = [...new Set(notes.map((n) => n.category).filter(Boolean))];
    catEl.innerHTML += cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    function refresh() {
      const q = searchEl.value.trim().toLowerCase();
      const cat = catEl.value;
      const favOnly = favEl.value === "fav";
      let list = getNotes();
      if (q) list = list.filter((n) => (n.text || "").toLowerCase().includes(q) || (n.tags || []).some((t2) => t2.toLowerCase().includes(q)));
      if (cat) list = list.filter((n) => n.category === cat);
      if (favOnly) list = list.filter((n) => n.favorite);
      renderGrid2(list);
    }
    function renderGrid2(list) {
      const grid = container.querySelector("#notes-grid");
      if (!list.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-mark">\u270E</div>
        <p>${lang === "en" ? "No notes yet. Write your first one!" : "A\xFAn no hay notas. \xA1Escribe la primera!"}</p>
      </div>`;
        return;
      }
      grid.innerHTML = list.map((n) => `
      <div class="note-card priority-${n.priority || "low"}" style="background:${n.color || "var(--bg-elevated)"};border:1px solid var(--border)">
        <div class="note-top">
          <span class="note-tag">${escapeHtml(n.category || (lang === "en" ? "General" : "General"))}</span>
          <button class="note-fav" data-id="${n.id}" data-action="fav">${n.favorite ? "\u2605" : "\u2606"}</button>
        </div>
        <div class="note-body">${escapeHtml(n.text)}</div>
        ${n.tags && n.tags.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap">${n.tags.map((t2) => `<span class="note-tag" style="background:rgba(0,0,0,.06)">#${escapeHtml(t2)}</span>`).join("")}</div>` : ""}
        <div class="note-meta">
          <span>${new Date(n.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "es-ES")}</span>
          <span>
            <button data-id="${n.id}" data-action="edit" title="${lang === "en" ? "Edit" : "Editar"}">\u270E</button>
            <button data-id="${n.id}" data-action="delete" title="${lang === "en" ? "Delete" : "Eliminar"}">\u{1F5D1}</button>
          </span>
        </div>
      </div>
    `).join("");
      grid.querySelectorAll('[data-action="fav"]').forEach((b) => b.addEventListener("click", () => {
        const note = getNotes().find((n) => n.id === b.dataset.id);
        if (note) {
          saveNote({ ...note, favorite: !note.favorite });
          refresh();
        }
      }));
      grid.querySelectorAll('[data-action="delete"]').forEach((b) => b.addEventListener("click", () => {
        if (confirm(lang === "en" ? "Delete this note?" : "\xBFEliminar esta nota?")) {
          deleteNote(b.dataset.id);
          refresh();
        }
      }));
      grid.querySelectorAll('[data-action="edit"]').forEach((b) => b.addEventListener("click", () => {
        openNoteForm(getNotes().find((n) => n.id === b.dataset.id), refresh);
      }));
    }
    searchEl.addEventListener("input", refresh);
    catEl.addEventListener("change", refresh);
    favEl.addEventListener("change", refresh);
    container.querySelector("#btn-new-note").addEventListener("click", () => openNoteForm(null, refresh));
    refresh();
  }
  function openNoteForm(existing, onSaved) {
    const lang = getLang();
    const overlay = openModal(`
    <div class="modal-head">
      <h3>${existing ? lang === "en" ? "Edit note" : "Editar nota" : lang === "en" ? "New note" : "Nueva nota"}</h3>
      <button class="modal-close" id="note-close">\u2715</button>
    </div>
    <div class="auth-form">
      <label class="field">
        <span>${lang === "en" ? "Text" : "Texto"}</span>
        <textarea id="note-text" rows="4" required>${escapeHtml((existing == null ? void 0 : existing.text) || "")}</textarea>
      </label>
      <label class="field">
        <span>${lang === "en" ? "Category" : "Categor\xEDa"}</span>
        <input type="text" id="note-cat" value="${escapeHtml((existing == null ? void 0 : existing.category) || "")}" placeholder="${lang === "en" ? "e.g. Travel" : "Ej. Viajes"}">
      </label>
      <label class="field">
        <span>${lang === "en" ? "Tags (comma separated)" : "Etiquetas (separadas por coma)"}</span>
        <input type="text" id="note-tags" value="${escapeHtml(((existing == null ? void 0 : existing.tags) || []).join(", "))}">
      </label>
      <label class="field">
        <span>${lang === "en" ? "Priority" : "Prioridad"}</span>
        <select id="note-priority">
          <option value="low" ${(existing == null ? void 0 : existing.priority) === "low" || !existing ? "selected" : ""}>${lang === "en" ? "Low" : "Baja"}</option>
          <option value="medium" ${(existing == null ? void 0 : existing.priority) === "medium" ? "selected" : ""}>${lang === "en" ? "Medium" : "Media"}</option>
          <option value="high" ${(existing == null ? void 0 : existing.priority) === "high" ? "selected" : ""}>${lang === "en" ? "High" : "Alta"}</option>
        </select>
      </label>
      <div class="field">
        <span>${lang === "en" ? "Color" : "Color"}</span>
        <div class="theme-swatches" id="note-colors">
          ${COLORS.map((c) => `<button type="button" class="theme-swatch" data-color="${c}" style="background:${c}"></button>`).join("")}
        </div>
      </div>
      <label class="checkbox-field">
        <input type="checkbox" id="note-fav" ${(existing == null ? void 0 : existing.favorite) ? "checked" : ""}>
        <span>${lang === "en" ? "Mark as favorite" : "Marcar como favorita"}</span>
      </label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="note-save">${lang === "en" ? "Save" : "Guardar"}</button>
    </div>
  `);
    let selectedColor = (existing == null ? void 0 : existing.color) || COLORS[0];
    const colorButtons = overlay.querySelectorAll("#note-colors .theme-swatch");
    colorButtons.forEach((b) => {
      if (b.dataset.color === selectedColor) b.classList.add("active");
      b.addEventListener("click", () => {
        selectedColor = b.dataset.color;
        colorButtons.forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      });
    });
    overlay.querySelector("#note-close").addEventListener("click", closeModal);
    overlay.querySelector("#note-save").addEventListener("click", () => {
      const text = overlay.querySelector("#note-text").value.trim();
      if (!text) {
        toast(lang === "en" ? "Note text is required" : "El texto de la nota es obligatorio", "error");
        return;
      }
      const tags = overlay.querySelector("#note-tags").value.split(",").map((t2) => t2.trim()).filter(Boolean);
      saveNote({
        ...existing || {},
        text,
        category: overlay.querySelector("#note-cat").value.trim(),
        tags,
        priority: overlay.querySelector("#note-priority").value,
        color: selectedColor,
        favorite: overlay.querySelector("#note-fav").checked
      });
      toast(lang === "en" ? "Note saved" : "Nota guardada", "success");
      closeModal();
      onSaved();
    });
  }

  // js/views/gallery.js
  var gallery_exports = {};
  __export(gallery_exports, {
    destroy: () => destroy6,
    init: () => init6
  });
  function destroy6() {
  }
  function init6(container) {
    render5(container);
  }
  function collectPhotos() {
    const days = getAllDays();
    const out = [];
    for (const [iso, day] of Object.entries(days)) {
      for (const m of day.media || []) {
        if (m.kind === "photo") out.push({ ...m, date: iso });
      }
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }
  function render5(container) {
    const lang = getLang();
    container.innerHTML = `
    <div class="toolbar-row">
      <input type="text" class="input-search" id="gal-search" placeholder="${lang === "en" ? "Search by date (YYYY-MM-DD)\u2026" : "Buscar por fecha (AAAA-MM-DD)\u2026"}">
      <select class="select-filter" id="gal-sort">
        <option value="desc">${lang === "en" ? "Newest first" : "M\xE1s recientes primero"}</option>
        <option value="asc">${lang === "en" ? "Oldest first" : "M\xE1s antiguas primero"}</option>
      </select>
      <select class="select-filter" id="gal-fav">
        <option value="">${lang === "en" ? "All photos" : "Todas las fotos"}</option>
        <option value="fav">${lang === "en" ? "Favorites only" : "Solo favoritas"}</option>
      </select>
    </div>
    <div class="gallery-grid" id="gallery-grid"></div>
  `;
    const searchEl = container.querySelector("#gal-search");
    const sortEl = container.querySelector("#gal-sort");
    const favEl = container.querySelector("#gal-fav");
    async function refresh() {
      let list = collectPhotos();
      const q = searchEl.value.trim();
      if (q) list = list.filter((p) => p.date.includes(q));
      const favs = getGalleryFavorites();
      if (favEl.value === "fav") list = list.filter((p) => favs.includes(p.id));
      list.sort((a, b) => sortEl.value === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
      const grid = container.querySelector("#gallery-grid");
      if (!list.length) {
        grid.outerHTML = `<div class="empty-state" id="gallery-grid-empty">
        <div class="empty-state-mark">\u25A3</div>
        <p>${lang === "en" ? "No photos match your search yet." : "A\xFAn no hay fotos que coincidan."}</p>
      </div>`;
        return;
      }
      grid.innerHTML = list.map((p) => `<div class="gallery-item" data-id="${p.id}" data-date="${p.date}">
      <button class="gallery-fav" data-fav="${p.id}">${favs.includes(p.id) ? "\u2605" : "\u2606"}</button>
    </div>`).join("");
      for (const p of list) {
        const el = grid.querySelector(`.gallery-item[data-id="${p.id}"]`);
        resolveMediaSrc(p).then((src) => {
          if (!src) return;
          const img = document.createElement("img");
          img.loading = "lazy";
          img.decoding = "async";
          img.src = src;
          img.alt = p.date;
          img.title = fmtDate(p.date, lang);
          img.addEventListener("click", () => openImageLightbox(src));
          el.prepend(img);
        }).catch(() => {
        });
      }
      grid.querySelectorAll("[data-fav]").forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleGalleryFavorite(b.dataset.fav);
        refresh();
      }));
    }
    searchEl.addEventListener("input", refresh);
    sortEl.addEventListener("change", refresh);
    favEl.addEventListener("change", refresh);
    refresh();
  }

  // js/views/settings.js
  var settings_exports = {};
  __export(settings_exports, {
    destroy: () => destroy7,
    init: () => init7
  });
  function destroy7() {
  }
  var THEMES = ["light", "dark", "rosa", "lavanda", "celeste", "rojo", "dorado", "vintage", "minimal"];
  var THEME_SWATCH_COLOR = {
    light: "#B98452",
    dark: "#2A2329",
    rosa: "#C1798A",
    lavanda: "#8B77C2",
    celeste: "#5FA3C0",
    rojo: "#B8443B",
    dorado: "#B8912E",
    vintage: "#9C6B45",
    minimal: "#1B1B1B"
  };
  var TEMPLATES = [
    { id: "romantica", es: "Rom\xE1ntica", en: "Romantic" },
    { id: "sakura", es: "Sakura", en: "Sakura" },
    { id: "nocturna", es: "Nocturna", en: "Night" },
    { id: "pastel", es: "Pastel", en: "Pastel" },
    { id: "navidad", es: "Navidad", en: "Christmas" },
    { id: "san_valentin", es: "San Valent\xEDn", en: "Valentine" },
    { id: "verano", es: "Verano", en: "Summer" },
    { id: "invierno", es: "Invierno", en: "Winter" }
  ];
  function init7(container) {
    render6(container);
  }
  function render6(container) {
    const lang = getLang();
    const settings = getSettings();
    const user = getCurrentUser();
    container.innerHTML = `
    <div class="settings-grid">

      <div class="card settings-section">
        <h3>${lang === "en" ? "Profile" : "Perfil"}</h3>
        <div class="auth-form">
          <label class="field"><span>${lang === "en" ? "Album name" : "Nombre del \xE1lbum"}</span>
            <input type="text" id="set-couple-name" value="${escVal(settings.coupleName)}"></label>
          <label class="field"><span>${lang === "en" ? "Relationship start date" : "Fecha de inicio de la relaci\xF3n"}</span>
            <input type="date" id="set-rel-date" value="${settings.relationshipDate || ""}"></label>
          <button class="btn btn-primary" id="btn-save-profile">${lang === "en" ? "Save profile" : "Guardar perfil"}</button>
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === "en" ? "Language & format" : "Idioma y formato"}</h3>
        <div class="auth-form">
          <label class="field"><span>${lang === "en" ? "Language" : "Idioma"}</span>
            <select id="set-lang"><option value="es" ${lang === "es" ? "selected" : ""}>Espa\xF1ol</option><option value="en" ${lang === "en" ? "selected" : ""}>English</option></select></label>
          <label class="field"><span>${lang === "en" ? "Date format" : "Formato de fecha"}</span>
            <select id="set-dateformat">
              <option value="DD/MM/YYYY" ${settings.dateFormat === "DD/MM/YYYY" ? "selected" : ""}>DD/MM/YYYY</option>
              <option value="MM/DD/YYYY" ${settings.dateFormat === "MM/DD/YYYY" ? "selected" : ""}>MM/DD/YYYY</option>
              <option value="YYYY-MM-DD" ${settings.dateFormat === "YYYY-MM-DD" ? "selected" : ""}>YYYY-MM-DD</option>
            </select></label>
          <label class="checkbox-field"><input type="checkbox" id="set-notifications" ${settings.notifications ? "checked" : ""}><span>${lang === "en" ? "Enable notifications" : "Activar notificaciones"}</span></label>
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === "en" ? "Theme" : "Tema"}</h3>
        <div class="theme-swatches" id="theme-swatches">
          ${THEMES.map((th) => `<button type="button" class="theme-swatch ${settings.theme === th ? "active" : ""}" data-theme="${th}" style="background:${THEME_SWATCH_COLOR[th]}" title="${th}"></button>`).join("")}
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === "en" ? "Templates" : "Plantillas"}</h3>
        <div class="template-list" id="template-list">
          ${TEMPLATES.map((tp) => `<button type="button" class="template-chip ${settings.template === tp.id ? "active" : ""}" data-template="${tp.id}">${lang === "en" ? tp.en : tp.es}</button>`).join("")}
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === "en" ? "Bucket list" : "Lista de deseos"}</h3>
        <div id="bucket-list"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input type="text" class="input-search" id="bucket-input" placeholder="${lang === "en" ? "Add a wish\u2026" : "A\xF1adir un deseo\u2026"}">
          <button class="btn btn-ghost" id="bucket-add">+</button>
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === "en" ? "Account security" : "Seguridad de la cuenta"}</h3>
        <div class="auth-form">
          <label class="field"><span>${lang === "en" ? "Username" : "Usuario"}</span>
            <input type="text" id="set-username" value="${escVal((user == null ? void 0 : user.username) || "")}"></label>
          <button class="btn btn-ghost" id="btn-change-username">${lang === "en" ? "Update username" : "Actualizar usuario"}</button>
          <hr style="border:none;border-top:1px solid var(--border);margin:6px 0">
          <label class="field"><span>${lang === "en" ? "Current password" : "Contrase\xF1a actual"}</span><input type="password" id="set-cur-pass"></label>
          <label class="field"><span>${lang === "en" ? "New password" : "Nueva contrase\xF1a"}</span><input type="password" id="set-new-pass"></label>
          <button class="btn btn-ghost" id="btn-change-pass">${lang === "en" ? "Change password" : "Cambiar contrase\xF1a"}</button>
          <hr style="border:none;border-top:1px solid var(--border);margin:6px 0">
          <label class="field"><span>${lang === "en" ? "Auto-lock after inactivity (minutes, 0 = off)" : "Bloqueo por inactividad (minutos, 0 = desactivado)"}</span>
            <input type="number" min="0" max="120" id="set-lock-minutes" value="${settings.inactivityLockMinutes}"></label>
          <button class="btn btn-ghost" id="btn-save-lock">${lang === "en" ? "Save" : "Guardar"}</button>
        </div>
      </div>

      <div class="card settings-section">
        <h3>${lang === "en" ? "Backup" : "Copia de seguridad"}</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:10px">${lang === "en" ? "Export everything (data + media) to a file, or restore from one." : "Exporta todo (datos + multimedia) a un archivo, o restaura desde uno."}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost" id="btn-export">\u2B07 ${lang === "en" ? "Export backup" : "Exportar copia"}</button>
          <label class="btn btn-ghost" style="cursor:pointer">\u2B06 ${lang === "en" ? "Import backup" : "Importar copia"}
            <input type="file" id="input-import" accept=".json" class="hidden"></label>
        </div>
      </div>

    </div>
  `;
    container.querySelector("#btn-save-profile").addEventListener("click", () => {
      saveSettings({
        coupleName: container.querySelector("#set-couple-name").value.trim() || "Nuestro \xC1lbum",
        relationshipDate: container.querySelector("#set-rel-date").value
      });
      document.getElementById("brand-couple-name").textContent = getSettings().coupleName;
      toast(lang === "en" ? "Profile saved" : "Perfil guardado", "success");
    });
    container.querySelector("#set-lang").addEventListener("change", (e) => {
      saveSettings({ lang: e.target.value });
      setLang(e.target.value);
      render6(container);
    });
    container.querySelector("#set-dateformat").addEventListener("change", (e) => saveSettings({ dateFormat: e.target.value }));
    container.querySelector("#set-notifications").addEventListener("change", (e) => saveSettings({ notifications: e.target.checked }));
    container.querySelectorAll("#theme-swatches .theme-swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        saveSettings({ theme: btn.dataset.theme });
        applyTheme(btn.dataset.theme);
        container.querySelectorAll("#theme-swatches .theme-swatch").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    container.querySelectorAll("#template-list .template-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        saveSettings({ template: btn.dataset.template });
        container.querySelectorAll("#template-list .template-chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        toast(lang === "en" ? "Template applied" : "Plantilla aplicada", "success");
      });
    });
    function renderBucket() {
      const s = getSettings();
      const list = container.querySelector("#bucket-list");
      if (!s.bucketList.length) {
        list.innerHTML = `<p style="color:var(--text-muted);font-size:13px">${lang === "en" ? "No wishes yet." : "Sin deseos todav\xEDa."}</p>`;
        return;
      }
      list.innerHTML = s.bucketList.map((item, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
        <input type="checkbox" data-idx="${i}" class="bucket-check" ${item.done ? "checked" : ""}>
        <span style="flex:1;${item.done ? "text-decoration:line-through;color:var(--text-muted)" : ""}">${escVal(item.text)}</span>
        <button class="icon-btn small bucket-del" data-idx="${i}">\u2715</button>
      </div>
    `).join("");
      list.querySelectorAll(".bucket-check").forEach((cb) => cb.addEventListener("change", () => {
        const st = getSettings();
        st.bucketList[+cb.dataset.idx].done = cb.checked;
        saveSettings({ bucketList: st.bucketList });
        renderBucket();
      }));
      list.querySelectorAll(".bucket-del").forEach((b) => b.addEventListener("click", () => {
        const st = getSettings();
        st.bucketList.splice(+b.dataset.idx, 1);
        saveSettings({ bucketList: st.bucketList });
        renderBucket();
      }));
    }
    container.querySelector("#bucket-add").addEventListener("click", () => {
      const input = container.querySelector("#bucket-input");
      const val = input.value.trim();
      if (!val) return;
      const st = getSettings();
      st.bucketList.push({ text: val, done: false });
      saveSettings({ bucketList: st.bucketList });
      input.value = "";
      renderBucket();
    });
    renderBucket();
    container.querySelector("#btn-change-username").addEventListener("click", async () => {
      const newU = container.querySelector("#set-username").value.trim();
      try {
        await changeUsername({ oldUsername: user.username, newUsername: newU });
        toast(lang === "en" ? "Username updated" : "Usuario actualizado", "success");
      } catch (err) {
        toast(err.message, "error");
      }
    });
    container.querySelector("#btn-change-pass").addEventListener("click", async () => {
      const cur = container.querySelector("#set-cur-pass").value;
      const nw = container.querySelector("#set-new-pass").value;
      try {
        await changePassword({ username: user.username, currentPassword: cur, newPassword: nw });
        toast(lang === "en" ? "Password changed" : "Contrase\xF1a cambiada", "success");
        container.querySelector("#set-cur-pass").value = "";
        container.querySelector("#set-new-pass").value = "";
      } catch (err) {
        toast(err.message, "error");
      }
    });
    container.querySelector("#btn-save-lock").addEventListener("click", () => {
      const minutes = Math.max(0, Math.min(120, +container.querySelector("#set-lock-minutes").value || 0));
      saveSettings({ inactivityLockMinutes: minutes });
      toast(lang === "en" ? "Saved" : "Guardado", "success");
      window.dispatchEvent(new CustomEvent("lockminutes-changed", { detail: minutes }));
    });
    container.querySelector("#btn-export").addEventListener("click", async () => {
      try {
        const structured = exportAllStructuredData();
        const media = await idbGetAll();
        const payload = { structured, media, appVersion: 1 };
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nuestro-album-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast(lang === "en" ? "Backup exported" : "Copia exportada", "success");
      } catch (err) {
        console.error(err);
        toast(lang === "en" ? "Export failed" : "No se pudo exportar", "error");
      }
    });
    container.querySelector("#input-import").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        if (!payload.structured) throw new Error("invalid");
        if (!confirm(lang === "en" ? "This will replace your current data. Continue?" : "Esto reemplazar\xE1 tus datos actuales. \xBFContinuar?")) return;
        importStructuredData(payload.structured);
        if (Array.isArray(payload.media)) {
          for (const rec of payload.media) await idbPut(rec);
        }
        toast(lang === "en" ? "Backup restored. Reloading\u2026" : "Copia restaurada. Recargando\u2026", "success");
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        console.error(err);
        toast(lang === "en" ? "Invalid backup file" : "Archivo de copia no v\xE1lido", "error");
      }
      e.target.value = "";
    });
  }
  function escVal(v) {
    const div = document.createElement("div");
    div.textContent = v || "";
    return div.innerHTML;
  }

  // js/app.js
  var VIEWS = {
    dashboard: dashboard_exports,
    calendar: calendar_exports,
    timeline: timeline_exports,
    events: events_exports,
    notes: notes_exports,
    gallery: gallery_exports,
    settings: settings_exports
  };
  var activeView = null;
  var inactivityTimer = null;
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
  }
  function boot() {
    const settings = getSettings();
    applyTheme(settings.theme);
    setLang(settings.lang || getLang());
    if (isAuthenticated()) {
      enterApp();
    } else {
      showScreen("screen-auth");
      applyTranslations();
    }
    wireAuthForms();
    wireUnlockForm();
  }
  function wireAuthForms() {
    document.querySelectorAll("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.goto;
        ["login", "register", "recover"].forEach((name) => {
          document.getElementById(`form-${name}`).classList.toggle("hidden", name !== target);
        });
        clearAuthErrors();
      });
    });
    document.getElementById("form-login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value;
      const password = document.getElementById("login-password").value;
      const remember = document.getElementById("login-remember").checked;
      try {
        await loginUser({ username, password, remember });
        document.getElementById("login-error").textContent = "";
        enterApp();
      } catch (err) {
        document.getElementById("login-error").textContent = err.message;
      }
    });
    document.getElementById("form-register").addEventListener("submit", async (e) => {
      e.preventDefault();
      const displayName = document.getElementById("reg-displayname").value;
      const username = document.getElementById("reg-username").value;
      const password = document.getElementById("reg-password").value;
      const password2 = document.getElementById("reg-password2").value;
      const secQuestion = document.getElementById("reg-secquestion").value;
      const secAnswer = document.getElementById("reg-secanswer").value;
      const errEl = document.getElementById("register-error");
      if (password !== password2) {
        errEl.textContent = getLang() === "en" ? "Passwords do not match" : "Las contrase\xF1as no coinciden";
        return;
      }
      try {
        await registerUser({ username, password, displayName, secQuestion, secAnswer });
        await loginUser({ username, password, remember: true });
        errEl.textContent = "";
        toast(getLang() === "en" ? "Account created" : "Cuenta creada", "success");
        enterApp();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
    const rec1 = document.getElementById("rec-step1-btn");
    const rec2 = document.getElementById("rec-step2-btn");
    rec1.addEventListener("click", () => {
      const username = document.getElementById("rec-username").value;
      const errEl = document.getElementById("recover-error");
      try {
        const q = getSecurityQuestion(username);
        document.getElementById("rec-question-label").textContent = q;
        document.getElementById("rec-step2").classList.remove("hidden");
        rec1.classList.add("hidden");
        rec2.classList.remove("hidden");
        errEl.textContent = "";
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
    rec2.addEventListener("click", async () => {
      const username = document.getElementById("rec-username").value;
      const answer = document.getElementById("rec-answer").value;
      const newPassword = document.getElementById("rec-newpass").value;
      const errEl = document.getElementById("recover-error");
      const okEl = document.getElementById("recover-ok");
      try {
        await recoverPassword({ username, answer, newPassword });
        errEl.textContent = "";
        okEl.textContent = getLang() === "en" ? "Password updated. You can sign in now." : "Contrase\xF1a actualizada. Ya puedes entrar.";
        setTimeout(() => {
          document.querySelector('[data-goto="login"]').click();
          okEl.textContent = "";
        }, 1600);
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }
  function clearAuthErrors() {
    ["login-error", "register-error", "recover-error", "recover-ok"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
  }
  function wireUnlockForm() {
    document.getElementById("form-unlock").addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = getCurrentUser();
      const password = document.getElementById("unlock-password").value;
      const errEl = document.getElementById("unlock-error");
      if (!user) {
        showScreen("screen-auth");
        return;
      }
      try {
        await loginUser({ username: user.username, password, remember: true });
        errEl.textContent = "";
        document.getElementById("unlock-password").value = "";
        showScreen("screen-app");
        resetInactivityTimer();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }
  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    const minutes = getSettings().inactivityLockMinutes;
    if (!minutes || minutes <= 0) return;
    inactivityTimer = setTimeout(() => {
      showScreen("screen-lock");
      applyTranslations();
    }, minutes * 60 * 1e3);
  }
  function wireInactivityWatchers() {
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((evt) => {
      document.addEventListener(evt, () => {
        if (!document.getElementById("screen-app").classList.contains("hidden")) resetInactivityTimer();
      }, { passive: true });
    });
    window.addEventListener("lockminutes-changed", resetInactivityTimer);
  }
  function enterApp() {
    const user = getCurrentUser();
    const settings = getSettings();
    document.getElementById("brand-couple-name").textContent = settings.coupleName || "Nuestro \xC1lbum";
    document.getElementById("auth-welcome").textContent = user ? `${t("welcomeTitle")}, ${user.displayName}` : t("welcomeTitle");
    showScreen("screen-app");
    applyTranslations();
    wireNav();
    wireTopbar();
    initPlayer();
    resetInactivityTimer();
    wireInactivityWatchers();
    navigateTo("dashboard");
  }
  function wireNav() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    function closeSidebar() {
      sidebar.classList.remove("open");
      if (backdrop) backdrop.classList.remove("show");
    }
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigateTo(btn.dataset.view);
        closeSidebar();
      });
    });
    if (backdrop) backdrop.addEventListener("click", closeSidebar);
    document.getElementById("btn-logout").addEventListener("click", () => {
      var _a;
      if (activeView && VIEWS[activeView].destroy) VIEWS[activeView].destroy();
      logoutUser();
      showScreen("screen-auth");
      (_a = document.querySelector('[data-goto="login"]')) == null ? void 0 : _a.click();
      applyTranslations();
    });
  }
  function wireTopbar() {
    const langSelect = document.getElementById("lang-switch");
    langSelect.value = getLang();
    langSelect.addEventListener("change", () => {
      setLang(langSelect.value);
      saveSettings({ lang: langSelect.value });
      navigateTo(activeView, true);
      applyTranslations();
    });
    document.getElementById("btn-hamburger").addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      const backdrop = document.getElementById("sidebar-backdrop");
      const willOpen = !sidebar.classList.contains("open");
      sidebar.classList.toggle("open", willOpen);
      if (backdrop) backdrop.classList.toggle("show", willOpen);
    });
    const animBtn = document.getElementById("btn-anim-toggle");
    const settings = getSettings();
    if (settings.animations) startFx(settings.template);
    animBtn.addEventListener("click", () => {
      if (isFxRunning()) {
        stopFx();
        saveSettings({ animations: false });
      } else {
        startFx(getSettings().template);
        saveSettings({ animations: true });
      }
    });
    window.addEventListener("langchange", () => {
      document.getElementById("view-title").textContent = t(navKeyFor(activeView));
    });
  }
  function navKeyFor(view) {
    return { dashboard: "navDashboard", calendar: "navCalendar", timeline: "navTimeline", events: "navEvents", notes: "navNotes", gallery: "navGallery", settings: "navSettings" }[view] || "navDashboard";
  }
  function navigateTo(view, silent = false) {
    if (!VIEWS[view]) view = "dashboard";
    if (activeView && VIEWS[activeView].destroy) VIEWS[activeView].destroy();
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const section = document.getElementById(`view-${view}`);
    section.classList.add("active");
    document.getElementById("view-title").textContent = t(navKeyFor(view));
    activeView = view;
    VIEWS[view].init(section);
    if (!silent) window.scrollTo({ top: 0 });
  }
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      document.getElementById("screen-loading").classList.add("hidden");
      boot();
    }, 350);
  });
})();
