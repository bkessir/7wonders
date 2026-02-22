import type { CardDef, CardEffect, Resource } from '../types/game';

// Resource letter → Resource type
function r(s: string): Resource {
  const map: Record<string, Resource> = {
    S: 'stone', T: 'wood', W: 'wood', O: 'ore', C: 'clay',
    L: 'linen', G: 'glass', P: 'paper',
  };
  return map[s.toUpperCase()] as Resource;
}

// Parse resource cost string like "SSS", "TCG", "CCOGPL"
function parseCost(s: string): Record<string, number> {
  if (!s || s === '') return {};
  const map: Record<string, number> = {};
  for (const ch of s.toUpperCase()) {
    const res = r(ch);
    if (res) map[res] = (map[res] || 0) + 1;
  }
  return map;
}

// Parse resource choice string like "T/C", "C/S/O/T", "L/G/P"
function parseChoice(s: string): Resource[] {
  return s.split('/').map(ch => r(ch.trim()));
}

// Science symbol: 1=compass, 2=gear, 3=tablet
function sciSym(n: string): 'compass' | 'gear' | 'tablet' {
  return n === '1' ? 'compass' : n === '2' ? 'gear' : 'tablet';
}

// copies object: for player counts 3-7
function copies(n3: number, n4: number, n5: number, n6: number, n7: number): Record<number, number> {
  return { 3: n3, 4: n4, 5: n5, 6: n6, 7: n7 };
}

// ─── AGE 1 ────────────────────────────────────────────────────────────────────

