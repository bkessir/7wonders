import type {
  GameState, PlayerState, PlayerAction, CardDef, GamePhase
} from '../types/game';
import { CARD_MAP, buildDeck, shuffleDeck, chooseGuilds } from '../data/cards';
import { WONDER_MAP, WONDERS } from '../data/wonders';
import { hasFreeChain } from './resources';
import { resolveMilitary, scoreAll } from './scoring';

// ─── Game Initialization ──────────────────────────────────────────────────────

export function createInitialPlayerState(id: string, name: string): PlayerState {
  return {
    id, name,
    wonderId: '',
    wonderSide: 'a',
    coins: 3,
    played: [],
    wonderStagesBuilt: 0,
    shields: 0,
    militaryTokens: [],
    canPlayFreeThisAge: false,
    hasRawDiscount: false,
    canCopyGuild: false,
    pendingDiscardPlay: false,
    pendingPlayTwo: false,
    isReady: false,
  };
}

// Assign wonders randomly to players
export function assignWonders(playerIds: string[]): Record<string, string> {
  const shuffled = [...WONDERS].sort(() => Math.random() - 0.5);
  const assignment: Record<string, string> = {};
  for (let i = 0; i < playerIds.length; i++) {
    assignment[playerIds[i]] = shuffled[i].id;
  }
  return assignment;
}

// Deal cards for an age
function dealAge(
  age: 1 | 2 | 3,
  numPlayers: number,
  playerOrder: string[],
  seed: number,
): Record<string, string[]> {
  const guilds = age === 3 ? chooseGuilds(numPlayers) : undefined;
  const deck = shuffleDeck(buildDeck(age, numPlayers, guilds), seed);
  const hands: Record<string, string[]> = {};
  for (let i = 0; i < numPlayers; i++) {
    hands[playerOrder[i]] = deck.slice(i * 7, (i + 1) * 7);
  }
  return hands;
}

// Rotate hands: age 1 & 3 pass left (clockwise), age 2 passes right
export function rotateHands(
  hands: Record<string, string[]>,
  playerOrder: string[],
  age: number,
): Record<string, string[]> {
  const n = playerOrder.length;
  const newHands: Record<string, string[]> = {};
  for (let i = 0; i < n; i++) {
    const srcIdx = age === 2
      ? (i + 1) % n   // receive from right
      : (i - 1 + n) % n; // receive from left
    newHands[playerOrder[i]] = hands[playerOrder[srcIdx]];
  }
  return newHands;
}

// ─── Start Game ───────────────────────────────────────────────────────────────

export function startGame(game: GameState): GameState {
  const order = game.playerOrder;
  const n = order.length;
  const seed = Date.now();
  const hands = dealAge(1, n, order, seed);

  // Apply wonder assignments
  const players = { ...game.players };
  for (const [pid, wonderId] of Object.entries(game.wonderAssignments ?? {})) {
    const wonder = WONDER_MAP[wonderId];
    players[pid] = {
      ...players[pid],
      wonderId,
      wonderSide: 'a',
    };
  }

  return {
    ...game,
    phase: 'wonder_select',
    players,
    hands,
    discard: [],
    pendingActions: {},
    age: 1,
    turn: 1,
  };
}

// ─── Apply Card Effect ────────────────────────────────────────────────────────

function applyCardEffect(card: CardDef, player: PlayerState): PlayerState {
  let shields = player.shields;
  let coins = player.coins;
  let canPlayFreeThisAge = player.canPlayFreeThisAge;
  let hasRawDiscount = player.hasRawDiscount;

  for (const eff of card.effects) {
    if (eff.type === 'military') shields += eff.shields;
    if (eff.type === 'coins') coins += eff.amount;
    if (eff.type === 'dynamic_yellow' && eff.coinsPerCard > 0) {
      // Coin collection happens at scoring time for points; but immediate coins
      // for Haven, Lighthouse, CoC, Arena happen when played
      // We'll handle this during play resolution
    }
  }

  return { ...player, shields, coins, canPlayFreeThisAge };
}

// ─── Resolve Actions for One Turn ────────────────────────────────────────────

