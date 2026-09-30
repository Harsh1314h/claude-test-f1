// ============================================================================
// stage.js: the three.js viewer. Loads the Blender-built cars, handles
// car swapping (dissolve "morph"), camera presets per chapter and all 3D modes:
// exploded anatomy, airflow, DRS, x-ray power unit, tyres, pit stop, halo, g-force.
// ============================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Airflow } from './airflow.js';
import { EnergyFlow } from './energy.js';
import { PARTS, EXPLODE, LABELS_ANATOMY, LABELS_PU, CARS } from './data.js';

const gsap = window.gsap;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Camera presets (three.js coords: +x = nose, +y = up, +z = car's right side)
const CAMS = {
  hero:      { pos: V(5.4, 1.55, 5.0),  target: V(0, 0.38, 0), auto: 0.55 },
  intro:     { pos: V(-5.0, 2.3, 5.4),  target: V(0, 0.35, 0), auto: 0.4 },
  weekend:   { pos: V(6.6, 0.75, 1.9),  target: V(0, 0.45, 0), auto: 0 },
  anatomy:   { pos: V(6.4, 4.9, 7.3),   target: V(-0.1, 0.85, 0), auto: 0 },
  aero:      { pos: V(0.2, 1.8, 7.6),   target: V(0, 0.5, 0), auto: 0 },
  drs:       { pos: V(-5.6, 1.35, 3.1), target: V(-1.6, 0.7, 0), auto: 0 },
  power:     { pos: V(0.9, 2.3, 3.4),   target: V(-0.8, 0.35, 0), auto: 0 },
  tyres:     { pos: V(3.4, 0.9, -2.9),  target: V(1.6, 0.36, -0.7), auto: 0 },
  pit:       { pos: V(3.6, 2.6, 7.0),   target: V(0, 0.35, 0), auto: 0 },
  flags:     { pos: V(2.2, 1.9, 2.4),   target: V(0.1, 0.72, 0), auto: 0 },
  cornering: { pos: V(4.6, 5.2, 4.6),   target: V(0, 0.3, 0), auto: 0 },
  eras:      { pos: V(5.4, 1.8, 5.2),   target: V(0, 0.4, 0), auto: 0.5 },
  quiz:      { pos: V(-5.4, 1.7, -4.6), target: V(0, 0.4, 0), auto: 0.5 },
};

// Per-scene behaviour flags
const SCENES = {
  hero: {}, intro: {}, weekend: {}, quiz: {}, eras: {},
  anatomy: { lock: 'modern', explode: true, labels: 'anatomy', pick: true },
  aero: { airflow: true, arrows: true },
  drs: { lock: 'modern', drive: true, drs: true },
  power: { lock: 'modern', xray: true, energy: true, labels: 'pu' },
  tyres: { spin: 0.6 },
  pit: { pit: true },
  flags: { halo: true },
  cornering: { drive: true, gforce: true },
};

export class Stage {
  constructor(container, canvas, labelsEl) {
    this.container = container;
    this.canvas = canvas;
    this.labelsEl = labelsEl;
    this.cars = {};              // id -> car record
    this.loading = {};
    this.current = null;         // car record
    this.sceneName = 'hero';
    this.flags = {};
    this.listeners = {};
    this.clock = new THREE.Clock();
    this.wheelSpin = 0;          // rad/s for wheels when driving
    this.roadSpeed = 0;
    this.compound = 'soft';
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { (this.listeners[ev] || []).forEach(f => f(...a)); }

  // ------------------------------------------------------------------ init
  init() {
    const q = new URLSearchParams(location.search).get('q');
    this.lowQ = q === 'low';
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !this.lowQ, alpha: true, powerPreference: 'high-performance' });
    this.pixelRatio = this.lowQ ? 0.6 : Math.min(window.devicePixelRatio || 1, 1.75);
    r.setPixelRatio(this.pixelRatio);
    this.perf = { frames: 0, time: 0, level: this.lowQ ? 3 : 0, adaptive: q !== 'high' };
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = !this.lowQ;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.85;
    scene.fog = new THREE.Fog(0x0c0e14, 13, 32);

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 120);
    this.camera.position.copy(CAMS.hero.pos);

    const hemi = new THREE.HemisphereLight(0xc8d4ff, 0x1a1410, 0.5);
    scene.add(hemi);
    const key = this.key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -4.5; key.shadow.camera.right = 4.5;
    key.shadow.camera.top = 4.5; key.shadow.camera.bottom = -4.5;
    key.shadow.camera.near = 1; key.shadow.camera.far = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fb6ff, 1.1);
    rim.position.set(-5, 3, -4);
    scene.add(rim);
    const warm = new THREE.PointLight(0xff5a2a, 6, 9, 2);
    warm.position.set(-3, 0.6, 2.5);
    scene.add(warm);

    // studio floor with radial fade
    const fade = document.createElement('canvas');
    fade.width = fade.height = 256;
    const g = fade.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, '#fff'); grad.addColorStop(0.55, '#aaa'); grad.addColorStop(1, '#000');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x141722, roughness: 0.42, metalness: 0.3, transparent: true, alphaMap: new THREE.CanvasTexture(fade), depthWrite: false });
    const floor = this.floor = new THREE.Mesh(new THREE.CircleGeometry(11, 72), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.55 }));
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0.001;
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);

    // road (for driving scenes)
    this.road = this.makeRoad();
    scene.add(this.road);

    // rig holds the current car so it can be driven / jacked independently
    this.rig = new THREE.Group();
    scene.add(this.rig);

    this.controls = new OrbitControls(this.camera, this.canvas);
    Object.assign(this.controls, {
      enableDamping: true, dampingFactor: 0.08, enablePan: false, enableZoom: false,
      minPolarAngle: 0.15, maxPolarAngle: Math.PI / 2 - 0.04, rotateSpeed: 0.7, autoRotateSpeed: 0.55,
    });
    this.controls.target.copy(CAMS.hero.target);
    this.canvas.style.touchAction = 'pan-y';  // keep vertical page scrolling on touch devices
    this.controls.addEventListener('start', () => { this.userOrbiting = true; if (this.camTween) this.camTween.kill(); });
    this.controls.addEventListener('end', () => { this.userOrbiting = false; });

    // helpers
    this.airflow = new Airflow(this.renderer);
    this.rig.add(this.airflow.object);
    this.energy = new EnergyFlow();
    this.rig.add(this.energy.object);
    this.arrows = this.makeArrows();
    this.rig.add(this.arrows);
    this.gArrow = new THREE.ArrowHelper(V(0, 0, 1), V(0, 1.35, 0), 1, 0xffd21f, 0.3, 0.22);
    this.gArrow.visible = false;
    this.rig.add(this.gArrow);

    // picking
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    let downAt = null;
    this.canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
    this.canvas.addEventListener('pointerup', e => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
      downAt = null;
      if (moved < 6) this.pick(e);
    });

    new ResizeObserver(() => this.resize()).observe(this.container);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  makeRoad() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#1b1d24'; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 2600; i++) {           // asphalt grain
      const v = 20 + Math.random() * 26;
      g.fillStyle = `rgb(${v},${v},${v + 4})`;
      g.fillRect(Math.random() * 512, Math.random() * 256, 1.5, 1.5);
    }
    g.fillStyle = '#d9dce3'; g.fillRect(0, 22, 512, 5); g.fillRect(0, 229, 512, 5);   // edge lines
    for (let x = 0; x < 512; x += 64) {        // kerbs
      g.fillStyle = '#c8261b'; g.fillRect(x, 0, 32, 20); g.fillRect(x + 32, 236, 32, 20);
      g.fillStyle = '#e8e8e8'; g.fillRect(x + 32, 0, 32, 20); g.fillRect(x, 236, 32, 20);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(6, 1);
    tex.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0, transparent: true, opacity: 0 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(48, 5.2), m);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.002;
    road.receiveShadow = true;
    road.visible = false;
    return road;
  }

  makeArrows() {
    const grp = new THREE.Group();
    grp.visible = false;
    const mk = (dir, origin, color) => {
      const a = new THREE.ArrowHelper(dir, origin, 1, color, 0.22, 0.16);
      a.line.material.linewidth = 2;
      grp.add(a);
      return a;
    };
    this.dfArrows = [mk(V(0, -1, 0), V(2.55, 1.35, 0), 0x2fd4ff), mk(V(0, -1, 0), V(-0.2, 1.75, 0), 0x2fd4ff),
                     mk(V(0, -1, 0), V(-2.45, 1.85, 0), 0x2fd4ff)];
    this.dragArrow = mk(V(-1, 0, 0), V(-2.9, 0.55, 0), 0xff4d1a);
    return grp;
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // wider FOV on narrow / portrait screens so the whole car fits
    this.camera.fov = w / h < 1 ? 48 : w / h < 1.3 ? 40 : 32;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ loading
  async loadCar(id, onProgress) {
    if (this.cars[id]) return this.cars[id];
    if (this.loading[id]) return this.loading[id];
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('assets/draco/');
    loader.setDRACOLoader(draco);
    this.loading[id] = new Promise((resolve, reject) => {
      loader.load(`assets/models/${id}.glb`, gltf => resolve(this.prepareCar(id, gltf.scene)),
        e => onProgress && e.total && onProgress(e.loaded / e.total), reject);
    });
    try {
      return await this.loading[id];
    } catch (err) {
      delete this.loading[id];
      throw err;
    }
  }

  prepareCar(id, root) {
    root.name = 'car_' + id;
    const uniforms = {
      uReveal: { value: 0 }, uMinX: { value: -3 }, uMaxX: { value: 3 },
      uInvRoot: { value: new THREE.Matrix4() }, uGlow: { value: new THREE.Color(0xff6a2a) },
    };
    const parts = {};
    const meshes = [];
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        // clone so each part can be highlighted / ghosted independently
        const src = o.material;
        const m = src.clone();
        m.userData.srcName = src.name;
        m.userData.base = { color: m.color.clone(), emissive: m.emissive.clone(), emissiveIntensity: m.emissiveIntensity, opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite };
        m.side = THREE.FrontSide;
        if (/Visor|Windscreen|Glass/i.test(src.name)) m.side = THREE.DoubleSide;
        if (/Windscreen/i.test(src.name)) { m.transparent = true; m.opacity = 0.45; m.userData.base.opacity = 0.45; m.userData.base.transparent = true; }
        if (m.envMapIntensity !== undefined) m.envMapIntensity = /Paint/.test(src.name) ? 1.0 : 0.95;
        patchDissolve(m, uniforms);
        o.material = m;
        meshes.push(o);
      }
    });
    // part = top-level named nodes under the scene root
    root.children.forEach(n => {
      const list = [];
      n.traverse(o => o.isMesh && list.push(o));
      parts[n.name] = { node: n, meshes: list, base: n.position.clone(), baseRot: n.rotation.clone() };
      list.forEach(ms => { ms.userData.part = n.name; });
    });
    const box = new THREE.Box3().setFromObject(root);
    uniforms.uMinX.value = box.min.x - 0.05;
    uniforms.uMaxX.value = box.max.x + 0.05;
    // part centres in car space (for labels / energy flow)
    for (const [name, p] of Object.entries(parts)) {
      const b = new THREE.Box3().setFromObject(p.node);
      p.center = b.getCenter(new THREE.Vector3());
      p.size = b.getSize(new THREE.Vector3());
    }
    const car = { id, root, parts, meshes, uniforms, box, stripeMats: meshes.map(m => m.material).filter(m => m.userData.srcName === 'TyreStripe') };
    this.cars[id] = car;
    return car;
  }

  // ------------------------------------------------------------------ car swap
  async showCar(id, { instant = false } = {}) {
    if (this.current && this.current.id === id && !this.swapping) return;
    this.wantCar = id;
    let car;
    try {
      car = await this.loadCar(id);
    } catch (e) {
      console.warn('Model failed to load', id, e);
      this.emit('modelerror', id);
      return;
    }
    if (this.wantCar !== id) return;           // user clicked another car meanwhile
    const old = this.current;
    if (old === car) return;
    this.current = car;
    this.emit('car', id);
    // reset any per-car state on the old car
    if (old) {
      this.resetParts(old);
      if (instant) { this.rig.remove(old.root); }
      else {
        this.swapping = true;
        gsap.to(old.uniforms.uReveal, { value: 0, duration: 0.8, ease: 'power2.in', onComplete: () => { this.rig.remove(old.root); this.swapping = false; } });
      }
    }
    this.rig.add(car.root);
    car.uniforms.uReveal.value = 0;
    gsap.to(car.uniforms.uReveal, { value: 1, duration: instant ? 0.01 : 1.25, delay: instant || !old ? 0 : 0.45, ease: 'power2.out' });
    this.airflow.setCar(car, CARS[id]);   // height-field is built lazily when airflow is first shown
    this.applySceneToCar();
  }

  resetParts(car) {
    for (const p of Object.values(car.parts)) {
      gsap.killTweensOf(p.node.position);
      gsap.killTweensOf(p.node.rotation);
      p.node.position.copy(p.base);
      p.node.rotation.copy(p.baseRot);
      p.node.visible = true;
    }
    for (const m of car.meshes) restoreMat(m.material);
  }

  // ------------------------------------------------------------------ scenes
  setScene(name) {
    if (!SCENES[name]) return;
    const prev = this.sceneName;
    this.sceneName = name;
    this.flags = SCENES[name];
    const cam = CAMS[name];
    this.flyTo(cam.pos, cam.target);
    this.controls.autoRotate = !!cam.auto && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.controls.autoRotateSpeed = cam.auto || 0.5;
    if (this.flags.lock && (!this.current || this.current.id !== this.flags.lock)) {
      this.showCar(this.flags.lock);
    } else {
      this.applySceneToCar();
    }
    this.emit('scene', name, prev);
  }

  flyTo(pos, target, duration = 1.6) {
    if (this.camTween) this.camTween.kill();
    // presets are framed for a ~1.5:1 stage; pull back on narrower stages so the car fits
    const hfov = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * this.camera.aspect;
    const k = Math.max(1, 0.86 / hfov);
    pos = target.clone().add(pos.clone().sub(target).multiplyScalar(k));
    const c = this.camera.position, t = this.controls.target;
    const from = { cx: c.x, cy: c.y, cz: c.z, tx: t.x, ty: t.y, tz: t.z };
    this.camTween = gsap.to(from, {
      cx: pos.x, cy: pos.y, cz: pos.z, tx: target.x, ty: target.y, tz: target.z, duration, ease: 'power3.inOut',
      onUpdate: () => { c.set(from.cx, from.cy, from.cz); t.set(from.tx, from.ty, from.tz); },
    });
  }

  applySceneToCar() {
    const car = this.current;
    const f = this.flags;
    if (!car) return;
    // exploded view
    for (const [name, p] of Object.entries(car.parts)) {
      const off = f.explode && this.exploded !== false ? EXPLODE[name] : null;
      const target = off ? p.base.clone().add(V(...off)) : p.base;
      gsap.to(p.node.position, { x: target.x, y: target.y, z: target.z, duration: 1.3, ease: 'power3.inOut', overwrite: true });
    }
    // lift the whole car when exploded so the floor clears the ground
    gsap.to(car.root.position, { y: f.explode && this.exploded !== false ? 0.55 : 0, duration: 1.3, ease: 'power3.inOut', overwrite: true });
    // x-ray (power unit)
    this.setXray(!!f.xray);
    // airflow
    this.airflow.setVisible(!!f.airflow);
    this.arrows.visible = !!f.arrows;
    // energy flow
    this.energy.setActive(!!f.energy && car.id === 'modern', car);
    // driving / road
    const drive = !!f.drive;
    this.road.visible = true;
    gsap.to(this.road.material, { opacity: drive ? 1 : 0, duration: 0.8, onComplete: () => { this.road.visible = drive; } });
    gsap.to(this.floor.material, { opacity: drive ? 0 : 1, duration: 0.8 });
    this.roadSpeed = drive ? 1 : 0;
    this.wheelSpin = drive ? 1 : (f.spin || 0);
    // DRS: default closed when entering/leaving
    if (!f.drs) this.setDRS(false, true);
    // halo highlight
    this.highlight(f.halo ? 'Halo' : null, 0x2fd4ff);
    // g-force arrow
    this.gArrow.visible = !!f.gforce;
    if (!f.gforce) gsap.to(this.rig.rotation, { x: 0, z: 0, duration: 0.6 });
    // pit
    if (!f.pit) this.stopPit();
    // stripe colour
    this.setCompound(this.compound, true);
    this.emit('labels', f.labels || null);
  }

  setExploded(on) {
    this.exploded = on;
    this.applySceneToCar();
  }

  // ------------------------------------------------------------------ materials
  setXray(on) {
    const car = this.current;
    if (!car) return;
    this.xray = on;
    for (const m of car.meshes) {
      const pu = PARTS[m.userData.part]?.pu;
      const mat = m.material;
      gsap.killTweensOf(mat, 'opacity');   // a stale "restore" tween must not flip transparency back
      if (on && !pu) {
        mat.transparent = true;
        mat.depthWrite = false;
        gsap.to(mat, { opacity: 0.16, duration: 0.8 });
        m.castShadow = false;
      } else {
        gsap.to(mat, { opacity: mat.userData.base.opacity, duration: 0.6, onComplete: () => { mat.transparent = mat.userData.base.transparent; mat.depthWrite = mat.userData.base.depthWrite; mat.needsUpdate = true; } });
        m.castShadow = true;
      }
      mat.needsUpdate = true;
    }
  }

  highlight(partName, color = 0xff4d1a) {
    const car = this.current;
    if (!car) return;
    if (this.hlTween) { this.hlTween.kill(); this.hlTween = null; }
    for (const m of car.meshes) {
      const b = m.material.userData.base;
      m.material.emissive.copy(b.emissive);
      m.material.emissiveIntensity = b.emissiveIntensity;
    }
    this.hlPart = partName;
    if (!partName || !car.parts[partName]) return;
    const mats = car.parts[partName].meshes.map(m => m.material);
    const col = new THREE.Color(color);
    const s = { k: 0 };
    this.hlTween = gsap.to(s, {
      k: 1, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut',
      onUpdate: () => mats.forEach(m => { m.emissive.copy(col); m.emissiveIntensity = 0.25 + s.k * 0.9; }),
    });
  }

  setCompound(c, instant = false) {
    this.compound = c;
    const col = new THREE.Color({ soft: 0xe8202a, medium: 0xffd21f, hard: 0xf2f2f2, inter: 0x35b44a, wet: 0x1f7ae0 }[c] || 0xe8202a);
    for (const car of Object.values(this.cars)) {
      for (const m of car.stripeMats) {
        if (instant) m.color.copy(col);
        else gsap.to(m.color, { r: col.r, g: col.g, b: col.b, duration: 0.5 });
      }
    }
  }

  // ------------------------------------------------------------------ DRS
  setDRS(open, instant = false) {
    const car = this.current;
    this.drsOpen = open;
    if (!car) return;
    const flap = car.parts.RearWing_Flap;
    if (!flap) return;
    const angle = open ? CARS[car.id].drsAngle : 0;
    gsap.to(flap.node.rotation, { z: flap.baseRot.z + angle, duration: instant ? 0 : 0.35, ease: open ? 'back.out(2)' : 'power2.in', overwrite: true });
  }

  // ------------------------------------------------------------------ aero
  setAero(speed, wing) {
    const level = { high: 1.35, mid: 1.0, low: 0.62 }[wing];
    const dragK = { high: 1.3, mid: 1.0, low: 0.7 }[wing];
    const q = (speed / 300) ** 2;
    this.dfArrows.forEach((a, i) => a.setLength(Math.max(0.05, q * [0.7, 1.1, 0.8][i] * level * (i === 2 ? level : 1)), 0.2, 0.14));
    this.dragArrow.setLength(Math.max(0.05, q * 1.2 * dragK), 0.2, 0.14);
    this.airflow.speed = 0.5 + speed / 250;
    this.airflow.wing = level;
  }

  // ------------------------------------------------------------------ g-force
  setGForce(lat, lon) {
    // lat > 0 means pushed towards car's right (+z); lon > 0 = braking (pushed forward)
    const v = V(lon, 0, lat);
    const len = v.length();
    if (len > 0.05) {
      this.gArrow.setDirection(v.clone().normalize());
      this.gArrow.setLength(0.3 + len * 0.38, 0.3, 0.22);
      this.gArrow.visible = true;
    }
    this.rig.rotation.x = -lat * 0.012;      // body roll
    this.rig.rotation.z = -lon * 0.008;      // pitch under braking
    this.roadSpeed = this.wheelSpin = 1;
  }

  // ------------------------------------------------------------------ pit stop
  playPit(cb = {}) {
    const car = this.current;
    if (!car) return;
    this.stopPit();
    const wheels = ['Tyre_FL', 'Tyre_FR', 'Tyre_RL', 'Tyre_RR'].map(n => car.parts[n]).filter(Boolean);
    const rig = this.rig;
    const clock = { t: 0 };
    const tl = this.pitTl = gsap.timeline({ onComplete: () => { cb.done && cb.done(); } });
    rig.position.set(-11, 0, 0);
    const phase = (name) => () => cb.phase && cb.phase(name);
    tl.call(phase('Pit entry'))
      .to(rig.position, { x: 0, duration: 2.2, ease: 'power2.out' })
      .call(phase('Stationary'))
      .to(clock, { t: 2.35, duration: 2.35, ease: 'none', onUpdate: () => cb.clock && cb.clock(clock.t) }, '<')
      .to(rig.position, { y: 0.06, duration: 0.22, ease: 'power2.out' }, '<')
      .call(phase('Wheels off'), null, '<0.25');
    wheels.forEach(w => {
      const side = Math.sign(w.base.z) || 1;
      tl.to(w.node.position, { z: w.base.z + side * 0.9, y: w.base.y - 0.05, duration: 0.45, ease: 'power2.in' }, '<0.02');
    });
    tl.call(() => { const next = { soft: 'medium', medium: 'hard', hard: 'soft', inter: 'wet', wet: 'inter' }[this.compound]; this.setCompound(next, true); cb.compound && cb.compound(next); phase('New tyres on')(); }, null, '>0.05');
    wheels.forEach(w => {
      tl.to(w.node.position, { z: w.base.z, y: w.base.y, duration: 0.5, ease: 'power2.out' }, '<0.02');
    });
    tl.to(rig.position, { y: 0, duration: 0.18, ease: 'power2.in' }, '>0.1')
      .call(phase('Go go go!'))
      .to(rig.position, { x: 13, duration: 2.0, ease: 'power2.in' }, '>0.05')
      .call(phase('Pit exit'))
      .set(rig.position, { x: -11 })
      .to(rig.position, { x: 0, duration: 1.0, ease: 'power2.out' });
    this.pitRunning = true;
  }

  stopPit() {
    if (this.pitTl) { this.pitTl.kill(); this.pitTl = null; }
    if (this.pitRunning) {
      this.pitRunning = false;
      gsap.to(this.rig.position, { x: 0, y: 0, duration: 0.5 });
      if (this.current) for (const n of ['Tyre_FL', 'Tyre_FR', 'Tyre_RL', 'Tyre_RR']) {
        const p = this.current.parts[n];
        if (p) gsap.to(p.node.position, { x: p.base.x, y: p.base.y, z: p.base.z, duration: 0.4 });
      }
    }
  }

  // ------------------------------------------------------------------ picking
  pick(e) {
    if (!this.flags.pick || !this.current) return;
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.current.meshes, false);
    for (const h of hits) {
      const name = h.object.userData.part;
      if (PARTS[name]) { this.selectPart(name); return; }
    }
  }

  selectPart(name) {
    this.highlight(name);
    this.emit('part', name, PARTS[name]?.key);
  }

  // world-space position of a part centre (used for labels)
  partScreen(name, out) {
    const car = this.current;
    const p = car?.parts[name];
    if (!p) return null;
    const w = p.center.clone().add(p.node.position).sub(p.base);
    car.root.localToWorld(w);
    w.project(this.camera);
    if (w.z > 1) return null;
    out.x = (w.x * 0.5 + 0.5) * this.container.clientWidth;
    out.y = (-w.y * 0.5 + 0.5) * this.container.clientHeight;
    return out;
  }

  // ------------------------------------------------------------------ loop
  // Adaptive quality: if frames are slow for ~2 s, step down resolution, then shadows.
  adapt(rawDt) {
    const p = this.perf;
    if (!p.adaptive || p.level >= 3 || document.hidden) return;
    p.frames++; p.time += rawDt;
    if (p.time < 2) return;
    const avg = p.time / p.frames;
    p.frames = 0; p.time = 0;
    if (avg > 1 / 45) {
      p.level++;
      if (p.level === 1) this.pixelRatio = Math.min(this.pixelRatio, 1.25);
      if (p.level === 2) this.pixelRatio = 1;
      if (p.level === 3) { this.pixelRatio = 0.8; this.renderer.shadowMap.enabled = false; this.key.castShadow = false; }
      this.renderer.setPixelRatio(this.pixelRatio);
      this.resize();
    }
  }

  tick() {
    const rawDt = this.clock.getDelta();
    this.adapt(rawDt);
    const dt = Math.min(rawDt, 0.05);
    const t = this.clock.elapsedTime;
    this.controls.update();
    const car = this.current;
    if (car) {
      car.root.updateMatrixWorld();
      for (const c of Object.values(this.cars)) c.uniforms.uInvRoot.value.copy(c.root.matrixWorld).invert();
      // wheel rotation
      let spin = this.wheelSpin * 9;
      if (this.pitRunning) {
        const dx = this.rig.position.x - (this.lastRigX ?? this.rig.position.x);
        spin = dt > 0 ? dx / 0.36 / dt : 0;
      }
      this.lastRigX = this.rig.position.x;
      if (spin) for (const n of ['Tyre_FL', 'Tyre_FR', 'Tyre_RL', 'Tyre_RR']) {
        const p = car.parts[n];
        if (p) p.node.rotation.z -= spin * dt;
      }
    }
    if (this.road.visible) this.road.material.map.offset.x += dt * 1.6 * this.roadSpeed;
    if (this.airflow.visible) this.airflow.update(dt, t);
    if (this.energy.active) this.energy.update(dt, t);
    this.emit('frame', dt);
    this.renderer.render(this.scene, this.camera);
  }
}

