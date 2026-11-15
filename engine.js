import { PARTS, ORBITS, LAUNCHERS, DIFFICULTIES, MISSIONS, SCIENCE, BASE_LOAD, MISSION_DAYS } from './config.js';

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const find = (list, id) => list.find(x => x.id === id);
const SUBS = ['bus', 'power', 'battery', 'comms', 'computer', 'adcs'];

// ---------- 1. THE ENGINEERING MODEL (one place for every formula) ----------
export function evaluate(s) {
  const mission = find(MISSIONS, s.mission), diff = DIFFICULTIES[s.difficulty];
  const orbit = find(ORBITS, s.orbit), launcher = find(LAUNCHERS, s.launcher);
  const [bus, power, battery, comms, computer, adcs] = SUBS.map(k => find(PARTS[k], s[k]));
  const inst = PARTS.instruments.filter(x => s.instruments.includes(x.id));
  const all = [bus, power, battery, comms, computer, adcs, ...inst];
  const sum = k => all.reduce((a, x) => a + (x[k] || 0), 0);

  const mass = sum('mass');
  const generation = power.gen * orbit.sun;              // sunlight is weaker at Mars
  const demand = BASE_LOAD + sum('power');               // all instruments assumed on (conservative)
  const margin = generation - demand;
  const battNeed = demand * orbit.ecl;                   // Wh to survive eclipse = load x eclipse hours
  const data = inst.reduce((a, x) => a + x.data, 0);
  const downlink = comms.rate * orbit.signal;            // GB/day
  const storeNeed = data * orbit.gap;                    // data to hold between ground contacts
  const capacity = launcher.cap[orbit.id];
  const points = inst.reduce((a, x) => a + SCIENCE[x.id][mission.id], 0);
  const devMonths = 12 + inst.length * 1.5 + all.filter(x => x.adv).length * 2;
  const marginRatio = generation ? margin / generation : -1;
  return {
    mission, diff, orbit, launcher, inst, mass, generation, demand, margin, marginRatio, battNeed,
    battWh: battery.wh, data, downlink, storeNeed, storeGB: computer.store, acc: adcs.acc,
    accNeed: Math.max(0, ...inst.map(x => x.acc)), shield: bus.shield + computer.shield,
    cost: all.reduce((a, x) => a + x.cost, 0) + launcher.cost + orbit.cost, capacity, launchMargin: capacity - mass,
    reachable: capacity > 0, orbitOK: mission.orbits.includes(orbit.id), points, need: mission.need, fit: points / mission.need,
    useless: inst.filter(x => SCIENCE[x.id][mission.id] === 0), devMonths,
    life: Math.round(orbit.life * cl(0.6 + marginRatio, 0.3, 1.2)), budget: diff.budget
  };
}

// ---------- 2. DESIGN REVIEW: PASS / WARNING / CRITICAL, grouped by NASA mission segment ----------
export function review(r) {
  const L = [], add = (seg, name, lvl, text) => L.push({ seg, name, lvl, text });
  add('Launch', 'Orbit fits the science', r.orbitOK ? 0 : 2, r.orbitOK ? `${r.orbit.name} supports ${r.mission.name}.` : `${r.mission.name} needs ${r.mission.orbits.join(' or ')}.`);
  add('Launch', 'Launcher mass capacity', !r.reachable || r.launchMargin < 0 ? 2 : r.launchMargin < 0.1 * r.capacity ? 1 : 0,
    !r.reachable ? `${r.launcher.name} cannot reach ${r.orbit.id}.` : `${r.mass} kg vs ${r.capacity} kg capacity (${r.launchMargin} kg margin).`);
  add('Space', 'Power balance', r.margin < 0 ? 2 : r.marginRatio < 0.15 ? 1 : 0, `${Math.round(r.generation)} W made, ${r.demand} W needed (margin ${Math.round(r.margin)} W).`);
  add('Space', 'Eclipse battery', r.battWh < r.battNeed ? 2 : r.battWh < 1.2 * r.battNeed ? 1 : 0, `${r.battWh} Wh stored vs ${Math.round(r.battNeed)} Wh needed in eclipse.`);
  add('Space', 'Pointing accuracy', r.acc < r.accNeed ? 1 : 0, `Pointing level ${r.acc} vs ${r.accNeed} needed by the payload.`);
  add('Space', 'Data storage', r.storeGB < 0.5 * r.storeNeed ? 2 : r.storeGB < r.storeNeed ? 1 : 0, `${r.storeGB} GB storage vs ${r.storeNeed.toFixed(1)} GB to buffer between contacts.`);
  add('Space', 'Mission lifetime', r.life < r.mission.minLife ? 1 : 0, `Estimated ${r.life} months vs ${r.mission.minLife} wanted.`);
  add('Ground', 'Downlink capacity', r.data && r.downlink < 0.4 * r.data ? 2 : r.downlink < r.data ? 1 : 0, `Link returns ${r.downlink.toFixed(1)} GB/day vs ${r.data} GB/day produced.`);
  add('User', 'Science payload', r.points === 0 ? 2 : r.fit < 1 ? 1 : 0, r.points === 0 ? 'No useful science instruments for this objective.' : `${r.points} science points vs ${r.need} needed.`);
  add('User', 'Budget', r.cost > r.budget ? 2 : r.cost > 0.9 * r.budget ? 1 : 0, `$${r.cost}M of $${r.budget}M.`);
  add('User', 'Development schedule', r.devMonths > r.diff.deadline + 6 ? 2 : r.devMonths > r.diff.deadline ? 1 : 0, `${r.devMonths} months to build vs ${r.diff.deadline} available.`);
  return L;
}
export const blocked = (r, rv) => r.diff.block && rv.some(x => x.lvl === 2);

