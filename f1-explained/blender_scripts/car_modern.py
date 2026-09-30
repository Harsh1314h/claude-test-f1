"""GE-22: a fictional 2022-2025 style ground-effect Formula 1 car.
Includes internal power-unit components so the website can do an exploded / x-ray view."""
import math
from f1lib import *

FA, RA = 1.80, -1.80           # front / rear axle x
R_T = 0.36                     # tyre radius (18in rims, ~720 mm tyre)
R_RIM = 0.229
TF, TR = 0.80, 0.78            # wheel-centre half-track front / rear
WF, WR = 0.305, 0.405          # tyre widths


def build(tex_dir, colors=None):
    c = colors or {}
    M = {
        "paint": paint("Paint_Main", c.get("main", (0.018, 0.02, 0.085)), metallic=0.55, rough=0.25),
        "accent": paint("Paint_Accent", c.get("accent", (1.0, 0.22, 0.0)), metallic=0.1, rough=0.3),
        "carbon": carbon("Carbon", tex_dir),
        "rubber": plain("Rubber", (0.018, 0.018, 0.02), rough=0.82),
        "stripe": plain("TyreStripe", (0.85, 0.05, 0.04), rough=0.6),
        "rim": plain("Rim_Metal", (0.08, 0.08, 0.09), metallic=0.9, rough=0.32),
        "metal": plain("Metal", (0.55, 0.56, 0.58), metallic=1.0, rough=0.28),
        "ti": plain("Titanium", (0.36, 0.36, 0.38), metallic=1.0, rough=0.35),
        "dark": plain("Matte_Black", (0.01, 0.01, 0.012), rough=0.7),
        "light": emissive("RearLight", (1.0, 0.02, 0.01), 6),
        "brake": plain("Brake_Carbon", (0.06, 0.05, 0.05), metallic=0.2, rough=0.6),
        "helmet": paint("Helmet", (0.92, 0.92, 0.95), metallic=0.1, rough=0.2),
        "visor": glass("Visor"),
        "suit": plain("Race_Suit", (0.9, 0.3, 0.05), rough=0.8),
        "pu": plain("PU_Alloy", (0.45, 0.45, 0.47), metallic=1.0, rough=0.4),
        "gold": plain("Heat_Shield", (0.8, 0.6, 0.25), metallic=1.0, rough=0.3),
        "battery": plain("Battery_Case", (0.1, 0.35, 0.65), metallic=0.3, rough=0.4),
        "mguk": plain("MGUK_Case", (0.05, 0.6, 0.35), metallic=0.4, rough=0.35),
        "mguh": plain("MGUH_Case", (0.75, 0.15, 0.55), metallic=0.4, rough=0.35),
        "radiator": plain("Radiator", (0.5, 0.5, 0.52), metallic=0.8, rough=0.5),
        "fuel": plain("Fuel_Cell", (0.9, 0.7, 0.1), rough=0.6),
    }
    parts = []

    # ---------------- Chassis / nose (survival cell) ----------------
    chassis = loft("Chassis", [
        (2.72, 0, 0.150, 0.05, 0.030, 0.028, 2.2, 1.0),
        (2.55, 0, 0.170, 0.10, 0.050, 0.045, 2.4, 0.9),
        (2.25, 0, 0.225, 0.14, 0.075, 0.070, 2.6, 0.85),
        (1.90, 0, 0.290, 0.17, 0.100, 0.100, 2.8, 0.82),
        (1.45, 0, 0.360, 0.21, 0.140, 0.220, 3.0, 0.80),
        (1.05, 0, 0.400, 0.26, 0.180, 0.290, 3.2, 0.78),
        (0.65, 0, 0.400, 0.33, 0.255, 0.300, 3.4, 0.74),
        (0.20, 0, 0.400, 0.38, 0.280, 0.310, 3.6, 0.70),
        (-0.25, 0, 0.420, 0.38, 0.300, 0.320, 3.6, 0.68),
        (-0.55, 0, 0.420, 0.33, 0.280, 0.320, 3.2, 0.70),
    ], M["paint"], ring=48, samples=6)
    cutter = loft("cut", [
        (0.80, 0, 0.80, 0.10, 0.20, 0.14, 2.4, 1),
        (0.66, 0, 0.80, 0.18, 0.20, 0.16, 3.0, 1),
        (0.30, 0, 0.80, 0.23, 0.20, 0.16, 3.4, 1),
        (-0.05, 0, 0.80, 0.23, 0.20, 0.16, 3.4, 1),
        (-0.18, 0, 0.80, 0.16, 0.20, 0.16, 3.0, 1),
    ], None, ring=32, samples=4)
    boolean_diff(chassis, cutter)
    set_smooth(chassis, 50)
    parts.append(chassis)
    tub = loft("Cockpit_Interior", [
        (0.78, 0, 0.52, 0.10, 0.10, 0.2, 2.4, 1),
        (0.64, 0, 0.52, 0.17, 0.10, 0.2, 3.0, 1),
        (0.30, 0, 0.52, 0.22, 0.10, 0.2, 3.4, 1),
        (-0.04, 0, 0.52, 0.22, 0.10, 0.2, 3.4, 1),
        (-0.16, 0, 0.52, 0.15, 0.10, 0.2, 3.0, 1),
    ], M["dark"], ring=24, samples=3)
    parts.append(tub)
    # cockpit padding / headrest
    for s in (1, -1):
        parts.append(loft(f"Headrest_{'L' if s > 0 else 'R'}", [
            (0.10, s * 0.19, 0.67, 0.03, 0.03, 0.04, 2.2, 1),
            (-0.05, s * 0.20, 0.68, 0.045, 0.04, 0.05, 2.4, 1),
            (-0.17, s * 0.13, 0.68, 0.05, 0.04, 0.05, 2.4, 1),
        ], M["dark"], ring=16, samples=3))

    # ---------------- Engine cover + airbox ----------------
    cover = loft("EngineCover", [
        (-0.08, 0, 0.66, 0.20, 0.080, 0.10, 2.6, 0.8),
        (-0.28, 0, 0.73, 0.19, 0.210, 0.15, 2.4, 0.55),
        (-0.55, 0, 0.71, 0.23, 0.215, 0.24, 2.6, 0.6),
        (-0.90, 0, 0.62, 0.26, 0.200, 0.30, 2.8, 0.7),
        (-1.35, 0, 0.52, 0.22, 0.140, 0.28, 3.0, 0.75),
        (-1.80, 0, 0.43, 0.14, 0.100, 0.21, 3.0, 0.8),
        (-2.15, 0, 0.38, 0.08, 0.060, 0.12, 2.6, 0.9),
        (-2.33, 0, 0.37, 0.05, 0.035, 0.06, 2.4, 1.0),
    ], M["paint"], ring=48, samples=6)
    parts.append(cover)
    parts.append(loft("Airbox_Intake", [
        (-0.195, 0, 0.855, 0.075, 0.055, 0.045, 2.2, 0.8),
        (-0.24, 0, 0.855, 0.075, 0.055, 0.045, 2.2, 0.8),
    ], M["dark"], ring=24, samples=1))
    parts.append(extrude_outline("SharkFin", [(-0.62, 0.90), (-1.70, 0.64), (-1.70, 0.58), (-0.70, 0.80)],
                                 M["accent"], axis='Y', thickness=0.012))
    # accent stripe along the spine
    parts.append(loft("Spine_Stripe", [
        (-0.30, 0, 0.935, 0.05, 0.009, 0.01, 2.0, 1),
        (-0.55, 0, 0.922, 0.06, 0.009, 0.01, 2.0, 1),
        (-0.90, 0, 0.816, 0.06, 0.009, 0.01, 2.0, 1),
    ], M["accent"], ring=16, samples=4))
    parts.append(box("RearLight", (-2.335, 0, 0.37), (0.02, 0.07, 0.035), M["light"]))

    # ---------------- Sidepods ----------------
    for s, tag in ((1, "L"), (-1, "R")):
        sp = loft(f"Sidepod_{tag}", [
            (0.74, s * 0.50, 0.47, 0.17, 0.10, 0.08, 3.4, 0.9),
            (0.52, s * 0.55, 0.46, 0.24, 0.13, 0.14, 3.6, 0.85),
            (0.10, s * 0.54, 0.42, 0.24, 0.16, 0.20, 3.2, 0.8),
            (-0.40, s * 0.47, 0.37, 0.21, 0.15, 0.22, 3.0, 0.75),
            (-0.90, s * 0.37, 0.32, 0.15, 0.12, 0.20, 2.8, 0.8),
            (-1.35, s * 0.25, 0.26, 0.08, 0.07, 0.14, 2.6, 0.8),
        ], M["paint"], ring=40, samples=6)
        parts.append(sp)
        parts.append(loft(f"Sidepod_Inlet_{tag}", [
            (0.755, s * 0.50, 0.475, 0.14, 0.075, 0.055, 3.2, 0.9),
            (0.70, s * 0.50, 0.475, 0.14, 0.075, 0.055, 3.2, 0.9),
        ], M["dark"], ring=32, samples=1))
        parts.append(loft(f"Sidepod_Lip_{tag}", [
            (0.765, s * 0.50, 0.47, 0.165, 0.095, 0.075, 3.4, 0.9),
            (0.745, s * 0.50, 0.47, 0.168, 0.097, 0.077, 3.4, 0.9),
        ], M["accent"], ring=32, samples=1))
        # radiators (internal)
        rad = box(f"Radiator_{tag}", (0.15, s * 0.55, 0.42), (0.06, 0.34, 0.26), M["radiator"])
        rad.rotation_euler = (0, math.radians(-35), math.radians(s * 12))
        parts.append(rad)
        # mirror
        parts.append(tube(f"Mirror_Stalk_{tag}", (0.47, s * 0.50, 0.56), (0.45, s * 0.55, 0.70), M["carbon"], 0.012, 0.008))
        parts.append(loft(f"Mirror_{tag}", [
            (0.49, s * 0.58, 0.745, 0.01, 0.01, 0.01, 2, 1),
            (0.46, s * 0.58, 0.745, 0.10, 0.034, 0.030, 2.6, 1),
            (0.41, s * 0.58, 0.745, 0.105, 0.036, 0.032, 3.0, 1),
            (0.40, s * 0.58, 0.745, 0.10, 0.032, 0.028, 3.0, 1),
        ], M["paint"], ring=24, samples=3))
        parts.append(box(f"Mirror_Glass_{tag}", (0.397, s * 0.58, 0.745), (0.004, 0.14, 0.04), M["visor"]))

    # ---------------- Floor, edge and diffuser ----------------
    half = [(1.30, 0.22), (1.15, 0.42), (0.95, 0.66), (0.72, 0.80), (-1.30, 0.80), (-1.38, 0.72),
            (-1.44, 0.56), (-1.60, 0.54)]
    outline = half + [(x, -y) for (x, y) in reversed(half)]
    floor = extrude_outline("Floor", outline, M["carbon"], axis='Z', offset=0.045, thickness=0.02, smooth_angle=20)
    parts.append(floor)
    for s, tag in ((1, "L"), (-1, "R")):
        edge = [(0.70, 0.055), (-1.28, 0.055), (-1.28, 0.10), (-0.4, 0.125), (0.4, 0.11), (0.70, 0.07)]
        parts.append(extrude_outline(f"Floor_Edge_{tag}", edge, M["carbon"], axis='Y', offset=s * 0.795, thickness=0.01))
        # floor fences (venturi inlet vanes, visible from the front)
        for k, yy in enumerate((0.25, 0.36, 0.47)):
            fence = [(1.25 - k * 0.08, 0.035), (0.70, 0.035), (0.72, 0.06), (1.20 - k * 0.08, 0.055)]
            parts.append(extrude_outline(f"Floor_Fence_{tag}{k}", fence, M["carbon"], axis='Y', offset=s * yy, thickness=0.008))
    diff_st = []
    for i in range(9):
        u = i / 8
        x = -1.52 - 0.83 * u
        z = 0.050 + 0.25 * u ** 1.7
        diff_st.append((x, 0, z, 0.52, 0.006, 0.006, 8, 1))
    dparts = [loft("Diffuser_Roof", diff_st, M["carbon"], ring=24, samples=2, smooth_angle=25)]
    for yy in (0.52, 0.34, 0.16, -0.16, -0.34, -0.52):
        prof = [(-1.52, 0.045)]
        for i in range(9):
            u = i / 8
            prof.append((-1.52 - 0.83 * u, 0.050 + 0.25 * u ** 1.7))
        prof.append((-2.35, 0.045))
        dparts.append(extrude_outline(f"Diffuser_Strake_{int(yy*100)}", prof, M["carbon"], axis='Y', offset=yy, thickness=0.008))
    parts.append(join(dparts, "Diffuser"))

    # ---------------- Front wing ----------------
    fw = []
    main_st = []
    for y in (-0.93, -0.70, -0.40, -0.18, 0.0, 0.18, 0.40, 0.70, 0.93):
        a = abs(y)
        main_st.append((y, 2.90 - 0.03 * a, 0.075 + 0.03 * a, 0.40 - 0.08 * a, 3 + 5 * a, 0.9))
    fw.append(wing("FW_Main", main_st, M["carbon"], samples=3))
    for s in (1, -1):
        # stacked flaps: each leading edge sits just above/behind the previous trailing edge
        prev = None
        for k, (ch, aoa) in enumerate(((0.17, 14), (0.15, 24), (0.12, 34))):
            st = []
            for y in (0.20, 0.35, 0.55, 0.75, 0.925):
                inboard = 1 - (y - 0.2) / 0.725          # 1 at nose, 0 at endplate
                ma = 3 + 5 * y
                mch = 0.40 - 0.08 * y
                mx, mz = 2.90 - 0.03 * y, 0.075 + 0.03 * y
                # trailing edge of mainplane at this span
                tx = mx - mch * math.cos(math.radians(ma))
                tz = mz + mch * math.sin(math.radians(ma))
                le_x, le_z = tx + 0.03, tz + 0.012
                chord_k = [0.17, 0.15, 0.12]
                aoas = [14 + 6 * inboard, 24 + 10 * inboard, 34 + 12 * inboard]
                for j in range(k):
                    a_j = math.radians(aoas[j])
                    le_x = le_x - chord_k[j] * math.cos(a_j) + 0.028
                    le_z = le_z + chord_k[j] * math.sin(a_j) + 0.010
                st.append((s * y, le_x, le_z, chord_k[k], aoas[k], 0.8))
            if s < 0:
                st = list(reversed(st))
            mat = M["accent"] if k == 2 else M["carbon"]
            fw.append(wing(f"FW_Flap{k}_{'L' if s > 0 else 'R'}", st, mat, samples=3))
        ep = [(2.95, 0.045), (2.36, 0.045), (2.27, 0.16), (2.27, 0.33), (2.40, 0.355), (2.62, 0.29), (2.84, 0.18),
              (2.94, 0.10)]
        fw.append(extrude_outline(f"FW_Endplate_{'L' if s > 0 else 'R'}", ep, M["paint"], axis='Y',
                                  offset=s * 0.935, thickness=0.012, round_samples=3))
    front_wing = join(fw, "FrontWing")
    parts.append(front_wing)

    # ---------------- Rear wing, beam wing, DRS flap ----------------
    rw = []
    rw_st = []
    for y in (-0.50, -0.45, -0.34, 0.0, 0.34, 0.45, 0.50):
        a = abs(y)
        drop = 0.0 if a < 0.34 else (a - 0.34) / 0.16
        rw_st.append((y, -2.28 - 0.02 * drop, 0.80 - 0.10 * drop ** 1.5, 0.30 - 0.04 * drop, 9 + 10 * drop, 0.9))
    rw.append(wing("RW_Main", rw_st, M["carbon"], samples=4))
    for s in (1, -1):
        ep = [(-2.26, 0.38), (-2.27, 0.84), (-2.40, 0.97), (-2.60, 1.00), (-2.77, 0.97), (-2.80, 0.86), (-2.64, 0.55),
              (-2.56, 0.38)]
        rw.append(extrude_outline(f"RW_Endplate_{'L' if s > 0 else 'R'}", ep, M["paint"], axis='Y',
                                  offset=s * 0.505, thickness=0.012, round_samples=3))
    rw.append(extrude_outline("RW_Pylon", [(-2.17, 0.33), (-2.33, 0.33), (-2.47, 0.84), (-2.33, 0.84)], M["carbon"],
                              axis='Y', thickness=0.022))
    rw.append(tube("DRS_Actuator", (-2.44, 0, 0.84), (-2.55, 0, 0.91), M["carbon"], 0.012, 0.012))
    rear_wing = join(rw, "RearWing")
    parts.append(rear_wing)
    beam = []
    beam.append(wing("BeamWing_Lower", [(-0.50, -2.26, 0.395, 0.13, 8, 0.9), (0.50, -2.26, 0.395, 0.13, 8, 0.9)],
                     M["carbon"], samples=1))
    beam.append(wing("BeamWing_Upper", [(-0.50, -2.39, 0.45, 0.11, 24, 0.9), (0.50, -2.39, 0.45, 0.11, 24, 0.9)],
                     M["carbon"], samples=1))
    parts.append(join(beam, "BeamWing"))
    flap_st = [(y, -2.545, 0.875 - (0.05 if abs(y) > 0.45 else 0) * ((abs(y) - 0.45) / 0.05 if abs(y) > 0.45 else 0),
                0.20, 30, 0.85) for y in (-0.495, -0.45, 0.0, 0.45, 0.495)]
    flap = wing("RearWing_Flap", flap_st, M["paint"], samples=3)
    # pivot at the trailing edge of the flap
    te = (-2.545 - 0.20 * math.cos(math.radians(30)), 0, 0.875 + 0.20 * math.sin(math.radians(30)))
    set_origin(flap, te)
    parts.append(flap)

    # ---------------- Halo ----------------
    halo_pts = [(-0.14, 0.27, 0.64), (-0.10, 0.28, 0.76), (0.05, 0.28, 0.83), (0.28, 0.24, 0.855), (0.46, 0.13, 0.865),
                (0.54, 0.0, 0.866), (0.46, -0.13, 0.865), (0.28, -0.24, 0.855), (0.05, -0.28, 0.83), (-0.10, -0.28, 0.76),
                (-0.14, -0.27, 0.64)]
    halo = sweep("Halo_Ring", halo_pts, M["ti"], radius=0.024, ry=0.018, k=14, samples=6)
    pillar = sweep("Halo_Pillar", [(0.53, 0, 0.86), (0.60, 0, 0.78), (0.70, 0, 0.68)], M["ti"], radius=0.03, ry=0.016,
                   k=12, samples=4)
    halo = join([halo, pillar], "Halo")
    parts.append(halo)

    # ---------------- Driver & steering wheel ----------------
    helmet = sphere("Helmet_Shell", (0.12, 0, 0.78), 0.13, M["helmet"], scale=(1.08, 0.95, 1.0))
    visor = sphere("Helmet_Visor", (0.155, 0, 0.785), 0.122, M["visor"], scale=(1.02, 0.93, 0.42), segs=24, rings=12)
    stripe = loft("Helmet_Stripe", [(0.26, 0, 0.84, 0.02, 0.01, 0.01, 2, 1), (0.12, 0, 0.912, 0.03, 0.006, 0.006, 2, 1),
                                    (-0.02, 0, 0.84, 0.02, 0.01, 0.01, 2, 1)], M["accent"], ring=10, samples=4)
    body = loft("Driver_Body", [(0.05, 0, 0.55, 0.16, 0.08, 0.1, 2, 1), (-0.02, 0, 0.60, 0.20, 0.07, 0.12, 2, 1),
                                (-0.10, 0, 0.58, 0.18, 0.06, 0.1, 2, 1)], M["suit"], ring=16, samples=3)
    neck = cylinder("Driver_Neck", (0.08, 0, 0.66), 0.05, 0.12, M["dark"], axis='Z', segs=12)
    parts.append(join([helmet, visor, stripe, body, neck], "Driver"))
    sw = box("SteeringWheel", (0.42, 0, 0.62), (0.03, 0.26, 0.12), M["carbon"], bevel=0.01)
    sw.rotation_euler = (0, math.radians(-20), 0)
    parts.append(sw)

    # ---------------- Wheels ----------------
    def wheel(name, hub, W, side, front):
        tyre = build_tyre(name + "_tyre", R_T, R_RIM + 0.004, W, [M["rubber"], M["stripe"]],
                          stripe=(0.30, 0.44), shoulder=0.04, sidewall_bulge=1.02)
        rim = lathe(name + "_rim", rim_profile(R_RIM, W), M["rim"], segs=64)
        cover = lathe(name + "_cover", [(0.03, W / 2 - 0.01), (0.215, W / 2 - 0.028), (0.225, W / 2 - 0.02),
                                         (0.225, W / 2 - 0.035), (0.03, W / 2 - 0.025)], M["carbon"], segs=64)
        ring_ = lathe(name + "_ring", [(0.18, W / 2 - 0.023), (0.20, W / 2 - 0.025), (0.20, W / 2 - 0.029),
                                        (0.18, W / 2 - 0.027)], M["accent"], segs=64)
        nut = cylinder(name + "_nut", (0, W / 2 - 0.01, 0), 0.035, 0.03, M["accent"], axis='Y', segs=6)
        disc = lathe(name + "_disc", [(0.10, -0.02), (0.165, -0.02), (0.165, 0.02), (0.10, 0.02)], M["brake"], segs=48)
        return finalize_wheel([tyre, rim, cover, ring_, nut, disc], name, hub, side)

    for tag, x, y, W, side, front in (("FL", FA, TF, WF, 1, True), ("FR", FA, -TF, WF, -1, True),
                                      ("RL", RA, TR, WR, 1, False), ("RR", RA, -TR, WR, -1, False)):
        parts.append(wheel(f"Tyre_{tag}", (x, y, R_T), W, side, front))
        # brake duct drum (static)
        by = y - side * (W / 2 + 0.045)
        parts.append(cylinder(f"BrakeDuct_{tag}", (x, by, R_T), 0.16, 0.09, M["carbon"], axis='Y', segs=32))

    # ---------------- Suspension ----------------
    sus = []
    for s in (1, -1):
        uy = s * (TF - WF / 2 - 0.02)
        sus += [
            tube("fl_lower_f", (2.05, s * 0.16, 0.20), (FA + 0.02, uy, 0.22), M["carbon"], 0.028, 0.009),
            tube("fl_lower_r", (1.45, s * 0.20, 0.20), (FA, uy, 0.22), M["carbon"], 0.028, 0.009),
            tube("fl_upper_f", (1.98, s * 0.15, 0.40), (FA - 0.02, uy, 0.52), M["carbon"], 0.028, 0.009),
            tube("fl_upper_r", (1.55, s * 0.19, 0.44), (FA - 0.02, uy, 0.52), M["carbon"], 0.028, 0.009),
            tube("fl_push", (FA, uy, 0.23), (1.72, s * 0.18, 0.50), M["carbon"], 0.02, 0.012),
            tube("fl_track", (1.95, s * 0.16, 0.30), (FA + 0.08, uy, 0.34), M["carbon"], 0.02, 0.008),
        ]
    front_sus = join(sus, "Suspension_Front")
    parts.append(front_sus)
    sus = []
    for s in (1, -1):
        uy = s * (TR - WR / 2 - 0.02)
        sus += [
            tube("rl_lower_f", (-1.55, s * 0.14, 0.17), (RA + 0.02, uy, 0.20), M["carbon"], 0.028, 0.009),
            tube("rl_lower_r", (-2.05, s * 0.12, 0.18), (RA - 0.02, uy, 0.20), M["carbon"], 0.028, 0.009),
            tube("rl_upper_f", (-1.60, s * 0.14, 0.42), (RA, uy, 0.52), M["carbon"], 0.028, 0.009),
            tube("rl_upper_r", (-2.05, s * 0.10, 0.40), (RA - 0.02, uy, 0.52), M["carbon"], 0.028, 0.009),
            tube("rl_pull", (RA - 0.02, uy, 0.50), (-1.65, s * 0.12, 0.20), M["carbon"], 0.02, 0.012),
            tube("rl_toe", (-2.12, s * 0.12, 0.30), (RA - 0.12, uy, 0.34), M["carbon"], 0.02, 0.008),
        ]
    parts.append(join(sus, "Suspension_Rear"))

    # ---------------- Power unit & internals ----------------
    ice = []
    ice.append(box("ice_block", (-0.90, 0, 0.26), (0.62, 0.30, 0.22), M["pu"], bevel=0.02))
    for s in (1, -1):
        bank = box(f"ice_bank_{s}", (-0.90, s * 0.12, 0.43), (0.60, 0.12, 0.20), M["pu"], bevel=0.015)
        bank.rotation_euler = (math.radians(-s * 40), 0, 0)
        apply_transform(bank)
        ice.append(bank)
        for k in range(3):
            ice.append(cylinder(f"ice_cam_{s}_{k}", (-0.72 - k * 0.18, s * 0.17, 0.51), 0.045, 0.02, M["gold"], axis='Z', segs=16))
        # exhaust primaries
        ice.append(sweep(f"exh_{s}", [(-0.72, s * 0.20, 0.36), (-0.95, s * 0.21, 0.30), (-1.20, s * 0.14, 0.36),
                                      (-1.35, s * 0.05, 0.47)], M["gold"], radius=0.022, k=10, samples=4))
    parts.append(join(ice, "PU_ICE"))
    turbo = []
    turbo.append(cylinder("turbine", (-1.40, 0, 0.50), 0.085, 0.10, M["gold"], axis='X', segs=24))
    turbo.append(cylinder("compressor", (-0.55, 0, 0.56), 0.09, 0.10, M["metal"], axis='X', segs=24))
    turbo.append(cylinder("turbo_shaft", (-0.97, 0, 0.53), 0.018, 0.80, M["metal"], axis='X', segs=12))
    turbo.append(sweep("plenum_pipe", [(-0.55, 0, 0.64), (-0.40, 0, 0.72), (-0.30, 0, 0.80)], M["metal"], 0.04, k=12, samples=3))
    turbo.append(cylinder("tailpipe", (-2.05, 0, 0.50), 0.04, 0.40, M["gold"], axis='X', segs=16, r2=0.05))
    parts.append(join(turbo, "PU_Turbo"))
    parts.append(cylinder("ERS_MGUH", (-1.26, 0, 0.51), 0.07, 0.14, M["mguh"], axis='X', segs=24))
    parts.append(cylinder("ERS_MGUK", (-0.62, 0.17, 0.17), 0.075, 0.18, M["mguk"], axis='X', segs=24))
    parts.append(box("ERS_Battery", (-0.20, 0, 0.14), (0.40, 0.36, 0.10), M["battery"], bevel=0.01))
    parts.append(box("ERS_Control", (-0.40, -0.16, 0.20), (0.18, 0.10, 0.12), M["battery"], bevel=0.01))
    parts.append(box("FuelCell", (-0.22, 0, 0.40), (0.50, 0.50, 0.38), M["fuel"], bevel=0.05))
    gb = loft("Gearbox", [(-1.28, 0, 0.30, 0.13, 0.14, 0.14, 3, 1), (-1.70, 0, 0.30, 0.12, 0.12, 0.14, 3, 1),
                          (-2.12, 0, 0.32, 0.07, 0.08, 0.09, 3, 1)], M["carbon"], ring=24, samples=3)
    parts.append(gb)
    return parts
