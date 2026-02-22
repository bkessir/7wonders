# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # TypeScript check + Vite production build (run before committing)
npm run preview  # Serve the production build locally
```

There are no tests. `npm run build` (which runs `tsc && vite build`) is the verification step.

**Node constraint**: Node.js v16.17.0 is installed on this machine. Vite 5 requires Node 18+, so the project is pinned to **Vite 4** (`^4.5.0`). Do not upgrade Vite.

## Architecture

**Stack**: React 18 + TypeScript + Vite 4 + Tailwind CSS 3 + Firebase Realtime Database. Deployed to Netlify.

**Multiplayer model**: All game logic runs in the browser. The host player's browser resolves turns when all players have submitted actions. Firebase is used only for state sync — it is not a server.

### Data flow

```
Firebase Realtime DB
       ↓ subscribeGame() → normalizeGameState()
   App.tsx (game: GameState)
       ↓ prop drilling
   WonderSelect / GameView / ScoreBoard
       ↓ submitAction() / updateGameState() / confirmWonderSide()
Firebase Realtime DB
```

### Critical Firebase behavior

**Firebase removes empty arrays and objects.** Any field written as `{}` or `[]` is deleted from the database. On reads, `normalizeGameState()` in `src/firebase/sync.ts` restores these to safe defaults. Currently normalized:
- Top-level: `pendingActions → {}`, `hands → {}`, `discard → []`
- Per-player: `played → []`, `militaryTokens → []`

If you add new array/object fields to `GameState` or `PlayerState` that start empty, add them to `normalizeGameState`.

**Use atomic updates for partial writes.** `updateGameState()` calls `set()` (full overwrite) and is safe for turn resolution. For partial updates (e.g., one player changing their wonder side), use `confirmWonderSide()` or a dedicated `update()` call. Mixing `set()` from multiple concurrent clients causes race conditions.

### Key files

| File | Purpose |
|------|---------|
| `src/types/game.ts` | All shared TypeScript types (`GameState`, `PlayerState`, `PlayerAction`, etc.) |
| `src/data/cards.ts` | 82 card definitions + `buildDeck()`, `shuffleDeck()`, `chooseGuilds()` |
| `src/data/wonders.ts` | 7 wonder definitions (both A/B sides) |
| `src/engine/resources.ts` | Backtracking resource purchase algorithm (`findPaymentOptions`) |
| `src/engine/scoring.ts` | Military resolution + end-game scoring |
| `src/engine/game.ts` | `resolveTurn()`, `rotateHands()`, `allPlayersReady()`, `startGame()` |
| `src/firebase/sync.ts` | All Firebase operations + `normalizeGameState()` |
| `src/App.tsx` | Root component: identity, lobby/game subscriptions, phase routing |
| `src/components/GameView.tsx` | Main game screen (most complex component) |

### Game phases

`lobby` (not in GameState) → `wonder_select` → `playing` → `end`

Phase routing is in `App.tsx`. The host's `GameView` `useEffect` watches `game.pendingActions` and calls `resolveTurn()` when all players have submitted.

### Images

- Cards: `public/images/cards/{cardId}.png` — card IDs are lowercase, no spaces (e.g., `lumberyard.png`, `easttradingpost.png`)
- Tokens: `public/images/tokens/{resource}.png` — resources: stone, wood, ore, clay, linen, glass, paper; military: victory1, victory3, victory5, victoryminus1; coins: coin, coin1, coin3
- Wonders: `public/images/wonders/{wonderId}{Side}.png` — wonder IDs lowercase, side uppercase (e.g., `alexandriaA.png`, `gizahB.png`)

### Environment

Firebase config is read from `VITE_FIREBASE_*` environment variables (see `.env.example`). The `.env` file is gitignored. On Netlify, set these in **Site → Environment variables**. `src/firebase/config.ts` shows a user-friendly error page if any variable is missing.