// ---------- 3. TEAM ROLES ----------
export function roleChecks(r) {
  return [
    { id: 'planner', name: 'Mission Planner', goal: 'Right orbit, and at least 10% spare launch capacity.', met: r.orbitOK && r.reachable && r.launchMargin >= 0.1 * r.capacity },
    { id: 'engineer', name: 'Spacecraft Engineer', goal: 'At least 15% spare power and a battery that survives eclipse.', met: r.marginRatio >= 0.15 && r.battWh >= r.battNeed },
    { id: 'science', name: 'Science Lead', goal: 'Collect all the science the mission needs.', met: r.points >= r.need },
    { id: 'ops', name: 'Flight Operations Officer', goal: 'Stay under 90% of budget and send all data home.', met: r.cost <= 0.9 * r.budget && r.downlink >= r.data }
  ];
}
export function conflicts(rs) {
  const g = id => rs.find(x => x.id === id).met, c = [];
  if (g('science') && !g('ops')) c.push('Science Lead vs Operations: the payload is great but the budget or downlink is stretched. Who gives way?');
  if (g('science') && !g('engineer')) c.push('Science Lead vs Engineer: more instruments ate the power reserve. Trim payload or buy bigger panels?');
  if (g('ops') && !g('science')) c.push('Operations vs Science: the cheap design leaves science short. Is one more instrument worth it?');
  return c;
}

// ---------- 4. FLIGHT SIMULATION (deterministic: the design alone decides the events) ----------
function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Each event has a vulnerability v (0-1) computed from YOUR design. Higher v = bigger impact. Two choices each.
const EVENTS = {
  power: { title: 'Power degradation', base: 18, v: r => cl(1 - r.marginRatio * 3, 0.1, 1),
    text: (r, v) => `A solar array loses output. Your power margin is ${Math.round(r.margin)} W (${Math.round(r.marginRatio * 100)}%).`,
    opts: [['Shed payload for 3 days', 'Safe, but no science meanwhile.', (x, k) => { x.safe += 3; x.health -= k.base * 0.3 * k.sev; }],
           ['Run on battery and keep observing', 'Keeps science, strains the system.', (x, k) => { x.health -= k.base * k.sev * (k.r.battWh < k.r.battNeed ? 1.5 : 1); }]] },
  rad: { title: 'Radiation storm', base: 20, v: r => cl(r.orbit.rad * (1 - r.shield) * 1.4 + 0.1, 0.1, 1),
    text: (r, v) => `Energetic particles hit in ${r.orbit.name}. Your shielding level is ${r.shield.toFixed(1)}.`,
    opts: [['Enter safe mode for 2 days', 'Protects electronics, pauses science.', (x, k) => { x.safe += 2; x.health -= k.base * 0.25; }],
           ['Keep observing', 'No lost time, higher damage risk.', (x, k) => { x.health -= k.base * k.sev; }]] },
  comm: { title: 'Ground link outage', base: 0, v: r => cl(1.1 - (r.downlink / Math.max(1, r.data)) * 0.5, 0.15, 1),
    text: (r, v) => `A ground station drops out. Your link sends ${r.downlink.toFixed(1)} GB/day against ${r.data} GB/day produced, so a backlog builds.`,
    opts: [['Prioritise the best data', 'Shorter outage, but drops 30% of stored data.', (x) => { x.link += 2; x.lost += x.stored * 0.3; x.stored *= 0.7; }],
           ['Keep everything queued', 'Nothing deleted, but the link stays weak longer.', (x) => { x.link += 3; }]] },
  cal: { title: 'Instrument calibration drift', base: 0, v: r => cl(0.15 + (r.accNeed - r.acc) * 0.35, 0.1, 1),
    text: (r, v) => `Instruments drift out of calibration. Pointing level is ${r.acc} and your payload wants ${r.accNeed}.`,
    opts: [['Recalibrate for 2 days', 'Pauses science, clean data after.', (x) => { x.safe += 2; }],
           ['Correct on the ground later', 'No pause, lower data quality.', (x, k) => { x.sci = Math.max(0.5, x.sci - 0.12 * k.sev); }]] },
  disc: { title: 'Unexpected discovery', base: 0, v: () => 0,
    text: () => 'Your instruments spot something outside the plan.',
    opts: [['Retask observations', '+8 science points, more strain on the bus.', (x, k) => { x.pts += 8; x.health -= 3 + (k.r.marginRatio < 0.1 ? 4 : 0); }],
           ['Log it and continue', '+2 science points, no risk.', (x) => { x.pts += 2; }]] }
};

