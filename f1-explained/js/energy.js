// ============================================================================
// energy.js: animated energy flow between power-unit components (x-ray view).
// Coordinates are the component positions in the GE-22 model (three.js space).
// ============================================================================
import * as THREE from 'three';

const P = {
  FUEL: [-0.22, 0.42, 0], ICE: [-0.9, 0.3, 0], ICE_TOP: [-0.9, 0.46, 0.12], CRANK: [-0.62, 0.2, 0],
  TURB: [-1.40, 0.50, 0], MGUH: [-1.26, 0.51, 0], COMP: [-0.55, 0.56, 0], AIRBOX: [-0.22, 0.86, 0],
  MGUK: [-0.62, 0.17, -0.17], ES: [-0.2, 0.14, 0], CE: [-0.4, 0.2, 0.16],
  GEAR: [-1.7, 0.3, 0], RL: [-1.8, 0.36, -0.7], RR: [-1.8, 0.36, 0.7],
};
const COL = { fuel: 0xffb020, exh: 0xff4d1a, elec: 0x2fd4ff, mech: 0xb6ff5c, air: 0xdde8ff };

const v = a => new THREE.Vector3(...a);
const path = (...pts) => pts.map(p => (typeof p === 'string' ? v(P[p]) : v(p)));

const FLOWS = {
  fuel:      { pts: path('FUEL', [-0.55, 0.36, 0.05], 'ICE'), c: 'fuel' },
  air:       { pts: path('AIRBOX', [-0.35, 0.74, 0], 'COMP', [-0.72, 0.5, 0.05], 'ICE_TOP'), c: 'air' },
  exh:       { pts: path('ICE_TOP', [-1.05, 0.34, 0.2], [-1.3, 0.36, 0.12], 'TURB'), c: 'exh' },
  shaftH:    { pts: path('TURB', 'MGUH'), c: 'mech' },
  shaftC:    { pts: path('MGUH', [-0.9, 0.53, 0], 'COMP'), c: 'mech' },
  shaftTC:   { pts: path('TURB', [-0.97, 0.53, 0], 'COMP'), c: 'mech' },
  hToCE:     { pts: path('MGUH', [-1.0, 0.32, 0.22], 'CE'), c: 'elec' },
  ceToES:    { pts: path('CE', [-0.3, 0.14, 0.12], 'ES'), c: 'elec' },
  esToCE:    { pts: path('ES', [-0.3, 0.14, 0.12], 'CE'), c: 'elec' },
  ceToK:     { pts: path('CE', [-0.55, 0.14, 0.02], 'MGUK'), c: 'elec' },
  kToCE:     { pts: path('MGUK', [-0.55, 0.14, 0.02], 'CE'), c: 'elec' },
  kToCrank:  { pts: path('MGUK', [-0.72, 0.2, -0.08], 'CRANK'), c: 'mech' },
  crankToK:  { pts: path('CRANK', [-0.72, 0.2, -0.08], 'MGUK'), c: 'mech' },
  driveL:    { pts: path('CRANK', 'ICE', 'GEAR', [-1.8, 0.33, -0.3], 'RL'), c: 'mech' },
  driveR:    { pts: path('CRANK', 'ICE', 'GEAR', [-1.8, 0.33, 0.3], 'RR'), c: 'mech' },
  brakeL:    { pts: path('RL', [-1.8, 0.33, -0.3], 'GEAR', 'ICE', 'CRANK'), c: 'mech' },
  brakeR:    { pts: path('RR', [-1.8, 0.33, 0.3], 'GEAR', 'ICE', 'CRANK'), c: 'mech' },
};

export const MODES = {
  throttle: ['fuel', 'air', 'exh', 'shaftH', 'shaftC', 'hToCE', 'esToCE', 'ceToK', 'kToCrank', 'driveL', 'driveR'],
  brake:    ['brakeL', 'brakeR', 'crankToK', 'kToCE', 'ceToES'],
  mguh:     ['air', 'exh', 'shaftH', 'hToCE', 'ceToES', 'fuel'],
  '2026':   ['fuel', 'air', 'exh', 'shaftTC', 'esToCE', 'ceToK', 'kToCrank', 'driveL', 'driveR'],
};

export class EnergyFlow {
  constructor() {
    this.object = new THREE.Group();
    this.object.visible = false;
    this.active = false;
    this.mode = 'throttle';
    this.MAX = 900;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.MAX * 3);
    this.col = new Float32Array(this.MAX * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const c = sprite.getContext('2d');
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    this.points = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.085, map: new THREE.CanvasTexture(sprite), vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, sizeAttenuation: true, fog: false,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.object.add(this.points);
    this.lines = new THREE.Group();
    this.object.add(this.lines);
    this.flows = [];
  }

  setActive(on) {
    this.active = on;
    this.object.visible = on;
    if (on) this.setMode(this.mode);
  }

  setMode(mode) {
    this.mode = mode;
    this.flows = [];
    this.lines.clear();
    const boost = mode === '2026' ? 1.8 : 1;
    for (const key of MODES[mode]) {
      const f = FLOWS[key];
      const curve = new THREE.CatmullRomCurve3(f.pts, false, 'centripetal');
      const len = curve.getLength();
      const color = new THREE.Color(COL[f.c]);
      const dens = f.c === 'elec' ? 26 * boost : 22;
      this.flows.push({ curve, len, color, n: Math.max(4, Math.round(len * dens)), speed: f.c === 'elec' ? 1.1 * boost : 0.8 });
      const lg = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
      const lm = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35, depthTest: false, blending: THREE.AdditiveBlending, fog: false });
      const line = new THREE.Line(lg, lm);
      line.renderOrder = 9;
      this.lines.add(line);
    }
  }

  update(dt, t) {
    let i = 0;
    const tmp = new THREE.Vector3();
    for (const f of this.flows) {
      for (let k = 0; k < f.n && i < this.MAX; k++, i++) {
        const u = ((k / f.n) + t * f.speed / f.len) % 1;
        f.curve.getPointAt(u, tmp);
        this.pos[i * 3] = tmp.x; this.pos[i * 3 + 1] = tmp.y; this.pos[i * 3 + 2] = tmp.z;
        const b = 0.55 + 0.45 * Math.sin(u * Math.PI);
        this.col[i * 3] = f.color.r * b; this.col[i * 3 + 1] = f.color.g * b; this.col[i * 3 + 2] = f.color.b * b;
      }
    }
    for (let j = i; j < this.MAX; j++) { this.pos[j * 3 + 1] = -100; }
    this.points.geometry.setDrawRange(0, i);
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
