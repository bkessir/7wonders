import type { PlayerState, ScoreBreakdown, GameState, CardColor } from '../types/game';
import { CARD_MAP, GUILDS } from '../data/cards';
import { WONDER_MAP } from '../data/wonders';
import { getPlayerSlots } from './resources';

// ─── Science Scoring ──────────────────────────────────────────────────────────

function scienceScore(compass: number, gear: number, tablet: number, wildcards: number): number {
  if (wildcards === 0) {
    return compass * compass + gear * gear + tablet * tablet
      + Math.min(compass, gear, tablet) * 7;
  }
  // Try all allocations of wildcards to maximize score
  let best = 0;
  for (let dc = 0; dc <= wildcards; dc++) {
    for (let dg = 0; dg <= wildcards - dc; dg++) {
      const dt = wildcards - dc - dg;
      const score = scienceScore(compass + dc, gear + dg, tablet + dt, 0);
      if (score > best) best = score;
    }
  }
  return best;
}

// ─── Count player cards by color ──────────────────────────────────────────────

function countByColor(player: PlayerState, color: CardColor | 'wonder'): number {
  if (color === 'wonder') return player.wonderStagesBuilt;
  return player.played.filter(id => CARD_MAP[id]?.color === color).length;
}

// ─── Score one player ─────────────────────────────────────────────────────────

export function scorePlayer(
  player: PlayerState,
  leftNeighbor: PlayerState,
  rightNeighbor: PlayerState,
  allPlayers: PlayerState[],
): ScoreBreakdown {
  let coinPts = 0;
  let wonderPts = 0;
  let bluePts = 0;
  let greenPts = 0;
  let redPts = 0;
  let yellowPts = 0;
  let purplePts = 0;

  // Coins → points (1 pt per 3 coins)
  coinPts = Math.floor(player.coins / 3);

  // Military tokens
  redPts = player.militaryTokens.reduce((s, t) => s + t, 0);

  // Wonder stages
  const wonder = WONDER_MAP[player.wonderId];
  if (wonder) {
    const side = wonder[player.wonderSide];
    for (let i = 0; i < player.wonderStagesBuilt; i++) {
      const stage = side.stages[i];
      for (const eff of stage.effects) {
        if (eff.type === 'points') wonderPts += eff.amount;
        if (eff.type === 'coins') {
          // These were collected during play, not scored now
        }
      }
    }
  }

  // Card effects
  let compass = 0, gear = 0, tablet = 0, sciWild = 0;

  for (const cardId of player.played) {
    const card = CARD_MAP[cardId];
    if (!card) continue;

    for (const eff of card.effects) {
      switch (eff.type) {
        case 'points':
          if (card.color === 'blue') bluePts += eff.amount;
          else if (card.color === 'purple') purplePts += eff.amount;
          break;

        case 'science':
          if (eff.symbol === 'compass') compass++;
          else if (eff.symbol === 'gear') gear++;
          else if (eff.symbol === 'tablet') tablet++;
          break;

        case 'science_wildcard':
          sciWild++;
          break;

        case 'dynamic_yellow': {
          const neighbors = [leftNeighbor, rightNeighbor];
          let count = 0;
          if (eff.who === 'self') {
            count = countByColor(player, eff.cardType as CardColor | 'wonder');
            // Shipowners' Guild: also count grey and purple
            if (card.id === 'shipownersguild') {
              count = countByColor(player, 'brown') + countByColor(player, 'grey') + countByColor(player, 'purple');
            }
          } else if (eff.who === 'neighbors') {
            count = neighbors.reduce((s, n) => {
              if (card.id === 'strategistsguild') {
                // 1 pt per loss token each neighbor
                return s + n.militaryTokens.filter(t => t < 0).length;
              }
              if (card.id === 'buildersguild') {
                // 1 pt per wonder stage self + neighbors
                return s + leftNeighbor.wonderStagesBuilt + rightNeighbor.wonderStagesBuilt + player.wonderStagesBuilt;
              }
              return s + countByColor(n, eff.cardType as CardColor | 'wonder');
            }, 0);
            // builders guild handled above in loop, avoid double count
            if (card.id === 'buildersguild') count = countByColor(player, 'wonder') + leftNeighbor.wonderStagesBuilt + rightNeighbor.wonderStagesBuilt;
          } else if (eff.who === 'left') {
            count = countByColor(leftNeighbor, eff.cardType as CardColor | 'wonder');
          } else if (eff.who === 'right') {
            count = countByColor(rightNeighbor, eff.cardType as CardColor | 'wonder');
          }

          const pts = count * eff.pointsPerCard;
          if (card.color === 'yellow') yellowPts += pts;
          else if (card.color === 'purple') purplePts += pts;
          break;
        }
      }
    }
  }

  // Babylon science wildcard (wonder effect)
  if (wonder) {
    const side = wonder[player.wonderSide];
    for (let i = 0; i < player.wonderStagesBuilt; i++) {
      for (const eff of side.stages[i].effects) {
        if (eff.type === 'science') {
          if (eff.symbol === 'any') sciWild++;
          else if (eff.symbol === 'compass') compass++;
          else if (eff.symbol === 'gear') gear++;
          else if (eff.symbol === 'tablet') tablet++;
        }
      }
    }
  }

  // Olympia B: copy best guild from neighbor
  if (player.canCopyGuild) {
    let bestGuildPts = 0;
    for (const neighbor of [leftNeighbor, rightNeighbor]) {
      for (const cardId of neighbor.played) {
        const card = CARD_MAP[cardId];
        if (card?.color !== 'purple') continue;
        // Evaluate this guild as if player had it
        const fakePts = evalGuild(cardId, player, leftNeighbor, rightNeighbor);
        bestGuildPts = Math.max(bestGuildPts, fakePts);
      }
    }
    purplePts += bestGuildPts;
  }

  greenPts = scienceScore(compass, gear, tablet, sciWild);

  const total = coinPts + wonderPts + bluePts + greenPts + redPts + yellowPts + purplePts;
  return { coins: coinPts, wonder: wonderPts, blue: bluePts, green: greenPts, red: redPts, yellow: yellowPts, purple: purplePts, total };
}

