// ============================================================
// fx.js — Animaciones ambientales suaves (activables/desactivables)
// El icono usado depende de la plantilla seleccionada en Ajustes.
// ============================================================

const TEMPLATE_ICONS = {
  romantica: ['💛', '✦'],
  sakura: ['🌸'],
  nocturna: ['✦', '⋆'],
  pastel: ['✿', '✦'],
  navidad: ['❄'],
  san_valentin: ['💕', '💗'],
  verano: ['☀', '✦'],
  invierno: ['❄', '✦']
};

let canvas, ctx, particles = [], rafId = null, running = false, resizeHandler = null;

function initCanvas() {
  canvas = document.getElementById('fx-canvas');
  if (!canvas) return false;
  ctx = canvas.getContext('2d');
  resize();
  resizeHandler = () => resize();
  window.addEventListener('resize', resizeHandler);
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

  particles.forEach(p => {
    p.y += p.speed;
    p.x += p.drift;
    p.rotation += p.rotSpeed;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.font = `${p.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(p.icon, 0, 0);
    ctx.restore();
  });
  particles = particles.filter(p => p.y < canvas.height + 30);

  rafId = requestAnimationFrame(() => loop(icons));
}

export function startFx(templateId = 'romantica') {
  if (running) stopFx();
  if (!canvas && !initCanvas()) return;
  canvas.classList.remove('hidden');
  running = true;
  particles = [];
  const icons = TEMPLATE_ICONS[templateId] || TEMPLATE_ICONS.romantica;
  loop(icons);
}

export function stopFx() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  particles = [];
  if (canvas) {
    ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.classList.add('hidden');
  }
}

export function isFxRunning() { return running; }
