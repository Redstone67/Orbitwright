# Orbitwright

**Every decision changes the mission.**

An interactive, browser-based space mission design simulator inspired by NASA’s Mission Design Lab, Concept Maturity Levels (CML 1–4), and systems engineering workflows across the four NASA mission segments (**Launch, Space, Ground, and User**).

## Run Locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev

Open the local URL printed by Vite (normally http://localhost:5173). To make a production build:

```bash
npm run build
npm run preview
```

Deploy to Vercel or Netlify using npm run build and output directory dist. No backend or API key is required.

Mission Lifecycle (6 Stages)
Mission: Select one of five science objectives (Stormwatch, Near-Earth Watch, Lunar Waterline, Helios Watch, or Red Planet Mapper) and difficulty mode (Solo or 4-Role Team Co-op).

Architecture: Conduct an orbit and launch vehicle trade study matching science requirements, eclipse duration, radiation, and mass capacity.

Spacecraft: Configure structure/shielding, solar power, battery storage, communications, onboard computer, attitude control (ADCS), and science instruments while monitoring the live resource ledger.

Review: Inspect automated engineering checks grouped by Launch, Space, Ground, and User segments, with mandatory 4-role sign-off in Team mode.

Flight: Run an accelerated 30-day operational rehearsal with deterministic in-flight anomalies scaled by your design's actual engineering margins.

Debrief: Review mission score, subsystem trade-offs, engineering story, real NASA mission parallels, and local design comparisons.
2. Add a true event-by-event animated simulation timeline.
3. Add local role handoffs with private role briefings and a coordination score.
4. Add sandbox mode and browser-local design history.
5. Add a server-backed leaderboard only after solo gameplay is stable.
