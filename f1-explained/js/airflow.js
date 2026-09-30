// ============================================================================
// airflow.js: stylised airflow streamlines around the car.
// A top-down height field of the car is rendered once per car (GPU, 256x64),
// then particle trails follow it: over the bodywork, through the underfloor
// tunnels and up out of the diffuser, with upwash + turbulence behind the wing.
// Visual teaching aid, not CFD.
// ============================================================================
import * as THREE from 'three';

const XR = 3.6, ZR = 1.25, W = 256, H = 72;

export class Airflow {
  constructor(renderer) {
    this.renderer = renderer;
    this.N = 340;
    this.K = 14;
    this.speed = 1.5;
    this.wing = 1;
    this.visible = false;
    this.heights = new Float32Array(W * H);
    const segs = this.N * (this.K - 1);
    this.pos = new Float32Array(segs * 2 * 3);
    this.col = new Float32Array(segs * 2 * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.object = new THREE.LineSegments(g, m);
    this.object.frustumCulled = false;
    this.object.visible = false;
    this.object.renderOrder = 5;
    this.p = [];
    for (let i = 0; i < this.N; i++) this.p.push({ trail: new Float32Array(this.K * 3) });
    this.prof = { floorFront: 1.3, diffStart: -1.5, diffEnd: -2.3, diffH: 0.25, rwX: -2.7, rwHalf: 0.5, rwY: 0.95 };
    for (const p of this.p) this.spawn(p, true);
  }

  setVisible(v) {
    this.visible = v;
    this.object.visible = v;
    if (v && this.pending) { const { car, prof } = this.pending; this.pending = null; this.build(car, prof); }
  }

  setCar(car, prof) {
    this.prof = prof;
    this.pending = { car, prof };
    if (this.visible) this.setVisible(true);
  }

  // render a height map of the car from above (GPU), read it back once
  build(car, prof) {
    this.prof = prof;
    const root = car.root;
    const parent = root.parent;
    const saved = { pos: root.position.clone(), rot: root.rotation.clone() };
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    // sample the assembled car even if it is currently exploded / mid-animation
    const partPos = Object.values(car.parts).map(p => [p, p.node.position.clone(), p.node.visible]);
    for (const [p] of partPos) { p.node.position.copy(p.base); p.node.visible = true; }
    const tmp = new THREE.Scene();
    tmp.add(root);
    tmp.overrideMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      vertexShader: 'varying float vH; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vH = w.y; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'varying float vH; void main(){ gl_FragColor = vec4(clamp(vH / 1.6, 0.0, 1.0), 0.0, 0.0, 1.0); }',
    });
    const cam = new THREE.OrthographicCamera(-XR, XR, ZR, -ZR, 0.1, 10);
    cam.position.set(0, 5, 0);
    cam.up.set(0, 0, -1);
    cam.lookAt(0, 0, 0);
    const rt = new THREE.WebGLRenderTarget(W, H);
    const r = this.renderer;
    const oldTarget = r.getRenderTarget();
    const oldColor = r.getClearColor(new THREE.Color());
    const oldAlpha = r.getClearAlpha();
    const oldShadow = r.shadowMap.enabled;
    r.shadowMap.enabled = false;
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(tmp, cam);
    const px = new Uint8Array(W * H * 4);
    r.readRenderTargetPixels(rt, 0, 0, W, H, px);
    r.setRenderTarget(oldTarget);
    r.setClearColor(oldColor, oldAlpha);
    r.shadowMap.enabled = oldShadow;
    rt.dispose();
    tmp.overrideMaterial.dispose();
    // row 0 = bottom of image = +z
    for (let row = 0; row < H; row++) for (let c = 0; c < W; c++) this.heights[row * W + c] = px[(row * W + c) * 4] / 255 * 1.6;
    for (const [p, pos, vis] of partPos) { p.node.position.copy(pos); p.node.visible = vis; }
    if (parent) parent.add(root);
    root.position.copy(saved.pos);
    root.rotation.copy(saved.rot);
    for (const p of this.p) this.spawn(p, true);
  }

  heightAt(x, z) {
    const c = Math.floor((x + XR) / (2 * XR) * W);
    const row = Math.floor((ZR - z) / (2 * ZR) * H);
    if (c < 0 || c >= W || row < 0 || row >= H) return 0;
    return this.heights[row * W + c];
  }

  spawn(p, scatter = false) {
    p.x = scatter ? -4.8 + Math.random() * 9.6 : 4.2 + Math.random() * 0.8;
    p.z = (Math.random() * 2 - 1) * 1.15;
    const r = Math.random();
    p.under = r < 0.22 && Math.abs(p.z) < 0.7 && this.prof.diffH > 0;
    p.y0 = p.under ? 0.022 + Math.random() * 0.012 : 0.06 + Math.pow(Math.random(), 1.3) * 1.1;
    p.y = p.y0;
    p.sf = 0.3;
    p.phase = Math.random() * 6.28;
    for (let k = 0; k < this.K; k++) { p.trail[k * 3] = p.x; p.trail[k * 3 + 1] = p.y; p.trail[k * 3 + 2] = p.z; }
  }

  update(dt, t) {
    const pr = this.prof;
    const U = 2.2 * this.speed;
    const K = this.K;
    let vi = 0;
    for (const p of this.p) {
      let sf = 0.3, mul = 1;
      if (p.under) {
        if (p.x < pr.floorFront && p.x > pr.diffStart) { p.y = p.y0; sf = 1; mul = 1.9; }
        else if (p.x <= pr.diffStart) {
          const u = (pr.diffStart - p.x) / (pr.diffStart - pr.diffEnd);
          p.y = p.y0 + pr.diffH * Math.pow(Math.min(u, 1), 1.7) + Math.max(0, u - 1) * 0.35;
          sf = Math.max(0.35, 1 - u * 0.45); mul = 1.9 - Math.min(u, 1) * 0.8;
          p.z += Math.sin(t * 5 + p.phase) * dt * 0.08 * Math.max(0, u - 1);
        } else { sf = 0.45; mul = 1.2; }
      } else {
        const h = Math.max(this.heightAt(p.x - 0.1, p.z), this.heightAt(p.x - 0.28, p.z) * 0.96, this.heightAt(p.x - 0.5, p.z) * 0.9);
        const target = h > 0.01 ? Math.max(p.y0, h + 0.05) : p.y0;
        if (p.y < target) { p.y += (target - p.y) * Math.min(1, dt * 14); sf = 0.5 + Math.min(0.5, (target - p.y0) * 1.2); mul = 1 + sf * 0.5; }
        else {
          let rest = p.y0;
          // upwash + turbulent wake behind the rear wing
          if (pr.rwHalf > 0 && p.x < pr.rwX + 0.35 && Math.abs(p.z) < pr.rwHalf + 0.15 && p.y > 0.25) {
            const d = pr.rwX + 0.35 - p.x;
            rest = p.y0 + Math.min(1.2, d * 0.55) * this.wing;
            p.z += Math.sin(t * 6 + p.phase + p.x * 3) * dt * 0.35 * Math.min(1, d);
            p.y += Math.cos(t * 7 + p.phase) * dt * 0.25 * Math.min(1, d);
            sf = 0.35 + 0.25 * Math.sin(t * 9 + p.phase);
          } else if (p.x < -2.2 && Math.abs(p.z) < 1.0) {
            p.z += Math.sin(t * 4 + p.phase) * dt * 0.12;           // general wake
          }
          p.y += (rest - p.y) * Math.min(1, dt * (rest > p.y ? 2.2 : 0.7));
          sf = Math.max(sf, 0.3);
        }
      }
      p.sf += (sf - p.sf) * Math.min(1, dt * 6);
      p.x -= U * mul * dt;
      if (p.x < -5.2) this.spawn(p);
      // shift trail
      const tr = p.trail;
      tr.copyWithin(3, 0, (K - 1) * 3);
      tr[0] = p.x; tr[1] = p.y; tr[2] = p.z;
      // colour: slow = deep blue, fast = cyan/white
      const c = p.sf;
      const cr = 0.08 + 0.9 * c * c, cg = 0.35 + 0.6 * c, cb = 1.0;
      for (let k = 0; k < K - 1; k++) {
        const f = (1 - k / (K - 1)) * 0.7;
        const f2 = (1 - (k + 1) / (K - 1)) * 0.7;
        const o = vi * 6;
        this.pos[o] = tr[k * 3]; this.pos[o + 1] = tr[k * 3 + 1]; this.pos[o + 2] = tr[k * 3 + 2];
        this.pos[o + 3] = tr[k * 3 + 3]; this.pos[o + 4] = tr[k * 3 + 4]; this.pos[o + 5] = tr[k * 3 + 5];
        this.col[o] = cr * f; this.col[o + 1] = cg * f; this.col[o + 2] = cb * f;
        this.col[o + 3] = cr * f2; this.col[o + 4] = cg * f2; this.col[o + 5] = cb * f2;
        vi++;
      }
    }
    const g = this.object.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
  }
}
