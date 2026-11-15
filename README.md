# Mission Control: Twelve Months to Launch

A browser-based educational space mission design game. Players choose a science objective, build a spacecraft, select a launcher and orbit, run an accelerated mission simulation, and receive an engineering debrief.

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). To make a production build:

```bash
npm run build
npm run preview
```

Deploy the repository to Vercel or Netlify using the default Vite build command (`npm run build`) and output directory (`dist`). No backend or API key is required.

## Game flow

1. **The pitch:** choose one of five science missions and a difficulty.
2. **Spacecraft design:** choose a bus, power system, communications system and up to six instruments. The live ledger updates mass, power, data and budget. The conceptual spacecraft drawing responds to selected payload count.
3. **The ride:** choose a launch vehicle and orbit. Payload capacity is specific to the selected orbit; mission science requirements also constrain acceptable orbit choices.
4. **Mission control:** review preflight checks and run a 30-day accelerated rehearsal.
5. **Debrief:** review mission score, science return, stored/downlinked data, events and engineering findings.

The `Why?` controls in the live telemetry ledger explain mass, power, data and cost. The spacecraft part descriptions explain each component's purpose and trade-offs.

## Architecture

- `src/config.js` — all editable game data and balancing assumptions.
- `src/engine.js` — pure calculations for resource budgets, compatibility, mission scoring and simulation.
- `src/App.jsx` — React interface, stage navigation and local state.
- `src/style.css` — responsive retro mission-control visual system.

Keep game calculations in `engine.js`; avoid duplicating formulas in UI components. Keep balance values in `config.js`.

## Model assumptions and limitations

This is an educational, deterministic game model, not a flight dynamics tool or mission design authority. It uses simplified approximations:

- Spacecraft component masses, power loads and data rates are representative game values, not vendor specifications.
- Budget values are abstract credits, not USD launch or spacecraft procurement quotes.
- Launcher capacities are illustrative payload limits by orbit, not current provider performance guarantees.
- Orbit effects are represented by simple signal and launch-cost multipliers. No orbital mechanics, link-budget geometry, eclipse analysis, propulsion sizing or thermal model is solved.
- Power is a static generation-versus-load comparison with simplified mission-life consequences.
- Data return is a daily capacity comparison; ground-station geometry, protocol overhead and contact schedules are omitted.
- Mission simulation is accelerated and uses a deterministic event schedule for reproducible live demos.
- Mission science scores use a simplified instrument capability score and mission-specific requirements.

These simplifications are intentional for a short hackathon build. The game teaches coupled systems thinking, not operational spacecraft certification.

## What changed in v1.1

- **Science depends on the mission.** `SCIENCE` and `NEED` in `config.js` score each instrument per mission, so a particle detector earns nothing over a hurricane. A warning names any instrument that adds no science.
- **Rebalanced budgets.** `check.mjs` searches every design. All 15 mission and difficulty combinations now have winning designs, with at least 6 different hardware combinations each. Run `node check.mjs` after changing numbers.
- **Real team roles.** Pass-the-console mode gives each of the four roles a private goal and shows conflict cards. A coordination bonus (up to +10) is added to the score.
- **Computed advice.** The debrief's "what another team might try" is built from the actual design.
- **Fly again, new luck** reshuffles the random events. **Sandbox** difficulty removes limits and events.

## Team mode, sharing and persistence

The current build includes a local pass-the-console discussion prompt for teams. It does not yet provide separate role permissions, private role briefings, a coordination score or online multiplayer. Share Design encodes the current design into a URL query parameter and copies it to the clipboard when browser permissions allow. The current build autosaves the latest design in browser local storage. It does not include a server-backed leaderboard, cloud saves or cross-device design history.

## Challenge coverage

| Challenge requirement | Implementation |
|---|---|
| Mission objective | Five selectable science scenarios |
| Spacecraft | Bus, power, communications and instrument selection |
| Launch vehicle and orbit | Orbit-specific launcher payload capacities and mission orbit constraints |
| Mass, power, budget and data | Live linked resource ledger and preflight warnings |
| Mission lifetime | Simplified power-margin lifetime estimate in the engineering model |
| Solo play | Complete five-stage solo flow |
| Team play up to four | Local pass-the-console discussion mode; online role-based mode is future work |
| Explain success/failure | Plain-language warnings, preflight checks and debrief |
| Random events | Repeatable solar, instrument, ground-station and thermal events |
| Difficulty | Cadet, Engineer and Flight Director balance settings |
| Save/share/compare | Shareable URL and browser-local autosave of the latest design; cross-device cloud comparison and leaderboard are future work |
| Sandbox | Future extension; can be implemented by removing budget and orbit restrictions |

## Two-minute demo script

**0:00–0:15 — Hook**  
“Welcome to Mission Control. You have twelve months to launch a spacecraft. The science team has a question; your job is to turn it into a mission that can actually fly.”

**0:15–0:35 — Pitch**  
Choose *Stormwatch*. “We need earlier hurricane warnings. Notice that the mission objective has specific science needs, so there isn't one spacecraft that is best for every mission.”

**0:35–1:05 — Build**  
Choose a bus, deployable solar wings, X-band communications, and a wide-field camera plus thermal sensor. Point to the live ledger: “Adding an instrument changes mass, power demand, data generation and cost together. The Why button explains what each resource means.”

**1:05–1:25 — Ride**  
Select a launcher and sun-synchronous orbit. “Orbit affects coverage, signal strength and how much the rocket can lift. The game checks actual design mass against this orbit's payload limit and explains a failure in plain language.”

**1:25–1:45 — Mission**  
Show the preflight checklist and run the simulation. “The mission runs for thirty accelerated days. Events can interrupt power, science collection or communications, so engineering margin matters.”

**1:45–2:00 — Debrief**  
Show score and report. “We don't just say pass or fail. We show what worked, what failed, why it happened, and what another team could change. This is how we turn a space mission into an approachable engineering learning experience.”

## Suggested next improvements

1. Add an explicit mission science scoring matrix per instrument and mission.
2. Add a true event-by-event animated simulation timeline.
3. Add local role handoffs with private role briefings and a coordination score.
4. Add sandbox mode and browser-local design history.
5. Add a server-backed leaderboard only after solo gameplay is stable.
