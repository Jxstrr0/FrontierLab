# Frontier Lab

An AI-lab tycoon for the browser, by Longlight Interactive. Forked from our bank tycoon Vault Street and converted stage by stage (the record is in [docs/archive/CONVERSION_PLAN.md](docs/archive/CONVERSION_PLAN.md)).

Raise a seed round, open your first sales office, price your plans and API, and win enterprise contracts. Buy compute or build data centers, train your own models, keep the safety regulator happy, take the lab public, buy your rivals and expand across the world's tech capitals — while your personal fortune climbs the rich list.

Plays on phones and desktops. Built with Vite, TypeScript and Preact; deployed with GitHub Pages.

**Play:** https://jxstrr0.github.io/FrontierLab/

**On iPhone:** open the link in Safari, tap Share → Add to Home Screen, then launch it from the icon to play full screen. After the first visit it works offline, and new versions arrive on the next launch.

## Docs

| Doc | What's in it |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Build brief for AI-assisted development sessions |
| [docs/DESIGN.md](docs/DESIGN.md) | Game design, pillars, every system, decision log (source of truth) |
| [docs/SIMULATION.md](docs/SIMULATION.md) | Economy formulas, tick order, balance targets |
| [docs/SCREENS.md](docs/SCREENS.md) | Every screen and its fields |
| [docs/CONTENT.md](docs/CONTENT.md) | Data tables: cities, products, equipment, rivals, events, names |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Game state types and save format |
| [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md) | The Banknote Deco look |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Staged build plan with acceptance criteria |
| [docs/archive/CONVERSION_PLAN.md](docs/archive/CONVERSION_PLAN.md) | Archived: the Vault Street → Frontier Lab mapping and conversion stages (C0–C8, done) |
| [docs/REFERENCE_NOTES.md](docs/REFERENCE_NOTES.md) | Teardown of the systems this game is modeled on |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | GitHub Pages setup |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Session-by-session build log |

## Develop

```bash
npm install
npm run dev        # local server
npm test           # unit tests
npm run balance    # headless multi-year balance report
npm run build      # production build into dist/
```

## Credits

Game systems are modeled on the tycoon genre, especially *Coffee Inc 2*. All names, writing, art and code in this repository are original.
