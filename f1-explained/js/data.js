// ============================================================================
// data.js: part descriptions, exploded-view offsets, per-car parameters.
// Offsets are in three.js car space: +x nose, +y up, +z car's right side.
// ============================================================================

export const CARS = {
  modern:  { name: 'GE-22',  era: '2022–25 ground-effect era', drsAngle: 0.5,
             floorFront: 1.30, diffStart: -1.52, diffEnd: -2.35, diffH: 0.25, rwX: -2.75, rwHalf: 0.5, rwY: 0.95 },
  v10:     { name: 'V10-04', era: 'Mid-2000s V10 era', drsAngle: 0.45,
             floorFront: 1.10, diffStart: -1.28, diffEnd: -1.98, diffH: 0.15, rwX: -2.40, rwHalf: 0.5, rwY: 1.0 },
  wingcar: { name: 'WC-78',  era: 'Late-1970s wing car', drsAngle: 0.4,
             floorFront: 1.00, diffStart: -0.95, diffEnd: -1.45, diffH: 0.12, rwX: -2.06, rwHalf: 0.52, rwY: 0.9 },
  classic: { name: 'FE-55',  era: '1950s front-engined car', drsAngle: 0,
             floorFront: 1.9, diffStart: -1.9, diffEnd: -2.0, diffH: 0.0, rwX: -2.0, rwHalf: 0, rwY: 0 },
};

// Information cards shown when a part is clicked (anatomy + power unit)
export const INFO = {
  frontwing: ['Front wing', 'The first surface to meet the air. Its stacked elements make downforce and, just as important, shape the flow around the front tyres and towards the floor. Teams tweak the flap angle at pit stops to fix balance.'],
  chassis: ['Survival cell (monocoque)', 'The carbon-fibre tub the driver sits in, including the nose. It must pass strict FIA crash tests. Everything else bolts to it.'],
  halo: ['Halo', 'Titanium hoop protecting the driver\'s head, compulsory since 2018. It weighs around 7 kg yet withstands huge loads.'],
  sidepod: ['Sidepods', 'Aerodynamic bodywork on each side housing the radiators. Their shape (the "undercut" beneath them) guides air towards the rear of the car.'],
  radiator: ['Radiators', 'Cool the engine\'s water and oil plus the hybrid electronics. More cooling means bigger openings, which means more drag.'],
  floor: ['Floor', 'Since 2022 the car\'s most important aero part. Venturi tunnels underneath speed the air up, lowering pressure and sucking the car to the track (ground effect).'],
  diffuser: ['Diffuser', 'The upswept channels at the back of the floor. They slow the fast underfloor air back down smoothly, which keeps the pressure under the car low.'],
  rearwing: ['Rear wing', 'Makes downforce over the rear axle. Its angle is chosen per track: steep for twisty Monaco, skinny for high-speed Monza.'],
  flap: ['Rear wing flap (DRS)', 'The upper element. From 2011 to 2025 it could open by up to 85 mm on DRS straights, cutting drag to help overtaking.'],
  beamwing: ['Beam wing', 'Small lower wing that works together with the diffuser, helping to pull air out from under the car.'],
  cover: ['Engine cover & airbox', 'Tightly wrapped bodywork over the power unit. The airbox above the driver\'s head feeds air to the engine; the structure also acts as a roll hoop.'],
  ice: ['Internal combustion engine', '1.6-litre V6 with a single turbocharger, rev-limited to 15,000 rpm. It is a stressed member: the rear of the car bolts directly to it.'],
  turbo: ['Turbocharger', 'Exhaust gas spins the turbine; on the same shaft a compressor pushes denser air into the engine.'],
  mguh: ['MGU-H', 'Motor Generator Unit – Heat. On the turbo shaft: it recovers energy from exhaust heat and can spin the turbo up to eliminate lag. Dropped from the 2026 rules.'],
  mguk: ['MGU-K', 'Motor Generator Unit – Kinetic. Connected to the crankshaft: acts as a generator under braking and as a 120 kW motor on acceleration (350 kW from 2026).'],
  battery: ['Energy Store (battery)', 'Lithium-ion battery under the fuel cell. Stores harvested energy until the driver needs it.'],
  control: ['Control Electronics', 'Power electronics that route energy between the MGU-K, MGU-H and battery.'],
  fuel: ['Fuel cell', 'A puncture-resistant rubber bladder behind the driver. Refuelling during races has been banned since 2010, so cars start with all the fuel they need.'],
  gearbox: ['Gearbox', 'Eight forward gears, seamless-shift and paddle-operated. The rear suspension and crash structure mount on its casing.'],
  tyre: ['Tyres & wheels', '18-inch wheels since 2022. Tyres from a single supplier; wheel covers and brake ducts manage airflow and brake temperatures.'],
  suspension: ['Suspension', 'Carbon wishbones shaped like wings. Pushrods / pullrods feed loads to springs and dampers hidden inside the chassis.'],
  steering: ['Steering wheel', 'A small computer: dozens of buttons and rotary switches for brake balance, differential, energy modes, radio and more.'],
  driver: ['Driver', 'Sits with feet higher than hips, withstanding more than 5 g under braking and in fast corners. Drivers can lose several kilograms of fluid in a hot race.'],
  mirror: ['Mirrors', 'Minimum sizes are defined by the rules so drivers can see cars behind.'],
  light: ['Rear light', 'A bright red LED light that must be switched on in wet or low-visibility conditions so following drivers can see the car through the spray.'],
  brakeduct: ['Brake ducts', 'Feed cooling air to the carbon brakes, which work at around 1,000 °C.'],
};

