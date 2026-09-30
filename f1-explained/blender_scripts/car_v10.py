"""V10-04: a fictional mid-2000s V10-era Formula 1 car.
Narrow (1.8 m) car, high raised nose, grooved tyres, tall narrow rear wing, coke-bottle sidepods."""
import math
from f1lib import *

FA, RA = 1.55, -1.55
R_T, R_RIM = 0.33, 0.168       # 13in rims, tall sidewalls
TF, TR = 0.765, 0.73
WF, WR = 0.27, 0.35


def build(tex_dir):
    M = {
        "paint": paint("Paint_Main", (0.80, 0.82, 0.84), metallic=0.15, rough=0.25),
        "accent": paint("Paint_Accent", (0.0, 0.42, 0.45), metallic=0.3, rough=0.28),
        "carbon": carbon("Carbon", tex_dir),
        "rubber": plain("Rubber", (0.018, 0.018, 0.02), rough=0.82),
        "rim": plain("Rim_Metal", (0.35, 0.36, 0.38), metallic=1.0, rough=0.3),
        "dark": plain("Matte_Black", (0.01, 0.01, 0.012), rough=0.7),
        "light": emissive("RearLight", (1.0, 0.02, 0.01), 6),
        "brake": plain("Brake_Carbon", (0.06, 0.05, 0.05), metallic=0.2, rough=0.6),
        "helmet": paint("Helmet", (0.95, 0.75, 0.05), metallic=0.1, rough=0.2),
        "visor": glass("Visor"),
        "suit": plain("Race_Suit", (0.0, 0.4, 0.42), rough=0.8),
    }
    parts = []
    chassis = loft("Chassis", [
        (2.50, 0, 0.395, 0.05, 0.040, 0.050, 2.2, 1.0),
        (2.25, 0, 0.415, 0.11, 0.070, 0.090, 2.4, 0.9),
        (1.90, 0, 0.445, 0.15, 0.100, 0.130, 2.6, 0.85),
        (1.50, 0, 0.450, 0.19, 0.130, 0.230, 3.0, 0.8),
        (1.10, 0, 0.440, 0.24, 0.160, 0.320, 3.2, 0.78),
        (0.70, 0, 0.420, 0.30, 0.220, 0.320, 3.4, 0.74),
        (0.30, 0, 0.420, 0.34, 0.240, 0.330, 3.6, 0.70),
        (-0.10, 0, 0.430, 0.34, 0.260, 0.330, 3.6, 0.70),
        (-0.40, 0, 0.430, 0.30, 0.250, 0.330, 3.2, 0.70),
    ], M["paint"], ring=48, samples=6)
    cutter = loft("cut", [
        (0.74, 0, 0.80, 0.10, 0.20, 0.17, 2.4, 1),
        (0.60, 0, 0.80, 0.17, 0.20, 0.18, 3.0, 1),
        (0.25, 0, 0.80, 0.21, 0.20, 0.18, 3.4, 1),
        (-0.08, 0, 0.80, 0.21, 0.20, 0.18, 3.4, 1),
        (-0.20, 0, 0.80, 0.15, 0.20, 0.18, 3.0, 1),
    ], None, ring=32, samples=4)
    boolean_diff(chassis, cutter)
    set_smooth(chassis, 50)
    parts.append(chassis)
    parts.append(loft("Cockpit_Interior", [
        (0.72, 0, 0.50, 0.10, 0.12, 0.2, 2.4, 1), (0.25, 0, 0.50, 0.20, 0.12, 0.2, 3.4, 1),
        (-0.18, 0, 0.50, 0.14, 0.12, 0.2, 3.0, 1)], M["dark"], ring=24, samples=3))
    parts.append(loft("Nose_Stripe", [
        (2.35, 0, 0.465, 0.04, 0.012, 0.01, 2, 1), (1.90, 0, 0.545, 0.07, 0.012, 0.01, 2, 1),
        (1.40, 0, 0.59, 0.09, 0.012, 0.01, 2, 1)], M["accent"], ring=12, samples=4))

    cover = loft("EngineCover", [
        (-0.10, 0, 0.66, 0.18, 0.100, 0.10, 2.6, 0.8),
        (-0.28, 0, 0.74, 0.17, 0.220, 0.15, 2.3, 0.5),
        (-0.55, 0, 0.70, 0.20, 0.200, 0.24, 2.6, 0.6),
        (-0.95, 0, 0.58, 0.22, 0.160, 0.30, 2.8, 0.7),
        (-1.40, 0, 0.46, 0.17, 0.120, 0.26, 3.0, 0.8),
        (-1.80, 0, 0.38, 0.10, 0.080, 0.16, 2.8, 0.9),
        (-2.02, 0, 0.35, 0.06, 0.050, 0.08, 2.4, 1.0),
    ], M["paint"], ring=48, samples=6)
    parts.append(cover)
    parts.append(loft("Airbox_Intake", [(-0.175, 0, 0.87, 0.07, 0.06, 0.05, 2.2, 0.8),
                                        (-0.23, 0, 0.87, 0.07, 0.06, 0.05, 2.2, 0.8)], M["dark"], ring=24, samples=1))
    parts.append(loft("Cover_Stripe", [(-0.30, 0, 0.955, 0.05, 0.009, 0.01, 2, 1), (-0.60, 0, 0.90, 0.07, 0.009, 0.01, 2, 1),
                                       (-1.10, 0, 0.71, 0.07, 0.009, 0.01, 2, 1), (-1.50, 0, 0.58, 0.05, 0.009, 0.01, 2, 1)],
                      M["accent"], ring=12, samples=4))
    parts.append(box("RearLight", (-2.03, 0, 0.35), (0.02, 0.07, 0.035), M["light"]))

    for s, tag in ((1, "L"), (-1, "R")):
        parts.append(loft(f"Sidepod_{tag}", [
            (0.56, s * 0.47, 0.30, 0.15, 0.17, 0.22, 3.6, 0.9),
            (0.30, s * 0.50, 0.30, 0.20, 0.20, 0.24, 3.6, 0.9),
            (-0.20, s * 0.47, 0.28, 0.20, 0.20, 0.22, 3.2, 0.85),
            (-0.70, s * 0.38, 0.25, 0.15, 0.17, 0.19, 3.0, 0.8),
            (-1.20, s * 0.25, 0.22, 0.08, 0.10, 0.15, 2.6, 0.8),
        ], M["paint"], ring=40, samples=6))
        parts.append(loft(f"Sidepod_Inlet_{tag}", [(0.575, s * 0.47, 0.32, 0.12, 0.13, 0.14, 3.4, 0.9),
                                                   (0.52, s * 0.47, 0.32, 0.12, 0.13, 0.14, 3.4, 0.9)],
                          M["dark"], ring=32, samples=1))
        # bargeboards behind the front wheels
        bb = [(1.12, 0.06), (0.55, 0.06), (0.60, 0.22), (0.95, 0.36), (1.12, 0.34)]
        parts.append(extrude_outline(f"Bargeboard_{tag}", bb, M["carbon"], axis='Y', offset=s * 0.40, thickness=0.01,
                                     round_samples=2))
        # flip-up winglet ahead of the rear wheels
        parts.append(wing(f"FlipUp_{tag}", [(s * 0.40, -0.95, 0.30, 0.18, 20, 0.8), (s * 0.62, -0.95, 0.30, 0.18, 20, 0.8)],
                          M["carbon"], samples=1))
        parts.append(tube(f"Mirror_Stalk_{tag}", (0.40, s * 0.40, 0.52), (0.38, s * 0.47, 0.62), M["carbon"], 0.012, 0.008))
        parts.append(loft(f"Mirror_{tag}", [(0.43, s * 0.49, 0.645, 0.01, 0.01, 0.01, 2, 1),
                                           (0.40, s * 0.49, 0.645, 0.09, 0.032, 0.03, 2.6, 1),
                                           (0.35, s * 0.49, 0.645, 0.09, 0.03, 0.028, 3.0, 1)],
                          M["paint"], ring=24, samples=3))

    half = [(1.10, 0.20), (0.90, 0.40), (0.62, 0.66), (-1.05, 0.66), (-1.15, 0.50), (-1.30, 0.46)]
    outline = half + [(x, -y) for (x, y) in reversed(half)]
    parts.append(extrude_outline("Floor", outline, M["carbon"], axis='Z', offset=0.045, thickness=0.02, smooth_angle=20))
    dparts = []
    st = []
    for i in range(7):
        u = i / 6
        st.append((-1.28 - 0.70 * u, 0, 0.05 + 0.15 * u ** 1.6, 0.44, 0.005, 0.005, 8, 1))
    dparts.append(loft("Diffuser_Roof", st, M["carbon"], ring=24, samples=2, smooth_angle=25))
    for yy in (0.44, 0.22, 0.0, -0.22, -0.44):
        prof = [(-1.28, 0.045)] + [(-1.28 - 0.70 * (i / 6), 0.05 + 0.15 * (i / 6) ** 1.6) for i in range(7)] + [(-1.98, 0.045)]
        dparts.append(extrude_outline(f"Diffuser_Strake_{int(yy*100)}", prof, M["carbon"], axis='Y', offset=yy, thickness=0.008))
    parts.append(join(dparts, "Diffuser"))

    # front wing hung beneath the raised nose
    fw = []
    st = []
    for y in (-0.70, -0.50, -0.26, -0.18, 0.0, 0.18, 0.26, 0.50, 0.70):
        a = abs(y)
        centre = a < 0.22
        st.append((y, 2.58 - 0.02 * a, 0.12 if centre else 0.075, 0.30, 3 if centre else 5 + 6 * a, 0.9))
    fw.append(wing("FW_Main", st, M["carbon"], samples=2))
    for s in (1, -1):
        st = [(s * y, 2.36, 0.125 + 0.02 * y, 0.15, 24 + 4 * y, 0.8) for y in (0.26, 0.48, 0.69)]
        if s < 0:
            st.reverse()
        fw.append(wing(f"FW_Flap_{s}", st, M["accent"], samples=2))
        ep = [(2.63, 0.03), (2.12, 0.03), (2.08, 0.12), (2.12, 0.25), (2.35, 0.28), (2.58, 0.20), (2.64, 0.10)]
        fw.append(extrude_outline(f"FW_Endplate_{s}", ep, M["paint"], axis='Y', offset=s * 0.705, thickness=0.012,
                                  round_samples=3))
        fw.append(extrude_outline(f"FW_Pylon_{s}", [(2.46, 0.12), (2.28, 0.12), (2.26, 0.40), (2.44, 0.40)], M["carbon"],
                                  axis='Y', offset=s * 0.075, thickness=0.012))
    parts.append(join(fw, "FrontWing"))

    rw = []
    rw.append(wing("RW_Main", [(-0.50, -1.97, 0.845, 0.24, 12, 0.9), (0.50, -1.97, 0.845, 0.24, 12, 0.9)], M["carbon"], samples=1))
    rw.append(wing("RW_Lower", [(-0.50, -1.95, 0.36, 0.20, 10, 0.9), (0.50, -1.95, 0.36, 0.20, 10, 0.9)], M["carbon"], samples=1))
    for s in (1, -1):
        ep = [(-1.90, 0.30), (-1.90, 0.98), (-1.98, 1.02), (-2.36, 1.02), (-2.40, 0.95), (-2.40, 0.45), (-2.25, 0.30)]
        rw.append(extrude_outline(f"RW_Endplate_{s}", ep, M["paint"], axis='Y', offset=s * 0.505, thickness=0.012,
                                  round_samples=2))
    rw.append(extrude_outline("RW_Pylon", [(-1.80, 0.33), (-1.95, 0.33), (-2.05, 0.85), (-1.93, 0.85)], M["carbon"],
                              axis='Y', thickness=0.02))
    parts.append(join(rw, "RearWing"))
    flap = wing("RearWing_Flap", [(-0.495, -2.20, 0.905, 0.16, 34, 0.85), (0.495, -2.20, 0.905, 0.16, 34, 0.85)], M["accent"], samples=1)
    set_origin(flap, (-2.20 - 0.16 * math.cos(math.radians(34)), 0, 0.905 + 0.16 * math.sin(math.radians(34))))
    parts.append(flap)

    helmet = sphere("Helmet_Shell", (0.10, 0, 0.765), 0.13, M["helmet"], scale=(1.08, 0.95, 1.0))
    visor = sphere("Helmet_Visor", (0.135, 0, 0.77), 0.122, M["visor"], scale=(1.02, 0.93, 0.42), segs=24, rings=12)
    body = loft("Driver_Body", [(0.05, 0, 0.54, 0.16, 0.08, 0.1, 2, 1), (-0.05, 0, 0.58, 0.19, 0.07, 0.12, 2, 1)],
                M["suit"], ring=16, samples=2)
    parts.append(join([helmet, visor, body], "Driver"))

    def wheel(name, hub, W, side):
        tyre = build_tyre(name + "_tyre", R_T, R_RIM + 0.004, W, [M["rubber"], M["rubber"]], grooves=4,
                          groove_depth=0.004, stripe=(0.4, 0.5), shoulder=0.035, sidewall_bulge=1.04)
        rim = lathe(name + "_rim", rim_profile(R_RIM, W), M["rim"], segs=48)
        sp = spokes(name + "_spokes", 10, 0.05, R_RIM - 0.01, W / 2 - 0.01, M["rim"], width=0.022, thick=0.016, twist=0.12)
        hubc = cylinder(name + "_hub", (0, W / 2 - 0.03, 0), 0.055, 0.05, M["rim"], axis='Y', segs=24)
        nut = cylinder(name + "_nut", (0, W / 2 - 0.005, 0), 0.03, 0.03, M["accent"], axis='Y', segs=6)
        disc = lathe(name + "_disc", [(0.07, -0.02), (0.13, -0.02), (0.13, 0.02), (0.07, 0.02)], M["brake"], segs=40)
        return finalize_wheel([tyre, rim, sp, hubc, nut, disc], name, hub, side)

    for tag, x, y, W, side in (("FL", FA, TF, WF, 1), ("FR", FA, -TF, WF, -1), ("RL", RA, TR, WR, 1), ("RR", RA, -TR, WR, -1)):
        parts.append(wheel(f"Tyre_{tag}", (x, y, R_T), W, side))
        by = y - side * (W / 2 + 0.04)
        parts.append(cylinder(f"BrakeDuct_{tag}", (x, by, R_T), 0.13, 0.07, M["carbon"], axis='Y', segs=28))

    sus = []
    for s in (1, -1):
        uy = s * (TF - WF / 2 - 0.02)
        sus += [tube("a", (1.78, s * 0.12, 0.34), (FA + 0.02, uy, 0.20), M["carbon"], 0.026, 0.009),
                tube("b", (1.28, s * 0.17, 0.30), (FA, uy, 0.20), M["carbon"], 0.026, 0.009),
                tube("c", (1.74, s * 0.12, 0.50), (FA - 0.02, uy, 0.46), M["carbon"], 0.026, 0.009),
                tube("d", (1.35, s * 0.17, 0.52), (FA - 0.02, uy, 0.46), M["carbon"], 0.026, 0.009),
                tube("e", (FA, uy, 0.21), (1.45, s * 0.14, 0.57), M["carbon"], 0.018, 0.012),
                tube("f", (1.72, s * 0.12, 0.40), (FA + 0.08, uy, 0.33), M["carbon"], 0.018, 0.008)]
    parts.append(join(sus, "Suspension_Front"))
    sus = []
    for s in (1, -1):
        uy = s * (TR - WR / 2 - 0.02)
        sus += [tube("a", (-1.30, s * 0.14, 0.17), (RA + 0.02, uy, 0.19), M["carbon"], 0.026, 0.009),
                tube("b", (-1.80, s * 0.12, 0.18), (RA - 0.02, uy, 0.19), M["carbon"], 0.026, 0.009),
                tube("c", (-1.35, s * 0.14, 0.40), (RA, uy, 0.47), M["carbon"], 0.026, 0.009),
                tube("d", (-1.80, s * 0.10, 0.38), (RA - 0.02, uy, 0.47), M["carbon"], 0.026, 0.009),
                tube("e", (RA - 0.02, uy, 0.20), (-1.40, s * 0.12, 0.45), M["carbon"], 0.018, 0.012)]
    parts.append(join(sus, "Suspension_Rear"))
    parts.append(loft("Gearbox", [(-1.10, 0, 0.28, 0.12, 0.13, 0.13, 3, 1), (-1.90, 0, 0.30, 0.07, 0.08, 0.09, 3, 1)],
                      M["carbon"], ring=24, samples=2))
    return parts
