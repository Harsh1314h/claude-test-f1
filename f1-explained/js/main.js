// ============================================================================
// main.js: boots the site: loader, WebGL stage, scroll-driven chapters,
// navigation, labels, HUD and all the widgets.
// ============================================================================
import { INFO, PARTS, LABELS_ANATOMY, LABELS_PU, ANATOMY_BUTTONS, CARS } from './data.js';
import { initPoints, initWeekend, initAero, initDRS, initPower, initTyres, initPit, initFlags, initCornering, visible } from './widgets.js';
import { initQuiz } from './quiz.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const TITLES = {
  hero: ['00', 'Formula 1, explained'], intro: ['01', 'The championship'], weekend: ['02', 'Race weekend'],
  anatomy: ['03', 'Anatomy · click a part'], aero: ['04', 'Aerodynamics · airflow'], drs: ['05', 'DRS'],
  power: ['06', 'Power unit · x-ray'], tyres: ['07', 'Tyres'], pit: ['08', 'Pit stop'], flags: ['09', 'Flags & safety · halo'],
  cornering: ['10', 'Cornering g-forces'], eras: ['11', 'Evolution'], quiz: ['12', 'Quiz'],
};

let stage = null;
const loaderFill = $('#loaderFill'), loaderText = $('#loaderText');
const setLoad = (p, msg) => { loaderFill.style.width = Math.round(p * 100) + '%'; if (msg) loaderText.textContent = msg; };
const hideLoader = () => { window.__f1Booted = true; setLoad(1, 'Lights out!'); setTimeout(() => $('#loader').classList.add('done'), 350); };

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
}

function showFallback(msg, carId = 'modern') {
  $('#stageFallback').hidden = false;
  $('#gl').style.display = 'none';
  $('#fallbackImg').src = `assets/img/previews/${carId}_hero.jpg`;
  if (msg) $('#fallbackMsg').textContent = msg;
}

// ------------------------------------------------------------------ HUD
const hudEl = $('#hudReadout');
const hud = {
  hide() { hudEl.hidden = true; },
  speed(v, open) {
    hudEl.hidden = false;
    hudEl.innerHTML = `<b>${v}</b> km/h<br><span class="tag" style="background:${open ? '#35d07f' : '#2d3448'};color:${open ? '#04140a' : '#98a0b3'}">DRS ${open ? 'OPEN' : 'CLOSED'}</span>`;
  },
  g(kmh, lat, lon) {
    hudEl.hidden = false;
    hudEl.innerHTML = `<b>${Math.round(kmh)}</b> km/h<br>lateral ${Math.abs(lat).toFixed(1)} g · ${lon >= 0 ? 'braking' : 'accel'} ${Math.abs(lon).toFixed(1)} g`;
  },
};

