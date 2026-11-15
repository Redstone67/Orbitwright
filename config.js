// All game-balance data lives here. Numbers are educational approximations, NOT NASA measurements or flight-qualified values.
// Units: mass kg, power W, data GB/day, cost in millions of US dollars (invented game values), time months.
export const BASE_LOAD = 15; // W the spacecraft always draws (housekeeping, heaters). Shown in the ledger so it is not a hidden number.
export const MISSION_DAYS = 30; // accelerated flight rehearsal

export const DIFFICULTIES = {
  Sandbox: { budget: 999, events: 0, adv: true, block: false, deadline: 99, label: 'No limits, no surprises. Launch is never blocked.' },
  Cadet: { budget: 150, events: 2, adv: false, block: true, deadline: 36, label: 'Simple parts only, generous budget.' },
  Engineer: { budget: 120, events: 3, adv: true, block: true, deadline: 28, label: 'Advanced parts, real trade-offs.' },
  'Flight Director': { budget: 100, events: 4, adv: true, block: true, deadline: 24, label: 'Tight margins, more anomalies.' }
};

export const SEGMENTS = ['Launch', 'Space', 'Ground', 'User']; // NASA mission segments

export const MISSIONS = [
  { id: 'stormwatch', icon: 'storm', name: 'Stormwatch', tag: 'EARTH OBSERVATION', objective: 'Track hurricane formation and measure cloud-top temperatures before landfall.',
    why: 'Earlier, better storm tracking gives coastal communities more warning time.', orbits: ['LEO', 'SSO'], minLife: 12, need: 9,
    conops: 'Launch, deploy, image storms daily, downlink each pass.', challenge: 'Lots of image data and short passes over ground stations.',
    real: ['GOES-R series', 'TROPICS CubeSats'] },
  { id: 'neo', icon: 'asteroid', name: 'Near-Earth Watch', tag: 'PLANETARY DEFENCE', objective: 'Detect and track asteroids that pass close to Earth, from a high Earth orbit.',
    why: 'Finding hazardous asteroids early leaves time to study them and decide what to do.', orbits: ['HEO', 'GEO'], minLife: 12, need: 9,
    conops: 'Launch, reach high orbit, survey the sky, downlink detections.', challenge: 'Far orbit means weak signal and a costly launch.',
    real: ['NEOWISE', 'NEO Surveyor (planned)'] },
  { id: 'lunar-ice', icon: 'moon', name: 'Lunar Waterline', tag: 'LUNAR EXPLORATION', objective: 'Map possible water-ice deposits near permanently shadowed lunar regions.',
    why: 'Water on the Moon could supply future explorers with drinking water and fuel.', orbits: ['LLO'], minLife: 12, need: 9,
    conops: 'Launch, transfer to the Moon, enter low lunar orbit, map the poles.', challenge: 'Long eclipses behind the Moon and a heavy launch penalty.',
    real: ['Lunar Reconnaissance Orbiter', 'LCROSS'] },
  { id: 'helios', icon: 'sun', name: 'Helios Watch', tag: 'SPACE WEATHER', objective: 'Monitor solar flares and energetic particles to improve space-weather alerts.',
    why: 'Solar storms can disrupt satellites, radio and power grids, so warnings protect them.', orbits: ['GEO', 'HEO'], minLife: 18, need: 8,
    conops: 'Launch, reach high orbit, watch the Sun continuously, send alerts.', challenge: 'Radiation exposure and a need for long lifetime.',
    real: ['SOHO', 'DSCOVR'] },
  { id: 'red-planet', icon: 'planet', name: 'Red Planet Mapper', tag: 'MARS SCIENCE', objective: 'Survey surface minerals and find regions with evidence of past water.',
    why: 'Where water once flowed is where life might have existed, and where we might land.', orbits: ['MARS'], minLife: 18, need: 9,
    conops: 'Launch, cruise to Mars, enter orbit, map minerals, relay data home.', challenge: 'Dim sunlight (about 43% of Earth) and a very slow link home.',
    real: ['Mars Reconnaissance Orbiter', 'MAVEN'] }
];

