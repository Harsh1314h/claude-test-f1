# Formula 1, Explained in 3D

An interactive, single-page guide to the core concepts of Formula 1, built around four
procedurally modelled 3D cars (made in Blender with Python) and a three.js viewer.

**12 chapters:** championship & points · race weekend & qualifying · car anatomy (exploded, clickable) ·
aerodynamics (airflow particles, downforce vs drag) · DRS · hybrid power unit (x-ray energy flow) ·
tyres & degradation · pit stops & strategy (undercut / overcut / Safety Car) · flags & safety (halo) ·
cornering physics (racing line, g-forces, slipstream vs dirty air) · eras (car morphs 1950s → 2020s) · quiz.

All cars, team names and colours are fictional. No real logos, liveries or sponsors are used.

---

## Run it locally

The site is plain static files (no build step). ES modules and the 3D models need to be served over
HTTP, so opening `index.html` directly from disk (`file://`) will not work.

```bash
cd f1-explained
python3 -m http.server 8000
# open http://localhost:8000
```

Any static server works (`npx serve`, `php -S localhost:8000`, etc.).

Optional URL flags:

| Flag | Effect |
|---|---|
| `?q=low` | Force low quality (no shadows, lower resolution) for weak devices |
| `?q=high` | Disable the automatic quality downgrade |

By default the viewer measures frame time and steps resolution/shadows down automatically if the
device can't keep up.

## Deploy

It's a static folder, so upload it as-is:

- **Netlify:** drag the `f1-explained` folder onto <https://app.netlify.com/drop>, or `netlify deploy --dir=f1-explained --prod`.
- **GitHub Pages:** push the folder contents to a repo (or a `docs/` folder), then *Settings → Pages → Deploy from branch*. Keep the `.nojekyll` file in place.
- **Vercel:** `vercel deploy f1-explained` (framework preset: "Other", no build command, output directory = the folder).
- **Any web host / S3 / Cloudflare Pages:** upload the folder; make sure `.wasm` is served as `application/wasm` (all the above do this by default).

Everything, including three.js, GSAP, the Draco decoder and fonts, is bundled locally. The site needs no
CDN or internet access at runtime.

## Folder layout

```
index.html              page + all chapter copy
css/style.css           design system, layout, responsive rules
js/main.js              boot, loader, scroll-driven chapter switching, nav, labels, HUD
js/stage.js             three.js viewer: loading, dissolve car-morph shader, camera presets, modes
js/airflow.js           airflow streamlines (GPU height-field of the car + particle trails)
js/energy.js            power-unit energy-flow animation
js/widgets.js           2D interactives: points, qualifying, charts, pit lane, flags, cornering, wake
js/quiz.js              the 12-question quiz
js/data.js              part descriptions, exploded-view offsets, per-car parameters
js/vendor/              three.js r169 (+ addons), GSAP 3.12 + ScrollTrigger
assets/models/*.glb     Draco-compressed cars (modern, v10, wingcar, classic)
assets/models/raw/      uncompressed Blender exports
assets/img/previews/    Cycles hero render of each car (also the no-WebGL fallback)
assets/draco/           Draco WASM decoder
assets/fonts/           Titillium Web + JetBrains Mono (SIL Open Font License)
blender_scripts/        everything needed to regenerate the models
```

## Regenerating the 3D models

Requirements: Blender 4.x (tested with 4.0.2; Blender's Python needs `numpy` for the glTF exporter) and
Node.js for compression.

```bash
cd f1-explained/blender_scripts
blender -b -P build_cars.py -- all            # build + export + hero preview render for all 4 cars
blender -b -P build_cars.py -- modern --views # one car, plus side/rear/top/front check renders in _checks/
blender -b -P build_cars.py -- all --no-render
./compress_models.sh                           # Draco-compress raw/*.glb into assets/models/
```

| Script | Contents |
|---|---|
| `f1lib.py` | Geometry toolkit: superellipse lofts (bodywork), NACA-style airfoil sweeps (wings), lathes (tyres/rims), elliptical tubes (suspension), swept curves (halo, exhausts), PBR materials incl. a generated carbon-fibre weave, box UVs, glTF export, Cycles preview rig |
| `car_modern.py` | GE-22: 2022–25 ground-effect car with halo, Venturi floor + diffuser, DRS flap on its own pivot, and internal power-unit parts (ICE, turbo, MGU-H, MGU-K, battery, control electronics, fuel cell, gearbox, radiators) |
| `car_v10.py` | V10-04: mid-2000s car: raised nose, grooved tyres, bargeboards, tall rear wing |
| `car_wingcar.py` | WC-78: late-1970s wing car: inverted-wing sidepods, skirts, exposed V8 |
| `car_classic.py` | FE-55: 1950s front-engined car: wire wheels, treaded tyres, side exhaust |
| `build_cars.py` | Runs a builder, exports `.glb`, renders previews |

Each part is a separately named object (`FrontWing`, `RearWing`, `RearWing_Flap`, `Floor`, `Diffuser`,
`Halo`, `Sidepod_L`, `Tyre_FL`, `ERS_MGUK`, `PU_ICE`, …) so the website can highlight, explode and
animate it. Wheels have their origin at the hub (they spin) and the DRS flap at its trailing-edge pivot.

## Accuracy notes & assumptions

- Facts were checked against the FIA regulations as understood for the 2022–2026 period. Where a figure
  varies (pit-lane time loss, DRS speed gain, tyre degradation, downforce levels) the site says so or
  labels the chart *illustrative*.
- Qualifying knock-outs assume the 22-car grid of 2026 (6 cars out in Q1 and Q2).
- The dirty-air figures are interpolated from the FIA's published comparison for the 2022 rules
  (roughly 35% vs 4% downforce lost at 20 m; 47% vs 18% at 10 m).
- The DRS chapter animates the 2011–2025 system and explains its 2026 replacement (active aero).

## Third-party

- three.js r169 (MIT) · GSAP 3.12 + ScrollTrigger (GSAP standard "no charge" licence)
- Draco decoder (Apache-2.0) · Titillium Web & JetBrains Mono (SIL OFL 1.1)
- Formula 1 is a trademark of Formula One Licensing B.V. This is an independent educational project.