// node name -> { key: INFO key, pu: part of the power unit (stays visible in x-ray) }
export const PARTS = {};
const map = (key, names, extra = {}) => names.forEach(n => { PARTS[n] = { key, ...extra }; });
map('frontwing', ['FrontWing']);
map('chassis', ['Chassis', 'Cockpit_Interior', 'Headrest_L', 'Headrest_R']);
map('halo', ['Halo']);
map('sidepod', ['Sidepod_L', 'Sidepod_R', 'Sidepod_Inlet_L', 'Sidepod_Inlet_R', 'Sidepod_Lip_L', 'Sidepod_Lip_R']);
map('radiator', ['Radiator_L', 'Radiator_R']);
map('floor', ['Floor', 'Floor_Edge_L', 'Floor_Edge_R', 'Floor_Fence_L0', 'Floor_Fence_L1', 'Floor_Fence_L2', 'Floor_Fence_R0', 'Floor_Fence_R1', 'Floor_Fence_R2']);
map('diffuser', ['Diffuser']);
map('rearwing', ['RearWing']);
map('flap', ['RearWing_Flap']);
map('beamwing', ['BeamWing']);
map('cover', ['EngineCover', 'Airbox_Intake', 'SharkFin', 'Spine_Stripe']);
map('ice', ['PU_ICE'], { pu: true });
map('turbo', ['PU_Turbo'], { pu: true });
map('mguh', ['ERS_MGUH'], { pu: true });
map('mguk', ['ERS_MGUK'], { pu: true });
map('battery', ['ERS_Battery'], { pu: true });
map('control', ['ERS_Control'], { pu: true });
map('fuel', ['FuelCell'], { pu: true });
map('gearbox', ['Gearbox']);
map('tyre', ['Tyre_FL', 'Tyre_FR', 'Tyre_RL', 'Tyre_RR']);
map('suspension', ['Suspension_Front', 'Suspension_Rear']);
map('steering', ['SteeringWheel']);
map('driver', ['Driver']);
map('mirror', ['Mirror_L', 'Mirror_R', 'Mirror_Stalk_L', 'Mirror_Stalk_R', 'Mirror_Glass_L', 'Mirror_Glass_R']);
map('light', ['RearLight']);
map('brakeduct', ['BrakeDuct_FL', 'BrakeDuct_FR', 'BrakeDuct_RL', 'BrakeDuct_RR']);