const AGE1: CardDef[] = [
  // ── Brown (raw materials) ──
  {
    id: 'lumberyard', name: 'Lumber Yard', color: 'brown', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { wood: 1 } }],
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  {
    id: 'stonepit', name: 'Stone Pit', color: 'brown', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { stone: 1 } }],
    chains: [],
    copies: copies(1, 1, 2, 2, 2),
  },
  {
    id: 'claypool', name: 'Clay Pool', color: 'brown', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { clay: 1 } }],
    chains: [],
    copies: copies(1, 1, 2, 2, 2),
  },
  {
    id: 'orevein', name: 'Ore Vein', color: 'brown', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { ore: 1 } }],
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  {
    id: 'treefarm', name: 'Tree Farm', color: 'brown', age: 1,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resource_choice', resources: ['wood', 'clay'] }],
    chains: [],
    copies: copies(0, 0, 0, 1, 1),
  },
  {
    id: 'excavation', name: 'Excavation', color: 'brown', age: 1,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resource_choice', resources: ['stone', 'clay'] }],
    chains: [],
    copies: copies(0, 1, 1, 1, 1),
  },
  {
    id: 'claypit', name: 'Clay Pit', color: 'brown', age: 1,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resource_choice', resources: ['clay', 'ore'] }],
    chains: [],
    copies: copies(1, 1, 1, 1, 1),
  },
  {
    id: 'timberyard', name: 'Timber Yard', color: 'brown', age: 1,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resource_choice', resources: ['stone', 'wood'] }],
    chains: [],
    copies: copies(1, 1, 1, 1, 1),
  },
  {
    id: 'forestcave', name: 'Forest Cave', color: 'brown', age: 1,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resource_choice', resources: ['wood', 'ore'] }],
    chains: [],
    copies: copies(0, 0, 1, 1, 1),
  },
  {
    id: 'mine', name: 'Mine', color: 'brown', age: 1,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resource_choice', resources: ['ore', 'stone'] }],
    chains: [],
    copies: copies(0, 0, 0, 1, 1),
  },
  // ── Grey (manufactured goods) ──
  {
    id: 'loom', name: 'Loom', color: 'grey', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { linen: 1 } }],
    chains: [],
    copies: copies(1, 1, 1, 2, 2),
  },
  {
    id: 'glassworks', name: 'Glassworks', color: 'grey', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { glass: 1 } }],
    chains: [],
    copies: copies(1, 1, 1, 2, 2),
  },
  {
    id: 'press', name: 'Press', color: 'grey', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { paper: 1 } }],
    chains: [],
    copies: copies(1, 1, 1, 2, 2),
  },
  // ── Blue (civic) ──
  {
    id: 'pawnshop', name: 'Pawnshop', color: 'blue', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'points', amount: 3 }],
    chains: [],
    copies: copies(0, 1, 1, 1, 2),
  },
  {
    id: 'baths', name: 'Baths', color: 'blue', age: 1,
    cost: { resources: { stone: 1 } },
    effects: [{ type: 'points', amount: 3 }],
    chains: ['aqueduct'],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'altar', name: 'Altar', color: 'blue', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'points', amount: 2 }],
    chains: ['temple'],
    copies: copies(1, 1, 2, 2, 2),
  },
  {
    id: 'theater', name: 'Theater', color: 'blue', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'points', amount: 2 }],
    chains: ['statue'],
    copies: copies(1, 1, 1, 2, 2),
  },
  // ── Yellow (commercial) ──
  {
    id: 'tavern', name: 'Tavern', color: 'yellow', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'coins', amount: 5 }],
    chains: [],
    copies: copies(0, 1, 2, 2, 3),
  },
  {
    id: 'easttradingpost', name: 'East Trading Post', color: 'yellow', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'trade_discount', direction: 'right', resources: ['stone', 'wood', 'ore', 'clay'] }],
    chains: ['forum'],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'westtradingpost', name: 'West Trading Post', color: 'yellow', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'trade_discount', direction: 'left', resources: ['stone', 'wood', 'ore', 'clay'] }],
    chains: ['forum'],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'marketplace', name: 'Marketplace', color: 'yellow', age: 1,
    cost: { resources: {} },
    effects: [{ type: 'trade_discount', direction: 'both', resources: ['linen', 'glass', 'paper'] }],
    chains: ['caravansery'],
    copies: copies(1, 1, 1, 2, 2),
  },
  // ── Red (military) ──
  {
    id: 'stockade', name: 'Stockade', color: 'red', age: 1,
    cost: { resources: { wood: 1 } },
    effects: [{ type: 'military', shields: 1 }],
    chains: [],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'barracks', name: 'Barracks', color: 'red', age: 1,
    cost: { resources: { ore: 1 } },
    effects: [{ type: 'military', shields: 1 }],
    chains: ['trainingground'],
    copies: copies(1, 1, 2, 2, 2),
  },
  {
    id: 'guardtower', name: 'Guard Tower', color: 'red', age: 1,
    cost: { resources: { clay: 1 } },
    effects: [{ type: 'military', shields: 1 }],
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  // ── Green (science) ──
  {
    id: 'apothecary', name: 'Apothecary', color: 'green', age: 1,
    cost: { resources: { linen: 1 } },
    effects: [{ type: 'science', symbol: 'compass' }],
    chains: ['stables', 'dispensary'],
    copies: copies(1, 1, 2, 2, 2),
  },
  {
    id: 'workshop', name: 'Workshop', color: 'green', age: 1,
    cost: { resources: { glass: 1 } },
    effects: [{ type: 'science', symbol: 'gear' }],
    chains: ['archeryrange', 'laboratory'],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'scriptorium', name: 'Scriptorium', color: 'green', age: 1,
    cost: { resources: { paper: 1 } },
    effects: [{ type: 'science', symbol: 'tablet' }],
    chains: ['courthouse', 'library'],
    copies: copies(1, 2, 2, 2, 2),
  },
];

// ─── AGE 2 ────────────────────────────────────────────────────────────────────

