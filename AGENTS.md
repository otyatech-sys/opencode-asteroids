# AGENTS.md

## Project

Single-file vanilla JS HTML5 Canvas game (`game.js`). No build system, no dependencies, no tests, no linting.

## Run

```bash
npx serve .
# → http://localhost:3000
```

Or open `index.html` directly in a browser.

## Code structure

- `index.html` — minimal shell, loads `game.js`
- `game.js` — entire game: input, entities (Ship, Asteroid, Bullet, Particle), game loop, HUD, state machine

## Key conventions

- All game logic lives in `game.js`. There are no modules or imports.
- Game state machine: `'playing'` → `'dead'` → `'playing'` | `'gameover'`
- Canvas is fixed 800×600 (`W`/`H` constants at top of `game.js`)
- Uses `'use strict'` mode throughout
- UI strings are in Spanish (score labels, game over text)

## Gotchas

- No tooling to run — verify changes by opening in a browser
- No type checking or linting configured — manual review only
- Single commit repo — no CI, no branch conventions
