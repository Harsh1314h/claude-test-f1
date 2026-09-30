"""WC-78: a fictional late-1970s ground-effect 'wing car'.
Slim monocoque, full-length sidepods shaped like inverted wings with sliding skirts,
nose-mounted front wings, exposed V8 and gearbox, big rear slicks, wraparound screen."""
import math
from f1lib import *

FA, RA = 1.35, -1.35
TF, TR = 0.72, 0.73
RF, RR = 0.30, 0.33
WF, WR = 0.28, 0.45
R_RIM = 0.168


def build(tex_dir):
    M = {
        "paint": paint("Paint_Main", (0.02, 0.06, 0.26), metallic=0.2, rough=0.3),
        "accent": paint("Paint_Accent", (0.92, 0.9, 0.84), metallic=0.0, rough=0.3),
        "pin": paint("Paint_Pinstripe", (0.9, 0.55, 0.05), metallic=0.6, rough=0.25),
        "alu": plain("Aluminium", (0.6, 0.61, 0.63), metallic=1.0, rough=0.35),
        "rubber": plain("Rubber", (0.018, 0.018, 0.02), rough=0.82),
        "rim": plain("Rim_Metal", (0.72, 0.62, 0.35), metallic=1.0, rough=0.35),
        "dark": plain("Matte_Black", (0.012, 0.012, 0.014), rough=0.7),
        "engine": plain("Engine_Black", (0.05, 0.05, 0.055), metallic=0.6, rough=0.45),
        "exhaust": plain("Exhaust", (0.35, 0.3, 0.28), metallic=1.0, rough=0.5),
        "screen": glass("Windscreen", (0.05, 0.06, 0.07), rough=0.02),
        "helmet": paint("Helmet", (0.9, 0.9, 0.9), metallic=0.0, rough=0.2),
        "visor": glass("Visor"),
        "suit": plain("Race_Suit", (0.85, 0.85, 0.8), rough=0.8),
        "brake": plain("Brake_Steel", (0.3, 0.3, 0.3), metallic=1.0, rough=0.5),
    }
    parts = []
    chassis = loft("Chassis", [
        (2.18, 0, 0.215, 0.07, 0.040, 0.060, 2.4, 1.0),
        (1.95, 0, 0.245, 0.16, 0.070, 0.100, 3.0, 0.9),
        (1.50, 0, 0.300, 0.20, 0.110, 0.180, 3.2, 0.8),
        (1.00, 0, 0.340, 0.22, 0.150, 0.250, 3.4, 0.75),
        (0.50, 0, 0.360, 0.26, 0.200, 0.280, 3.6, 0.72),
        (0.00, 0, 0.370, 0.27, 0.210, 0.290, 3.6, 0.70),
        (-0.35, 0, 0.380, 0.26, 0.220, 0.300, 3.2, 0.70),
    ], M["paint"], ring=48, samples=6)
    cutter = loft("cut", [(0.56, 0, 0.75, 0.10, 0.20, 0.19, 2.4, 1), (0.40, 0, 0.75, 0.17, 0.20, 0.20, 3.0, 1),
                          (0.00, 0, 0.75, 0.19, 0.20, 0.20, 3.4, 1), (-0.22, 0, 0.75, 0.14, 0.20, 0.20, 3.0, 1)],
                  None, ring=32, samples=4)
    boolean_diff(chassis, cutter)
    set_smooth(chassis, 50)
    parts.append(chassis)
    parts.append(loft("Cockpit_Interior", [(0.54, 0, 0.45, 0.10, 0.1, 0.2, 2.4, 1), (0.10, 0, 0.45, 0.18, 0.1, 0.2, 3.4, 1),
                                           (-0.20, 0, 0.45, 0.13, 0.1, 0.2, 3.0, 1)], M["dark"], ring=24, samples=3))
    parts.append(loft("Nose_Stripe", [(2.10, 0, 0.262, 0.05, 0.01, 0.01, 2, 1), (1.50, 0, 0.412, 0.10, 0.01, 0.01, 2, 1),
                                      (0.70, 0, 0.555, 0.12, 0.01, 0.01, 2, 1)], M["accent"], ring=12, samples=4))
    # wraparound windscreen
    # curved strip: centre furthest forward, wrapping back at the sides
    verts, faces = [], []
    for i in range(13):
        a = math.pi * (i / 12)
        y = math.cos(a) * 0.20
        x = 0.46 + 0.08 * math.sin(a)
        verts += [(x, y, 0.575), (x - 0.05, y * 1.05, 0.68)]
    for i in range(12):
        faces.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    parts.append(mesh_object("Windscreen", verts, faces, M["screen"], 60))
    # airbox + engine cover
    parts.append(loft("EngineCover", [
        (-0.15, 0, 0.60, 0.12, 0.06, 0.06, 2.4, 0.8),
        (-0.32, 0, 0.72, 0.12, 0.20, 0.14, 2.4, 0.6),
        (-0.60, 0, 0.62, 0.16, 0.14, 0.16, 2.6, 0.7),
        (-0.88, 0, 0.50, 0.12, 0.08, 0.10, 2.6, 0.8),
    ], M["paint"], ring=40, samples=5))
    parts.append(loft("Airbox_Intake", [(-0.20, 0, 0.84, 0.08, 0.06, 0.05, 2.4, 0.9), (-0.26, 0, 0.84, 0.08, 0.06, 0.05, 2.4, 0.9)],
                      M["dark"], ring=24, samples=1))
    parts.append(tube("RollHoop", (-0.18, 0.12, 0.58), (-0.18, -0.12, 0.58), M["alu"], 0.02, 0.02))

    # sidepods: inverted-wing profile with sliding skirts
    for s, tag in ((1, "L"), (-1, "R")):
        parts.append(loft(f"Sidepod_{tag}", [
            (1.00, s * 0.50, 0.27, 0.20, 0.08, 0.10, 3.4, 0.95),
            (0.82, s * 0.51, 0.30, 0.22, 0.12, 0.18, 5, 1.0),
            (0.00, s * 0.51, 0.30, 0.22, 0.13, 0.22, 6, 1.0),
            (-0.60, s * 0.50, 0.27, 0.22, 0.12, 0.20, 5, 1.0),
            (-0.95, s * 0.46, 0.21, 0.18, 0.08, 0.12, 3.5, 1.0),
        ], M["paint"], ring=40, samples=6))
        parts.append(loft(f"Sidepod_Pinstripe_{tag}", [(0.95, s * 0.72, 0.31, 0.004, 0.008, 0.008, 2, 1),
                                                       (-0.85, s * 0.72, 0.30, 0.004, 0.008, 0.008, 2, 1)],
                          M["pin"], ring=8, samples=1))
        parts.append(loft(f"Sidepod_Inlet_{tag}", [(1.02, s * 0.52, 0.30, 0.15, 0.06, 0.05, 3.4, 1),
                                                   (0.96, s * 0.52, 0.30, 0.15, 0.06, 0.05, 3.4, 1)], M["dark"], ring=24, samples=1))
        parts.append(extrude_outline(f"Skirt_{tag}", [(0.95, 0.012), (-0.95, 0.012), (-0.95, 0.20), (0.95, 0.20)], M["dark"],
                                     axis='Y', offset=s * 0.735, thickness=0.012))
        parts.append(tube(f"Mirror_Stalk_{tag}", (0.42, s * 0.26, 0.55), (0.42, s * 0.36, 0.62), M["alu"], 0.008, 0.008))
        parts.append(loft(f"Mirror_{tag}", [(0.45, s * 0.38, 0.63, 0.01, 0.01, 0.01, 2, 1), (0.42, s * 0.38, 0.63, 0.06, 0.03, 0.03, 2.4, 1),
                                           (0.38, s * 0.38, 0.63, 0.06, 0.03, 0.03, 3, 1)], M["paint"], ring=20, samples=2))
    half = [(1.05, 0.22), (0.95, 0.70), (-0.95, 0.70), (-1.05, 0.30), (-1.40, 0.25)]
    outline = half + [(x, -y) for (x, y) in reversed(half)]
    parts.append(extrude_outline("Floor", outline, M["dark"], axis='Z', offset=0.03, thickness=0.02, smooth_angle=20))

    # nose wings
    fw = []
    for s in (1, -1):
        st = [(s * 0.18, 2.12, 0.16, 0.30, 8, 0.9), (s * 0.60, 2.08, 0.18, 0.26, 12, 0.9)]
        if s < 0:
            st.reverse()
        fw.append(wing(f"FW_{s}", st, M["paint"], samples=1))
        fw.append(wing(f"FW_Flap_{s}", [(s * 0.2, 1.86, 0.20, 0.12, 25, 0.8), (s * 0.6, 1.84, 0.22, 0.12, 28, 0.8)][::s],
                       M["accent"], samples=1))
        fw.append(extrude_outline(f"FW_Endplate_{s}", [(2.16, 0.10), (1.70, 0.10), (1.70, 0.30), (2.16, 0.24)], M["paint"],
                                  axis='Y', offset=s * 0.605, thickness=0.01))
    parts.append(join(fw, "FrontWing"))

    # exposed engine & gearbox
    eng = []
    eng.append(box("block", (-0.72, 0, 0.30), (0.56, 0.30, 0.24), M["engine"], bevel=0.02))
    for s in (1, -1):
        bank = box(f"bank{s}", (-0.72, s * 0.12, 0.42), (0.54, 0.12, 0.14), M["engine"], bevel=0.015)
        bank.rotation_euler = (math.radians(-s * 45), 0, 0)
        apply_transform(bank)
        eng.append(bank)
        eng.append(box(f"cam{s}", (-0.72, s * 0.20, 0.48), (0.50, 0.06, 0.05), M["alu"], bevel=0.01))
        for k in range(4):
            x = -0.52 - k * 0.13
            eng.append(sweep(f"exh{s}{k}", [(x, s * 0.20, 0.34), (x - 0.05, s * 0.28, 0.30), (-1.10, s * 0.26, 0.30),
                                           (-1.45, s * 0.22, 0.34)], M["exhaust"], 0.018, k=8, samples=3))
        for k in range(4):
            eng.append(cylinder(f"trumpet{s}{k}", (-0.55 - k * 0.13, s * 0.05, 0.55), 0.025, 0.08, M["alu"], axis='Z', segs=12))
    parts.append(join(eng, "PU_ICE"))
    parts.append(loft("Gearbox", [(-1.00, 0, 0.28, 0.14, 0.12, 0.12, 3, 1), (-1.55, 0, 0.30, 0.10, 0.10, 0.10, 3, 1),
                                  (-1.68, 0, 0.30, 0.07, 0.07, 0.07, 3, 1)], M["alu"], ring=24, samples=2))
    parts.append(box("OilCooler", (-1.60, 0, 0.48), (0.10, 0.30, 0.12), M["dark"], bevel=0.01))

    rw = []
    rw.append(wing("RW_Main", [(-0.52, -1.58, 0.82, 0.32, 10, 0.9), (0.52, -1.58, 0.82, 0.32, 10, 0.9)], M["paint"], samples=1))
    for s in (1, -1):
        rw.append(extrude_outline(f"RW_Endplate_{s}", [(-1.52, 0.62), (-1.52, 0.96), (-2.06, 0.96), (-2.06, 0.62)],
                                  M["paint"], axis='Y', offset=s * 0.525, thickness=0.012))
    rw.append(extrude_outline("RW_Pylon", [(-1.45, 0.40), (-1.60, 0.40), (-1.70, 0.84), (-1.60, 0.84)], M["alu"], axis='Y',
                              thickness=0.02))
    parts.append(join(rw, "RearWing"))
    flap = wing("RearWing_Flap", [(-0.515, -1.88, 0.885, 0.15, 30, 0.85), (0.515, -1.88, 0.885, 0.15, 30, 0.85)],
                M["accent"], samples=1)
    set_origin(flap, (-1.88 - 0.15 * math.cos(math.radians(30)), 0, 0.885 + 0.15 * math.sin(math.radians(30))))
    parts.append(flap)

    helmet = sphere("Helmet_Shell", (0.05, 0, 0.74), 0.13, M["helmet"], scale=(1.05, 0.95, 1.0))
    visor = sphere("Helmet_Visor", (0.085, 0, 0.745), 0.122, M["visor"], scale=(1.02, 0.93, 0.40), segs=24, rings=12)
    band = loft("Helmet_Stripe", [(0.19, 0, 0.80, 0.05, 0.02, 0.02, 2, 1), (0.05, 0, 0.87, 0.06, 0.02, 0.02, 2, 1),
                                  (-0.08, 0, 0.80, 0.05, 0.02, 0.02, 2, 1)], M["paint"], ring=10, samples=3)
    body = loft("Driver_Body", [(0.05, 0, 0.50, 0.17, 0.08, 0.1, 2, 1), (-0.08, 0, 0.55, 0.20, 0.07, 0.12, 2, 1)],
                M["suit"], ring=16, samples=2)
    parts.append(join([helmet, visor, band, body], "Driver"))

    def wheel(name, hub, R, W, side):
        tyre = build_tyre(name + "_tyre", R, R_RIM + 0.004, W, [M["rubber"], M["rubber"]], shoulder=0.04,
                          sidewall_bulge=1.05, tread_rounding=0.006)
        rim = lathe(name + "_rim", rim_profile(R_RIM, W), M["rim"], segs=48)
        face = lathe(name + "_face", [(0.04, W / 2 - 0.03), (R_RIM - 0.01, W / 2 - 0.05), (R_RIM - 0.01, W / 2 - 0.06),
                                      (0.04, W / 2 - 0.045)], M["rim"], segs=48)
        holes = []
        for k in range(8):
            a = 2 * math.pi * k / 8
            holes.append(cylinder(f"{name}_h{k}", (0.11 * math.cos(a), W / 2 - 0.04, 0.11 * math.sin(a)), 0.028, 0.01,
                                  M["dark"], axis='Y', segs=12))
        nut = cylinder(name + "_nut", (0, W / 2 - 0.025, 0), 0.035, 0.04, M["alu"], axis='Y', segs=6)
        disc = lathe(name + "_disc", [(0.07, -0.015), (0.13, -0.015), (0.13, 0.015), (0.07, 0.015)], M["brake"], segs=40)
        return finalize_wheel([tyre, rim, face] + holes + [nut, disc], name, hub, side)

    for tag, x, y, R, W, side in (("FL", FA, TF, RF, WF, 1), ("FR", FA, -TF, RF, WF, -1),
                                  ("RL", RA, TR, RR, WR, 1), ("RR", RA, -TR, RR, WR, -1)):
        parts.append(wheel(f"Tyre_{tag}", (x, y, R), R, W, side))

    sus = []
    for s in (1, -1):
        uy = s * (TF - WF / 2 - 0.02)
        sus += [tube("a", (1.55, s * 0.18, 0.18), (FA, uy, RF - 0.1), M["alu"], 0.012, 0.012),
                tube("b", (1.15, s * 0.20, 0.18), (FA, uy, RF - 0.1), M["alu"], 0.012, 0.012),
                tube("c", (1.50, s * 0.18, 0.40), (FA, uy, RF + 0.12), M["alu"], 0.012, 0.012),
                tube("d", (1.20, s * 0.20, 0.40), (FA, uy, RF + 0.12), M["alu"], 0.012, 0.012)]
    parts.append(join(sus, "Suspension_Front"))
    sus = []
    for s in (1, -1):
        uy = s * (TR - WR / 2 - 0.02)
        sus += [tube("a", (-1.10, s * 0.16, 0.18), (RA, uy, 0.22), M["alu"], 0.013, 0.013),
                tube("b", (-1.55, s * 0.10, 0.18), (RA, uy, 0.22), M["alu"], 0.013, 0.013),
                tube("c", (-1.40, s * 0.10, 0.38), (RA, uy, 0.44), M["alu"], 0.013, 0.013),
                tube("d", (RA, uy * 0.6, 0.33), (RA, uy, 0.33), M["alu"], 0.02, 0.02)]
    parts.append(join(sus, "Suspension_Rear"))
    return parts