// "adv" parts are hidden on Cadet. Each part: mass, power draw, cost, plus its own performance number.
export const PARTS = {
  bus: [
    { id: 'micro', name: 'CubeSat-class bus', mass: 45, power: 0, cost: 7, shield: 0.1, desc: 'Small and cheap, with little radiation protection.' },
    { id: 'standard', name: 'Standard bus', mass: 110, power: 0, cost: 13, shield: 0.3, desc: 'Flexible small-satellite platform with some shielding.' },
    { id: 'heavy', name: 'Hardened bus', mass: 210, power: 0, cost: 21, shield: 0.5, adv: true, desc: 'Heavy and costly, but protects electronics best.' }
  ],
  power: [
    { id: 'body', name: 'Body-mounted solar', mass: 12, power: 0, cost: 5, gen: 90, desc: 'Fixed panels: simple and light, but few watts.' },
    { id: 'wings', name: 'Deployable solar wings', mass: 32, power: 0, cost: 10, gen: 200, desc: 'Bigger panels make more power but weigh more.' },
    { id: 'hieff', name: 'High-efficiency array', mass: 24, power: 0, cost: 15, gen: 280, adv: true, desc: 'Most watts per kilogram, at a high price.' }
  ],
  battery: [
    { id: 'b1', name: 'Small battery (60 Wh)', mass: 5, power: 0, cost: 3, wh: 60, desc: 'Light, but covers only short eclipses.' },
    { id: 'b2', name: 'Medium battery (180 Wh)', mass: 14, power: 0, cost: 7, wh: 180, desc: 'A balanced choice for most orbits.' },
    { id: 'b3', name: 'Large battery (420 Wh)', mass: 30, power: 0, cost: 13, wh: 420, adv: true, desc: 'Rides through long eclipses.' }
  ],
  comms: [
    { id: 'uhf', name: 'UHF radio', mass: 4, power: 8, cost: 3, rate: 3, desc: 'Cheap and robust, but slow (3 GB/day at best).' },
    { id: 'xband', name: 'X-band system', mass: 12, power: 24, cost: 8, rate: 18, desc: 'A good balance of data rate, mass and power.' },
    { id: 'laser', name: 'Optical terminal', mass: 18, power: 42, cost: 14, rate: 45, adv: true, desc: 'Very fast but demanding on power and pointing.' }
  ],
  computer: [
    { id: 'c1', name: 'Basic computer (20 GB)', mass: 3, power: 6, cost: 3, store: 20, shield: 0, desc: 'Little storage to hold data between ground contacts.' },
    { id: 'c2', name: 'Standard computer (60 GB)', mass: 5, power: 10, cost: 6, store: 60, shield: 0.1, desc: 'Enough buffer for moderate data volumes.' },
    { id: 'c3', name: 'Radiation-hardened (120 GB)', mass: 8, power: 16, cost: 14, store: 120, shield: 0.3, adv: true, desc: 'Big storage and tolerant of radiation.' }
  ],
  adcs: [
    { id: 'a1', name: 'Magnetorquers (pointing 1)', mass: 4, power: 3, cost: 3, acc: 1, desc: 'Coarse pointing, very low power.' },
    { id: 'a2', name: 'Reaction wheels (pointing 2)', mass: 14, power: 12, cost: 9, acc: 2, desc: 'Good pointing for most instruments.' },
    { id: 'a3', name: 'Star tracker + wheels (pointing 3)', mass: 22, power: 20, cost: 18, acc: 3, adv: true, desc: 'Precise pointing for sharp imaging.' }
  ],
  instruments: [
    { id: 'widecam', name: 'Wide-field camera', mass: 18, power: 16, cost: 6, data: 5, acc: 1, use: 'Broad scenes for context and frequent coverage.' },
    { id: 'hires', name: 'High-resolution imager', mass: 34, power: 32, cost: 11, data: 12, acc: 3, adv: true, use: 'Small features, but large data volumes and sharp pointing.' },
    { id: 'spectrometer', name: 'Imaging spectrometer', mass: 26, power: 27, cost: 9, data: 8, acc: 2, use: 'Identifies materials by their light fingerprint.' },
    { id: 'thermal', name: 'Thermal infrared sensor', mass: 22, power: 22, cost: 8, data: 6, acc: 1, use: 'Measures heat: cloud tops, ground temperature.' },
    { id: 'magnetometer', name: 'Magnetometer', mass: 8, power: 7, cost: 4, data: 1, acc: 1, use: 'Measures magnetic fields. Low data volume.' },
    { id: 'radar', name: 'Synthetic aperture radar', mass: 58, power: 75, cost: 17, data: 20, acc: 2, adv: true, use: 'Sees through cloud and darkness. Power hungry.' },
    { id: 'particle', name: 'Particle detector', mass: 14, power: 13, cost: 6, data: 2, acc: 1, use: 'Counts energetic particles, key for space weather.' }
  ]
};

// Science points of each instrument for each mission. The RIGHT instrument matters more than the biggest one.
export const SCIENCE = {
  widecam: { stormwatch: 3, neo: 2, 'lunar-ice': 1, helios: 0, 'red-planet': 2 },
  hires: { stormwatch: 2, neo: 4, 'lunar-ice': 3, helios: 0, 'red-planet': 3 },
  spectrometer: { stormwatch: 1, neo: 4, 'lunar-ice': 4, helios: 0, 'red-planet': 5 },
  thermal: { stormwatch: 4, neo: 2, 'lunar-ice': 3, helios: 0, 'red-planet': 2 },
  magnetometer: { stormwatch: 0, neo: 1, 'lunar-ice': 1, helios: 3, 'red-planet': 1 },
  radar: { stormwatch: 3, neo: 2, 'lunar-ice': 4, helios: 0, 'red-planet': 3 },
  particle: { stormwatch: 0, neo: 0, 'lunar-ice': 1, helios: 5, 'red-planet': 1 }
};

