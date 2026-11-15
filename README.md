Orbitwright

Every decision changes the mission.

An interactive, browser-based space mission systems simulator inspired by NASA’s Mission Design Lab, Concept Maturity Levels (CML 1–4), and systems engineering workflows across NASA’s four mission segments (Launch, Space, Ground, and User).

Live Demo: https://orbitwright-vpqb.vercel.app/

Modes: Solo Mission Architect & 4-Role Local Co-Op (Pass & Play)

Difficulty Tiers: Sandbox, Cadet, Engineer, Flight Director

Mission Lifecycle (6 Stages)

Mission: Choose one of five scientific objectives (Stormwatch, Near-Earth Watch, Lunar Waterline, Helios Watch, or Red Planet Mapper) and set difficulty and Solo/Team mode.

Architecture: Conduct an orbit and launch vehicle trade study balancing science coverage, eclipse duration, radiation exposure, link quality, and payload mass capacity.

Spacecraft: Configure structure/shielding, solar power generation, battery storage, communications, onboard computer, attitude control (ADCS), and up to seven science instruments while watching a live spacecraft schematic and 9-meter Mission Ledger update in real time.

Review: Inspect automated engineering checks grouped by Launch, Space, Ground, and User segments. Critical findings block launch outside Sandbox mode, and Team mode requires sign-off from all four roles.

Flight: Run an accelerated 30-day operational rehearsal with Pause/Resume and 1×/3× speed controls, featuring deterministic in-flight anomalies scaled by your design’s actual engineering margins.

Debrief: Review a weighted 100-point scorecard, root-cause engineering story, actionable redesign suggestions, real NASA mission parallels, and a local trade-study comparison leaderboard.

Architecture

src/config.js — Mission scenarios, difficulty parameters, subsystem specs, orbit/launcher tables, and the per-mission science scoring matrix (SCIENCE).

src/engine.js — Pure engineering model (evaluate), 4-segment design review (review), 4-role conflict checks (roleChecks, conflicts), deterministic 30-day flight simulation (createSim, step, decide), and scoring/debrief generator (report, suggest).

src/App.jsx — React UI, intro menu with theme/mode/difficulty drawers, live spacecraft & orbital SVG visualizations, full-screen flight HUD, and local trade-study persistence.

src/style.css — Responsive design system supporting Light, Dark, OLED, and Glass themes with five accent palettes.

Run Locally

Requirements: Node.js 18 or newer.

npm install
npm run dev


Open the local URL printed by Vite (normally http://localhost:5173). To create and preview a production build:

npm run build
npm run preview


Deploy to Vercel or Netlify using the default Vite build command (npm run build) and output directory (dist). No backend or API key is required.

Model Assumptions & Educational Scope

Orbitwright is an educational systems-thinking simulator, not a flight-certified mission design tool:

Spacecraft masses, power loads (including a 15 W always-on baseline load), data rates, and $M budgets are representative game values rather than vendor quotes.

Launcher capacities and orbital multipliers (sunlight intensity, signal quality, eclipse hours, data buffer gap, radiation level) are simplified approximations for gameplay trade-offs.

In-flight anomalies (power degradation, radiation storm, ground link outage, calibration drift, unexpected discovery) are deterministically seeded from your design so every crisis traces directly to engineering margins.

NASA & Partner References

Design and Develop Science Missions (NASA) — Four-segment structure (Launch, Space, Ground, User).

Mission Design Lab (NASA GSFC) — Objective-first architecture trade studies and design comparison workflow.

Concept Maturity Levels (NASA/JPL) — Progressive concept maturity tracking across mission stages.

CubeSat 101 & Webb: Build It Yourself (NASA) — Small-satellite bus concepts, ConOps summaries, and real-mission comparisons.

NASA Mission Viz — Inspiration for orbital views and mission timelines.
