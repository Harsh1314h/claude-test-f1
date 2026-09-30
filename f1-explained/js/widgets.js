// ============================================================================
// widgets.js: the 2D interactive diagrams in each chapter.
// Each init function is independent; they receive the Stage (may be null when
// WebGL is unavailable, so every 3D call is guarded).
// ============================================================================
const gsap = window.gsap;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const segGroup = (root, attr, fn) => {
  $$(`button[data-${attr}]`, root).forEach(b => b.addEventListener('click', () => {
    $$(`button[data-${attr}]`, root).forEach(x => x.classList.toggle('on', x === b));
    fn(b.dataset[attr], b);
  }));
};

// Track whether a chapter is on screen (to pause canvas animations)
export const visible = {};

// ---------------------------------------------------------------- 1. points
const GP_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];
export function initPoints() {
  const bars = $('#pointsBars');
  const selA = $('#drvA'), selB = $('#drvB');
  let mode = 'gp';
  const pts = () => (mode === 'gp' ? GP_POINTS : SPRINT_POINTS);
  const fill = () => {
    bars.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const v = pts()[i] || 0;
      const d = document.createElement('div');
      d.className = 'pb' + (v ? '' : ' off');
      d.innerHTML = `<i data-v="${v}" style="height:0"></i><span>P${i + 1}</span>`;
      d.addEventListener('click', () => { selA.value = i; calc(); });
      bars.appendChild(d);
      requestAnimationFrame(() => { d.firstChild.style.height = Math.max(3, (v / 25) * 100) + '%'; });
    }
    for (const s of [selA, selB]) {
      const cur = s.value;
      s.innerHTML = Array.from({ length: 22 }, (_, i) => `<option value="${i}">P${i + 1}</option>`).join('') + '<option value="99">DNF</option>';
      s.value = cur || (s === selA ? 0 : 4);
    }
    calc();
  };
  const calc = () => {
    const a = +selA.value, b = +selB.value;
    const pa = pts()[a] || 0, pb = pts()[b] || 0;
    $$('.pb', bars).forEach((el, i) => el.classList.toggle('sel', i === a || i === b));
    const label = i => (i === 99 ? 'DNF' : 'P' + (i + 1));
    $('#calcOut').innerHTML = a === b && a !== 99
      ? 'Two cars can\'t finish in the same position. Pick different places.'
      : `Driver A (${label(a)}) scores <b>${pa}</b> · Driver B (${label(b)}) scores <b>${pb}</b> → team scores <b>${pa + pb}</b> for the ${mode === 'gp' ? 'Grand Prix' : 'Sprint'}.`;
  };
  selA.addEventListener('change', calc);
  selB.addEventListener('change', calc);
  segGroup($('#pointsWidget'), 'mode', m => { mode = m; fill(); });
  fill();
}

// ---------------------------------------------------------------- 2. weekend + quali
const WEEKEND = {
  std: [
    ['Friday', [['practice', 'Practice 1', '60 min: learn the track, test parts'], ['practice', 'Practice 2', '60 min: race-pace long runs']]],
    ['Saturday', [['practice', 'Practice 3', '60 min: final set-up'], ['quali', 'Qualifying', 'Q1 · Q2 · Q3 sets the Sunday grid']]],
    ['Sunday', [['race', 'Grand Prix', '305+ km · points for the top 10']]],
  ],
  sprint: [
    ['Friday', [['practice', 'Practice 1', 'The only practice session'], ['quali', 'Sprint Qualifying', 'SQ1 · SQ2 · SQ3 sets the Sprint grid']]],
    ['Saturday', [['sprint', 'Sprint', '~100 km, no mandatory stop · points for the top 8'], ['quali', 'Qualifying', 'Sets the Grand Prix grid']]],
    ['Sunday', [['race', 'Grand Prix', '305+ km · points for the top 10']]],
  ],
};
export function initWeekend() {
  const tl = $('#weekendTimeline');
  const draw = fmt => {
    tl.innerHTML = WEEKEND[fmt].map(([day, evs]) => `<div class="tl-day"><h5>${day}</h5>${evs.map(([c, t, s]) => `<div class="tl-ev ${c}"><b>${t}</b><span>${s}</span></div>`).join('')}</div>`).join('');
    gsap.to($$('.tl-ev', tl), { opacity: 1, y: 0, stagger: 0.08, duration: 0.45, ease: 'power2.out' });
  };
  segGroup(tl.parentElement, 'fmt', draw);
  draw('std');
  initQuali();
}

const TEAMS = [['Aurora', '#ff4d1a'], ['Vortex', '#2fd4ff'], ['Kestrel', '#ffd21f'], ['Nimbus', '#b36bff'], ['Halcyon', '#35d07f'],
  ['Meridian', '#ff5fa2'], ['Stratos', '#f2f2f2'], ['Corvid', '#6d7cff'], ['Sable', '#c28a4a'], ['Tidewater', '#1fc7b0'], ['Pyre', '#ff2e3a']];