function evalGuild(cardId: string, player: PlayerState, left: PlayerState, right: PlayerState): number {
  const card = CARD_MAP[cardId];
  if (!card) return 0;
  let pts = 0;
  for (const eff of card.effects) {
    if (eff.type === 'dynamic_yellow' && eff.pointsPerCard > 0) {
      if (eff.who === 'neighbors') {
        if (card.id === 'strategistsguild') {
          pts = ([left, right].reduce((s, n) => s + n.militaryTokens.filter(t => t < 0).length, 0)) * eff.pointsPerCard;
        } else if (card.id === 'buildersguild') {
          pts = (player.wonderStagesBuilt + left.wonderStagesBuilt + right.wonderStagesBuilt) * eff.pointsPerCard;
        } else {
          const ct = eff.cardType as CardColor;
          pts = ([left, right].reduce((s, n) => s + n.played.filter(id => CARD_MAP[id]?.color === ct).length, 0)) * eff.pointsPerCard;
        }
      }
    }
    if (eff.type === 'science_wildcard') pts = 3; // rough estimate of wildcard value
  }
  return pts;
}

// ─── Score all players ────────────────────────────────────────────────────────

export function scoreAll(game: GameState): Record<string, ScoreBreakdown> {
  const order = game.playerOrder;
  const n = order.length;
  const scores: Record<string, ScoreBreakdown> = {};
  for (let i = 0; i < n; i++) {
    const pid = order[i];
    const player = game.players[pid];
    const left = game.players[order[(i - 1 + n) % n]];
    const right = game.players[order[(i + 1) % n]];
    scores[pid] = scorePlayer(player, left, right, Object.values(game.players));
  }
  return scores;
}

// ─── Military Resolution ──────────────────────────────────────────────────────

export function resolveMilitary(game: GameState): GameState {
  const order = game.playerOrder;
  const n = order.length;
  const tokenValue = game.age === 1 ? 1 : game.age === 2 ? 3 : 5;
  const newPlayers = { ...game.players };

  for (let i = 0; i < n; i++) {
    const pid = order[i];
    const leftId = order[(i - 1 + n) % n];
    const rightId = order[(i + 1) % n];
    const p = newPlayers[pid];
    const l = newPlayers[leftId];
    const r = newPlayers[rightId];

    const leftTokens: number[] = [];
    const rightTokens: number[] = [];

    // Fight left neighbor
    if (p.shields > l.shields) leftTokens.push(tokenValue);
    else if (p.shields < l.shields) leftTokens.push(-1);

    // Fight right neighbor
    if (p.shields > r.shields) rightTokens.push(tokenValue);
    else if (p.shields < r.shields) rightTokens.push(-1);

    newPlayers[pid] = {
      ...p,
      militaryTokens: [...p.militaryTokens, ...leftTokens, ...rightTokens],
    };
  }

  return { ...game, players: newPlayers };
}