export function resolveTurn(game: GameState): GameState {
  const order = game.playerOrder;
  const n = order.length;
  let players = { ...game.players };
  let discard = [...(game.discard ?? [])];
  const actions = game.pendingActions ?? {};

  // First pass: process all plays
  for (const pid of order) {
    const action = actions[pid];
    if (!action) continue;
    const player = players[pid];
    const card = CARD_MAP[action.cardId];
    if (!card) continue;

    // Deduct payment to neighbors
    const leftId = order[(order.indexOf(pid) - 1 + n) % n];
    const rightId = order[(order.indexOf(pid) + 1) % n];

    let newCoins = player.coins - (action.payment.left + action.payment.right);
    players[leftId] = { ...players[leftId], coins: players[leftId].coins + action.payment.left };
    players[rightId] = { ...players[rightId], coins: players[rightId].coins + action.payment.right };

    // Also deduct base coin cost
    if (card.cost.coins && !hasFreeChain(card, player) && !player.canPlayFreeThisAge && action.type === 'play') {
      newCoins -= card.cost.coins;
    }

    if (action.type === 'trash') {
      // Discard card for 3 coins
      newCoins += 3;
      discard.push(action.cardId);
      players[pid] = { ...player, coins: newCoins, isReady: false };
      continue;
    }

    if (action.type === 'build_wonder') {
      const wonder = WONDER_MAP[player.wonderId];
      const side = wonder?.[player.wonderSide];
      const stageIdx = player.wonderStagesBuilt;
      const stage = side?.stages[stageIdx];
      discard.push(action.cardId); // card is consumed

      let extraCoins = 0;
      let extraShields = 0;
      let newCanCopyGuild = player.canCopyGuild;
      let newPendingDiscard = player.pendingDiscardPlay;
      let newPendingPlayTwo = player.pendingPlayTwo;
      let newHasRawDiscount = player.hasRawDiscount;
      let newCanPlayFree = player.canPlayFreeThisAge;

      if (stage) {
        for (const eff of stage.effects) {
          if (eff.type === 'coins') extraCoins += eff.amount;
          if (eff.type === 'military') extraShields += eff.shields;
          if (eff.type === 'special') {
            if (eff.ability === 'discard_free') newPendingDiscard = true;
            if (eff.ability === 'play2') newPendingPlayTwo = true;
            if (eff.ability === 'raw_discount') newHasRawDiscount = true;
            if (eff.ability === 'free_per_age') newCanPlayFree = true;
            if (eff.ability === 'copy_guild') newCanCopyGuild = true;
          }
        }
      }

      players[pid] = {
        ...player,
        coins: newCoins + extraCoins,
        shields: player.shields + extraShields,
        wonderStagesBuilt: player.wonderStagesBuilt + 1,
        canCopyGuild: newCanCopyGuild,
        pendingDiscardPlay: newPendingDiscard,
        pendingPlayTwo: newPendingPlayTwo,
        hasRawDiscount: newHasRawDiscount,
        canPlayFreeThisAge: newCanPlayFree,
        isReady: false,
      };
      continue;
    }

    // Play card
    if (action.type === 'play') {
      let usedFree = false;
      if (player.canPlayFreeThisAge && !hasFreeChain(card, player)) {
        usedFree = true;
      }
      // Apply immediate coin effects (Tavern, fixed amounts)
      for (const eff of card.effects) {
        if (eff.type === 'coins') {
          newCoins += eff.amount;
        }
      }
      // Dynamic yellow coin effects (Vineyard, Bazar, Haven, Lighthouse, CoC, Arena)
      newCoins += calcDynamicCoins(card, player, players[leftId], players[rightId]);

      players[pid] = {
        ...player,
        coins: newCoins,
        shields: player.shields + (((card.effects.find(e => e.type === 'military') as any)?.shields) ?? 0),
        played: [...player.played, action.cardId],
        canPlayFreeThisAge: usedFree ? false : player.canPlayFreeThisAge,
        isReady: false,
      };
    }
  }

  // Second pass: resolve Halikarnassus discard picks.
  // Only process players whose pendingDiscardPlay flag was already set BEFORE
  // this turn (i.e. in game.players). If the flag was just set during the first
  // pass above (stage built this same turn), we defer it — the flag stays true
  // and the player will see the discard picker at the start of the next turn,
  // which is correct for both mid-age and end-of-age builds.
  for (const pid of order) {
    if (!game.players[pid]?.pendingDiscardPlay) continue;
    const player = players[pid];
    const chosenId = actions[pid]?.discardChoice;
    const discardIdx = chosenId ? discard.indexOf(chosenId) : -1;
    if (chosenId && discardIdx !== -1) {
      discard.splice(discardIdx, 1);
      players[pid] = {
        ...players[pid],
        played: [...players[pid].played, chosenId],
        pendingDiscardPlay: false,
      };
    } else {
      // Skipped or invalid choice — just clear the flag
      players[pid] = { ...players[pid], pendingDiscardPlay: false };
    }
  }

  // Determine shields for all (recompute from played cards + wonder)
  for (const pid of order) {
    const p = players[pid];
    let shields = 0;
    for (const cardId of p.played) {
      const card = CARD_MAP[cardId];
      for (const eff of card?.effects ?? []) {
        if (eff.type === 'military') shields += eff.shields;
      }
    }
    // Wonder stages military
    const wonder = WONDER_MAP[p.wonderId];
    if (wonder) {
      const side = wonder[p.wonderSide];
      for (let i = 0; i < p.wonderStagesBuilt; i++) {
        for (const eff of (side.stages[i]?.effects ?? [])) {
          if (eff.type === 'military') shields += eff.shields;
        }
      }
    }
    players[pid] = { ...players[pid], shields };
  }

  // Advance turn
  let newTurn = game.turn + 1;
  let newAge = game.age;
  let newPhase: GamePhase = 'playing';

  // Remove each player's chosen card from their hand before rotation.
  // Use indexOf+splice-style removal so only ONE copy is removed — multiple
  // copies of the same card ID can end up in a hand via rotation, and
  // filter() would incorrectly remove all of them.
  let newHands: Record<string, string[]> = {};
  for (const pid of order) {
    const action = actions[pid];
    const hand = [...((game.hands ?? {})[pid] ?? [])];
    if (action) {
      const idx = hand.indexOf(action.cardId);
      if (idx !== -1) hand.splice(idx, 1);
    }
    newHands[pid] = hand;
  }

  // Discard last card of the age (7th card after 6 plays)
  const turnsPerAge = 6;

  if (newTurn > turnsPerAge) {
    // End of age: military resolution, then next age or end
    const resolved = resolveMilitary({ ...game, players, discard });
    players = { ...resolved.players };
    // Reset free-per-age flags
    for (const pid of order) {
      players[pid] = { ...players[pid], canPlayFreeThisAge: false };
    }
    // Discard remaining cards in hands
    for (const pid of order) {
      discard.push(...(newHands[pid] ?? []));
    }
    newHands = {};

    if (newAge < 3) {
      newAge = (newAge + 1) as 1 | 2 | 3;
      newTurn = 1;
      const seed = Date.now() + newAge;
      newHands = dealAge(newAge, n, order, seed);
    } else {
      // End of game
      const finalGame: GameState = {
        ...game,
        phase: 'end',
        players,
        discard,
        hands: {},
        pendingActions: {},
        age: newAge,
        turn: 6,
        scores: scoreAll({ ...game, players, age: newAge }),
      };
      return finalGame;
    }
  } else {
    // Rotate hands for next turn; hands already have the played card removed
    const rotated = rotateHands(newHands, order, game.age);
    newHands = rotated;
  }

  return {
    ...game,
    phase: newPhase,
    age: newAge as 1 | 2 | 3,
    turn: newTurn,
    players,
    hands: newHands,
    discard,
    pendingActions: {},
    lastResolved: { age: game.age, turn: game.turn, actions: { ...actions } as any },
  };
}