const AGE2: CardDef[] = [
  // ── Brown ──
  {
    id: 'sawmill', name: 'Sawmill', color: 'brown', age: 2,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resources', resources: { wood: 2 } }],
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  {
    id: 'quarry', name: 'Quarry', color: 'brown', age: 2,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resources', resources: { stone: 2 } }],
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  {
    id: 'brickyard', name: 'Brickyard', color: 'brown', age: 2,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resources', resources: { clay: 2 } }],
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  {
    id: 'foundry', name: 'Foundry', color: 'brown', age: 2,
    cost: { coins: 1, resources: {} },
    effects: [{ type: 'resources', resources: { ore: 2 } }],
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  // ── Grey ──
  {
    id: 'loom2', name: 'Loom', color: 'grey', age: 2,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { linen: 1 } }],
    chains: [],
    copies: copies(1, 1, 2, 2, 2),
  },
  {
    id: 'glassworks2', name: 'Glassworks', color: 'grey', age: 2,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { glass: 1 } }],
    chains: [],
    copies: copies(1, 1, 2, 2, 2),
  },
  {
    id: 'press2', name: 'Press', color: 'grey', age: 2,
    cost: { resources: {} },
    effects: [{ type: 'resources', resources: { paper: 1 } }],
    chains: [],
    copies: copies(1, 1, 2, 2, 2),
  },
  // ── Blue ──
  {
    id: 'aqueduct', name: 'Aqueduct', color: 'blue', age: 2,
    cost: { resources: { stone: 3 } },
    effects: [{ type: 'points', amount: 5 }],
    freeFrom: 'baths',
    chains: [],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'temple', name: 'Temple', color: 'blue', age: 2,
    cost: { resources: { wood: 1, clay: 1, glass: 1 } },
    effects: [{ type: 'points', amount: 3 }],
    freeFrom: 'altar',
    chains: ['pantheon'],
    copies: copies(1, 1, 1, 2, 2),
  },
  {
    id: 'statue', name: 'Statue', color: 'blue', age: 2,
    cost: { resources: { wood: 1, ore: 2 } },
    effects: [{ type: 'points', amount: 4 }],
    freeFrom: 'theater',
    chains: ['gardens'],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'courthouse', name: 'Courthouse', color: 'blue', age: 2,
    cost: { resources: { clay: 2, linen: 1 } },
    effects: [{ type: 'points', amount: 4 }],
    freeFrom: 'scriptorium',
    chains: ['senate'],
    copies: copies(1, 1, 2, 2, 2),
  },
  // ── Yellow ──
  {
    id: 'forum', name: 'Forum', color: 'yellow', age: 2,
    cost: { resources: { clay: 2 } },
    effects: [{ type: 'resource_choice', resources: ['linen', 'glass', 'paper'] }],
    freeFrom: 'easttradingpost',
    chains: ['haven'],
    copies: copies(1, 1, 1, 2, 3),
  },
  {
    id: 'caravansery', name: 'Caravansery', color: 'yellow', age: 2,
    cost: { resources: { wood: 2 } },
    effects: [{ type: 'resource_choice', resources: ['stone', 'wood', 'ore', 'clay'] }],
    freeFrom: 'marketplace',
    chains: ['lighthouse'],
    copies: copies(1, 1, 2, 3, 3),
  },
  {
    id: 'vineyard', name: 'Vineyard', color: 'yellow', age: 2,
    cost: { resources: {} },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 1, pointsPerCard: 0, cardType: 'brown', who: 'neighbors' }],
    chains: [],
    copies: copies(1, 1, 1, 2, 2),
  },
  {
    id: 'bazar', name: 'Bazar', color: 'yellow', age: 2,
    cost: { resources: {} },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 2, pointsPerCard: 0, cardType: 'grey', who: 'neighbors' }],
    chains: [],
    copies: copies(0, 1, 1, 1, 2),
  },
  // ── Red ──
  {
    id: 'walls', name: 'Walls', color: 'red', age: 2,
    cost: { resources: { stone: 3 } },
    effects: [{ type: 'military', shields: 2 }],
    chains: ['fortifications'],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'trainingground', name: 'Training Ground', color: 'red', age: 2,
    cost: { resources: { wood: 1, ore: 2 } },
    effects: [{ type: 'military', shields: 2 }],
    freeFrom: 'barracks',
    chains: ['circus'],
    copies: copies(0, 1, 1, 2, 3),
  },
  {
    id: 'stables', name: 'Stables', color: 'red', age: 2,
    cost: { resources: { ore: 1, clay: 1, wood: 1 } },
    effects: [{ type: 'military', shields: 2 }],
    freeFrom: 'apothecary',
    chains: [],
    copies: copies(1, 1, 2, 2, 2),
  },
  {
    id: 'archeryrange', name: 'Archery Range', color: 'red', age: 2,
    cost: { resources: { wood: 2, ore: 1 } },
    effects: [{ type: 'military', shields: 2 }],
    freeFrom: 'workshop',
    chains: [],
    copies: copies(1, 1, 1, 2, 2),
  },
  // ── Green ──
  {
    id: 'dispensary', name: 'Dispensary', color: 'green', age: 2,
    cost: { resources: { ore: 2, glass: 1 } },
    effects: [{ type: 'science', symbol: 'compass' }],
    freeFrom: 'apothecary',
    chains: ['arena', 'lodge'],
    copies: copies(1, 2, 2, 2, 2),
  },
  {
    id: 'laboratory', name: 'Laboratory', color: 'green', age: 2,
    cost: { resources: { clay: 2, paper: 1 } },
    effects: [{ type: 'science', symbol: 'gear' }],
    freeFrom: 'workshop',
    chains: ['siegeworkshop', 'observatory'],
    copies: copies(1, 1, 2, 2, 2),
  },
  {
    id: 'library', name: 'Library', color: 'green', age: 2,
    cost: { resources: { stone: 2, linen: 1 } },
    effects: [{ type: 'science', symbol: 'tablet' }],
    freeFrom: 'scriptorium',
    chains: ['senate', 'university'],
    copies: copies(1, 1, 1, 2, 2),
  },
  {
    id: 'school', name: 'School', color: 'green', age: 2,
    cost: { resources: { wood: 1, paper: 1 } },
    effects: [{ type: 'science', symbol: 'tablet' }],
    chains: ['academy', 'study'],
    copies: copies(1, 1, 1, 1, 2),
  },
];

