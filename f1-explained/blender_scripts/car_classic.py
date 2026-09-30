"""FE-55: a fictional 1950s front-engined Grand Prix car.
Cigar body, oval grille, wire wheels with treaded tyres, upright driving position,
side exhaust, small wraparound screen, headrest fairing."""
import math
from f1lib import *

FA, RA = 1.15, -1.15
R_T = 0.34
R_RIM = 0.205
TF, TR = 0.62, 0.61
WF, WR = 0.14, 0.165


def build(tex_dir):
    M = {
        "paint": paint("Paint_Main", (0.42, 0.015, 0.02), metallic=0.25, rough=0.28),
        "accent": paint("Paint_Accent", (0.93, 0.92, 0.86), metallic=0.0, rough=0.35),
        "chrome": plain("Chrome", (0.85, 0.86, 0.88), metallic=1.0, rough=0.08),
        "steel": plain("Steel", (0.45, 0.46, 0.48), metallic=1.0, rough=0.35),
        "exhaust": plain("Exhaust", (0.30, 0.25, 0.22), metallic=1.0, rough=0.45),
        "rubber": plain("Rubber", (0.022, 0.022, 0.024), rough=0.85),
        "dark": plain("Matte_Black", (0.012, 0.012, 0.014), rough=0.7),
        "leather": plain("Leather", (0.18, 0.08, 0.04), rough=0.6),
        "wood": plain("Wood", (0.35, 0.18, 0.08), rough=0.4, coat=0.8),
        "screen": glass("Windscreen", (0.08, 0.09, 0.1), rough=0.02),
        "helmet": paint("Helmet", (0.85, 0.82, 0.72), metallic=0.0, rough=0.35),
        "shirt": plain("Race_Suit", (0.55, 0.65, 0.78), rough=0.85),
        "brake": plain("Brake_Drum", (0.25, 0.25, 0.26), metallic=0.8, rough=0.5),
    }
    parts = []
    body = loft("Chassis", [
        (2.00, 0, 0.42, 0.15, 0.10, 0.12, 2.0, 1.0),
        (1.85, 0, 0.44, 0.24, 0.16, 0.20, 2.2, 0.95),
        (1.50, 0, 0.47, 0.29, 0.20, 0.24, 2.4, 0.9),
        (1.00, 0, 0.50, 0.31, 0.22, 0.28, 2.5, 0.88),
        (0.40, 0, 0.52, 0.33, 0.24, 0.30, 2.6, 0.85),
        (-0.10, 0, 0.52, 0.34, 0.24, 0.31, 2.6, 0.85),
        (-0.60, 0, 0.50, 0.34, 0.22, 0.30, 2.6, 0.85),
        (-1.10, 0, 0.47, 0.30, 0.20, 0.27, 2.5, 0.85),
        (-1.60, 0, 0.44, 0.20, 0.15, 0.20, 2.3, 0.9),
        (-2.00, 0, 0.43, 0.06, 0.05, 0.06, 2.0, 1.0),
    ], M["paint"], ring=48, samples=6)
    cutter = loft("cut", [(0.02, 0, 0.90, 0.12, 0.20, 0.22, 2.4, 1), (-0.15, 0, 0.90, 0.22, 0.20, 0.24, 3.0, 1),
                          (-0.65, 0, 0.90, 0.22, 0.20, 0.24, 3.0, 1), (-0.85, 0, 0.90, 0.14, 0.20, 0.24, 2.4, 1)],
                  None, ring=32, samples=4)
    boolean_diff(body, cutter)
    set_smooth(body, 50)
    parts.append(body)
    parts.append(loft("Cockpit_Interior", [(0.0, 0, 0.55, 0.12, 0.1, 0.2, 2.4, 1), (-0.4, 0, 0.55, 0.21, 0.1, 0.2, 3.0, 1),
                                           (-0.83, 0, 0.55, 0.13, 0.1, 0.2, 2.4, 1)], M["leather"], ring=24, samples=3))
    parts.append(loft("Headrest", [(-0.78, 0, 0.74, 0.06, 0.06, 0.02, 2, 1), (-1.00, 0, 0.74, 0.09, 0.08, 0.02, 2.2, 1),
                                   (-1.50, 0, 0.66, 0.06, 0.05, 0.02, 2.2, 1), (-1.85, 0, 0.54, 0.02, 0.02, 0.01, 2, 1)],
                      M["paint"], ring=24, samples=4))
    # grille
    parts.append(loft("Grille", [(2.012, 0, 0.42, 0.12, 0.08, 0.09, 2.0, 1), (1.99, 0, 0.42, 0.12, 0.08, 0.09, 2.0, 1)],
                      M["dark"], ring=32, samples=1))
    parts.append(sweep("Grille_Surround", [(2.01, 0.13 * math.cos(a), 0.42 + 0.095 * math.sin(a))
                                           for a in [2 * math.pi * i / 24 for i in range(25)]], M["chrome"], 0.012, k=8,
                       samples=1, cap=False))
    for k in range(7):
        y = -0.09 + k * 0.03
        parts.append(box(f"GrilleBar{k}", (2.0, y, 0.42), (0.01, 0.006, 0.16), M["chrome"]))
    # roundels on the flanks + nose band
    for s, tag in ((1, "L"), (-1, "R")):
        parts.append(cylinder(f"Roundel_{tag}", (-0.30, s * 0.325, 0.50), 0.13, 0.03, M["accent"], axis='Y', segs=40))
    parts.append(loft("Nose_Band", [(1.80, 0, 0.44, 0.262, 0.182, 0.222, 2.2, 0.95), (1.70, 0, 0.45, 0.283, 0.198, 0.238, 2.3, 0.93)],
                      M["accent"], ring=48, samples=1))
    # windscreen
    verts, faces = [], []
    for i in range(11):
        a = math.pi * i / 10
        y = math.cos(a) * 0.22
        x = 0.02 - 0.12 * math.sin(a) ** 0.5 * 0 - 0.06 * (1 - math.sin(a))
        verts += [(x, y, 0.72), (x - 0.04, y * 1.05, 0.85)]
    for i in range(10):
        faces.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    parts.append(mesh_object("Windscreen", verts, faces, M["screen"], 60))
    # steering wheel (wood rim)
    sw = sweep("SteeringWheel_Rim", [(-0.05, 0.19 * math.cos(a), 0.80 + 0.19 * math.sin(a) * 0.95)
                                     for a in [2 * math.pi * i / 24 for i in range(25)]], M["wood"], 0.012, k=8, samples=1, cap=False)
    sw.rotation_euler = (0, 0, 0)
    spk = [tube(f"sws{k}", (-0.05, 0, 0.80), (-0.05, 0.18 * math.cos(a), 0.80 + 0.18 * math.sin(a)), M["steel"], 0.006, 0.006)
           for k, a in enumerate((0.3, math.pi - 0.3, -math.pi / 2))]
    parts.append(join([sw] + spk + [tube("column", (-0.05, 0, 0.80), (0.35, 0, 0.62), M["steel"], 0.012, 0.012)], "SteeringWheel"))
    # side exhaust (right side)
    exh = []
    for k in range(4):
        exh.append(sweep(f"exh{k}", [(1.25 - k * 0.14, -0.25, 0.52), (1.20 - k * 0.14, -0.36, 0.45),
                                     (0.70 - k * 0.05, -0.38, 0.34), (0.40, -0.37, 0.30)], M["exhaust"], 0.02, k=8, samples=3))
    exh.append(sweep("tailpipe", [(0.42, -0.37, 0.30), (-0.60, -0.37, 0.28), (-1.60, -0.35, 0.26), (-1.95, -0.33, 0.26)],
                     M["exhaust"], 0.045, k=14, samples=3))
    parts.append(join(exh, "Exhaust"))
    parts.append(cylinder("FuelCap", (-1.30, 0, 0.66), 0.06, 0.03, M["chrome"], axis='Z', segs=24))
    parts.append(box("Mirror", (0.05, 0.28, 0.80), (0.02, 0.10, 0.05), M["chrome"], bevel=0.008))
    # driver: upright seating, open-face helmet
    helmet = sphere("Helmet_Shell", (-0.42, 0, 1.06), 0.13, M["helmet"], scale=(1.05, 0.95, 0.9))
    face = sphere("Face", (-0.36, 0, 1.00), 0.10, M["helmet"], scale=(0.9, 0.85, 1.0))   # cloth face mask
    goggles = loft("Goggles", [(-0.26, 0, 1.03, 0.10, 0.025, 0.025, 2, 1), (-0.30, 0, 1.03, 0.12, 0.028, 0.028, 2, 1)],
                   M["chrome"], ring=16, samples=1)
    torso = loft("Torso", [(-0.30, 0, 0.72, 0.15, 0.1, 0.1, 2, 1), (-0.42, 0, 0.84, 0.21, 0.08, 0.1, 2, 1),
                           (-0.50, 0, 0.84, 0.19, 0.06, 0.1, 2, 1)], M["shirt"], ring=16, samples=3)
    arms = [tube(f"arm{s}", (-0.40, s * 0.20, 0.86), (-0.10, s * 0.15, 0.80), M["shirt"], 0.04, 0.04) for s in (1, -1)]
    parts.append(join([helmet, face, goggles, torso] + arms, "Driver"))

    def wheel(name, hub, W, side):
        tyre = build_tyre(name + "_tyre", R_T, R_RIM + 0.004, W, [M["rubber"], M["rubber"]], grooves=5, groove_depth=0.005,
                          shoulder=0.035, sidewall_bulge=1.08, tread_rounding=0.012)
        rim = lathe(name + "_rim", rim_profile(R_RIM, W, depth=0.02, lip=0.01), M["steel"], segs=48)
        hubc = cylinder(name + "_hub", (0, 0.0, 0), 0.06, W * 0.9, M["chrome"], axis='Y', segs=24)
        spin = cylinder(name + "_spinner", (0, W / 2 + 0.03, 0), 0.03, 0.06, M["chrome"], axis='Y', segs=6)
        ears = [tube(f"{name}_ear{k}", (0, W / 2 + 0.05, 0), (0.08 * math.cos(a), W / 2 + 0.05, 0.08 * math.sin(a)),
                     M["chrome"], 0.01, 0.006) for k, a in enumerate((0.4, 0.4 + math.pi))]
        sp = wire_spokes(name + "_spokes", 0.055, R_RIM - 0.01, W * 0.42, W * 0.25, M["chrome"], n=48)
        drum = cylinder(name + "_drum", (0, -W * 0.2, 0), 0.16, 0.08, M["brake"], axis='Y', segs=32)
        return finalize_wheel([tyre, rim, hubc, spin, sp, drum] + ears, name, hub, side)

    for tag, x, y, W, side in (("FL", FA, TF, WF, 1), ("FR", FA, -TF, WF, -1), ("RL", RA, TR, WR, 1), ("RR", RA, -TR, WR, -1)):
        parts.append(wheel(f"Tyre_{tag}", (x, y, R_T), W, side))

    sus = []
    for s in (1, -1):
        uy = s * (TF - WF / 2 - 0.03)
        sus += [tube("a", (1.30, s * 0.22, 0.28), (FA, uy, 0.28), M["dark"], 0.014, 0.014),
                tube("b", (1.00, s * 0.24, 0.28), (FA, uy, 0.28), M["dark"], 0.014, 0.014),
                tube("c", (1.28, s * 0.22, 0.46), (FA, uy, 0.42), M["dark"], 0.014, 0.014),
                tube("d", (1.02, s * 0.24, 0.46), (FA, uy, 0.42), M["dark"], 0.014, 0.014),
                cylinder(f"kingpin{s}", (FA, uy, 0.35), 0.03, 0.18, M["steel"], axis='Z', segs=12)]
    parts.append(join(sus, "Suspension_Front"))
    sus = []
    for s in (1, -1):
        uy = s * (TR - WR / 2 - 0.03)
        sus += [tube("a", (-0.70, s * 0.28, 0.30), (RA, uy, 0.32), M["dark"], 0.015, 0.015),
                tube("b", (-0.75, s * 0.28, 0.44), (RA, uy, 0.40), M["dark"], 0.015, 0.015)]
    sus.append(sweep("deDion", [(RA - 0.02, -0.52, R_T), (RA - 0.10, -0.2, R_T - 0.05), (RA - 0.10, 0.2, R_T - 0.05),
                                (RA - 0.02, 0.52, R_T)], M["steel"], 0.03, k=10, samples=3))
    parts.append(join(sus, "Suspension_Rear"))
    return parts
