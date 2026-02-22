# 7 Wonders Online

A full-featured mobile-friendly web app for playing 7 Wonders with 3–7 players online. Built with React + TypeScript + Firebase, deployable to Netlify.

## Features

- **3–7 player real-time multiplayer** via Firebase Realtime Database
- **Full game logic**: all cards, wonders, resource purchasing, science scoring, military
- **Mobile-first** responsive design (works great on phones)
- **All 7 Wonders** with both A and B sides
- **All 3 Ages** with correct card decks and guild selection
- **Resource trading**: buy from neighbors with discounts (Trading Posts, Marketplace, Olympia B)
- **Wonder effects**: Halikarnassus discard play, Babylon play-2, Olympia free card per age, copy guild, etc.
- **Score breakdown** at game end by category
- Works without card images (CSS-based card display); drop in `.png` files to show artwork

---

## Quick Start

### 1. Set Up Firebase (5 minutes, free)

1. Go to **[Firebase Console](https://console.firebase.google.com/)**
2. Click **Add project** → name it anything → Continue → Create project
3. In the left sidebar: **Build → Realtime Database → Create database**
   - Choose a region → Start in **test mode** → Enable
4. In the left sidebar: **Project Overview → ⚙ Project settings**
5. Scroll to **Your apps** → click **</>** (Web) → Register app → Copy the config

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` and paste your Firebase config values:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Deploy to Netlify

1. Push this folder to a GitHub repository
2. Go to [Netlify](https://netlify.com) → **Add new site → Import an existing project**
3. Connect GitHub → select your repo
4. Build settings are auto-detected from `netlify.toml`
5. Go to **Site settings → Environment variables** → add all `VITE_*` values from your `.env`
6. Deploy!

---

## How to Play

### Starting a Game

1. One player clicks **New Game** → enters their name → shares the **5-letter code**
2. Other players click **Join Game** → enter code and name
3. Host clicks **▶ Start Game** when 3–7 players have joined

### Wonder Selection

- Each player is randomly assigned one of 7 Wonders (Alexandria, Babylon, Ephesos, Gizah, Halikarnassus, Olympia, Rhodos)
- Choose **Side A** or **Side B** — each has different stage effects
- Confirm your choice; game begins when all players confirm

### Main Game

- Each turn, all players **simultaneously** choose a card action:
  - **▶ Play**: Put the card in front of you for its effect
  - **🏛 Wonder**: Sacrifice a card to build the next stage of your wonder
  - **🗑 +3🪙**: Discard any card to gain 3 coins
- Cards with a **⛓** icon can be played free if you have the prerequisite card
- Cards highlighted with **reduced opacity** are ones you can't currently afford
- After choosing, click the action button — a payment modal appears if you need to buy resources from neighbors
- Submit your action; wait for all players → hands rotate → next turn

### Scoring

After 3 ages (18 turns), final scores are calculated:
- **Blue** = civic card points (fixed)
- **Green** = science: squares + sets of 3 different symbols
- **Red** = military: win/loss tokens accumulated each age
- **Yellow** = commercial card bonuses (coins + points for card counts)
- **Purple** = guild card points (based on neighbors' cards)
- **Wonder** = built stage points
- **Coins** = 1 VP per 3 coins remaining

---

## Adding Card Images

The game plays perfectly with CSS card designs. To add artwork:

Place PNG files in `public/images/`:

```
public/images/cards/lumberyard.png
public/images/cards/stonepit.png
... (use the card ID as filename)

public/images/wonders/gizaha.png   (Gizah side A)
public/images/wonders/gizahb.png   (Gizah side B)
... (lowercase wonder name + 'a' or 'b')
```

Card IDs match the names in `src/data/cards.ts` (e.g., `lumberyard`, `easttradingpost`, `workersguild`).

---

## Project Structure

```
src/
├── types/game.ts          # All TypeScript types
├── data/
│   ├── cards.ts           # All 82 card definitions
│   └── wonders.ts         # All 7 wonder definitions
├── engine/
│   ├── resources.ts       # Resource purchase calculation
│   ├── scoring.ts         # End-game scoring + military
│   └── game.ts            # Turn resolution + game flow
├── firebase/
│   ├── config.ts          # Firebase initialization
│   └── sync.ts            # Realtime Database operations
└── components/
    ├── Lobby.tsx           # Waiting room
    ├── WonderSelect.tsx    # Side A/B selection
    ├── GameView.tsx        # Main game screen
    ├── WonderBoard.tsx     # Wonder stages display
    ├── CardDisplay.tsx     # Card rendering
    ├── ResourceIcon.tsx    # Resource icon component
    ├── PlayerStatus.tsx    # Other players chip + detail panel
    ├── PaymentModal.tsx    # Resource purchase dialog
    └── ScoreBoard.tsx      # End-game scores
```

---

## Tech Stack

- **React 18** + **TypeScript** — UI and type safety
- **Vite 4** — fast dev server and build
- **Tailwind CSS** — utility-first styling
- **Firebase Realtime Database** — multiplayer sync (free tier)
- **Netlify** — hosting with SPA redirect support