// ─── Dynamic coin scoring (called during play for immediate coins) ─────────────

export function calcDynamicCoins(
  card: CardDef,
  player: PlayerState,
  leftNeighbor: PlayerState,
  rightNeighbor: PlayerState,
): number {
  let coins = 0;
  for (const eff of card.effects) {
    if (eff.type === 'dynamic_yellow' && eff.coinsPerCard > 0) {
      let count = 0;
      const targets = eff.who === 'self' ? [player]
        : eff.who === 'neighbors' ? [leftNeighbor, rightNeighbor]
        : eff.who === 'all' ? [player, leftNeighbor, rightNeighbor]
        : eff.who === 'left' ? [leftNeighbor]
        : [rightNeighbor];
      for (const p of targets) {
        if (eff.cardType === 'wonder') {
          count += p.wonderStagesBuilt;
        } else {
          count += p.played.filter(id => CARD_MAP[id]?.color === eff.cardType).length;
        }
      }
      coins += count * eff.coinsPerCard;
    }
  }
  return coins;
}

// ─── Check if all players have submitted ─────────────────────────────────────

export function allPlayersReady(game: GameState): boolean {
  const actions = game.pendingActions ?? {};
  return game.playerOrder.every(pid => actions[pid] != null);
}

// ─── Get left and right neighbor IDs ─────────────────────────────────────────

export function getNeighborIds(
  playerId: string,
  playerOrder: string[],
): { leftId: string; rightId: string } {
  const n = playerOrder.length;
  const idx = playerOrder.indexOf(playerId);
  return {
    leftId: playerOrder[(idx - 1 + n) % n],
    rightId: playerOrder[(idx + 1) % n],
  };
}
