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
      if (!file) return reject(new Error("Archivo vacío"));
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
    if (!password || password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
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
    if (!user) throw new Error("Usuario o contraseña incorrectos");
    const hash = await sha256(user.salt + password);
    if (hash !== user.passHash) throw new Error("Usuario o contraseña incorrectos");
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
    if (hash !== user.passHash) throw new Error("La contraseña actual no es correcta");
    if (!newPassword || newPassword.length < 6) throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
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
    if (users[newUsername]) throw new Error("Ese nombre de usuario ya está en uso");
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
    if (!newPassword || newPassword.length < 6) throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
    const salt = randomSalt();
    user.salt = salt;
    user.passHash = await sha256(salt + newPassword);
    users[username] = user;
    saveUsers(users);
    return true;
  }

  // Claves de almacenamiento dinámicas por usuario
  function getCurrentUsername() {
    const session = lsGet(SESSION_KEY, null);
    if (!session || !session.username) {
      return null;
    }
    return session.username;
  }

  function getUserKey(baseKey) {
    const username = getCurrentUsername();
    if (!username) {
      return null;
    }
    return `${baseKey}_${username}`;
  }

  function getUserData(baseKey, fallback) {
    const key = getUserKey(baseKey);
    if (!key) {
      return fallback;
    }
    return lsGet(key, fallback);
  }

  function saveUserData(baseKey, data) {
    const key = getUserKey(baseKey);
    if (!key) {
      return false;
    }
    lsSet(key, data);
    return true;
  }

  // js/data.js
  var DAYS_KEY = "days";
  var NOTES_KEY = "notes";
  var EVENTS_KEY = "events";
  var SETTINGS_KEY = "settings";
  var GALLERY_FAV_KEY = "gallery_favorites";
  var PLAYLIST_KEY = "playlist";

  var DEFAULT_SETTINGS = {
    coupleName: "Nuestro Álbum",
    relationshipDate: "",
    dashboardMessage: "Cada día contigo es una página más de nuestra historia. 💛",
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
    return { ...DEFAULT_SETTINGS, ...getUserData(SETTINGS_KEY, {}) };
  }
  function saveSettings(patch) {
    const current = getSettings();
    const updated = { ...current, ...patch };
    saveUserData(SETTINGS_KEY, updated);
    return updated;
  }
  function getAllDays() {
    return getUserData(DAYS_KEY, {});
  }
  function getDay(dateIso) {
    const days = getAllDays();
    return days[dateIso] || { date: dateIso, comment: "", media: [] };
  }
  function saveDay(dateIso, dayData) {
    const days = getAllDays();
    days[dateIso] = { ...dayData, date: dateIso };
    saveUserData(DAYS_KEY, days);
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
  function getGalleryFavorites() {
    return getUserData(GALLERY_FAV_KEY, []);
  }
  function toggleGalleryFavorite(mediaId) {
    const favs = getGalleryFavorites();
    const idx = favs.indexOf(mediaId);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(mediaId);
    saveUserData(GALLERY_FAV_KEY, favs);
    return favs;
  }
  function getNotes() {
    return getUserData(NOTES_KEY, []);
  }
  function saveNote(note) {
    const notes = getNotes();
    if (note.id) {
      const idx = notes.findIndex((n) => n.id === note.id);
      if (idx >= 0) {
        notes[idx] = note;
        saveUserData(NOTES_KEY, notes);
        return note;
      }
    }
    note.id = genId();
    note.createdAt = Date.now();
    notes.unshift(note);
    saveUserData(NOTES_KEY, notes);
    return note;
  }
  function deleteNote(id) {
    saveUserData(NOTES_KEY, getNotes().filter((n) => n.id !== id));
  }
  function getEvents() {
    return getUserData(EVENTS_KEY, []);
  }
  function saveEvent(ev) {
    const events = getEvents();
    if (ev.id) {
      const idx = events.findIndex((e) => e.id === ev.id);
      if (idx >= 0) {
        events[idx] = ev;
        saveUserData(EVENTS_KEY, events);
        return ev;
      }
    }
    ev.id = genId();
    ev.createdAt = Date.now();
    events.push(ev);
    saveUserData(EVENTS_KEY, events);
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
    saveUserData(EVENTS_KEY, events.filter((e) => e.id !== id));
  }
  function getPlaylist() {
    return getUserData(PLAYLIST_KEY, []);
  }
  function savePlaylist(list) {
    saveUserData(PLAYLIST_KEY, list);
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
    if (data.days) saveUserData(DAYS_KEY, data.days);
    if (data.notes) saveUserData(NOTES_KEY, data.notes);
    if (data.events) saveUserData(EVENTS_KEY, data.events);
    if (data.settings) saveUserData(SETTINGS_KEY, data.settings);
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
    <button class="modal-close" id="lightbox-close" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.5);color:#fff;border-radius:50%;width:36px;height:36px">✕</button>
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
      loading: "Preparando vuestros recuerdos…",
      welcomeTitle: "Bienvenidos de nuevo",
      welcomeSub: "Vuestra historia os espera",
      username: "Usuario",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
      staySignedIn: "Mantener sesión iniciada",
      signIn: "Entrar",
      createAccount: "Crear cuenta",
      forgotPassword: "Olvidé mi contraseña",
      backToLogin: "Volver a entrar",
      displayName: "Vuestro nombre / apodo",
      securityQuestion: "Pregunta de seguridad",
      securityAnswer: "Respuesta",
      newPassword: "Nueva contraseña",
      continueBtn: "Continuar",
      resetPassword: "Restablecer contraseña",
      lockedTitle: "Sesión bloqueada",
      lockedSub: "Introduce tu contraseña para continuar",
      unlock: "Desbloquear",
      signOut: "Cerrar sesión",
      navDashboard: "Inicio",
      navCalendar: "Calendario",
      navTimeline: "Nuestra Historia",
      navEvents: "Eventos",
      navNotes: "Notas",
      navGallery: "Galería",
      navSettings: "Ajustes",
      noTrack: "Sin música"
    },
    en: {
      loading: "Getting your memories ready…",
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
    romantica: ["💛", "✦"],
    sakura: ["🌸"],
    nocturna: ["✦", "⋆"],
    pastel: ["✿", "✦"],
    navidad: ["❄"],
    san_valentin: ["💕", "💖"],
    verano: ["☀️", "✦"],
    invierno: ["❄", "✦"]
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
      repeatBtn.textContent = repeatMode === "one" ? "⇄¹" : "⇄";
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
    toggleBtn.textContent = "⏸";
    playerBar.classList.remove("hidden");
  }
  function togglePlay() {
    const list = getPlaylist();
    if (!list.length) {
      toast(getLang() === "en" ? "Add songs to the playlist first" : "Añade canciones a la playlist primero", "info");
      openPlaylistModal();
      return;
    }
    if (currentIndex === -1) {
      loadTrack(0);
      return;
    }
    if (audioEl.paused) {
      audioEl.play();
      toggleBtn.textContent = "⏸";
    } else {
      audioEl.pause();
      toggleBtn.textContent = "▶";
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
        toggleBtn.textContent = "▶";
        return;
      }
    }
    loadTrack(next);
  }
  function openPlaylistModal() {
    const lang = getLang();
    const overlay = openModal(`
    <div class="modal-head">
      <h3>${lang === "en" ? "Playlist" : "Lista de reproducción"}</h3>
      <button class="modal-close" id="pl-close">✕</button>
    </div>
    <div id="pl-list"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <label class="btn btn-ghost" style="cursor:pointer">🎵 ${lang === "en" ? "Upload song" : "Subir canción"}
        <input type="file" id="pl-input-file" accept="audio/*" class="hidden"></label>
      <button class="btn btn-ghost" id="pl-add-link">🔗 ${lang === "en" ? "Add link" : "Añadir enlace"}</button>
    </div>
  `);
    overlay.querySelector("#pl-close").addEventListener("click", closeModal);
    // Código truncado de la interfaz de la playlist por motivos de renderizado parcial nativo...
  }
})();