// ---------------------------------------------------------------------------
function restoreMat(m) {
  const b = m.userData.base;
  m.opacity = b.opacity; m.transparent = b.transparent; m.depthWrite = b.depthWrite;
  m.emissive.copy(b.emissive); m.emissiveIntensity = b.emissiveIntensity;
  m.needsUpdate = true;
}

// Noise-based wipe along the car's length with a glowing edge.
function patchDissolve(mat, u) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uInvRoot;\nvarying vec3 vCarPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCarPos = (uInvRoot * modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uReveal; uniform float uMinX; uniform float uMaxX; uniform vec3 uGlow;
varying vec3 vCarPos;
float dsHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float dsNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dsHash(i), dsHash(i + vec3(1,0,0)), f.x), mix(dsHash(i + vec3(0,1,0)), dsHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(dsHash(i + vec3(0,0,1)), dsHash(i + vec3(1,0,1)), f.x), mix(dsHash(i + vec3(0,1,1)), dsHash(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float dsT = (uMaxX - vCarPos.x) / (uMaxX - uMinX);
float dsN = dsNoise(vCarPos * 9.0) * 0.18;
float dsD = (uReveal * 1.4 - 0.2) - (dsT + dsN);
if (dsD < 0.0) discard;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
if (uReveal < 0.999) { float e = 1.0 - smoothstep(0.0, 0.04, dsD); gl_FragColor.rgb += uGlow * e * 2.5; }`);
  };
  mat.customProgramCacheKey = () => 'dissolve';
}
