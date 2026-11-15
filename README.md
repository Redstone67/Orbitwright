# Orbitwright

**Every decision changes the mission.**

An interactive, browser-based space mission design simulator inspired by NASA’s Mission Design Lab, Concept Maturity Levels (CML 1–4), and systems engineering workflows across the four NASA mission segments (**Launch, Space, Ground, and User**).

## Live Demo

* **Web App:** [https://orbitwright-delta.vercel.app/](https://orbitwright-delta.vercel.app/)

## Run Locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev
```

Mission Lifecycle (6 Stages)

Mission: Choose one of five science objectives (Stormwatch, Near-Earth Watch, Lunar Waterline, Helios Watch, or Red Planet Mapper), difficulty level (Sandbox, Cadet, Engineer, Flight Director), and Solo or Team of 4 co-op mode.
Architecture: Conduct an orbit and launch vehicle trade study matching science requirements, eclipse duration, radiation exposure, and launcher mass capacity.
Spacecraft: Configure structure/shielding, solar power generation, battery storage, communications, onboard computer, attitude control (ADCS), and science instruments while watching the live spacecraft schematic and resource ledger update in real time.
Review: Inspect automated engineering checks grouped across NASA's four mission segments (Launch, Space, Ground, and User), with mandatory 4-role sign-off in Team mode.
Flight: Run an accelerated 30-day operational rehearsal with pause/speed controls and deterministic in-flight anomalies scaled by your design's actual engineering margins.
Debrief: Review your weighted final score, subsystem breakdown, personalized engineering story, real NASA mission parallels, and local trade-study leaderboard.
