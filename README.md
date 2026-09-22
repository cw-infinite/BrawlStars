# Dustup — Canyon Showdown

A 3D top-down battle-royale arena game (Brawl Stars–inspired) built with **React + TypeScript + Three.js**, ported from a single-file HTML game into a downloadable Vite project.

Break boxes, collect power cubes, charge your super, and be the last brawler standing as the poison gas closes in.

## Quick start (Windows Git Bash)

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173) in your browser.

Requires **Node.js 18+** (Node 20+ recommended).

## Scripts

| Command           | What it does                               |
|-------------------|--------------------------------------------|
| `npm run dev`     | Start the dev server with hot reload       |
| `npm run build`   | Type-check + production build into `dist/` |
| `npm run preview` | Serve the production build locally         |

## How to play

- **Move** — WASD / arrow keys (left stick on touch)
- **Aim & fire** — mouse (right stick on touch; tap to auto-aim)
- **Super** — Space / right-click, release to fire (✦ button on touch)
- **Pause** — P · **Mute** — M
- Debug keys (add `?debug=1` to the URL): N dummy · R refill super/ammo · G advance gas · T cycle time of day

Pick one of 4 brawlers (Rico the shotgunner, and 3 more), choose bot difficulty, and fight 7 AI rivals. Power cubes boost HP and damage; each brawler has a unique super.

## Project layout

```
src/
  main.tsx        — React entry (no StrictMode: the game manages its own lifecycle)
  App.tsx         — lobby / HUD / results markup
  index.css       — full game stylesheet
  game/
    engine.ts     — the entire Three.js game engine (world, brawlers, bots,
                    combat, gas, effects, audio, input, HUD)
```

The engine boots once after React mounts (`startGame()` in `App.tsx`) and disposes cleanly on unmount (`game.dispose()`).

## Tech notes

- `three@0.128` from npm — no CDN, works fully offline after `npm install`
- `tsconfig.app.json` is intentionally lenient (`strict: false`) because the engine is a faithful port of the original imperative JavaScript game code
- All audio is synthesized with Web Audio — no audio files