export function createSim(r, s) {
  const R = rng(hash(JSON.stringify(s))), days = [7, 12, 20, 25], n = r.diff.events;
  const neg = ['power', 'rad', 'comm', 'cal'].map(id => ({ id, v: EVENTS[id].v(r), w: EVENTS[id].v(r) * (0.7 + 0.6 * R()) }))
    .sort((a, b) => b.w - a.w).slice(0, n).sort((a, b) => b.v - a.v);
  const plan = neg.map((e, i) => ({ ...e, day: days[i] }));
  if (n > 0 && r.points > 0) plan.push({ id: 'disc', v: 0, day: 16 });
  return { day: 0, stored: 0, down: 0, raw: 0, lost: 0, health: 100, sci: 1, safe: 0, link: 0, pts: 0, log: [], decisions: [], pending: null, plan, done: false };
}
export function phase(day) {
  return day <= 1 ? 'Launch and deployment' : day <= 3 ? 'Spacecraft activation' : day <= 5 ? 'Orbit insertion / trajectory' : day <= 8 ? 'Instrument commissioning' : day <= 24 ? 'Science observation and downlink' : 'Extended operations';
}
export function step(sim, r) {
  if (sim.pending || sim.done) return sim;
  const x = { ...sim, log: [...sim.log] };
  x.day++;
  let collect = r.data * (r.margin < 0 ? 0.55 : 1);       // brown-outs cut observations
  if (x.safe > 0) { collect = 0; x.safe--; }
  x.stored += collect;
  if (x.stored > r.storeGB) { x.lost += x.stored - r.storeGB; x.stored = r.storeGB; }  // storage full: data lost
  const sent = Math.min(x.stored, r.downlink * (x.link > 0 ? 0.35 : 1));
  if (x.link > 0) x.link--;
  x.stored -= sent; x.raw += sent; x.down += sent * x.sci;
  if (r.margin < 0) x.health -= 1.5;
  if (r.battWh < r.battNeed) x.health -= 0.5;
  x.health = Math.max(0, x.health);
  if (x.health === 0) {
    x.log.push(`Day ${x.day}: Spacecraft lost (health reached 0%).`);
    x.done = true;
    return x;
  }
  const ev = x.plan.find(e => e.day === x.day);
  if (ev) { x.pending = ev; x.log.push(`Day ${x.day}: ${EVENTS[ev.id].title}`); }
  if (x.day >= MISSION_DAYS && !x.pending) x.done = true;
  return x;
}
export const eventInfo = (ev, r) => ({ title: EVENTS[ev.id].title, text: EVENTS[ev.id].text(r, ev.v), opts: EVENTS[ev.id].opts.map(o => ({ label: o[0], desc: o[1] })) });
export function decide(sim, i, r) {
  const ev = sim.pending, E = EVENTS[ev.id], x = { ...sim, log: [...sim.log], decisions: [...sim.decisions] };
  const k = { r, base: E.base, sev: 0.4 + 1.2 * ev.v };
  E.opts[i][2](x, k);
  x.health = cl(x.health, 0, 100);
  x.decisions.push({ day: ev.day, id: ev.id, title: E.title, choice: E.opts[i][0], v: ev.v, cause: E.text(r, ev.v) });
  x.log.push(`Day ${ev.day}: chose "${E.opts[i][0]}".`);
  x.pending = null;
  if (x.health === 0) {
    x.log.push(`Day ${x.day}: Spacecraft lost (health reached 0%).`);
    x.done = true;
  } else if (x.day >= MISSION_DAYS) {
    x.done = true;
  }
  return x;
}

