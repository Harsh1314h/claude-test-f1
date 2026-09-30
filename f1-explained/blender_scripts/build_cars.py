"""
Build, export and preview-render the F1 cars.

Usage (from this folder):
    blender -b -P build_cars.py -- all
    blender -b -P build_cars.py -- modern v10 --no-render

Outputs:
    ../assets/models/raw/<car>.glb     (uncompressed, then Draco-compressed by compress_models.sh)
    ../assets/img/previews/<car>_hero.jpg  (+ blender_scripts/_checks/*.png with --views)
"""
import sys
import os
import importlib
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import f1lib  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, ".."))
RAW = os.path.join(ROOT, "assets", "models", "raw")
PREV = os.path.join(ROOT, "assets", "img", "previews")
CHECKS = os.path.join(HERE, "_checks")          # extra check views (not shipped)
TEX = os.path.join(HERE, "_tex")
for d in (RAW, PREV, TEX, CHECKS):
    os.makedirs(d, exist_ok=True)

CARS = {
    # id: (module, length for camera framing)
    "modern": ("car_modern", 5.8),
    "v10": ("car_v10", 4.8),
    "wingcar": ("car_wingcar", 4.5),
    "classic": ("car_classic", 4.1),
}

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["all"]
render = "--no-render" not in args
views = "--views" in args
wanted = [a for a in args if not a.startswith("--")]
if not wanted or "all" in wanted:
    wanted = list(CARS)

for car_id in wanted:
    mod_name, length = CARS[car_id]
    t0 = time.time()
    f1lib.reset_scene()
    f1lib._carbon_img = None
    mod = importlib.import_module(mod_name)
    importlib.reload(mod)
    parts = mod.build(TEX)
    parts = [p for p in parts if p is not None and p.name in bpy.data.objects]
    for p in parts:
        f1lib.box_uv(p, scale=5.0)
    tris = f1lib.tri_count(parts)
    names = sorted(p.name for p in parts)
    out = os.path.join(RAW, f"{car_id}.glb")
    f1lib.export_glb(out, parts)
    size = os.path.getsize(out) / 1e6
    print(f"[build] {car_id}: {len(parts)} objects, {tris} tris, {size:.2f} MB raw -> {out}")
    print(f"[build] parts: {', '.join(names)}")
    if render:
        cam = f1lib.setup_preview_scene(length)
        L = length
        f1lib.render_view(cam, os.path.join(PREV, f"{car_id}_hero.jpg"), (L * 0.95, -L * 0.95, L * 0.32),
                          target=(0.1, 0, 0.32), lens=55)
        if views:
            f1lib.render_view(cam, os.path.join(CHECKS, f"{car_id}_side.png"), (0, -L * 1.6, 0.5), target=(0, 0, 0.4),
                              lens=50, res=(1000, 420), samples=24)
            f1lib.render_view(cam, os.path.join(CHECKS, f"{car_id}_rear.png"), (-L * 0.9, L * 0.7, L * 0.35),
                              target=(-0.3, 0, 0.35), lens=50, res=(1000, 560), samples=24)
            f1lib.render_view(cam, os.path.join(CHECKS, f"{car_id}_top.png"), (0, -0.01, L * 1.6), target=(0, 0, 0),
                              lens=50, res=(1000, 560), samples=16)
            f1lib.render_view(cam, os.path.join(CHECKS, f"{car_id}_front.png"), (L * 1.4, 0, 0.5), target=(0, 0, 0.45),
                              lens=50, res=(1000, 520), samples=16)
        f1lib.cleanup_preview_scene()
    print(f"[build] {car_id} done in {time.time() - t0:.1f}s")