// ─── AGE 3 ────────────────────────────────────────────────────────────────────

const AGE3: CardDef[] = [
  // ── Blue ──
  {
    id: 'pantheon', name: 'Pantheon', color: 'blue', age: 3,
    cost: { resources: { clay: 2, ore: 1, glass: 1, paper: 1, linen: 2 } },
    effects: [{ type: 'points', amount: 7 }],
    freeFrom: 'temple',
    chains: [],
    copies: copies(1, 1, 1, 2, 2),
  },
  {
    id: 'gardens', name: 'Gardens', color: 'blue', age: 3,
    cost: { resources: { wood: 1, clay: 2 } },
    effects: [{ type: 'points', amount: 5 }],
    freeFrom: 'statue',
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  {
    id: 'townhall', name: 'Town Hall', color: 'blue', age: 3,
    cost: { resources: { stone: 2, ore: 1, glass: 1 } },
    effects: [{ type: 'points', amount: 6 }],
    chains: [],
    copies: copies(1, 1, 2, 3, 3),
  },
  {
    id: 'palace', name: 'Palace', color: 'blue', age: 3,
    cost: { resources: { stone: 1, ore: 1, wood: 1, clay: 1, glass: 1, linen: 1, paper: 1 } },
    effects: [{ type: 'points', amount: 8 }],
    chains: [],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'senate', name: 'Senate', color: 'blue', age: 3,
    cost: { resources: { ore: 1, stone: 1, wood: 2 } },
    effects: [{ type: 'points', amount: 6 }],
    freeFrom: 'library',
    chains: [],
    copies: copies(1, 1, 2, 2, 2),
  },
  // ── Yellow ──
  {
    id: 'haven', name: 'Haven', color: 'yellow', age: 3,
    cost: { resources: { linen: 1, ore: 1, wood: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 1, pointsPerCard: 1, cardType: 'brown', who: 'self' }],
    freeFrom: 'forum',
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  {
    id: 'lighthouse', name: 'Lighthouse', color: 'yellow', age: 3,
    cost: { resources: { stone: 1, glass: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 1, pointsPerCard: 1, cardType: 'yellow', who: 'self' }],
    freeFrom: 'caravansery',
    chains: [],
    copies: copies(1, 1, 1, 2, 2),
  },
  {
    id: 'chamberofcommerce', name: 'Chamber of Commerce', color: 'yellow', age: 3,
    cost: { resources: { clay: 2, paper: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 2, pointsPerCard: 2, cardType: 'grey', who: 'self' }],
    chains: [],
    copies: copies(0, 1, 1, 2, 2),
  },
  {
    id: 'arena', name: 'Arena', color: 'yellow', age: 3,
    cost: { resources: { stone: 2, ore: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 3, pointsPerCard: 1, cardType: 'wonder', who: 'self' }],
    freeFrom: 'dispensary',
    chains: [],
    copies: copies(1, 1, 2, 2, 3),
  },
  // ── Red ──
  {
    id: 'fortifications', name: 'Fortifications', color: 'red', age: 3,
    cost: { resources: { ore: 3, stone: 1 } },
    effects: [{ type: 'military', shields: 3 }],
    freeFrom: 'walls',
    chains: [],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'circus', name: 'Circus', color: 'red', age: 3,
    cost: { resources: { stone: 3, ore: 1 } },
    effects: [{ type: 'military', shields: 3 }],
    freeFrom: 'trainingground',
    chains: [],
    copies: copies(0, 1, 2, 3, 3),
  },
  {
    id: 'arsenal', name: 'Arsenal', color: 'red', age: 3,
    cost: { resources: { wood: 2, ore: 1, linen: 1 } },
    effects: [{ type: 'military', shields: 3 }],
    chains: [],
    copies: copies(1, 2, 2, 2, 3),
  },
  {
    id: 'siegeworkshop', name: 'Siege Workshop', color: 'red', age: 3,
    cost: { resources: { wood: 1, clay: 3 } },
    effects: [{ type: 'military', shields: 3 }],
    freeFrom: 'laboratory',
    chains: [],
    copies: copies(1, 1, 2, 2, 2),
  },
  // ── Green ──
  {
    id: 'lodge', name: 'Lodge', color: 'green', age: 3,
    cost: { resources: { clay: 2, linen: 1, paper: 1 } },
    effects: [{ type: 'science', symbol: 'compass' }],
    freeFrom: 'dispensary',
    chains: [],
    copies: copies(1, 1, 1, 2, 2),
  },
  {
    id: 'observatory', name: 'Observatory', color: 'green', age: 3,
    cost: { resources: { ore: 2, glass: 1, linen: 1 } },
    effects: [{ type: 'science', symbol: 'gear' }],
    freeFrom: 'laboratory',
    chains: [],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'university', name: 'University', color: 'green', age: 3,
    cost: { resources: { wood: 2, paper: 1, glass: 1 } },
    effects: [{ type: 'science', symbol: 'tablet' }],
    freeFrom: 'library',
    chains: [],
    copies: copies(1, 2, 2, 2, 2),
  },
  {
    id: 'academy', name: 'Academy', color: 'green', age: 3,
    cost: { resources: { stone: 3, glass: 1 } },
    effects: [{ type: 'science', symbol: 'compass' }],
    freeFrom: 'school',
    chains: [],
    copies: copies(1, 1, 1, 1, 2),
  },
  {
    id: 'study', name: 'Study', color: 'green', age: 3,
    cost: { resources: { wood: 1, paper: 1, linen: 1 } },
    effects: [{ type: 'science', symbol: 'gear' }],
    freeFrom: 'school',
    chains: [],
    copies: copies(1, 1, 2, 2, 2),
  },
  // ── Purple (guilds) — all included in GUILDS export below ──
];

// ─── GUILDS ───────────────────────────────────────────────────────────────────

export const GUILDS: CardDef[] = [
  {
    id: 'workersguild', name: "Workers' Guild", color: 'purple', age: 3,
    cost: { resources: { ore: 1, clay: 1, stone: 1, wood: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 0, pointsPerCard: 1, cardType: 'brown', who: 'neighbors' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
  {
    id: 'craftsmensguild', name: "Craftsmen's Guild", color: 'purple', age: 3,
    cost: { resources: { ore: 2, stone: 2 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 0, pointsPerCard: 2, cardType: 'grey', who: 'neighbors' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
  {
    id: 'tradersguild', name: "Traders' Guild", color: 'purple', age: 3,
    cost: { resources: { linen: 1, glass: 1, paper: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 0, pointsPerCard: 1, cardType: 'yellow', who: 'neighbors' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
  {
    id: 'philosophersguild', name: "Philosophers' Guild", color: 'purple', age: 3,
    cost: { resources: { clay: 3, linen: 1, paper: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 0, pointsPerCard: 1, cardType: 'green', who: 'neighbors' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
  {
    id: 'spiesguild', name: "Spies' Guild", color: 'purple', age: 3,
    cost: { resources: { clay: 3, glass: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 0, pointsPerCard: 1, cardType: 'red', who: 'neighbors' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
  {
    id: 'strategistsguild', name: "Strategists' Guild", color: 'purple', age: 3,
    cost: { resources: { ore: 2, stone: 1, linen: 1 } },
    // 1 pt per military loss token on each neighbor (loss = -1 token)
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 0, pointsPerCard: 1, cardType: 'red', who: 'neighbors' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
  {
    id: 'shipownersguild', name: "Shipowners' Guild", color: 'purple', age: 3,
    cost: { resources: { linen: 1, paper: 1, glass: 1 } },
    // 1 pt per brown + grey + purple card of self
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 0, pointsPerCard: 1, cardType: 'brown', who: 'self' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
  {
    id: 'scientistsguild', name: "Scientists' Guild", color: 'purple', age: 3,
    cost: { resources: { wood: 2, ore: 2, paper: 1 } },
    effects: [{ type: 'science_wildcard' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
  {
    id: 'magistratesguild', name: "Magistrates' Guild", color: 'purple', age: 3,
    cost: { resources: { wood: 3, stone: 1, linen: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 0, pointsPerCard: 1, cardType: 'blue', who: 'neighbors' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
  {
    id: 'buildersguild', name: "Builders' Guild", color: 'purple', age: 3,
    cost: { resources: { stone: 2, clay: 2, glass: 1 } },
    effects: [{ type: 'dynamic_yellow', coinsPerCard: 0, pointsPerCard: 1, cardType: 'wonder', who: 'neighbors' }],
    chains: [],
    copies: copies(0, 0, 0, 0, 0),
  },
];

// ─── All Cards ────────────────────────────────────────────────────────────────

export const ALL_CARDS: CardDef[] = [...AGE1, ...AGE2, ...AGE3, ...GUILDS];

export const CARD_MAP: Record<string, CardDef> = Object.fromEntries(
  ALL_CARDS.map(c => [c.id, c])
);

// Build deck for a given age and player count
export function buildDeck(age: 1 | 2 | 3, numPlayers: number, guildIds?: string[]): string[] {
  const deck: string[] = [];
  const cards = age === 1 ? AGE1 : age === 2 ? AGE2 : AGE3;
  for (const card of cards) {
    const count = card.copies[numPlayers] ?? 0;
    for (let i = 0; i < count; i++) {
      deck.push(card.id);
    }
  }
  if (age === 3) {
    // Add numPlayers + 2 randomly chosen guilds
    const chosen = guildIds ?? chooseGuilds(numPlayers);
    for (const id of chosen) {
      deck.push(id);
    }
  }
  return deck;
}

export function chooseGuilds(numPlayers: number): string[] {
  const shuffled = [...GUILDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numPlayers + 2).map(g => g.id);
}

// Seeded shuffle (Fisher-Yates with a simple seed)
export function shuffleDeck(deck: string[], seed: number): string[] {
  const arr = [...deck];
  let s = seed;
  function rand() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
