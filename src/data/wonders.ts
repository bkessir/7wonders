import type { WonderDef, Resource, WonderSide } from '../types/game';

function r(s: string): Resource {
  const map: Record<string, Resource> = {
    S: 'stone', W: 'wood', T: 'wood', O: 'ore', C: 'clay',
    L: 'linen', G: 'glass', P: 'paper',
  };
  return map[s.toUpperCase()] as Resource;
}

function parseCost(s: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const ch of s.toUpperCase()) {
    const res = r(ch);
    if (res) map[res] = (map[res] || 0) + 1;
  }
  return map;
}

function parseRes(s: string): Resource[] {
  return s.split('/').map(ch => r(ch.trim()));
}

export const WONDERS: WonderDef[] = [
  {
    id: 'alexandria',
    name: 'Alexandria',
    a: {
      startResource: 'glass',
      stages: [
        { cost: parseCost('SS'), effects: [{ type: 'points', amount: 3 }] },
        { cost: parseCost('OO'), effects: [{ type: 'resource_choice', resources: ['stone', 'wood', 'ore', 'clay'] }] },
        { cost: parseCost('GG'), effects: [{ type: 'points', amount: 7 }] },
      ],
    },
    b: {
      startResource: 'glass',
      stages: [
        { cost: parseCost('CC'), effects: [{ type: 'resource_choice', resources: ['stone', 'wood', 'ore', 'clay'] }] },
        { cost: parseCost('WW'), effects: [{ type: 'resource_choice', resources: ['linen', 'glass', 'paper'] }] },
        { cost: parseCost('SSS'), effects: [{ type: 'points', amount: 7 }] },
      ],
    },
  },
  {
    id: 'babylon',
    name: 'Babylon',
    a: {
      startResource: 'clay',
      stages: [
        { cost: parseCost('CC'), effects: [{ type: 'points', amount: 3 }] },
        { cost: parseCost('WWW'), effects: [{ type: 'science', symbol: 'any' }] },
        { cost: parseCost('CCCC'), effects: [{ type: 'points', amount: 7 }] },
      ],
    },
    b: {
      startResource: 'clay',
      stages: [
        { cost: parseCost('CL'), effects: [{ type: 'points', amount: 3 }] },
        { cost: parseCost('GWW'), effects: [{ type: 'special', ability: 'play2' }] },
        { cost: parseCost('CCCP'), effects: [{ type: 'science', symbol: 'any' }] },
      ],
    },
  },
  {
    id: 'ephesos',
    name: 'Ephesos',
    a: {
      startResource: 'paper',
      stages: [
        { cost: parseCost('SS'), effects: [{ type: 'points', amount: 3 }] },
        { cost: parseCost('WW'), effects: [{ type: 'coins', amount: 9 }] },
        { cost: parseCost('PP'), effects: [{ type: 'points', amount: 7 }] },
      ],
    },
    b: {
      startResource: 'paper',
      stages: [
        { cost: parseCost('SS'), effects: [{ type: 'points', amount: 2 }, { type: 'coins', amount: 4 }] },
        { cost: parseCost('WW'), effects: [{ type: 'points', amount: 3 }, { type: 'coins', amount: 4 }] },
        { cost: parseCost('GPL'), effects: [{ type: 'points', amount: 5 }, { type: 'coins', amount: 4 }] },
      ],
    },
  },
  {
    id: 'gizah',
    name: 'Gizah',
    a: {
      startResource: 'stone',
      stages: [
        { cost: parseCost('SS'), effects: [{ type: 'points', amount: 3 }] },
        { cost: parseCost('WWW'), effects: [{ type: 'points', amount: 5 }] },
        { cost: parseCost('SSSS'), effects: [{ type: 'points', amount: 7 }] },
      ],
    },
    b: {
      startResource: 'stone',
      stages: [
        { cost: parseCost('WW'), effects: [{ type: 'points', amount: 3 }] },
        { cost: parseCost('SSS'), effects: [{ type: 'points', amount: 5 }] },
        { cost: parseCost('CCC'), effects: [{ type: 'points', amount: 5 }] },
        { cost: parseCost('PSSSS'), effects: [{ type: 'points', amount: 7 }] },
      ],
    },
  },
  {
    id: 'halikarnassus',
    name: 'Halikarnassus',
    a: {
      startResource: 'linen',
      stages: [
        { cost: parseCost('CC'), effects: [{ type: 'points', amount: 3 }] },
        { cost: parseCost('OOO'), effects: [{ type: 'special', ability: 'discard_free' }] },
        { cost: parseCost('LL'), effects: [{ type: 'points', amount: 7 }] },
      ],
    },
    b: {
      startResource: 'linen',
      stages: [
        { cost: parseCost('OO'), effects: [{ type: 'points', amount: 2 }, { type: 'special', ability: 'discard_free' }] },
        { cost: parseCost('CCC'), effects: [{ type: 'points', amount: 1 }, { type: 'special', ability: 'discard_free' }] },
        { cost: parseCost('GPL'), effects: [{ type: 'special', ability: 'discard_free' }] },
      ],
    },
  },
  {
    id: 'olympia',
    name: 'Olympia',
    a: {
      startResource: 'wood',
      stages: [
        { cost: parseCost('WW'), effects: [{ type: 'points', amount: 3 }] },
        { cost: parseCost('SS'), effects: [{ type: 'special', ability: 'free_per_age' }] },
        { cost: parseCost('OO'), effects: [{ type: 'points', amount: 7 }] },
      ],
    },
    b: {
      startResource: 'wood',
      stages: [
        { cost: parseCost('WW'), effects: [{ type: 'special', ability: 'raw_discount' }] },
        { cost: parseCost('SS'), effects: [{ type: 'points', amount: 5 }] },
        { cost: parseCost('LOO'), effects: [{ type: 'special', ability: 'copy_guild' }] },
      ],
    },
  },
  {
    id: 'rhodos',
    name: 'Rhodos',
    a: {
      startResource: 'ore',
      stages: [
        { cost: parseCost('WW'), effects: [{ type: 'points', amount: 3 }] },
        { cost: parseCost('CCC'), effects: [{ type: 'military', shields: 2 }] },
        { cost: parseCost('OOOO'), effects: [{ type: 'points', amount: 7 }] },
      ],
    },
    b: {
      startResource: 'ore',
      stages: [
        { cost: parseCost('SSS'), effects: [{ type: 'military', shields: 1 }, { type: 'points', amount: 3 }, { type: 'coins', amount: 3 }] },
        { cost: parseCost('OOOO'), effects: [{ type: 'military', shields: 1 }, { type: 'points', amount: 4 }, { type: 'coins', amount: 4 }] },
      ],
    },
  },
];

export const WONDER_MAP: Record<string, WonderDef> = Object.fromEntries(
  WONDERS.map(w => [w.id, w])
);