// cap = payload kg by orbit (0 = cannot reach). Derived from nothing official: simplified for gameplay.
export const LAUNCHERS = [
  { id: 'small', name: 'Small rideshare', cost: 8, cap: { LEO: 250, SSO: 180, HEO: 0, GEO: 0, LLO: 0, MARS: 0 }, desc: 'Cheap, but only reaches Earth-near orbits.' },
  { id: 'medium', name: 'Medium launcher', cost: 15, cap: { LEO: 900, SSO: 650, HEO: 420, GEO: 350, LLO: 260, MARS: 0 }, desc: 'Versatile, but cannot reach Mars.' },
  { id: 'heavy', name: 'Heavy launcher', cost: 25, cap: { LEO: 2200, SSO: 1600, HEO: 1100, GEO: 950, LLO: 750, MARS: 500 }, desc: 'Reaches everywhere, at a premium price.' }
];

// signal = relative link quality; ecl = eclipse hours per orbit; gap = share of daily data to buffer between ground contacts; life = months; rad = radiation level 0-1.
export const ORBITS = [
  { id: 'LEO', name: 'Low Earth orbit', alt: '400-700 km', signal: 1, sun: 1, ecl: 0.6, gap: 0.8, life: 24, rad: 0.2, cost: 4, ring: 30, desc: 'Close to Earth: strong link, frequent passes, narrow view, short ground contact.' },
  { id: 'SSO', name: 'Sun-synchronous orbit', alt: '600-800 km', signal: 0.9, sun: 1, ecl: 0.4, gap: 0.8, life: 30, rad: 0.2, cost: 7, ring: 36, desc: 'Passes each place at the same local solar time: ideal for comparing images.' },
  { id: 'HEO', name: 'Highly elliptical orbit', alt: 'varies', signal: 0.75, sun: 1, ecl: 0.5, gap: 0.5, life: 36, rad: 0.5, cost: 10, ring: 52, desc: 'Long views of high latitudes. Distance, and so link quality, keeps changing.' },
  { id: 'GEO', name: 'Geostationary orbit', alt: '35,786 km', signal: 0.65, sun: 1, ecl: 0.1, gap: 0.1, life: 60, rad: 0.5, cost: 13, ring: 60, desc: 'Fixed view and near-constant contact, but far away and costly to reach.' },
  { id: 'LLO', name: 'Low lunar orbit', alt: '~100 km above Moon', signal: 0.55, sun: 1, ecl: 0.8, gap: 0.5, life: 24, rad: 0.5, cost: 17, ring: 44, desc: 'Close-up Moon mapping, long eclipse behind the Moon.' },
  { id: 'MARS', name: 'Mars orbit', alt: 'mission-dependent', signal: 0.35, sun: 0.43, ecl: 0.7, gap: 0.6, life: 36, rad: 0.5, cost: 23, ring: 56, desc: 'Planet-wide mapping, but dim sunlight and a slow link to Earth.' }
];

// Short plain-language explanations shown above each design section (progressive learning).
export const LEARN = {
  bus: 'The bus is the frame and shielding. More shielding protects against radiation but adds mass.',
  power: 'Solar panels make power (watts). Everything you add draws power, so generation must exceed demand.',
  battery: 'In eclipse the panels make nothing, so the battery must carry the whole load until sunlight returns.',
  comms: 'Downlink is how many GB per day you can send to Earth. Data you cannot send stays onboard or is lost.',
  computer: 'The computer stores data between ground-station contacts. Too little storage means lost observations.',
  adcs: 'Attitude control points the spacecraft. Sharp instruments need accurate pointing.',
  instruments: 'Instruments create the science, and also the mass, power draw and data. Match them to the objective.'
};
export const SECTIONS = [['bus', 'Structure and shielding'], ['power', 'Power generation'], ['battery', 'Battery storage'], ['comms', 'Communications'], ['computer', 'Onboard computer'], ['adcs', 'Attitude control']];

// Where each source is used in the game.
export const SOURCES = [
  ['Design and Develop Science Missions', 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf', 'Four mission segments (launch, space, ground, user) organise the ledger, review and debrief.'],
  ['Concept Maturity Levels (JPL)', 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299', 'The CML badge shows how mature your concept is as you move through the stages (simplified).'],
  ['Mission Design Lab (NASA GSFC)', 'https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/', 'Stages follow concept, trade study and point design. Designs can be compared as trade studies.'],
  ['Mission Viz', 'https://nasa.github.io/mission-viz/', 'Inspired the orbit view and flight timeline. For real 3D trajectories, use it.'],
  ['CubeSat 101', 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf', 'The CubeSat-class bus and the one-line concept of operations (ConOps) for each mission.'],
  ['GMAT', 'https://software.nasa.gov/software/GSC-19468-1', 'Not used. Our orbit model is far simpler; GMAT is the real tool for trajectories.'],
  ['Webb: Build It Yourself', 'https://science.nasa.gov/mission/webb/game-build-it-yourself/', 'Inspired objective-first design and the "real missions like yours" list.'],
  ['CSA digital games and activities', 'https://www.asc-csa.gc.ca/eng/learning-resources/', 'Further learning (partner resource).']
];