const CODES = ['ARK', 'BEL', 'CRU', 'DAV', 'EKO', 'FAL', 'GRY', 'HAN', 'IVO', 'JAX', 'KOR', 'LUM', 'MAR', 'NOV', 'ORT', 'PAZ', 'QUI', 'ROS', 'SAN', 'TAK', 'ULF', 'VEX'];
function initQuali() {
  const list = $('#qualiList');
  const stage = $('#qualiStage');
  const btn = $('#qualiPlay');
  const drivers = CODES.map((c, i) => ({ code: c, team: TEAMS[Math.floor(i / 2)], skill: Math.random() }));
  let running = false;
  const render = (order, outSet, pole) => {
    list.innerHTML = order.map((d, i) => `<li class="${outSet.has(d.code) ? 'out' : ''} ${pole && i === 0 ? 'pole' : ''}">
      <span class="p">P${i + 1}</span><span class="c" style="background:${d.team[1]}"></span><span>${d.code} <small style="color:var(--dim)">${d.team[0]}</small></span><span class="t">${d.t ? fmt(d.t) : ''}</span></li>`).join('');
  };
  const fmt = t => `1:${(t - 60).toFixed(3).padStart(6, '0')}`;
  const lap = (d, session) => 78.2 + (1 - d.skill) * 1.6 - session * 0.25 + Math.random() * 0.35;
  const sortBy = arr => arr.sort((a, b) => a.t - b.t);
  const reset = () => { drivers.forEach(d => { d.t = 0; }); render(drivers, new Set(), false); stage.textContent = '22 cars on track'; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  btn.addEventListener('click', async () => {
    if (running) return;
    running = true;
    btn.disabled = true;
    const out = new Set();
    let pool = [...drivers];
    for (const [sess, knock, label] of [[1, 6, 'Q1'], [2, 6, 'Q2'], [3, 0, 'Q3']]) {
      stage.textContent = `${label}: ${pool.length} cars on track…`;
      pool.forEach(d => { d.t = lap(d, sess); });
      sortBy(pool);
      const eliminated = drivers.filter(d => out.has(d.code));
      render([...pool, ...eliminated], out, false);
      gsap.from($$('li', list).slice(0, pool.length), { x: -12, opacity: 0, stagger: 0.03, duration: 0.3 });
      await wait(1500);
      if (knock) {
        pool.slice(-knock).forEach(d => out.add(d.code));
        render([...pool, ...eliminated], out, false);
        stage.textContent = `${label} over: slowest ${knock} knocked out`;
        await wait(1400);
        pool = pool.slice(0, -knock);
      } else {
        render([...pool, ...eliminated], out, true);
        stage.textContent = `Pole position: ${pool[0].code} (${pool[0].team[0]})`;
      }
    }
    running = false;
    btn.disabled = false;
    btn.textContent = '↺ Run again';
  });
  reset();
}

// ---------------------------------------------------------------- 4. aero
export function initAero(stage) {
  const spd = $('#spd');
  let wing = 'mid';
  const upd = () => {
    const v = +spd.value;
    $('#spdVal').textContent = v;
    const lv = { high: 1.35, mid: 1, low: 0.62 }[wing];
    const dk = { high: 1.3, mid: 1, low: 0.7 }[wing];
    const q = (v / 340) ** 2;
    const df = q * lv / 1.35 * 100, dr = q * dk / 1.3 * 100;
    $('#dfBar').style.width = df + '%';
    $('#drBar').style.width = dr + '%';
    $('#dfVal').textContent = Math.round(df);
    $('#drVal').textContent = Math.round(dr);
    stage && stage.setAero(v, wing);
  };
  spd.addEventListener('input', upd);
  segGroup($('#aeroWidget'), 'wing', w => { wing = w; upd(); });
  upd();
}

// ---------------------------------------------------------------- 5. DRS
export function initDRS(stage, hud) {
  const btn = $('#drsBtn');
  const steps = $$('.drs-steps div');
  const speedEl = $('#drsSpeed');
  const sp = { v: 296 };
  const show = n => steps.forEach(s => s.classList.toggle('on', +s.dataset.step === n));
  const writeSpeed = () => { speedEl.textContent = Math.round(sp.v); hud.speed(Math.round(sp.v), stage?.drsOpen); };
  const tl = gsap.timeline({ repeat: -1, paused: true, onUpdate: writeSpeed });
  tl.addLabel('detect')
    .call(() => { show(1); stage && stage.setDRS(false); btn.textContent = 'Open DRS'; })
    .to(sp, { v: 304, duration: 1.8, ease: 'none' })
    .addLabel('open')
    .call(() => { show(2); stage && stage.setDRS(true); btn.textContent = 'DRS open'; btn.classList.add('active'); })
    .to(sp, { v: 318, duration: 2.6, ease: 'power1.out' })
    .call(() => { show(3); stage && stage.setDRS(false); btn.classList.remove('active'); btn.textContent = 'Open DRS'; })
    .to(sp, { v: 120, duration: 1.4, ease: 'power2.out' })
    .to(sp, { v: 296, duration: 1.6, ease: 'power1.inOut' });
  btn.addEventListener('click', () => { tl.play('open'); });
  return {
    start() { tl.play(0); },
    stop() { tl.pause(); stage && stage.setDRS(false); },
  };
}

// ---------------------------------------------------------------- 6. power unit
const FLOW_CAPTIONS = {
  throttle: '<b>Full throttle.</b> Fuel burns in the V6; exhaust spins the turbo. The MGU-H turns spare exhaust energy into electricity, and together with the battery it powers the MGU-K, adding ~160 hp straight to the crankshaft.',
  brake: '<b>Braking.</b> The MGU-K works as a generator: the rear wheels drive it, turning kinetic energy that would be lost as brake heat into electricity stored in the battery (max 2 MJ per lap from the MGU-K, 2014–25).',
  mguh: '<b>Turbo &amp; MGU-H.</b> Exhaust gas spins the turbine. The MGU-H on the same shaft converts that spin into electricity (no limit on how much). It can also work in reverse, spinning the compressor up so there is no turbo lag.',
  '2026': '<b>2026 rules.</b> The complex MGU-H is gone. The MGU-K is almost three times as powerful (350 kW) and harvests much more under braking, so about half the power is electric. Fuel is 100% sustainable.',
};
export function initPower(stage) {
  const cap = $('#flowCaption');
  const set = mode => {
    cap.innerHTML = FLOW_CAPTIONS[mode];
    const is26 = mode === '2026';
    $('#splitIce').style.width = is26 ? '50%' : '85%';
    $('#splitElec').style.width = is26 ? '50%' : '15%';
    $('#splitTxt').textContent = is26 ? '≈ 50% / 50%' : '≈ 85% / 15% (ICE / electric)';
    window.__puMode = mode;
    if (stage) {
      stage.energy.setMode(mode);
      const h = stage.cars.modern?.parts.ERS_MGUH;
      if (h) h.node.visible = !is26;
      document.querySelectorAll('.lbl[data-part=ERS_MGUH]').forEach(l => { l.style.textDecoration = is26 ? 'line-through' : ''; l.style.opacity = is26 ? 0.5 : ''; });
    }
  };
  segGroup($('#puWidget'), 'flow', set);
  set('throttle');
  return { reset() { const h = stage?.cars.modern?.parts.ERS_MGUH; if (h) h.node.visible = true; } };
}

// ---------------------------------------------------------------- 7. tyres
const TREAD = {
  soft: ['slick', 'C-range slick. Smooth, no grooves: maximum rubber on the road. Fastest, but wears and overheats soonest.'],
  medium: ['slick', 'The middle of the three compounds brought to each race: a balance of pace and durability.'],
  hard: ['slick', 'Hardest of the three: slowest over one lap but lasts much longer. Good for long stints.'],
  inter: ['inter', 'Shallow grooves pump away a thin film of water. Used on a damp or drying track, or in light rain.'],
  wet: ['wet', 'Deep grooves clear large volumes of water to resist aquaplaning in heavy rain.'],
};
function treadSVG(type, color) {
  let grooves = '';
  if (type === 'inter') {
    for (let i = -2; i < 8; i++) grooves += `<path d="M${10 + i * 12} 88 l18 -28 l-6 -14 l16 -30" stroke="#0c0e14" stroke-width="3" fill="none"/>`;
  } else if (type === 'wet') {
    grooves += '<path d="M30 2 V88 M60 2 V88" stroke="#0c0e14" stroke-width="5"/>';
    for (let i = -2; i < 8; i++) grooves += `<path d="M${2 + i * 14} 88 l26 -40 l-26 -40" stroke="#0c0e14" stroke-width="4" fill="none"/>`;
  }
  return `<svg viewBox="0 0 90 90"><defs><clipPath id="tc"><rect x="4" y="2" width="82" height="86" rx="10"/></clipPath></defs>
    <rect x="4" y="2" width="82" height="86" rx="10" fill="#262a33"/><g clip-path="url(#tc)">${grooves}</g>
    <rect x="4" y="2" width="6" height="86" fill="${color}"/><rect x="80" y="2" width="6" height="86" fill="${color}"/></svg>`;
}
export function initTyres(stage) {
  const info = $('#treadInfo');
  const cols = { soft: '#e8202a', medium: '#ffd21f', hard: '#f2f2f2', inter: '#35b44a', wet: '#1f7ae0' };
  const set = c => {
    info.innerHTML = treadSVG(TREAD[c][0], cols[c]) + `<p>${TREAD[c][1]}</p>`;
    stage && stage.setCompound(c);
    highlightLine(c);
  };
  segGroup($('#compounds'), 'c', set);
  // degradation chart
  const svg = $('#degChart');
  const Wd = 560, Hd = 300, m = { l: 48, r: 16, t: 18, b: 38 };
  const laps = 36, yMin = -1, yMax = 3;
  const X = l => m.l + (l / laps) * (Wd - m.l - m.r);
  const Y = v => m.t + (1 - (v - yMin) / (yMax - yMin)) * (Hd - m.t - m.b);
  for (let v = yMin; v <= yMax; v += 1) {
    svgEl('line', { x1: m.l, x2: Wd - m.r, y1: Y(v), y2: Y(v), class: 'grid' }, svg);
    svgEl('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }, svg).textContent = (v > 0 ? '+' : '') + v + 's';
  }
  for (let l = 0; l <= laps; l += 6) svgEl('text', { x: X(l), y: Hd - m.b + 18, 'text-anchor': 'middle' }, svg).textContent = l;
  svgEl('text', { x: (Wd + m.l) / 2, y: Hd - 4, 'text-anchor': 'middle' }, svg).textContent = 'Tyre age (laps)';
  svgEl('text', { x: 12, y: Hd / 2, transform: `rotate(-90 12 ${Hd / 2})`, 'text-anchor': 'middle' }, svg).textContent = 'Lap time vs baseline';
  svgEl('line', { x1: m.l, x2: m.l, y1: m.t, y2: Hd - m.b, class: 'axis' }, svg);
  const models = {
    soft: l => -0.8 + 0.09 * l + (l > 16 ? 0.045 * (l - 16) ** 2 : 0),
    medium: l => -0.35 + 0.055 * l + (l > 27 ? 0.05 * (l - 27) ** 2 : 0),
    hard: l => 0.0 + 0.032 * l,
  };
  const lines = {};
  for (const [k, f] of Object.entries(models)) {
    let d = '';
    for (let l = 0; l <= laps; l += 0.5) {
      const v = f(l);
      if (v > yMax + 0.2) break;
      d += (d ? 'L' : 'M') + X(l).toFixed(1) + ' ' + Y(v).toFixed(1);
    }
    lines[k] = svgEl('path', { d, fill: 'none', stroke: cols[k], 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    const len = lines[k].getTotalLength ? lines[k].getTotalLength() : 1000;
    lines[k].style.strokeDasharray = len;
    lines[k].style.strokeDashoffset = len;
  }
  svgEl('text', { x: X(19.2), y: Y(1.7), fill: '#e8202a', style: 'fill:#ff6b6b;font-weight:700' }, svg).textContent = '"the cliff"';
  const legend = svgEl('g', {}, svg);
  ['soft', 'medium', 'hard'].forEach((k, i) => {
    svgEl('rect', { x: m.l + 14 + i * 90, y: m.t + 4, width: 14, height: 4, fill: cols[k], rx: 2 }, legend);
    svgEl('text', { x: m.l + 34 + i * 90, y: m.t + 10 }, legend).textContent = k[0].toUpperCase() + k.slice(1);
  });
  let drawn = false;
  function highlightLine(c) {
    for (const [k, p] of Object.entries(lines)) p.style.opacity = (c in lines) ? (k === c ? 1 : 0.28) : 0.7;
  }
  set('soft');
  return {
    draw() {
      if (drawn) return;
      drawn = true;
      Object.values(lines).forEach((p, i) => gsap.to(p.style, { strokeDashoffset: 0, duration: 1.6, delay: i * 0.25, ease: 'power2.out' }));
    },
  };
}

// ---------------------------------------------------------------- 8. pit + strategy
export function initPit(stage) {
  const car = $('#laneCar');
  const lane = $('#pitLane');
  const phaseEl = $('#pitPhase');
  const clockEl = $('#pitClock');
  let fallbackTl = null;
  const W = () => lane.clientWidth;
  const run = () => {
    clockEl.textContent = '0.0';
    gsap.killTweensOf(car);
    gsap.set(car, { x: -90 });
    const cb = {
      phase: p => {
        phaseEl.textContent = p;
        if (p === 'Pit entry') gsap.to(car, { x: W() / 2 - 38, duration: 2.2, ease: 'power2.out' });
        if (p === 'Go go go!') gsap.to(car, { x: W() + 20, duration: 2.0, ease: 'power2.in' });
      },
      clock: t => { clockEl.textContent = t.toFixed(1); },
      done: () => { setTimeout(() => { if (visible.pit) run(); }, 1800); },
    };
    if (stage && stage.current) stage.playPit(cb);
    else {
      // 2D-only fallback sequence
      if (fallbackTl) fallbackTl.kill();
      const c = { t: 0 };
      fallbackTl = gsap.timeline({ onComplete: cb.done })
        .call(() => cb.phase('Pit entry')).to({}, { duration: 2.2 })
        .call(() => cb.phase('Stationary')).to(c, { t: 2.35, duration: 2.35, ease: 'none', onUpdate: () => cb.clock(c.t) })
        .call(() => cb.phase('Go go go!')).to({}, { duration: 2 }).call(() => cb.phase('Pit exit'));
    }
  };
  $('#pitReplay').addEventListener('click', run);
  initStrategy();
  return { start: run, stop() { stage && stage.stopPit(); if (fallbackTl) fallbackTl.kill(); } };
}

function simulate(kind) {
  // returns effective gap (s) of car B behind car A for laps 0..10, plus pit laps
  const P = kind === 'under'
    ? { deg: 0.12, cold: 0.5, traffic: 0, pitA: 5, pitB: 3 }
    : { deg: 0.03, cold: 0.6, traffic: 3.5, pitA: 3, pitB: 6 };
  const LOSS = 20;
  let tA = 0, tB = 1.0, ageA = 15, ageB = 15, stopA = 0, stopB = 0;
  const out = [{ lap: 0, gap: 1.0 }];
  for (let lap = 1; lap <= 10; lap++) {
    const lapT = (age, fresh, first, traffic) => 90 + P.deg * age + (first ? P.cold + traffic : 0);
    let a = lapT(ageA, stopA, ageA === 0 && stopA, P.traffic), b = lapT(ageB, stopB, ageB === 0 && stopB, 0);
    if (lap === P.pitA) { a += LOSS; stopA = 1; ageA = -1; }
    if (lap === P.pitB) { b += LOSS; stopB = 1; ageB = -1; }
    tA += a; tB += b; ageA++; ageB++;
    const eff = (tB - tA) - LOSS * (stopB - stopA);
    out.push({ lap, gap: eff, pitA: lap === P.pitA, pitB: lap === P.pitB });
  }
  return out;
}

function initStrategy() {
  const svg = $('#stratChart');
  const cap = $('#stratCaption');
  const W = 560, H = 240, m = { l: 46, r: 28, t: 20, b: 34 };
  const draw = kind => {
    svg.innerHTML = '';
    const data = simulate(kind);
    const lo = Math.min(-4, ...data.map(d => d.gap)), hi = Math.max(4, ...data.map(d => d.gap));
    const X = l => m.l + (l / 10) * (W - m.l - m.r);
    const Y = v => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
    svgEl('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: Y(0) - m.t, fill: 'rgba(47,212,255,.05)' }, svg);
    svgEl('rect', { x: m.l, y: Y(0), width: W - m.l - m.r, height: H - m.b - Y(0), fill: 'rgba(255,77,26,.06)' }, svg);
    svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), class: 'axis', 'stroke-dasharray': '4 4' }, svg);
    svgEl('text', { x: W - m.r - 4, y: m.t + 14, 'text-anchor': 'end' }, svg).textContent = 'A ahead';
    svgEl('text', { x: W - m.r - 4, y: H - m.b - 6, 'text-anchor': 'end' }, svg).textContent = 'B ahead';
    for (let l = 0; l <= 10; l += 2) svgEl('text', { x: X(l), y: H - m.b + 18, 'text-anchor': 'middle' }, svg).textContent = 'Lap ' + l;
    svgEl('text', { x: 12, y: (H) / 2, transform: `rotate(-90 12 ${H / 2})`, 'text-anchor': 'middle' }, svg).textContent = 'Effective gap (s)';
    let d = '';
    data.forEach((p, i) => { d += (i ? 'L' : 'M') + X(p.lap) + ' ' + Y(p.gap); });
    const path = svgEl('path', { d, fill: 'none', stroke: '#ffd21f', 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
    const len = path.getTotalLength ? path.getTotalLength() : 800;
    path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    gsap.to(path.style, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.out' });
    data.forEach(p => {
      if (p.pitA || p.pitB) {
        const c = p.pitA ? '#2fd4ff' : '#ff4d1a';
        svgEl('circle', { cx: X(p.lap), cy: Y(p.gap), r: 6, fill: c }, svg);
        svgEl('text', { x: X(p.lap), y: Y(p.gap) - 11, 'text-anchor': 'middle', style: `fill:${c};font-weight:700` }, svg).textContent = p.pitA ? 'A pits' : 'B pits';
      }
    });
    const end = data[data.length - 1].gap;
    cap.innerHTML = kind === 'under'
      ? `Car B pits first (lap 3). Its fresh tyres are ~1.8 s a lap faster than A's worn ones. When A stops on lap 5, B is already ahead by <b>${Math.abs(end).toFixed(1)} s</b>. <em>Undercut successful.</em>`
      : `Car A stops first (lap 3) but rejoins in traffic and loses time. B's old tyres are still strong, so B stays out until lap 6 and rejoins <b>${Math.abs(end).toFixed(1)} s</b> ahead. <em>Overcut successful.</em>`;
    // "effective gap" explanation
  };
  segGroup($('#stratWidget'), 'strat', draw);
  draw('under');
}

// ---------------------------------------------------------------- 9. flags
const FLAGS = [
  { id: 'green', name: 'Green', tint: '#35d07f', text: 'Track clear. The hazard has passed and normal racing can resume. Also shown at the start of practice sessions.',
    draw: (g, w, h) => { g.fillStyle = '#1fae4a'; g.fillRect(0, 0, w, h); } },
  { id: 'yellow', name: 'Yellow', tint: '#ffd21f', text: 'Danger ahead: slow down, no overtaking, and be ready to change direction. Something is on or near the track.',
    draw: (g, w, h) => { g.fillStyle = '#ffd21f'; g.fillRect(0, 0, w, h); } },
  { id: 'dyellow', name: 'Double yellow', tint: '#ffd21f', text: 'Two yellows waved together: slow down significantly, no overtaking, be prepared to stop. Marshals may be working on the track.',
    draw: (g, w, h) => { g.fillStyle = '#ffd21f'; g.fillRect(0, 0, w, h); g.fillStyle = '#10131b'; g.fillRect(w / 2 - 2, 0, 4, h); g.fillStyle = '#000'; g.font = `900 ${h * 0.35}px Titillium Web, sans-serif`; g.textAlign = 'center'; g.fillText('×2', w * 0.75, h * 0.62); } },
  { id: 'red', name: 'Red', tint: '#ff3b3b', text: 'Session stopped. All drivers slow down and return to the pit lane. Used for big crashes, barrier damage or severe weather.',
    draw: (g, w, h) => { g.fillStyle = '#e0141e'; g.fillRect(0, 0, w, h); } },
  { id: 'blue', name: 'Blue', tint: '#1f7ae0', text: 'A faster car is about to lap you. Let it pass at the first opportunity. Ignoring blue flags earns a penalty.',
    draw: (g, w, h) => { g.fillStyle = '#1f6fe0'; g.fillRect(0, 0, w, h); } },
  { id: 'white', name: 'White', tint: '#ffffff', text: 'Slow-moving vehicle ahead, such as a recovery truck, the medical car or a car driving slowly back to the pits.',
    draw: (g, w, h) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h); } },
  { id: 'slippery', name: 'Slippery surface', tint: '#ff7a1a', text: 'Red and yellow stripes: reduced grip ahead from oil, water or debris on the track.',
    draw: (g, w, h) => { const n = 6; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#e0141e' : '#ffd21f'; g.fillRect(i * w / n, 0, w / n + 1, h); } } },
  { id: 'meatball', name: 'Black & orange', tint: '#ff7a1a', text: 'Shown with a car number: that car has a mechanical problem (e.g. loose bodywork) and must pit to fix it.',
    draw: (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.3, 0, 7); g.fill(); } },
  { id: 'bw', name: 'Black & white', tint: '#bbbbbb', text: 'Diagonal halves, shown with a car number: a warning for unsportsmanlike behaviour, often repeated track-limits abuse. Next time it\'s a penalty.',
    draw: (g, w, h) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(0, h); g.fill(); } },
  { id: 'black', name: 'Black', tint: '#222222', text: 'Shown with a car number: that driver is disqualified and must return to the pits.',
    draw: (g, w, h) => { g.fillStyle = '#0d0d0f'; g.fillRect(0, 0, w, h); } },
  { id: 'cheq', name: 'Chequered', tint: '#ffffff', text: 'End of the session or race. After the leader takes it, every other car finishes when they next cross the line.',
    draw: (g, w, h) => { const s = h / 4; for (let y = 0; y < 4; y++) for (let x = 0; x < Math.ceil(w / s); x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#f2f2f2'; g.fillRect(x * s, y * s, s + 1, s + 1); } } },
];
export function initFlags(stage) {
  const grid = $('#flagGrid');
  const info = $('#flagInfo');
  const stageEl = $('#stage');
  const items = FLAGS.map(f => {
    const b = document.createElement('button');
    b.innerHTML = `<canvas width="150" height="100"></canvas><span>${f.name}</span>`;
    b.setAttribute('aria-label', f.name + ' flag');
    grid.appendChild(b);
    const src = document.createElement('canvas');
    src.width = 120; src.height = 80;
    const sg = src.getContext('2d');
    f.draw(sg, 120, 80);
    sg.strokeStyle = 'rgba(255,255,255,.28)'; sg.lineWidth = 2; sg.strokeRect(1, 1, 118, 78);   // edge so dark flags read
    b.addEventListener('click', () => select(f, b));
    return { f, b, cv: b.querySelector('canvas'), src };
  });
  const select = (f, b) => {
    $$('button', grid).forEach(x => x.classList.toggle('on', x === b));
    info.style.setProperty('--flag', f.tint);
    info.innerHTML = `<h4>${f.name} flag</h4><p>${f.text}</p>`;
    stageEl.style.setProperty('--tint', f.tint);
    stageEl.classList.add('tinted');
  };
  info.innerHTML = '<h4>Tap a flag</h4><p>Flags are waved at marshal posts; the same signals also appear on trackside LED panels and on the driver\'s steering-wheel display.</p>';
  // waving animation
  let t = 0;
  const draw = () => {
    for (const it of items) {
      const g = it.cv.getContext('2d');
      const w = 150, h = 100, pole = 6, fw = 132, fh = 84;
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#9aa0ad'; g.fillRect(2, 2, 3, h - 4);
      const slices = 44;
      for (let i = 0; i < slices; i++) {
        const u = i / slices;
        const amp = 5 * u;
        const off = Math.sin(u * 9 - t * 5) * amp;
        const shade = 0.82 + 0.18 * Math.cos(u * 9 - t * 5);
        g.globalAlpha = 1;
        g.drawImage(it.src, u * 120, 0, 120 / slices + 0.6, 80, pole + u * fw, 6 + off, fw / slices + 0.6, fh);
        g.globalAlpha = 1 - shade;
        g.fillStyle = '#000';
        g.fillRect(pole + u * fw, 6 + off, fw / slices + 0.6, fh);
      }
      g.globalAlpha = 1;
    }
  };
  const loop = () => {
    if (visible.flags) { t += 1 / 60; draw(); }
    requestAnimationFrame(loop);
  };
  draw();
  loop();
  return { clearTint() { stageEl.classList.remove('tinted'); } };
}

// ---------------------------------------------------------------- 10. cornering
export function initCornering(stage, hud) {
  const cv = $('#cornerCanvas');
  const g = cv.getContext('2d');
  const Wc = cv.width, Hc = cv.height;
  const PXM = 0.5;                                  // metres per pixel
  // centreline: straight up, 90° right-hander, straight right
  const ctr = [];
  for (let y = 420; y >= 200; y -= 5) ctr.push([120, y]);
  for (let a = Math.PI; a <= Math.PI * 1.5 + 1e-6; a += Math.PI / 60) ctr.push([260 + 140 * Math.cos(a), 200 + 140 * Math.sin(a)]);
  for (let x = 265; x <= 640; x += 5) ctr.push([x, 60]);
  const key = [[88, 440], [88, 330], [90, 262], [112, 186], [168, 122], [245, 86], [330, 62], [420, 36], [520, 30], [640, 30]];
  // Catmull-Rom racing line
  const line = [];
  for (let i = 0; i < key.length - 1; i++) {
    const p0 = key[Math.max(i - 1, 0)], p1 = key[i], p2 = key[i + 1], p3 = key[Math.min(i + 2, key.length - 1)];
    for (let k = 0; k < 30; k++) {
      const t = k / 30, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      line.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  line.push(key[key.length - 1]);
  // arc length, curvature, speed profile
  const n = line.length;
  const s = [0], kap = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]) * PXM);
  for (let i = 1; i < n - 1; i++) {
    const [ax, ay] = line[i - 1], [bx, by] = line[i], [cx, cy] = line[i + 1];
    const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    const d = Math.hypot(bx - ax, by - ay) * Math.hypot(cx - bx, cy - by) * Math.hypot(cx - ax, cy - ay);
    kap.push(d > 0 ? 2 * cross / d / PXM : 0);
  }
  kap.push(0);
  const ks = kap.map((_, i) => { let a = 0, c = 0; for (let j = -4; j <= 4; j++) { const q = kap[i + j]; if (q !== undefined) { a += q; c++; } } return a / c; });
  const G = 9.81, LAT = 3.6 * G, BRK = 5.0 * G, ACC = 1.1 * G, VMAX = 86;
  const v = ks.map(k => Math.min(VMAX, Math.sqrt(LAT / Math.max(Math.abs(k), 1e-4))));
  v[0] = 80;
  for (let i = 1; i < n; i++) v[i] = Math.min(v[i], Math.sqrt(v[i - 1] ** 2 + 2 * ACC * (s[i] - s[i - 1])));
  for (let i = n - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] ** 2 + 2 * BRK * (s[i + 1] - s[i])));
  const brk = v.map((vi, i) => i < n - 1 && v[i + 1] < vi - 0.05);
  const total = s[n - 1];
  let pos = 0, idx = 0, trail = [];
  const draw = (lat, lon) => {
    g.clearRect(0, 0, Wc, Hc);
    g.fillStyle = '#0d1a12'; g.fillRect(0, 0, Wc, Hc);                     // grass
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
    path(ctr); g.strokeStyle = '#3a3f4c'; g.lineWidth = 84; g.stroke();     // run-off edge
    path(ctr); g.strokeStyle = '#23262f'; g.lineWidth = 76; g.stroke();     // asphalt
    // kerbs on the apex
    g.save(); g.setLineDash([8, 8]);
    g.beginPath(); for (let a = Math.PI * 1.05; a <= Math.PI * 1.45; a += 0.02) g.lineTo(260 + 102 * Math.cos(a), 200 + 102 * Math.sin(a));
    g.strokeStyle = '#d6261c'; g.lineWidth = 6; g.stroke();
    g.lineDashOffset = 8; g.strokeStyle = '#eee'; g.stroke();
    g.restore();
    // braking zone
    g.lineWidth = 10; g.strokeStyle = 'rgba(255,59,59,.35)';
    g.beginPath(); let on = false;
    line.forEach(([x, y], i) => { if (brk[i]) { on ? g.lineTo(x, y) : g.moveTo(x, y); on = true; } else on = false; });
    g.stroke();
    // racing line
    g.setLineDash([10, 8]); path(line); g.strokeStyle = 'rgba(255,210,31,.85)'; g.lineWidth = 2.5; g.stroke(); g.setLineDash([]);
    // labels
    g.font = '700 12px Titillium Web, sans-serif'; g.fillStyle = '#ff8a8a'; g.fillText('◀ BRAKING ZONE', 166, 318);
    g.fillStyle = '#ffd21f'; g.fillText('TURN-IN', 104, 268); g.fillText('APEX', 186, 150); g.fillText('EXIT', 330, 90);
    g.fillStyle = '#8a92a6'; g.fillText('Racing line: outside → apex → outside', 300, 136);
    // car
    const [x, y] = line[idx];
    const [x2, y2] = line[Math.min(idx + 1, n - 1)];
    const ang = Math.atan2(y2 - y, x2 - x);
    trail.push([x, y]); if (trail.length > 26) trail.shift();
    g.strokeStyle = 'rgba(47,212,255,.5)'; g.lineWidth = 3; path(trail); g.stroke();
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = '#ff4d1a'; g.fillRect(-13, -4.5, 26, 9); g.fillStyle = '#fff'; g.fillRect(6, -2, 5, 4);
    g.fillStyle = '#111'; [[-9, -7], [-9, 5], [7, -7], [7, 5]].forEach(([a, b]) => g.fillRect(a, b, 6, 2.5));
    g.restore();
    // g-meter
    const cx = Wc - 70, cy = Hc - 70, R = 52;
    g.strokeStyle = '#2d3448'; g.lineWidth = 1;
    for (const r of [R * 0.4, R * 0.8]) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    g.fillStyle = '#8a92a6'; g.font = '10px JetBrains Mono, monospace'; g.fillText('2g', cx + R * 0.4 - 6, cy - 3); g.fillText('4g', cx + R * 0.8 - 6, cy - 3);
    const gx = cx + (lat / 5) * R, gy = cy - (lon / 5) * R;
    g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(gx, gy, 6, 0, 7); g.fill();
    g.fillStyle = '#cfd4df'; g.font = '700 11px Titillium Web, sans-serif'; g.fillText('G-FORCE', cx - 22, cy - R - 8);
  };
  let last = performance.now();
  const loop = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible.cornering) {
      pos += v[idx] * dt * 0.75;                  // 0.75x slow-motion
      if (pos > total) { pos = 0; trail = []; }
      while (idx < n - 1 && s[idx + 1] < pos) idx++;
      if (pos === 0) idx = 0;
      const i2 = Math.min(idx + 1, n - 1);
      const dv = (v[i2] - v[idx]) / Math.max(1e-3, (s[i2] - s[idx]) / v[idx]);
      const lon = Math.max(-2, -dv / G);         // braking positive
      const lat = v[idx] ** 2 * ks[idx] / G;      // + = pushed left on screen (right-hander)
      draw(lat, lon);
      const kmh = v[idx] * 3.6;
      $('#cSpeed').textContent = Math.round(kmh);
      $('#cG').textContent = Math.hypot(lat, lon).toFixed(1);
      $('#cPhase').textContent = lon > 0.6 ? 'Braking' : Math.abs(lat) > 2 ? (lon > 0.1 ? 'Turn-in' : 'Apex') : Math.abs(lat) > 0.4 ? 'Exit' : 'Full throttle';
      stage && stage.setGForce(-lat, lon);
      hud.g(kmh, lat, lon);
    }
    requestAnimationFrame(loop);
  };
  draw(0, 0);
  requestAnimationFrame(loop);
  initWake();
}

function initWake() {
  const cv = $('#wakeCanvas');
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const slider = $('#gap');
  const lerpTable = (tab, x) => {
    if (x <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const [x0, y0] = tab[i - 1], [x1, y1] = tab[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
    return tab[tab.length - 1][1];
  };
  const T21 = [[5, 55], [10, 47], [20, 35], [35, 16], [50, 6]];
  const T22 = [[5, 26], [10, 18], [20, 4], [35, 1], [50, 0]];
  const upd = () => {
    const gap = +slider.value;
    $('#gapVal').textContent = gap;
    const a = lerpTable(T21, gap), b = lerpTable(T22, gap), tow = 28 * Math.exp(-(gap - 5) / 18);
    $('#dl21').style.width = a + '%'; $('#dl21v').textContent = '−' + Math.round(a) + '%';
    $('#dl22').style.width = b + '%'; $('#dl22v').textContent = '−' + Math.round(b) + '%';
    $('#tow').style.width = tow / 0.3 + '%'; $('#towv').textContent = '−' + Math.round(tow) + '% drag';
  };
  slider.addEventListener('input', upd);
  upd();
  const parts = Array.from({ length: 220 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
  const carShape = (x, col) => {
    g.save(); g.translate(x, H - 40);
    g.fillStyle = '#111'; g.beginPath(); g.arc(18, 0, 13, 0, 7); g.arc(92, 0, 13, 0, 7); g.fill();
    g.fillStyle = col;
    g.beginPath(); g.moveTo(0, -24); g.lineTo(10, -30); g.lineTo(38, -28); g.lineTo(52, -40); g.lineTo(66, -40); g.lineTo(78, -24); g.lineTo(118, -18); g.lineTo(122, -8); g.lineTo(0, -8); g.closePath(); g.fill();
    g.fillRect(-2, -46, 6, 30); g.fillRect(-10, -48, 22, 5);
    g.restore();
  };
  let last = performance.now();
  const loop = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible.cornering) {
      const gap = +slider.value;
      const leadX = W - 140, followX = leadX - 130 - gap * 5.6;
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#0a0c12'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1b1e27'; g.fillRect(0, H - 27, W, 27);
      for (let x = (now / 6) % 40; x < W; x += 40) { g.fillStyle = '#2b2f3b'; g.fillRect(W - x, H - 16, 18, 3); }
      // wake particles
      for (const p of parts) {
        if (p.life <= 0) { p.x = leadX - 4 + Math.random() * 10; p.y = H - 60 - Math.random() * 30; p.vx = -(120 + Math.random() * 80); p.vy = -(10 + Math.random() * 30); p.life = 1 + Math.random() * 1.5; }
        p.x += p.vx * dt; p.y += p.vy * dt + Math.sin(now / 90 + p.x / 20) * 0.6; p.vy *= 0.98; p.life -= dt;
        const a = Math.max(0, p.life) * 0.5;
        g.fillStyle = `rgba(255,120,70,${a})`; g.fillRect(p.x, p.y, 3, 3);
      }
      carShape(leadX, '#2fd4ff');
      const inWake = gap < 30;
      carShape(followX, inWake ? '#ff4d1a' : '#b8bfcc');
      g.fillStyle = '#cfd4df'; g.font = '700 12px Titillium Web, sans-serif';
      g.fillText('LEADER', leadX + 32, 22); g.fillText('FOLLOWER', followX + 26, 22);
      g.fillStyle = '#ff8a6a'; g.fillText('turbulent wake ("dirty air")', Math.max(12, followX + 130), H - 96);
      g.strokeStyle = '#8a92a6'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(followX + 122, H - 70); g.lineTo(leadX, H - 70); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#8a92a6'; g.fillText(gap + ' m', (followX + 122 + leadX) / 2 - 10, H - 76);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