// ------------------------------------------------------------------ labels
let labelDefs = [];
const labelEls = new Map();
const SVGNS = 'http://www.w3.org/2000/svg';
let leaderSvg = null;
function setLabels(kind) {
  const list = kind === 'anatomy' ? LABELS_ANATOMY : kind === 'pu' ? LABELS_PU : [];
  labelDefs = list;
  const host = $('#labels');
  host.innerHTML = '';
  labelEls.clear();
  leaderSvg = document.createElementNS(SVGNS, 'svg');
  leaderSvg.setAttribute('class', 'leaders');
  host.appendChild(leaderSvg);
  for (const [part, text] of list) {
    const el = document.createElement('div');
    el.className = 'lbl' + (kind === 'pu' ? ' pu' : '');
    el.dataset.part = part;
    el.textContent = text;
    el.addEventListener('click', () => stage && stage.selectPart(part));
    host.appendChild(el);
    const line = document.createElementNS(SVGNS, 'line');
    const dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('r', 2.5);
    leaderSvg.append(line, dot);
    labelEls.set(part, { el, line, dot, w: 0, h: 0 });
  }
  if (kind === 'pu') $$('.lbl[data-part=ERS_MGUH]').forEach(l => { l.style.textDecoration = window.__puMode === '2026' ? 'line-through' : ''; });
}
// Labels are pushed radially away from the car's screen centre, then relaxed so
// they don't overlap, with a leader line back to the part.
const tmp = { x: 0, y: 0 };
function updateLabels() {
  if (!labelDefs.length || !stage) return;
  const W = $('#stage').clientWidth, H = $('#stage').clientHeight;
  const items = [];
  let cx = 0, cy = 0;
  for (const [part] of labelDefs) {
    const L = labelEls.get(part);
    const p = stage.partScreen(part, tmp);
    if (!p) { L.el.classList.add('hidden'); L.line.style.display = L.dot.style.display = 'none'; continue; }
    if (!L.w) { L.w = L.el.offsetWidth + 8; L.h = L.el.offsetHeight + 6; }
    items.push({ L, ax: p.x, ay: p.y });
    cx += p.x; cy += p.y;
  }
  if (!items.length) return;
  cx /= items.length; cy /= items.length;
  const R = Math.min(W, H) * 0.09 + 18;
  for (const it of items) {
    let dx = it.ax - cx, dy = it.ay - cy;
    const d = Math.hypot(dx, dy) || 1;
    it.x = it.ax + dx / d * R;
    it.y = it.ay + dy / d * R * 0.8;
  }
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      const ox = (a.L.w + b.L.w) / 2 - Math.abs(a.x - b.x);
      const oy = (a.L.h + b.L.h) / 2 - Math.abs(a.y - b.y);
      if (ox > 0 && oy > 0) {
        const push = oy / 2 + 0.5, s = a.y < b.y ? -1 : 1;
        a.y += s * push; b.y -= s * push;
      }
    }
  }
  for (const it of items) {
    const { L } = it;
    it.x = Math.max(L.w / 2 + 4, Math.min(W - L.w / 2 - 4, it.x));
    it.y = Math.max(40, Math.min(H - 100, it.y));
    L.el.classList.remove('hidden');
    L.el.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px) translate(-50%, -50%)`;
    L.line.style.display = L.dot.style.display = '';
    L.line.setAttribute('x1', it.ax.toFixed(1)); L.line.setAttribute('y1', it.ay.toFixed(1));
    L.line.setAttribute('x2', it.x.toFixed(1)); L.line.setAttribute('y2', it.y.toFixed(1));
    L.dot.setAttribute('cx', it.ax.toFixed(1)); L.dot.setAttribute('cy', it.ay.toFixed(1));
  }
}

// ------------------------------------------------------------------ part card
function showPart(name, key) {
  const info = INFO[key];
  if (!info) return;
  $('#partName').textContent = info[0];
  $('#partText').textContent = info[1];
  $('#partCard').hidden = false;
  $$('.lbl').forEach(l => l.classList.toggle('on', l.dataset.part === name));
  $$('#partGrid button').forEach(b => b.classList.toggle('on', b.dataset.part === name));
}
$('#partCard .close').addEventListener('click', () => { $('#partCard').hidden = true; stage && stage.highlight(null); $$('.lbl.on, #partGrid .on').forEach(x => x.classList.remove('on')); });

// ------------------------------------------------------------------ nav
function initNav() {
  const toggle = $('#navToggle'), nav = $('#nav');
  toggle.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
  });
  $$('#nav a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', false); }));
  gsap.to('#progress i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.2 } });
}

// ------------------------------------------------------------------ chapters
let current = null;
const handlers = {};
function activate(id) {
  if (current === id) return;
  const prev = current;
  current = id;
  Object.keys(visible).forEach(k => { visible[k] = false; });
  visible[id] = true;
  $$('#nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  const [n, t] = TITLES[id];
  $('#hudNum').textContent = n;
  $('#hudTitle').textContent = t;
  $('#partCard').hidden = true;
  hud.hide();
  if (prev && handlers[prev]?.leave) handlers[prev].leave();
  if (handlers[id]?.enter) handlers[id].enter();
  if (stage) stage.setScene(id);
  // car selector lock hint
  $('#carSelect').classList.toggle('locked', ['anatomy', 'power', 'drs'].includes(id));
}

function initChapters() {
  $$('section.chapter').forEach(sec => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => { if (self.isActive) activate(sec.id); },
    });
  });
  // eras: each block swaps the car
  $$('.era').forEach(el => {
    ScrollTrigger.create({
      trigger: el, start: 'top 60%', end: 'bottom 45%',
      onToggle: self => {
        el.classList.toggle('on', self.isActive);
        if (self.isActive && stage && current === 'eras') stage.showCar(el.dataset.era);
      },
    });
  });
  // gentle reveal of cards/widgets
  ScrollTrigger.batch('.chapter .card, .chapter .widget, .chapter .facts, .chapter details.deep', {
    start: 'top 92%', once: true,
    onEnter: els => gsap.fromTo(els, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power2.out', overwrite: true }),
  });
}

function initCarSelect() {
  $$('#carSelect button').forEach(b => b.addEventListener('click', () => {
    if (!stage) { showFallback(null, b.dataset.car); setSelected(b.dataset.car); return; }
    if ($('#carSelect').classList.contains('locked') && b.dataset.car !== 'modern') {
      const hint = $('#hudHint');
      hint.textContent = 'This chapter uses the GE-22 (modern car)';
      gsap.fromTo(hint, { color: '#ff7a45' }, { color: '#626a7e', duration: 2.5 });
      return;
    }
    stage.showCar(b.dataset.car);
  }));
}
function setSelected(id) {
  $$('#carSelect button').forEach(b => { const on = b.dataset.car === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
}

function initAnatomyUI() {
  const grid = $('#partGrid');
  grid.innerHTML = ANATOMY_BUTTONS.map(([p, t, pu]) => `<button data-part="${p}" class="${pu ? 'pu' : ''}">${t}</button>`).join('');
  $$('button', grid).forEach(b => b.addEventListener('click', () => {
    if (stage) stage.selectPart(b.dataset.part);
    else showPart(b.dataset.part, PARTS[b.dataset.part]?.key);
  }));
  $$('[data-explode]').forEach(b => b.addEventListener('click', () => {
    $$('[data-explode]').forEach(x => x.classList.toggle('on', x === b));
    stage && stage.setExploded(b.dataset.explode === '1');
  }));
}

// ------------------------------------------------------------------ boot
async function boot() {
  initNav();
  initAnatomyUI();
  initCarSelect();
  initPoints();
  initWeekend();

  if (webglOK()) {
    try {
      const { Stage } = await import('./stage.js');
      stage = new Stage($('#stage'), $('#gl'), $('#labels'));
      stage.init();
      window.__stage = stage;   // handy for debugging in the console
      stage.on('labels', setLabels);
      stage.on('part', showPart);
      stage.on('frame', updateLabels);
      stage.on('car', id => { setSelected(id); $('#hudHint').textContent = `${CARS[id].name} · ${CARS[id].era} · drag to rotate`; });
      stage.on('modelerror', id => { showFallback(`The ${CARS[id].name} model could not be loaded. Showing a pre-rendered image.`, id); });
      setLoad(0.1, 'Loading the GE-22…');
      await stage.loadCar('modern', p => setLoad(0.1 + p * 0.8));
      await stage.showCar('modern', { instant: true });
    } catch (e) {
      console.error(e);
      stage = null;
      showFallback('3D view could not start on this device. Showing pre-rendered images instead.');
    }
  } else {
    showFallback('Your browser doesn\'t support WebGL 2, so the 3D view is replaced by pre-rendered images.');
  }

  initAero(stage);
  const drs = initDRS(stage, hud);
  const power = initPower(stage);
  const tyres = initTyres(stage);
  const pit = initPit(stage);
  const flags = initFlags(stage);
  initCornering(stage, hud);
  initQuiz($('#quizBox'));

  Object.assign(handlers, {
    drs: { enter: () => drs.start(), leave: () => { drs.stop(); hud.hide(); } },
    power: { leave: () => power.reset() },
    tyres: { enter: () => tyres.draw() },
    pit: { enter: () => pit.start(), leave: () => pit.stop() },
    flags: { leave: () => flags.clearTint() },
    cornering: { leave: () => { hud.hide(); } },
    eras: { enter: () => { const on = $('.era.on'); if (on && stage) stage.showCar(on.dataset.era); } },
  });

  initChapters();
  hideLoader();
  if (!current) activate('hero');
  ScrollTrigger.refresh();

  // background-load the other cars so switching is instant
  if (stage) {
    for (const id of ['v10', 'wingcar', 'classic']) {
      try { await stage.loadCar(id); } catch (e) { console.warn('preload failed', id, e); }
    }
  }
}

boot().catch(e => { console.error(e); hideLoader(); });
