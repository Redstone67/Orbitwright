import React, { useEffect, useMemo, useState } from 'react';
import { MISSIONS, PARTS, ORBITS, LAUNCHERS, DIFFICULTIES, SEGMENTS, SECTIONS, LEARN, SOURCES, SCIENCE, MISSION_DAYS } from './config.js';
import { evaluate, review, blocked, roleChecks, conflicts, createSim, step, decide, eventInfo, phase, report, suggest } from './engine.js';

const SUBS = SECTIONS.map(x => x[0]);
const INITIAL = { mission: 'stormwatch', difficulty: 'Cadet', bus: 'standard', power: 'wings', battery: 'b2', comms: 'xband', computer: 'c2', adcs: 'a2', instruments: ['widecam', 'thermal'], launcher: 'medium', orbit: 'SSO' };
const STAGES = ['Mission', 'Architecture', 'Spacecraft', 'Review', 'Flight', 'Debrief'];
const LVL = ['PASS', 'WARNING', 'CRITICAL'], LVLC = ['pass', 'warn', 'crit'], LVLI = ['check', 'alert', 'x'];
const f = (v, d = 0) => Number(v).toFixed(d);
const store = (k, v) => { try { v === undefined ? JSON.parse(localStorage.getItem(k)) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

function sanitize(s) {
  let n = { ...INITIAL, ...s };
  if (!MISSIONS.find(m => m.id === n.mission) || !DIFFICULTIES[n.difficulty] || !ORBITS.find(o => o.id === n.orbit) || !LAUNCHERS.find(l => l.id === n.launcher)) return INITIAL;
  for (const k of SUBS) if (!PARTS[k].find(p => p.id === n[k])) n[k] = INITIAL[k];
  n.instruments = (n.instruments || []).filter(id => PARTS.instruments.find(p => p.id === id));
  if (!DIFFICULTIES[n.difficulty].adv) {
    for (const k of SUBS) if (PARTS[k].find(p => p.id === n[k]).adv) n[k] = PARTS[k][1].id;
    n.instruments = n.instruments.filter(id => !PARTS.instruments.find(p => p.id === id).adv);
  }
  const m = MISSIONS.find(x => x.id === n.mission);
  if (n.difficulty !== 'Sandbox' && !m.orbits.includes(n.orbit)) n.orbit = m.orbits[0];
  return n;
}
function loadDesign() {
  return sanitize(read('mc-design', INITIAL));
}
const DELTAS = [['mass', 'Mass', 'kg'], ['demand', 'Power demand', 'W'], ['margin', 'Power margin', 'W'], ['data', 'Data produced', 'GB/day'], ['downlink', 'Downlink', 'GB/day'], ['cost', 'Cost', 'M USD'], ['points', 'Science', 'pts']];
const deltas = (a, b) => DELTAS.map(([k, l, u]) => [l, b[k] - a[k], u]).filter(x => Math.abs(x[1]) > 0.05);
const perf = x => x.gen ? `${x.gen} W` : x.wh ? `${x.wh} Wh` : x.rate ? `${x.rate} GB/day` : x.store ? `${x.store} GB` : x.acc ? `pointing ${x.acc}` : x.shield ? `shield ${x.shield}` : '';

function Meter({ icon, label, val, max, unit, dec = 0 }) {
  const over = val > max, tight = val > 0.9 * max;
  return <div className="meter"><div className="k"><span>{icon && <Icon n={icon} s={14} />}{label}</span><b className={over ? 'crit' : tight ? 'warn' : ''}>{f(val, dec)} / {f(max, dec)} {unit}</b></div>
    <div className="bar"><i className={over ? 'c' : tight ? 'w' : ''} style={{ width: `${Math.min(100, max ? val / max * 100 : 100)}%` }} /></div></div>;
}
function Logo({ size = 34, animated = false }) {
  return <svg className={animated ? 'logo-anim' : ''} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
    <circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.45" />
    <g className="logo-orbit">
      <path d="M8 30 A18 18 0 0 1 40 18" fill="none" stroke="var(--ac)" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="40" cy="18" r="4.5" fill="var(--ac)" />
    </g>
    <circle className="logo-core" cx="24" cy="24" r="4" fill="currentColor" />
  </svg>;
}
const P = {
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />, box: <><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  battery: <><rect x="2" y="7" width="18" height="10" rx="2" /><path d="M22 11v2" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="1" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  radio: <><path d="M5 12a7 7 0 0 1 14 0M8.5 12a3.5 3.5 0 0 1 7 0M12 12v9" /></>,
  flask: <path d="M9 3h6M10 3v6L4 20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1l-6-11V3" />,
  dollar: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  orbit: <><circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" /></>,
  rocket: <><path d="M12 2c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10z" /><circle cx="12" cy="9" r="1.5" /><path d="M9 15l-2 4M15 15l2 4M12 17v4" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, compass: <><circle cx="12" cy="12" r="10" /><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z" /></>,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />,
  palette: <><circle cx="12" cy="12" r="10" /><circle cx="8" cy="11" r="1" fill="currentColor" /><circle cx="12" cy="7.5" r="1" fill="currentColor" /><circle cx="16" cy="11" r="1" fill="currentColor" /></>,
  storm: <><path d="M6 16.3A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 .5 9" /><path d="M13 12l-3 5h4l-3 5" /></>,
  asteroid: <><path d="M7 3l6-1 6 4 2 7-3 6-7 2-6-4-2-6z" /><circle cx="10" cy="9" r="1.2" /><circle cx="15" cy="14" r="1.6" /></>,
  planet: <><circle cx="12" cy="12" r="8" /><path d="M5 10c4 2 8 0 14 2M7 16c3 1 6 0 10-1" /></>,
  oled: <circle cx="12" cy="12" r="9" fill="currentColor" />,
  glass: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
  play: <path d="M6 4l14 8-14 8z" />, pause: <path d="M6 4h4v16H6zM14 4h4v16h-4z" />, step: <path d="M5 4l10 8-10 8zM19 5v14" />,
  check: <path d="M20 6L9 17l-5-5" />, x: <path d="M18 6L6 18M6 6l12 12" />,
  alert: <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  sliders: <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>,
  exit: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>
};
function Icon({ n, s = 16 }) {
  return <svg className="ic" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>;
}
const IC = { bus: 'shield', power: 'zap', battery: 'battery', comms: 'radio', computer: 'cpu', adcs: 'compass' };
const ACCENTS = [['rose', 'Rose', '#b3405a'], ['terracotta', 'Terracotta', '#c2542d'], ['forest', 'Forest', '#3f7a52'], ['plum', 'Plum', '#8a3f6d'], ['amber', 'Amber', '#b7791f']];

function Pop({ button, children }) {
  const [open, setOpen] = useState(false);
  return <div className="pop" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onBlur={ev => { if (!ev.currentTarget.contains(ev.relatedTarget)) setOpen(false); }}>
    {button(open, () => setOpen(o => !o))}{open && <div className="popbox">{children}</div>}</div>;
}
function Settings({ theme, setTheme, accent, setAccent }) {
  return <Pop button={(open, toggle) => <button className="iconbtn" aria-label="Appearance: mode and accent colour" aria-expanded={open} onClick={toggle}><Icon n="palette" s={18} /><span>UI</span></button>}>
    <h4>Mode</h4><div className="seg grid4">{[['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['oled', 'OLED', 'oled'], ['glass', 'Glass', 'glass']].map(([id, n, ic]) => <button key={id} className={theme === id ? 'on' : ''} aria-pressed={theme === id} onClick={() => setTheme(id)}><Icon n={ic} s={14} />{n}</button>)}</div>
    <h4>Accent colour</h4><div className="swatches">{ACCENTS.map(([id, n, c]) => <button key={id} className={'sw' + (accent === id ? ' on' : '')} style={{ background: c }} aria-label={n} title={n} aria-pressed={accent === id} onClick={() => setAccent(id)} />)}</div></Pop>;
}
const STARS = [[12, 10], [40, 26], [70, 8], [95, 30], [150, 14], [190, 9], [220, 28], [230, 70], [205, 100], [18, 95], [60, 70], [110, 18], [175, 48], [135, 100], [28, 52], [212, 50]];
function Sat({ x, y, s = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}><rect x="-14" y="-2.5" width="10" height="5" fill="#d9a441" /><rect x="4" y="-2.5" width="10" height="5" fill="#d9a441" /><rect x="-4" y="-4" width="8" height="8" rx="1.5" fill="#e8e1d6" /></g>;
}
function Scene({ children, label, wide }) {
  return <svg className={'art' + (wide ? ' wide' : '')} viewBox="0 0 240 120" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
    <rect width="240" height="120" fill="#17121c" /><g fill="#fff">{STARS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 0.8 : 1.3} opacity=".7" />)}</g>{children}</svg>;
}
function DiffArt({ id }) {
  const scene = {
    Sandbox: <><circle cx="120" cy="60" r="34" fill="none" stroke="#7bc08f" strokeWidth="2" strokeDasharray="6 4" /><path d="M98 60c0-10 14-14 22 0s22 10 22 0-14-14-22 0-22 10-22 0z" fill="none" stroke="#f7c46b" strokeWidth="2.5" /><Sat x="120" y="26" s="1.1" /></>,
    Cadet: <><circle cx="120" cy="60" r="28" fill="#2f6f8a" opacity=".35" /><path d="M120 34l6 14 15 2-11 10 3 15-13-7-13 7 3-15-11-10 15-2z" fill="#7bc08f" /></>,
    Engineer: <><circle cx="120" cy="60" r="24" fill="none" stroke="#e8855a" strokeWidth="4" strokeDasharray="8 5" /><circle cx="120" cy="60" r="12" fill="none" stroke="#e8e1d6" strokeWidth="2" /><path d="M74 60h22M144 60h22M120 18v18M120 84v18" stroke="#e8855a" strokeWidth="2" strokeLinecap="round" /></>,
    'Flight Director': <><path d="M60 88h120" stroke="#ee8aa0" strokeWidth="2" /><path d="M72 88v-24h24v24M108 88v-42h24v42M144 88v-56h24v56" fill="#ee8aa0" fillOpacity=".28" stroke="#ee8aa0" strokeWidth="2" /><circle cx="156" cy="22" r="4" fill="#f7c46b" /></>
  };
  return <Scene label={`${id} difficulty illustration`}>{scene[id]}</Scene>;
}
function MissionArt({ id, wide }) {
  const scene = {
    stormwatch: <><circle cx="120" cy="190" r="118" fill="#2f6f8a" /><circle cx="120" cy="190" r="118" fill="none" stroke="#9ad0e0" strokeOpacity=".5" strokeWidth="3" />
      <path d="M30 132c30-18 60-8 90-14s60 6 90 18" stroke="#e9f2f5" strokeOpacity=".5" strokeWidth="6" fill="none" strokeLinecap="round" />
      <g fill="none" stroke="#fff" strokeLinecap="round"><ellipse cx="130" cy="100" rx="30" ry="11" strokeWidth="5" transform="rotate(-18 130 100)" /><ellipse cx="130" cy="100" rx="17" ry="6" strokeWidth="4" transform="rotate(-18 130 100)" /></g><circle cx="130" cy="100" r="3" fill="#2f6f8a" /><Sat x="52" y="40" s="1.2" /></>,
    neo: <><circle cx="38" cy="96" r="30" fill="#2f6f8a" /><path d="M60 30Q140 8 208 62" stroke="#e8e1d6" strokeOpacity=".6" strokeDasharray="4 5" fill="none" strokeWidth="1.5" />
      <path d="M150 52l16-6 16 6 8 14-6 14-16 8-18-4-10-14z" fill="#8c8479" /><circle cx="160" cy="62" r="4" fill="#6f685e" /><circle cx="176" cy="73" r="5" fill="#6f685e" /><circle cx="168" cy="52" r="2.5" fill="#6f685e" /><Sat x="84" y="52" s="1.1" /></>,
    'lunar-ice': <><circle cx="120" cy="172" r="106" fill="#b9b3a9" /><circle cx="68" cy="102" r="14" fill="#a39d93" /><circle cx="152" cy="92" r="10" fill="#a39d93" /><circle cx="196" cy="114" r="16" fill="#a39d93" /><circle cx="105" cy="84" r="6" fill="#a39d93" />
      <ellipse cx="124" cy="68" rx="18" ry="6" fill="#4a4540" /><ellipse cx="127" cy="69" rx="6" ry="2.2" fill="#dff3f2" /><Sat x="58" y="38" s="1.2" /></>,
    helios: <><circle cx="42" cy="62" r="66" fill="#f2a33a" opacity=".08" /><circle cx="42" cy="62" r="52" fill="#f2a33a" opacity=".18" /><circle cx="42" cy="62" r="40" fill="#f2a33a" />
      <path d="M72 30c20-14 44-6 56 14" stroke="#f7c46b" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g fill="#f7c46b">{[[100, 70], [116, 62], [132, 78], [150, 66], [168, 82], [186, 58], [205, 76]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" />)}</g><Sat x="186" y="92" s="1.3" /></>,
    'red-planet': <><circle cx="120" cy="176" r="108" fill="#b5532f" /><path d="M40 100c30 10 50 2 80 12s60 4 90-6" stroke="#8a3b20" strokeWidth="5" fill="none" strokeLinecap="round" /><circle cx="85" cy="94" r="9" fill="#9a4526" /><circle cx="165" cy="102" r="12" fill="#9a4526" />
      <ellipse cx="120" cy="72" rx="22" ry="5" fill="#f1e8de" opacity=".85" /><circle cx="205" cy="34" r="5" fill="#8c8479" /><Sat x="62" y="40" s="1.2" /></>
  };
  return <Scene label="Mission illustration" wide={wide}>{scene[id]}</Scene>;
}
function OrbitArt({ id }) {
  const scene = {
    LEO: <><circle cx="120" cy="60" r="24" fill="#2f6f8a" /><path d="M108 52c8-4 14 2 18 0" stroke="#7bc08f" strokeWidth="4" fill="none" strokeLinecap="round" /><ellipse cx="120" cy="60" rx="56" ry="22" fill="none" stroke="#9ad0e0" strokeWidth="1.8" strokeDasharray="4 3" transform="rotate(-14 120 60)" /><Sat x="168" y="46" s="1.1" /></>,
    SSO: <><circle cx="120" cy="60" r="24" fill="#2f6f8a" /><path d="M120 36a24 24 0 0 1 0 48z" fill="#163544" opacity=".6" /><ellipse cx="120" cy="60" rx="18" ry="48" fill="none" stroke="#f7c46b" strokeWidth="1.8" strokeDasharray="4 3" transform="rotate(14 120 60)" /><Sat x="110" y="16" s="1.1" /></>,
    HEO: <><circle cx="64" cy="60" r="18" fill="#2f6f8a" /><ellipse cx="128" cy="60" rx="86" ry="28" fill="none" stroke="#e8855a" strokeWidth="1.8" strokeDasharray="5 4" /><Sat x="206" y="48" s="1.15" /></>,
    GEO: <><circle cx="120" cy="60" r="14" fill="#2f6f8a" /><circle cx="120" cy="60" r="46" fill="none" stroke="#7bc08f" strokeWidth="1.8" strokeDasharray="5 4" /><path d="M120 60L166 60" stroke="#7bc08f" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="2 3" /><Sat x="166" y="60" s="1.15" /></>,
    LLO: <><circle cx="120" cy="60" r="26" fill="#b9b3a9" /><circle cx="110" cy="52" r="5" fill="#9d978d" /><circle cx="132" cy="68" r="6" fill="#9d978d" /><ellipse cx="120" cy="60" rx="54" ry="20" fill="none" stroke="#e8e1d6" strokeWidth="1.8" strokeDasharray="4 3" transform="rotate(-10 120 60)" /><Sat x="72" y="66" s="1.1" /></>,
    MARS: <><circle cx="120" cy="60" r="25" fill="#b5532f" /><ellipse cx="120" cy="39" rx="10" ry="2.8" fill="#f1e8de" opacity=".85" /><ellipse cx="120" cy="60" rx="56" ry="21" fill="none" stroke="#f7c46b" strokeWidth="1.8" strokeDasharray="4 3" transform="rotate(12 120 60)" /><Sat x="170" y="70" s="1.1" /></>
  };
  return <Scene label={`${id} orbit illustration`}>{scene[id]}</Scene>;
}
function LauncherArt({ id }) {
  const scene = {
    small: <><path d="M0 106Q120 94 240 106L240 120L0 120Z" fill="#2a2433" /><path d="M114 96L114 44L120 30L126 44L126 96Z" fill="#e8e1d6" /><path d="M114 82L107 96L114 96Z M126 82L133 96L126 96Z" fill="#b3405a" /><ellipse cx="120" cy="103" rx="5" ry="7" fill="#f2a33a" /></>,
    medium: <><path d="M0 106Q120 94 240 106L240 120L0 120Z" fill="#2a2433" /><path d="M112 96L112 34L120 18L128 34L128 96Z" fill="#e8e1d6" /><rect x="104" y="56" width="6" height="40" rx="2" fill="#cfc7ba" /><rect x="130" y="56" width="6" height="40" rx="2" fill="#cfc7ba" /><ellipse cx="120" cy="104" rx="8" ry="8" fill="#f2a33a" /></>,
    heavy: <><path d="M0 106Q120 94 240 106L240 120L0 120Z" fill="#2a2433" /><path d="M111 96L111 28L120 12L129 28L129 96Z" fill="#e8e1d6" /><path d="M99 96L99 42L104 32L109 42L109 96Z" fill="#d8d0c3" /><path d="M131 96L131 42L136 32L141 42L141 96Z" fill="#d8d0c3" /><ellipse cx="120" cy="104" rx="14" ry="8" fill="#f2a33a" /></>
  };
  return <Scene label={`${id} launcher illustration`}>{scene[id]}</Scene>;
}
function PartArt({ id }) {
  const scene = {
    micro: <><rect x="106" y="46" width="28" height="28" rx="3" fill="#cfc7ba" stroke="#ee8aa0" strokeWidth="1.5" /><path d="M106 55h28M106 65h28M115 46v28M125 46v28" stroke="#6f665a" strokeWidth="1" /></>,
    standard: <><rect x="96" y="40" width="48" height="40" rx="5" fill="#d8d0c3" stroke="#ee8aa0" strokeWidth="2" /><rect x="104" y="48" width="32" height="24" rx="2" fill="none" stroke="#6f665a" strokeWidth="1.5" /><circle cx="120" cy="60" r="5" fill="#ee8aa0" /></>,
    heavy: <><rect x="86" y="34" width="68" height="52" rx="7" fill="none" stroke="#f7c46b" strokeWidth="2.5" strokeDasharray="6 3" /><rect x="94" y="40" width="52" height="40" rx="5" fill="#cfc7ba" stroke="#ee8aa0" strokeWidth="2.5" /><path d="M104 50h32v20h-32z" fill="#6f665a" /></>,
    body: <><rect x="96" y="38" width="48" height="44" rx="4" fill="#2f6f8a" stroke="#9ad0e0" strokeWidth="1.5" /><path d="M112 38v44M128 38v44M96 52h48M96 68h48" stroke="#9ad0e0" strokeOpacity=".5" strokeWidth="1" /></>,
    wings: <><rect x="110" y="48" width="20" height="24" rx="3" fill="#e8e1d6" /><rect x="52" y="51" width="52" height="18" rx="2" fill="#2f6f8a" stroke="#7bc08f" strokeWidth="1.5" /><rect x="136" y="51" width="52" height="18" rx="2" fill="#2f6f8a" stroke="#7bc08f" strokeWidth="1.5" /><path d="M70 51v18M88 51v18M154 51v18M172 51v18" stroke="#7bc08f" strokeOpacity=".6" strokeWidth="1" /></>,
    hieff: <><rect x="111" y="48" width="18" height="24" rx="3" fill="#e8e1d6" /><rect x="40" y="47" width="65" height="26" rx="2" fill="#1e4b63" stroke="#f7c46b" strokeWidth="1.8" /><rect x="135" y="47" width="65" height="26" rx="2" fill="#1e4b63" stroke="#f7c46b" strokeWidth="1.8" /><path d="M62 47v26M84 47v26M156 47v26M178 47v26M40 60h65M135 60h65" stroke="#f7c46b" strokeOpacity=".55" strokeWidth="1" /></>,
    b1: <><rect x="104" y="46" width="32" height="28" rx="4" fill="none" stroke="#e8e1d6" strokeWidth="2" /><rect x="116" y="41" width="8" height="5" fill="#e8e1d6" /><rect x="109" y="62" width="22" height="8" rx="1" fill="#7bc08f" /></>,
    b2: <><rect x="98" y="42" width="44" height="36" rx="4" fill="none" stroke="#e8e1d6" strokeWidth="2" /><rect x="114" y="37" width="12" height="5" fill="#e8e1d6" /><rect x="103" y="54" width="34" height="19" rx="1" fill="#7bc08f" /></>,
    b3: <><rect x="90" y="38" width="60" height="44" rx="5" fill="none" stroke="#f7c46b" strokeWidth="2" /><rect x="112" y="33" width="16" height="5" fill="#f7c46b" /><rect x="95" y="44" width="50" height="33" rx="2" fill="#7bc08f" /><path d="M122 49l-7 11h6l-1 11 7-11h-6z" fill="#17121c" /></>,
    uhf: <><line x1="120" y1="86" x2="120" y2="34" stroke="#e8e1d6" strokeWidth="2.5" /><line x1="102" y1="46" x2="138" y2="46" stroke="#e8e1d6" strokeWidth="2" /><line x1="106" y1="58" x2="134" y2="58" stroke="#e8e1d6" strokeWidth="2" /><circle cx="120" cy="34" r="3.5" fill="#ee8aa0" /></>,
    xband: <><path d="M92 50c0 18 56 18 56 0" fill="none" stroke="#e8e1d6" strokeWidth="2.5" strokeLinecap="round" /><line x1="120" y1="64" x2="120" y2="86" stroke="#e8e1d6" strokeWidth="2.5" /><line x1="120" y1="50" x2="120" y2="38" stroke="#f7c46b" strokeWidth="2" /><circle cx="120" cy="37" r="3" fill="#f7c46b" /><path d="M104 30a22 22 0 0 1 32 0" fill="none" stroke="#9ad0e0" strokeWidth="1.5" /></>,
    laser: <><rect x="92" y="48" width="28" height="24" rx="3" fill="#cfc7ba" /><circle cx="122" cy="60" r="8" fill="#2f6f8a" stroke="#9ad0e0" strokeWidth="1.5" /><line x1="130" y1="60" x2="212" y2="60" stroke="#ee8aa0" strokeWidth="3" /><line x1="130" y1="60" x2="212" y2="60" stroke="#fff" strokeWidth="1" /></>,
    c1: <><rect x="104" y="44" width="32" height="32" rx="3" fill="#2a2433" stroke="#9ad0e0" strokeWidth="2" /><path d="M112 38v6M128 38v6M112 76v6M128 76v6M98 54h6M98 66h6M136 54h6M136 66h6" stroke="#9ad0e0" strokeWidth="1.8" /></>,
    c2: <><rect x="98" y="40" width="44" height="40" rx="4" fill="#2a2433" stroke="#7bc08f" strokeWidth="2" /><rect x="108" y="50" width="24" height="20" rx="2" fill="#7bc08f" fillOpacity=".35" /><path d="M108 34v6M120 34v6M132 34v6M108 80v6M120 80v6M132 80v6M92 52h6M92 68h6M142 52h6M142 68h6" stroke="#7bc08f" strokeWidth="1.8" /></>,
    c3: <><rect x="92" y="36" width="56" height="48" rx="5" fill="#2a2433" stroke="#f7c46b" strokeWidth="2.5" /><rect x="104" y="46" width="32" height="28" rx="3" fill="#f7c46b" fillOpacity=".25" stroke="#f7c46b" strokeWidth="1.5" /><circle cx="120" cy="60" r="5" fill="#f7c46b" /></>,
    a1: <><rect x="102" y="44" width="36" height="32" rx="4" fill="none" stroke="#ee8aa0" strokeWidth="2.5" /><ellipse cx="120" cy="60" rx="48" ry="20" fill="none" stroke="#9ad0e0" strokeWidth="1.3" strokeDasharray="3 3" /></>,
    a2: <><circle cx="106" cy="60" r="14" fill="none" stroke="#e8e1d6" strokeWidth="2.5" /><circle cx="106" cy="60" r="4" fill="#ee8aa0" /><circle cx="136" cy="60" r="14" fill="none" stroke="#e8e1d6" strokeWidth="2.5" /><circle cx="136" cy="60" r="4" fill="#ee8aa0" /></>,
    a3: <><circle cx="120" cy="60" r="24" fill="none" stroke="#f7c46b" strokeWidth="1.8" /><path d="M120 30v12M120 78v12M90 60h12M138 60h12" stroke="#f7c46b" strokeWidth="1.8" /><circle cx="120" cy="60" r="4" fill="#ee8aa0" /><circle cx="111" cy="52" r="1.5" fill="#fff" /><circle cx="130" cy="66" r="1.5" fill="#fff" /></>,
    widecam: <><rect x="94" y="46" width="30" height="28" rx="3" fill="#cfc7ba" /><path d="M124 52l14-6v28l-14-6z" fill="#2f6f8a" stroke="#9ad0e0" strokeWidth="1.5" /><path d="M138 46l36-18M138 74l36 18" stroke="#9ad0e0" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="3 3" /></>,
    hires: <><rect x="84" y="44" width="54" height="32" rx="4" fill="#cfc7ba" /><rect x="138" y="48" width="12" height="24" rx="2" fill="#2f6f8a" stroke="#f7c46b" strokeWidth="1.8" /><path d="M150 56l42-6M150 64l42 6" stroke="#f7c46b" strokeOpacity=".7" strokeWidth="1.5" /></>,
    spectrometer: <><polygon points="104,76 122,42 140,76" fill="#2a2433" stroke="#e8e1d6" strokeWidth="1.8" /><line x1="74" y1="62" x2="112" y2="62" stroke="#fff" strokeWidth="2" /><line x1="132" y1="56" x2="174" y2="44" stroke="#ee7a6c" strokeWidth="2" /><line x1="134" y1="62" x2="176" y2="60" stroke="#f7c46b" strokeWidth="2" /><line x1="136" y1="68" x2="174" y2="76" stroke="#7bc08f" strokeWidth="2" /></>,
    thermal: <><circle cx="120" cy="60" r="24" fill="#ee7a6c" fillOpacity=".35" /><circle cx="120" cy="60" r="16" fill="#f2a33a" fillOpacity=".6" /><circle cx="120" cy="60" r="8" fill="#f7c46b" /><path d="M90 60h10M140 60h10M120 30v10M120 80v10" stroke="#e8e1d6" strokeWidth="1.5" /></>,
    magnetometer: <><line x1="80" y1="60" x2="152" y2="60" stroke="#cfc7ba" strokeWidth="3" /><circle cx="156" cy="60" r="6" fill="#ee8aa0" /><path d="M134 60c0-18 44-18 44 0s-44 18-44 0z" fill="none" stroke="#9ad0e0" strokeWidth="1.5" strokeDasharray="3 3" /></>,
    radar: <><rect x="82" y="48" width="76" height="14" rx="2" fill="#cfc7ba" stroke="#f7c46b" strokeWidth="1.5" /><path d="M102 68a24 12 0 0 0 36 0M92 78a34 16 0 0 0 56 0" fill="none" stroke="#7bc08f" strokeWidth="2" strokeLinecap="round" /></>,
    particle: <><circle cx="120" cy="60" r="18" fill="none" stroke="#e8e1d6" strokeWidth="2" /><path d="M74 44l36 12M78 74l32-10M166 46l-36 10" stroke="#f7c46b" strokeWidth="2" strokeLinecap="round" /><circle cx="120" cy="60" r="5" fill="#ee8aa0" /></>
  };
  return <Scene label={`${id} component illustration`}>{scene[id]}</Scene>;
}
function HeroArt() {
  return <svg className="hero" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g fill="#fff">
      {[[70, 35], [140, 75], [230, 28], [320, 62], [440, 22], [530, 58], [640, 30], [730, 70], [180, 115], [610, 105], [380, 95], [90, 145]].map(([x, y], i) => (
        <circle key={i} className="hero-star" style={{ animationDelay: `${(i * 0.45).toFixed(2)}s` }} cx={x} cy={y} r={i % 2 ? 1.4 : 0.9} />
      ))}
    </g>
    <ellipse cx="400" cy="330" rx="580" ry="170" fill="var(--pn)" stroke="var(--ac)" strokeWidth="2" />
    <path d="M-20 180Q400 80 820 180" stroke="var(--ac)" strokeOpacity=".45" strokeWidth="1.5" fill="none" strokeDasharray="4 6" />
    <g className="hero-sat">
      <Sat x="0" y="0" s="1.8" />
    </g>
  </svg>;
}
function Craft({ e }) {
  const w = Math.max(14, Math.min(64, e.generation / 280 * 64)), d = Math.max(6, Math.min(26, e.downlink / 45 * 20 + 6));
  return <svg viewBox="0 0 320 120" className="craft" role="img" aria-label="Spacecraft layout, not to scale"><rect x="130" y="40" width="60" height="40" rx="4" className="bus" />
    <rect x={122 - w} y="54" width={w} height="12" className="panel" /><rect x="198" y="54" width={w} height="12" className="panel" />
    <line x1="160" y1="40" x2="160" y2="26" stroke="currentColor" /><ellipse cx="160" cy="24" rx={d} ry={d / 3} className="dish" />
    {e.inst.map((x, i) => <circle key={x.id} cx={140 + i * 10} cy="92" r="4" className="inst" />)}
    <text x="160" y="114" textAnchor="middle" className="cap">{e.mass} kg · {e.generation | 0} W generated · {e.inst.length} instruments</text></svg>;
}
function OrbitView({ o }) {
  return <svg viewBox="0 0 160 160" className="orbit" role="img" aria-label={`${o.name} diagram`}><circle cx="80" cy="80" r="14" className="earth" />
    <circle cx="80" cy="80" r={o.ring} className="ring" /><g className="spin"><circle cx={80 + o.ring} cy="80" r="4" className="inst" /></g></svg>;
}

export default function App() {
  const [s, setS] = useState(loadDesign), [stage, setStage] = useState(0), [note, setNote] = useState(null);
  const [sim, setSim] = useState(null), [playing, setPlaying] = useState(false), [fast, setFast] = useState(false), [rep, setRep] = useState(null);
  const [outcomeBanner, setOutcomeBanner] = useState(null);
  const [team, setTeam] = useState(false), [role, setRole] = useState(0), [sign, setSign] = useState([]);
  const [intro, setIntro] = useState(true), [introTab, setIntroTab] = useState(null);
  const [accent, setAccent] = useState(() => read('mc-accent', 'rose')), [theme, setTheme] = useState(() => read('mc-theme', 'glass'));
  const [src, setSrc] = useState(false), [hist, setHist] = useState(() => read('mc-history', []));
  const e = useMemo(() => evaluate(s), [s]), rv = useMemo(() => review(e), [e]);
  const diff = e.diff, mission = e.mission, roles = roleChecks(e);

  useEffect(() => store('mc-design', s), [s]);
  useEffect(() => { document.documentElement.dataset.theme = theme; store('mc-theme', theme); }, [theme]);
  useEffect(() => { document.documentElement.dataset.accent = accent; store('mc-accent', accent); }, [accent]);
  useEffect(() => {
    if (!sim || !playing || sim.pending || sim.done) return;
    const t = setTimeout(() => setSim(x => step(x, e)), fast ? 75 : 220);
    return () => clearTimeout(t);
  }, [sim, playing, fast, e]);

  useEffect(() => {
    if (!sim || !sim.done || stage !== 4) return;
    const r = report(sim, e, rv, team);
    const passed = r.status !== 'MISSION FAILURE';
    setOutcomeBanner({ passed, status: r.status, score: r.total });
    const t = setTimeout(() => {
      setOutcomeBanner(null);
      setRep(r);
      const row = { id: Date.now(), state: s, mission: s.mission, total: r.total, science: Math.round(r.science), cost: e.cost, mass: e.mass, margin: Math.round(e.margin), diff: s.difficulty };
      const h = [row, ...hist].slice(0, 30);
      setHist(h);
      store('mc-history', h);
      setStage(5);
    }, 3500);
    return () => clearTimeout(t);
  }, [sim?.done, stage]);

  useEffect(() => {
    const k = ev => {
      if (ev.key !== 'Escape') return;
      if (src) setSrc(false);
      else if (introTab) setIntroTab(null);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [src, introTab]);

  const change = (patch, text) => { const next = sanitize({ ...s, ...patch }); setNote({ text, d: deltas(e, evaluate(next)) }); setS(next); setSim(null); setRep(null); setOutcomeBanner(null); setSign([]); setPlaying(false); };
  const toggleInst = x => { const on = s.instruments.includes(x.id); change({ instruments: on ? s.instruments.filter(i => i !== x.id) : [...s.instruments, x.id] },
    `${on ? 'Removed' : 'Added'} the ${x.name}. ${x.use} Science for this mission: ${SCIENCE[x.id][mission.id]} points. Every instrument also changes mass, power draw and data volume.`); };
  const launch = () => { setOutcomeBanner(null); setRep(null); setFast(false); setSim(createSim(e, s)); setPlaying(true); setStage(4); };
  const finishNow = () => {
    if (!sim) return;
    const r = report(sim, e, rv, team);
    setOutcomeBanner(null);
    setRep(r);
    const row = { id: Date.now(), state: s, mission: s.mission, total: r.total, science: Math.round(r.science), cost: e.cost, mass: e.mass, margin: Math.round(e.margin), diff: s.difficulty };
    const h = [row, ...hist].slice(0, 30);
    setHist(h);
    store('mc-history', h);
    setStage(5);
  };
  const exitToMenu = () => {
    setPlaying(false);
    setFast(false);
    setSim(null);
    setRep(null);
    setOutcomeBanner(null);
    setIntroTab(null);
    setIntro(true);
  };
  const canStage = i => i <= 3 || (i === 4 && !!sim) || (i === 5 && !!rep);
  const toggleIntroTab = tab => setIntroTab(cur => (cur === tab ? null : tab));

  const Choice = ({ sel, dis, onClick, title, meta, desc, tag, art }) => <button className={'opt' + (sel ? ' sel' : '')} aria-pressed={sel} disabled={dis} onClick={onClick}>{art}<b>{title}</b><i>{meta}</i><span>{desc}</span>{tag && <em>{tag}</em>}</button>;

  // ---------- STAGES ----------
  const missionSelect = <>
    <div className="stage-head">
      <h2>Select a science mission</h2>
      <span className="badge">{s.difficulty} · {diff.budget > 500 ? 'Unlimited budget' : `$${diff.budget}M budget`}</span>
    </div>
    <p className="lead">Every mission begins with a scientific question. Choose your mission objective below, then select the orbit, launcher, and spacecraft subsystems to achieve it.</p>
    <div className="row">{MISSIONS.map(m => <Choice key={m.id} sel={s.mission === m.id} onClick={() => change({ mission: m.id, orbit: m.orbits[0] }, m.why)} title={<><Icon n={m.icon} s={17} />{m.name}</>} art={<MissionArt id={m.id} />} meta={m.tag} desc={`${m.objective} Needs ${m.orbits.join(' or ')}, ${m.minLife}+ months. ${m.challenge}`} />)}</div>
    <p style={{ marginTop: 18 }}><button className="go" onClick={() => setStage(1)}>Proceed to Architecture →</button></p></>;

  const arch = <>
    <h2>Architecture trade study</h2><p className="lead">Choose where the spacecraft flies and what lifts it. {diff.block ? 'Only orbits that suit this science are offered.' : 'Sandbox shows every orbit.'}</p>
    <h3><Icon n="orbit" />Orbit</h3><div className="row">{ORBITS.filter(o => !diff.block || mission.orbits.includes(o.id)).map(o => <Choice key={o.id} sel={s.orbit === o.id} onClick={() => change({ orbit: o.id }, o.desc)} title={o.name} art={<OrbitArt id={o.id} />} meta={`${o.alt} · eclipse ${o.ecl} h · life ${o.life} mo · $${o.cost}M`} desc={o.desc} tag={mission.orbits.includes(o.id) ? 'Suits this mission' : 'Poor fit'} />)}</div>
    <div className="row" style={{ alignItems: 'center' }}><OrbitView o={e.orbit} /><p className="lead" style={{ flex: 1 }}>Sunlight x{e.orbit.sun}, link quality x{e.orbit.signal}, radiation {e.orbit.rad}. For real 3D trajectories, explore <a href="https://nasa.github.io/mission-viz/" target="_blank" rel="noreferrer">NASA Mission Viz</a>.</p></div>
    <h3><Icon n="rocket" />Launch vehicle</h3><div className="row">{LAUNCHERS.map(l => <Choice key={l.id} sel={s.launcher === l.id} onClick={() => change({ launcher: l.id }, `${l.name}: lifts ${l.cap[s.orbit]} kg to ${s.orbit}. ${l.desc}`)} title={l.name} art={<LauncherArt id={l.id} />} meta={`${l.cap[s.orbit] ? l.cap[s.orbit] + ' kg to ' + s.orbit : 'Cannot reach ' + s.orbit} · $${l.cost}M`} desc={l.desc} />)}</div>
    <p style={{ marginTop: 18 }}><button onClick={() => setStage(0)}>← Mission Select</button> <button className="go" onClick={() => setStage(2)}>Proceed to Spacecraft →</button></p></>;

  const design = <>
    <h2>Spacecraft design lab</h2>
    <p className="lead">Configure each subsystem and pick your science payload. Watch the live spacecraft preview and resource ledger on the right as you make trade-offs.</p>
    <div className="mobile-craft"><Craft e={e} /></div>
    {SECTIONS.map(([k, label]) => <section key={k}><h3><Icon n={IC[k]} />{label}</h3><p className="learn">{LEARN[k]}</p><div className="row">{PARTS[k].filter(p => diff.adv || !p.adv).map(p => <Choice key={p.id} sel={s[k] === p.id} onClick={() => change({ [k]: p.id }, `${p.name}: ${p.desc}`)} title={p.name} art={<PartArt id={p.id} />} meta={`${p.mass} kg · ${p.power} W · $${p.cost}M · ${perf(p)}`} desc={p.desc} tag={p.adv ? 'Advanced' : ''} />)}</div></section>)}
    <h3><Icon n="flask" />Science instruments</h3><p className="learn">{LEARN.instruments}</p>
    <div className="row">{PARTS.instruments.filter(p => diff.adv || !p.adv).map(p => { const pts = SCIENCE[p.id][mission.id]; return <Choice key={p.id} sel={s.instruments.includes(p.id)} onClick={() => toggleInst(p)} title={p.name} art={<PartArt id={p.id} />} meta={`${p.mass} kg · ${p.power} W · $${p.cost}M · ${p.data} GB/day`} desc={p.use} tag={pts ? `Science +${pts} here` : 'No science value for this mission'} />; })}</div>
    <p style={{ marginTop: 18 }}><button onClick={() => setStage(1)}>← Architecture</button> <button className="go" onClick={() => setStage(3)}>Proceed to Review →</button></p></>;

  const signed = !team || sign.length === 4;
  const worst = rv.some(x => x.lvl === 2) ? 2 : rv.some(x => x.lvl === 1) ? 1 : 0, stop = blocked(e, rv) || !signed;
  const rev = <>
    <h2>Mission design review</h2><p className="lead">Findings are grouped by NASA's four mission segments. Critical findings stop launch{diff.block ? '' : ' (not in Sandbox)'}.</p>
    {SEGMENTS.map(g => <section key={g}><h3>{g} segment</h3><table><tbody>{rv.filter(x => x.seg === g).map(x => <tr key={x.name}><td>{x.name}</td><td className={'mono ' + LVLC[x.lvl]}><Icon n={LVLI[x.lvl]} s={14} />{LVL[x.lvl]}</td><td>{x.text}</td></tr>)}</tbody></table></section>)}
    <p><b className={LVLC[worst]}>{worst === 2 ? 'Launch not approved.' : worst === 1 ? 'Approved with warnings: accepted risks make in-flight problems more likely.' : 'All checks passed.'}</b></p>
    {team && <><h3>Team sign-off</h3><div className="row">{roles.map((r, i) => <button key={r.id} className={'opt' + (sign.includes(i) ? ' sel' : '')} onClick={() => setSign(x => x.includes(i) ? x.filter(y => y !== i) : [...x, i])}><b>{sign.includes(i) ? '[x] ' : '[ ] '}{r.name}</b><span>{r.goal}</span><em>{r.met ? 'Goal met' : 'Goal not met: negotiate'}</em></button>)}</div></>}
    <p><button onClick={() => setStage(2)}>Back to design lab</button> <button className="go" disabled={stop} onClick={launch}><Icon n="rocket" s={15} />Launch</button>{!signed && <span className="warn"> All four roles must sign off.</span>}</p></>;

  const rows = hist.filter(h => h.mission === s.mission).sort((a, b) => b.total - a.total).slice(0, 8);
  const deb = !rep ? null : <>
    <MissionArt id={mission.id} wide /><h2>{rep.status}</h2><p className="mono">Final score <b className="big">{rep.total}</b> / 100 · {mission.name} · {s.difficulty}</p>
    <table><tbody>{Object.entries(rep.parts).map(([k, v]) => <tr key={k}><td>{k}</td><td className="mono">{Math.round(v[0])}</td><td>weight {Math.round(v[1] * 100)}%</td></tr>)}</tbody></table>
    <h3>The engineering story</h3>{rep.story.map((t, i) => <p key={i}>{t}</p>)}
    <h3>Design review by segment</h3><table><tbody>{rv.map(x => <tr key={x.name}><td>{x.seg}</td><td>{x.name}</td><td className={'mono ' + LVLC[x.lvl]}><Icon n={LVLI[x.lvl]} s={14} />{LVL[x.lvl]}</td></tr>)}</tbody></table>
    <h3>What to try next</h3>{suggest(e).map((t, i) => <p key={i} className="learn">{t}</p>)}
    {team && <><h3>Team coordination</h3>{roles.map(r => <p key={r.id}>{r.met ? '✓' : '!'} {r.name}: {r.goal}</p>)}</>}
    <h3>Real missions with similar goals</h3><p>{mission.real.join(', ')}. Your game numbers are simplified and not NASA data.</p>
    <h3>Compare designs (trade study) and local leaderboard</h3>
    <table><thead><tr><th>Score</th><th>Science</th><th>Cost</th><th>Mass</th><th>Power margin</th><th>Orbit / launcher</th><th /></tr></thead><tbody>{rows.map(h => <tr key={h.id} className={hist[0] && h.id === hist[0].id ? 'now' : ''}><td className="mono">{h.total}</td><td>{h.science}</td><td>${h.cost}M</td><td>{h.mass} kg</td><td>{h.margin} W</td><td>{h.state.orbit} / {h.state.launcher}</td><td><button onClick={() => { setS(sanitize(h.state)); setSim(null); setRep(null); setStage(2); }}>Load</button></td></tr>)}</tbody></table>
    <p className="learn">Saved on this device only. Fly different designs to compare them.</p>

    <div className="row" style={{ marginTop: 18 }}>
      <button className="go" onClick={() => { setSim(null); setRep(null); setStage(2); }}>Modify Spacecraft</button>
      <button onClick={exitToMenu}>Back to Main Menu</button>
    </div></>;

  const body = [missionSelect, arch, design, rev, null, deb][stage];
  const r = e;
  const startGame = () => { setSign([]); setIntroTab(null); setIntro(false); setStage(0); };

  const sourcesModal = src && <div className="back" onClick={() => setSrc(false)}><div className="dlg pn" role="dialog" aria-modal="true" aria-label="Sources and assumptions" onClick={x => x.stopPropagation()}>
    <button onClick={() => setSrc(false)} aria-label="Close">×</button><h2>Sources and learning</h2>
    <p>This is an educational, simplified simulator. Its orbit, cost and reliability numbers are invented for gameplay. They are not NASA measurements, not flight-certified and not a substitute for tools like GMAT.</p>
    <ul>{SOURCES.map(([n, u, w]) => <li key={n}><a href={u} target="_blank" rel="noreferrer">{n}</a>: {w}</li>)}</ul>
    <h3>Simplified assumptions</h3><ul><li>Demand = 15 W baseline + every part, all instruments on.</li><li>Eclipse energy = demand x eclipse hours.</li><li>Downlink GB/day = radio rate x orbit link quality.</li><li>Storage must hold the share of daily data not sent between contacts.</li><li>Costs are in millions of US dollars. They are invented game values, not real price quotes.</li><li>Events are chosen from your design weaknesses and are repeatable.</li></ul>
    <h3>Glossary</h3><ul><li><b>Mass budget</b>: what the launcher can lift to your orbit.</li><li><b>Power margin</b>: watts made minus watts used.</li><li><b>Downlink</b>: data sent from spacecraft to Earth.</li><li><b>Eclipse</b>: time in planet shadow, with no solar power.</li><li><b>CML</b>: Concept Maturity Level, how developed a mission idea is.</li></ul></div></div>;

  // ---------- FULL-SCREEN ANIMATED LAUNCH & FLIGHT ----------
  if (!intro && stage === 4 && sim) {
    const ev = sim.pending ? eventInfo(sim.pending, e) : null;
    const pct = Math.min(100, Math.round((sim.day / MISSION_DAYS) * 100));
    const latestLog = sim.log[sim.log.length - 1] || 'T-0 Ignition & Liftoff...';
    return <div className="launch-full">
      <svg className="launch-sky" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[[80, 60], [190, 120], [310, 45], [470, 95], [610, 40], [740, 110], [880, 55], [930, 160], [140, 220], [820, 230], [520, 180], [270, 175]].map(([x, y], i) => (
          <circle key={i} className="hero-star" style={{ animationDelay: `${(i * 0.35).toFixed(2)}s` }} cx={x} cy={y} r={i % 2 ? 1.8 : 1.1} fill="#fff" />
        ))}
        <ellipse cx="500" cy="640" rx="760" ry="230" fill="var(--pn)" stroke="var(--ac)" strokeWidth="2.5" />
        <path d="M80 390 Q500 130 920 390" fill="none" stroke="var(--ac)" strokeWidth="2" strokeDasharray="6 8" strokeOpacity="0.55" />
        <g transform={`translate(${120 + (pct / 100) * 760}, ${360 - Math.sin((pct / 100) * Math.PI) * 195}) rotate(${-28 + (pct / 100) * 56})`}>
          {sim.day < 5 && <ellipse cx="-26" cy="0" rx="18" ry="5" fill="#f2a33a" className="flame-pulse" />}
          <rect x="-16" y="-4" width="10" height="8" fill="#d9a441" />
          <rect x="6" y="-4" width="10" height="8" fill="#d9a441" />
          <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#efe8dc" stroke="var(--ac)" strokeWidth="1.5" />
        </g>
      </svg>

      {outcomeBanner ? (
        <div className={'outcome-card ' + (outcomeBanner.passed ? 'passed' : 'failed')}>
          <div className="outcome-icon">
            <Icon n={outcomeBanner.passed ? 'check' : 'x'} s={42} />
          </div>
          <small className="mono">{mission.name.toUpperCase()} · DAY {sim.day} COMPLETE</small>
          <h1>{outcomeBanner.passed ? 'MISSION PASSED' : 'MISSION FAILED'}</h1>
          <p>{outcomeBanner.status} — Final Score <b>{outcomeBanner.score}/100</b></p>
          <div className="outcome-bar"><i /></div>
          <button className="go" onClick={finishNow}>Continue to Debrief →</button>
        </div>
      ) : (
        <div className="launch-hud">
          <div className="launch-top">
            <div>
              <span className="badge">{mission.name} · {s.orbit}</span>
              <h2>{sim.day <= 2 ? 'Liftoff & Ascent' : phase(Math.max(1, sim.day))}</h2>
            </div>
            <div className="row" style={{ marginBottom: 0, alignItems: 'center' }}>
              <button className="iconbtn" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause simulation' : 'Resume simulation'}>
                <Icon n={playing ? 'pause' : 'play'} s={14} /><span>{playing ? 'Pause' : 'Resume'}</span>
              </button>
              <button className={'iconbtn' + (fast ? ' sel' : '')} onClick={() => setFast(v => !v)} aria-pressed={fast}>
                <Icon n="step" s={14} /><span>{fast ? '3×' : '1×'}</span>
              </button>
              <div className="mono launch-day">DAY {sim.day} <span>/ {MISSION_DAYS}</span></div>
            </div>
          </div>

          <div className="launch-prog">
            <div className="launch-prog-fill" style={{ width: `${pct}%` }} />
          </div>

          <div className="launch-stats">
            <div className="lstat"><span>Spacecraft Health</span><b className={sim.health < 45 ? 'crit' : sim.health < 75 ? 'warn' : 'pass'}>{f(sim.health)}%</b></div>
            <div className="lstat"><span>Science Data Sent</span><b>{f(sim.raw, 1)} GB</b></div>
            <div className="lstat"><span>Onboard Buffer</span><b>{f(sim.stored, 1)} GB</b></div>
            <div className="lstat"><span>System State</span><b className={sim.safe ? 'crit' : sim.link ? 'warn' : 'pass'}>{sim.safe ? 'SAFE MODE' : sim.link ? 'LINK DEGRADED' : 'NOMINAL'}</b></div>
          </div>

          <div className="launch-ticker">
            <Icon n="radio" s={16} />
            <span>{latestLog}</span>
          </div>

          {ev && (
            <div className="launch-event">
              <div className="ev-head"><Icon n="alert" s={18} /><b>In-Flight Anomaly: {ev.title}</b></div>
              <p>{ev.text}</p>
              <div className="row">
                {ev.opts.map((o, i) => (
                  <button key={i} className="opt" onClick={() => setSim(decide(sim, i, e))}>
                    <b>{o.label}</b>
                    <span>{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>;
  }

  // ---------- VIDEO-GAME INTRO SCREEN ----------
  if (intro) return <div className={'intro' + (introTab ? ' has-drawer' : '')}>
    <HeroArt />
    <div className="intro-top">
      <div className={'intro-brand intro-brand-top' + (introTab ? ' visible' : '')} aria-hidden={!introTab}>
        <Logo size={108} animated />
        <div>
          <h1>Orbitwright</h1>
          <p className="tag">Every decision changes the mission.</p>
        </div>
      </div>
    </div>

    <div className="intro-grid">
      <div className="gmenu" role="menu">
        <button className="gbtn primary" onClick={startGame} autoFocus>
          <Icon n="play" s={18} />
          <div><b>Play</b><span>Start mission ({team ? 'Team of 4' : 'Solo'} · {s.difficulty})</span></div>
        </button>
        <button className={'gbtn' + (introTab === 'mode' ? ' active-tab' : '')} aria-expanded={introTab === 'mode'} onClick={() => toggleIntroTab('mode')}>
          <Icon n={team ? 'users' : 'user'} s={18} />
          <div><b>Team or Solo Mode</b><span>{team ? 'Team of 4 (Pass & Play)' : 'Solo Mission Architect'}</span></div>
        </button>
        <button className={'gbtn' + (introTab === 'difficulty' ? ' active-tab' : '')} aria-expanded={introTab === 'difficulty'} onClick={() => toggleIntroTab('difficulty')}>
          <Icon n="sliders" s={18} />
          <div><b>Difficulty</b><span>{s.difficulty} · {DIFFICULTIES[s.difficulty].budget > 500 ? 'Unlimited budget' : `$${DIFFICULTIES[s.difficulty].budget}M budget`}</span></div>
        </button>
        <button className={'gbtn' + (introTab === 'appearance' ? ' active-tab' : '')} aria-expanded={introTab === 'appearance'} onClick={() => toggleIntroTab('appearance')}>
          <Icon n="palette" s={18} />
          <div><b>Appearance</b><span>{theme.toUpperCase()} mode · {accent}</span></div>
        </button>
        <button className="gbtn" onClick={() => setSrc(true)}>
          <Icon n="info" s={18} />
          <div><b>Sources</b><span>NASA references &amp; simulation assumptions</span></div>
        </button>
      </div>

      <div className="intro-stage">
        <div className={'intro-brand intro-brand-center' + (!introTab ? ' visible' : '')} aria-hidden={!!introTab}>
          <Logo size={108} animated />
          <div>
            <h1>Orbitwright</h1>
            <p className="tag">Every decision changes the mission.</p>
          </div>
        </div>

        <div className={'intro-drawer' + (introTab ? ' open' : '')} aria-hidden={!introTab}>
          {introTab && <div key={introTab} className="intro-right pn">
          {introTab === 'mode' && <>
            <h3>Team or Solo Mode</h3>
            <p className="learn">Choose whether you command alone or share one screen across four mission roles.</p>
            <div className="row">
              <button className={'opt' + (!team ? ' sel' : '')} onClick={() => { setTeam(false); setSign([]); }}>
                <MissionArt id={mission.id} />
                <b><Icon n="user" s={15} />Solo Mode</b>
                <i>Single Mission Architect</i>
                <span>Make every orbit, hardware, and flight operations decision yourself.</span>
                {!team && <em>Selected</em>}
              </button>
              <button className={'opt' + (team ? ' sel' : '')} onClick={() => { setTeam(true); setSign([]); }}>
                <DiffArt id="Flight Director" />
                <b><Icon n="users" s={15} />Team of 4</b>
                <i>4 Console Roles · Local Co-op</i>
                <span>Pass the console between Science, Systems, Flight, and Program roles with team sign-off.</span>
                {team && <em>Selected</em>}
              </button>
            </div>
          </>}

          {introTab === 'difficulty' && <>
            <h3>Difficulty</h3>
            <p className="learn">Set budget limits, engineering strictness, and advanced subsystem access.</p>
            <div className="row">
              {Object.keys(DIFFICULTIES).map(d => (
                <Choice key={d} sel={s.difficulty === d} onClick={() => change({ difficulty: d }, `${d}: ${DIFFICULTIES[d].label}`)} title={d} art={<DiffArt id={d} />} meta={`Budget ${DIFFICULTIES[d].budget > 500 ? 'unlimited' : '$' + DIFFICULTIES[d].budget + 'M'}`} desc={DIFFICULTIES[d].label} tag={s.difficulty === d ? 'Selected' : ''} />
              ))}
            </div>
          </>}

          {introTab === 'appearance' && <>
            <h3>Appearance</h3>
            <p className="learn">Switch visual theme mode and highlight accent colour.</p>
            <div className="seg grid4" style={{ marginBottom: 14 }}>
              {[['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['oled', 'OLED', 'oled'], ['glass', 'Glass', 'glass']].map(([id, n, ic]) => (
                <button key={id} className={theme === id ? 'on' : ''} onClick={() => setTheme(id)}><Icon n={ic} s={14} />{n}</button>
              ))}
            </div>
            <h4>Accent Colour</h4>
            <div className="swatches" style={{ marginBottom: 16 }}>
              {ACCENTS.map(([id, n, c]) => (
                <button key={id} className={'sw' + (accent === id ? ' on' : '')} style={{ background: c }} aria-label={n} title={n} onClick={() => setAccent(id)} />
              ))}
            </div>
            <div className="intro-craft-box">
              <small className="mono">THEME PREVIEW</small>
              <Craft e={e} />
            </div>
          </>}
        </div>}
        </div>
      </div>
    </div>
    {sourcesModal}
  </div>;

  return <div className="shell">
    <header>
      <div>
        <div className="brand">
          <Logo />
          <div><h1>Orbitwright</h1><small>Every decision changes the mission.</small></div>
        </div>
      </div>
      <div className="row">
        <Settings theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} />
        <button className="iconbtn" onClick={exitToMenu} aria-label="Exit to main menu">
          <Icon n="exit" s={16} /><span>Exit</span>
        </button>
      </div>
    </header>
    <nav aria-label="Mission stages">{STAGES.map((n, i) => <React.Fragment key={n}>{i > 0 && <span aria-hidden="true" style={{ alignSelf: 'center', color: 'var(--mu)', fontSize: 13 }}>→</span>}<button disabled={!canStage(i)} className={stage === i ? 'on' : stage > i ? 'done' : ''} onClick={() => setStage(i)}>{n}</button></React.Fragment>)}</nav>
    <div className="mini"><span className={r.launchMargin < 0 ? 'crit' : ''}>Mass {r.mass}/{r.capacity}</span><span className={r.margin < 0 ? 'crit' : ''}>Power {r.margin >= 0 ? '+' : ''}{Math.round(r.margin)} W</span><span className={r.downlink < r.data ? 'warn' : ''}>Data {f(r.downlink - r.data, 1)}</span><span className={r.cost > r.budget ? 'crit' : ''}>${r.cost}M / {r.budget > 500 ? '∞' : '$' + r.budget + 'M'}</span></div>
    <div className="layout"><main className="pn">
      {team && <div className="role"><div className="chips">{roles.map((x, i) => <span key={x.id} className={'chip' + (i === role ? ' on' : '')}>{x.met ? '✓ ' : ''}{x.name}</span>)}</div><p><b>{roles[role].name}</b> has the console. Goal: {roles[role].goal}</p><button onClick={() => setRole((role + 1) % 4)}><Icon n="users" s={14} />Pass console to {roles[(role + 1) % 4].name}</button></div>}
      {body}</main>
      <aside className="sidecol">
        {stage === 2 && <div className="pn craft-card"><h3 style={{ marginTop: 0 }}>Live spacecraft</h3><Craft e={e} /></div>}
        <div className="pn ledger"><h3>Mission ledger</h3>
          <h4><Icon n="rocket" s={14} />Launch segment</h4><Meter icon="box" label="Mass" val={r.mass} max={r.capacity || 1} unit="kg" />
          <h4><Icon n="orbit" s={14} />Space segment</h4><Meter icon="zap" label="Power used" val={r.demand} max={r.generation} unit="W" /><Meter icon="battery" label="Eclipse energy" val={r.battNeed} max={r.battWh} unit="Wh" /><Meter icon="cpu" label="Storage need" val={r.storeNeed} max={r.storeGB} unit="GB" dec={1} />
          <h4><Icon n="radio" s={14} />Ground segment</h4><Meter icon="radio" label="Data vs downlink" val={r.data} max={r.downlink} unit="GB/day" dec={1} />
          <h4><Icon n="flask" s={14} />User segment</h4><Meter icon="flask" label="Science (need)" val={Math.min(r.need, r.points)} max={r.need} unit="pts" /><Meter icon="dollar" label="Budget" val={r.cost} max={r.budget} unit="M USD" /><Meter icon="clock" label="Build time" val={r.devMonths} max={diff.deadline} unit="mo" dec={1} /><Meter icon="orbit" label="Lifetime wanted" val={mission.minLife} max={r.life} unit="mo" />
          <p className="learn">Always-on load of 15 W is included in demand. All instruments assumed on.</p>
          <div className="why"><b><Icon n="info" s={14} />WHY THIS MATTERS</b><p>{note ? note.text : mission.why}</p>{note && note.d.length > 0 && <ul>{note.d.map(([l, v, u]) => <li key={l}>{l} {u === 'M USD' ? `${v > 0 ? '+$' : '-$'}${f(Math.abs(v), 0)}M` : `${v > 0 ? '+' : ''}${f(v, Math.abs(v) < 10 ? 1 : 0)} ${u}`}</li>)}</ul>}</div>
          {team && conflicts(roles).map(c => <p key={c} className="warn">{c}</p>)}</div></aside></div>
    {sourcesModal}
  </div>;
}