// ---------- 5. SCORING, STORY, SUGGESTIONS ----------
export function report(sim, r, rv, team) {
  const retr = r.data ? cl(sim.down / (r.data * MISSION_DAYS), 0, 1) : 0;
  const science = cl(cl(r.fit, 0, 1) * 100 * retr + sim.pts, 0, 100);
  const crit = rv.filter(x => x.lvl === 2).length, warn = rv.filter(x => x.lvl === 1).length;
  const refBudget = r.budget > 500 ? 150 : r.budget;
  const parts = {
    'Scientific achievement': [science, 0.3], 'Engineering feasibility': [cl(100 - 35 * crit - 12 * warn, 0, 100), 0.2],
    'Resource efficiency': [cl(80 * (science / 100) / (r.cost / refBudget), 0, 100), 0.15], 'Reliability': [sim.health, 0.1],
    'Communications': [retr * 100, 0.1], 'Schedule': [cl(100 - 10 * (r.devMonths - r.diff.deadline), 0, 100), 0.05]
  };
  if (team) parts['Team coordination'] = [roleChecks(r).filter(x => x.met).length * 25, 0.1];
  const wsum = Object.values(parts).reduce((a, p) => a + p[1], 0);
  const total = Math.round(Object.values(parts).reduce((a, p) => a + p[0] * p[1], 0) / wsum);
  const status = science >= 70 && sim.health >= 50 ? 'MISSION SUCCESS' : science >= 35 && sim.health >= 25 ? 'PARTIAL SUCCESS' : 'MISSION FAILURE';
  const names = r.inst.map(x => x.name);
  const story = [
    `You flew ${names.length ? names.join(', ') : 'no instruments'} to ${r.orbit.name} and returned ${Math.round(science)} of 100 science points.`,
    retr < 0.9 ? `Your link returned only ${Math.round(retr * 100)}% of the planned data (${r.downlink.toFixed(1)} GB/day against ${r.data} GB/day produced), and ${sim.lost.toFixed(0)} GB was lost to full storage. More science does not help unless the data gets home.`
      : 'Your downlink kept up with the instruments, so what you observed reached Earth.',
    r.marginRatio < 0.15 ? `Your power margin was only ${Math.round(r.marginRatio * 100)}%, which made power problems hit harder.` : `A ${Math.round(r.marginRatio * 100)}% power margin gave you room to absorb faults.`,
    ...sim.decisions.filter(d => d.v >= 0.5).map(d => `Day ${d.day}, ${d.title}: this was severe because of your design. ${d.cause} You chose "${d.choice}".`),
    r.cost > 0.9 * r.budget ? `You spent ${Math.round(r.cost / r.budget * 100)}% of the budget, leaving little margin.` : `You used ${Math.round(r.cost / r.budget * 100)}% of the budget.`
  ];
  return { total, status, science, retr, parts, story, health: sim.health, lost: sim.lost, decisions: sim.decisions, crit, warn };
}
export function suggest(r) {
  const s = [], hog = [...r.inst].sort((a, b) => b.power - a.power)[0];
  if (r.margin < 0 && hog) s.push(`Drop the ${hog.name}: it frees ${hog.power} W and ${hog.mass} kg.`);
  if (r.data && r.downlink < r.data) s.push(`Instruments make ${r.data} GB/day but the link returns ${r.downlink.toFixed(1)}. A faster radio or a lower-data instrument closes the gap.`);
  if (r.launchMargin < 0) s.push(`Shed ${-r.launchMargin} kg or pick a bigger launcher.`);
  if (r.useless.length) s.push(`The ${r.useless.map(x => x.name).join(' and ')} adds no science here. Swap it for one that fits the objective.`);
  if (!r.inst.length) s.push('Add at least three instruments that match the objective.');
  else if (!s.length) s.push('Everything passed. Try removing your costliest instrument to see what that saving costs in science.');
  s.push('There is no single best spacecraft. A light craft on a cheap rocket and a heavy one with a big dish can both succeed.');
  return s.slice(0, 4);
}
// Simplified Concept Maturity Level (NASA/JPL CML 1-4). stage: 0 concept, 1 architecture, 2 design, 3 review, 4+ flight
export function cml(stage, rv) {
  if (stage === 0) return 1;
  if (stage === 1) return 2;
  if (stage === 2) return 3;
  return rv.some(x => x.lvl === 2) ? 3 : 4;
}
