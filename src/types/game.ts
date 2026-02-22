// ─── Resources ───────────────────────────────────────────────────────────────

export type Resource = 'stone' | 'wood' | 'ore' | 'clay' | 'linen' | 'glass' | 'paper';
export type ResourceMap = Partial<Record<Resource, number>>;

// ─── Cards ───────────────────────────────────────────────────────────────────

export type CardColor = 'brown' | 'grey' | 'blue' | 'yellow' | 'red' | 'green' | 'purple';
export type ScienceSymbol = 'compass' | 'gear' | 'tablet';

export interface CardCost {
  coins?: number;       // coin cost (on top of resource cost)
  resources: ResourceMap;
}

export type CardEffect =
  | { type: 'resource_choice'; resources: Resource[] }      // produces one of (e.g. stone or wood)
  | { type: 'resources'; resources: ResourceMap }           // produces all of these
  | { type: 'military'; shields: number }
  | { type: 'science'; symbol: ScienceSymbol }
  | { type: 'coins'; amount: number }
  | { type: 'points'; amount: number }
  | { type: 'trade_discount'; direction: 'left' | 'right' | 'both'; resources: Resource[] }
  | { type: 'dynamic_yellow';                               // commercial scoring
      coinsPerCard: number;
      pointsPerCard: number;
      cardType: CardColor | 'wonder';
      who: 'self' | 'neighbors' | 'all' | 'left' | 'right' }
  | { type: 'science_wildcard' };

export interface CardDef {
  id: string;
  name: string;
  color: CardColor;
  age: 1 | 2 | 3;
  cost: CardCost;
  effects: CardEffect[];
  freeFrom?: string;     // card name that enables free chain
  chains: string[];      // cards this enables for free
  copies: Record<number, number>;  // playerCount -> number of copies (3-7)
}

// ─── Wonders ─────────────────────────────────────────────────────────────────

export type WonderSpecial = 'play2' | 'discard_free' | 'free_per_age' | 'raw_discount' | 'copy_guild';

export type WonderEffect =
  | { type: 'points'; amount: number }
  | { type: 'coins'; amount: number }
  | { type: 'military'; shields: number }
  | { type: 'science'; symbol: ScienceSymbol | 'any' }
  | { type: 'resource_choice'; resources: Resource[] }
  | { type: 'special'; ability: WonderSpecial };

export interface WonderStage {
  cost: ResourceMap;
  effects: WonderEffect[];
}

export interface WonderSide {
  startResource: Resource;
  stages: WonderStage[];
}

export interface WonderDef {
  id: string;
  name: string;
  a: WonderSide;
  b: WonderSide;
}

// ─── Player State ─────────────────────────────────────────────────────────────

export interface PlayerState {
  id: string;
  name: string;
  wonderId: string;
  wonderSide: 'a' | 'b';
  coins: number;
  played: string[];          // card IDs played in front of player
  wonderStagesBuilt: number;
  shields: number;
  militaryTokens: number[];  // e.g. [1, 3, -1] = tokens received
  // Special abilities unlocked by wonder stages
  canPlayFreeThisAge: boolean;   // Olympia A stage 2
  hasRawDiscount: boolean;       // Olympia B stage 1
  canCopyGuild: boolean;         // Olympia B stage 3
  pendingDiscardPlay: boolean;   // Halikarnassus: may play from discard
  pendingPlayTwo: boolean;       // Babylon B: play 2 cards this turn
  isReady: boolean;              // has submitted action for this turn
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type ActionType = 'play' | 'build_wonder' | 'trash';

export interface PlayerAction {
  type: ActionType;
  cardId: string;             // card being played/sacrificed/trashed
  wonderStageIndex?: number;  // for build_wonder
  payment: {
    left: number;
    right: number;
  };
  // Extra actions
  discardChoice?: string;     // Halikarnassus: chosen card from discard pile
  guildCopy?: string;         // Olympia B: chosen guild card to copy
}

// ─── Payment Calculation ──────────────────────────────────────────────────────

export interface PaymentOption {
  left: number;
  right: number;
  total: number;
  valid: boolean;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type GamePhase = 'lobby' | 'wonder_select' | 'playing' | 'military' | 'end';

export interface GameState {
  code: string;
  phase: GamePhase;
  age: 1 | 2 | 3;
  turn: number;   // 1-6 within an age
  hostId: string;
  playerOrder: string[];   // player IDs in clockwise seating order
  players: Record<string, PlayerState>;
  hands: Record<string, string[]>;    // playerId -> card IDs in hand
  discard: string[];
  pendingActions: Record<string, PlayerAction | null>;
  scores?: Record<string, ScoreBreakdown>;
  lastResolved?: TurnResolution;      // for showing what happened
  wonderAssignments?: Record<string, string>;  // playerId -> wonderId
}

export interface TurnResolution {
  age: number;
  turn: number;
  actions: Record<string, PlayerAction>;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  coins: number;      // 1 pt per 3 coins
  wonder: number;     // wonder stage points
  blue: number;       // civic card points
  green: number;      // science points
  red: number;        // military (net, after -1s)
  yellow: number;     // commercial points
  purple: number;     // guild points
  total: number;
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

export interface LobbyPlayer {
  id: string;
  name: string;
  joinedAt: number;
}

export interface LobbyState {
  code: string;
  hostId: string;
  players: Record<string, LobbyPlayer>;
  started: boolean;
}

// ─── Local Player Identity ────────────────────────────────────────────────────

export interface LocalIdentity {
  id: string;    // Firebase push key or localStorage UUID
  name: string;
}