// Exploded view offsets (modern car)
const L = -1, R = 1;   // left side of car is -z in three.js
export const EXPLODE = {
  Driver: [0, 1.05, 0], SteeringWheel: [0.2, 0.8, 0], Halo: [0, 0.62, 0], Headrest_L: [0, 0.3, 0], Headrest_R: [0, 0.3, 0],
  EngineCover: [-0.1, 0.95, 0], Airbox_Intake: [-0.1, 0.95, 0], SharkFin: [-0.1, 0.95, 0], Spine_Stripe: [-0.1, 0.95, 0],
  FrontWing: [1.0, -0.1, 0],
  RearWing: [-1.0, 0.35, 0], RearWing_Flap: [-1.0, 0.6, 0], BeamWing: [-0.85, 0.05, 0], RearLight: [-0.65, 0, 0],
  Floor: [0, -0.45, 0], Floor_Edge_L: [0, -0.45, 0], Floor_Edge_R: [0, -0.45, 0], Diffuser: [-0.55, -0.45, 0],
  Gearbox: [-0.45, 0, 0], Suspension_Front: [0.12, 0, 0], Suspension_Rear: [-0.12, 0, 0],
  PU_ICE: [-0.1, 0.45, 0], PU_Turbo: [-0.25, 0.78, 0], ERS_MGUH: [-0.25, 0.78, 0], ERS_MGUK: [0, 0.15, 0.5 * L],
  ERS_Battery: [0.25, -0.28, 0], ERS_Control: [0, 0.1, 0.5 * R], FuelCell: [0.12, 0.55, 0],
};
for (const s of ['L', 'R']) {
  const z = (s === 'L' ? L : R);
  for (const n of ['Sidepod_', 'Sidepod_Inlet_', 'Sidepod_Lip_']) EXPLODE[n + s] = [0, 0, 0.75 * z];
  for (const n of ['Mirror_', 'Mirror_Stalk_', 'Mirror_Glass_']) EXPLODE[n + s] = [0, 0.25, 0.75 * z];
  EXPLODE['Radiator_' + s] = [0, 0.12, 0.42 * z];
  for (let k = 0; k < 3; k++) EXPLODE[`Floor_Fence_${s}${k}`] = [0, -0.45, 0];
  EXPLODE['Tyre_F' + s] = [0.15, 0, 0.75 * z];
  EXPLODE['Tyre_R' + s] = [-0.1, 0, 0.75 * z];
  EXPLODE['BrakeDuct_F' + s] = [0.1, 0, 0.42 * z];
  EXPLODE['BrakeDuct_R' + s] = [-0.1, 0, 0.42 * z];
}

export const LABELS_ANATOMY = [
  ['FrontWing', 'Front wing'], ['Chassis', 'Survival cell'], ['Halo', 'Halo'], ['Sidepod_R', 'Sidepod'],
  ['Radiator_R', 'Radiator'], ['Floor', 'Floor'], ['Diffuser', 'Diffuser'], ['RearWing', 'Rear wing'],
  ['EngineCover', 'Engine cover'], ['PU_ICE', 'Power unit'], ['ERS_Battery', 'Battery'], ['Gearbox', 'Gearbox'],
  ['Tyre_FR', 'Tyre'], ['Suspension_Front', 'Suspension'], ['SteeringWheel', 'Steering wheel'],
];
export const LABELS_PU = [
  ['PU_ICE', 'ICE · V6'], ['PU_Turbo', 'Turbo'], ['ERS_MGUH', 'MGU-H'], ['ERS_MGUK', 'MGU-K'],
  ['ERS_Battery', 'Battery (ES)'], ['ERS_Control', 'CE'], ['FuelCell', 'Fuel cell'],
];

// Parts list shown as buttons in the anatomy chapter
export const ANATOMY_BUTTONS = [
  ['FrontWing', 'Front wing'], ['Chassis', 'Survival cell'], ['Halo', 'Halo'], ['Sidepod_R', 'Sidepods'], ['Radiator_R', 'Radiators'],
  ['Floor', 'Floor'], ['Diffuser', 'Diffuser'], ['RearWing', 'Rear wing'], ['RearWing_Flap', 'DRS flap'], ['BeamWing', 'Beam wing'],
  ['EngineCover', 'Engine cover'], ['PU_ICE', 'Engine (ICE)', true], ['PU_Turbo', 'Turbo', true], ['ERS_MGUK', 'MGU-K', true],
  ['ERS_MGUH', 'MGU-H', true], ['ERS_Battery', 'Battery', true], ['FuelCell', 'Fuel cell', true], ['Gearbox', 'Gearbox'],
  ['Tyre_FR', 'Tyres'], ['Suspension_Front', 'Suspension'], ['SteeringWheel', 'Steering wheel'], ['Driver', 'Driver'],
  ['BrakeDuct_FR', 'Brake ducts'], ['RearLight', 'Rear light'],
];
