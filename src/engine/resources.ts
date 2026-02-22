import type { Resource, ResourceMap, CardDef, CardEffect, PlayerState } from '../types/game';
import { CARD_MAP } from '../data/cards';
import { WONDER_MAP } from '../data/wonders';

const RAW: Resource[] = ['stone', 'wood', 'ore', 'clay'];
const MFG: Resource[] = ['linen', 'glass', 'paper'];

// ─── Resource slot: one of these resources is produced ───────────────────────

interface ResourceSlot {
  options: Resource[];
  source: 'self' | 'left' | 'right';
  costPerUse: number;  // 0 for self, 1 or 2 for neighbors
}

// ─── Gather all resource slots for a player ──────────────────────────────────

export function getPlayerSlots(player: PlayerState): Resource[][] {
  const slots: Resource[][] = [];
  // Wonder starting resource
  const wonder = WONDER_MAP[player.wonderId];
  if (wonder) {
    const side = wonder[player.wonderSide];
    slots.push([side.startResource]);
  }
  // Played cards
  for (const cardId of player.played) {
    const card = CARD_MAP[cardId];
    if (!card) continue;
    for (const effect of card.effects) {
      if (effect.type === 'resources') {
        for (const [res, count] of Object.entries(effect.resources)) {
          for (let i = 0; i < (count ?? 0); i++) {
            slots.push([res as Resource]);
          }
        }
      } else if (effect.type === 'resource_choice') {
        slots.push(effect.resources);
      }
    }
  }
  // Wonder stage resources
  const builtStages = wonder
    ? wonder[player.wonderSide].stages.slice(0, player.wonderStagesBuilt)
    : [];
  for (const stage of builtStages) {
    for (const effect of stage.effects) {
      if (effect.type === 'resource_choice') {
        slots.push(effect.resources);
      }
    }
  }
  return slots;
}

// ─── Get trade costs for each resource type ───────────────────────────────────

export interface TradeCosts {
  leftRaw: number;
  rightRaw: number;
  leftMfg: number;
  rightMfg: number;
}

export function getTradeCosts(player: PlayerState): TradeCosts {
  let leftRaw = 2, rightRaw = 2, leftMfg = 2, rightMfg = 2;
  for (const cardId of player.played) {
    const card = CARD_MAP[cardId];
    if (!card) continue;
    for (const effect of card.effects) {
      if (effect.type === 'trade_discount') {
        const isRaw = effect.resources.some(r => RAW.includes(r));
        const isMfg = effect.resources.some(r => MFG.includes(r));
        if (effect.direction === 'left' || effect.direction === 'both') {
          if (isRaw) leftRaw = 1;
          if (isMfg) leftMfg = 1;
        }
        if (effect.direction === 'right' || effect.direction === 'both') {
          if (isRaw) rightRaw = 1;
          if (isMfg) rightMfg = 1;
        }
      }
    }
  }
  // Olympia B stage 1: raw materials cost 1 from both neighbors
  if (player.hasRawDiscount) {
    leftRaw = 1;
    rightRaw = 1;
  }
  return { leftRaw, rightRaw, leftMfg, rightMfg };
}

// ─── Get neighbor's tradeable resource slots ──────────────────────────────────

export function getNeighborSlots(neighbor: PlayerState): Resource[][] {
  const slots: Resource[][] = [];
  const wonder = WONDER_MAP[neighbor.wonderId];
  if (wonder) {
    // Starting resource is tradeable
    slots.push([wonder[neighbor.wonderSide].startResource]);
  }
  for (const cardId of neighbor.played) {
    const card = CARD_MAP[cardId];
    if (!card) continue;
    if (card.color !== 'brown' && card.color !== 'grey') continue;
    for (const effect of card.effects) {
      if (effect.type === 'resources') {
        for (const [res, count] of Object.entries(effect.resources)) {
          for (let i = 0; i < (count ?? 0); i++) {
            slots.push([res as Resource]);
          }
        }
      } else if (effect.type === 'resource_choice') {
        slots.push(effect.resources);
      }
    }
  }
  return slots;
}

// ─── Main: find all valid payment options ─────────────────────────────────────
// Returns sorted list of {left, right, total} payment options.
// Returns [] if card is unaffordable (player has no valid option).
// Returns [{left:0,right:0,total:0}] if card is free for this player.

export interface PaymentOption {
  left: number;
  right: number;
  total: number;
}

export function findPaymentOptions(
  cost: { coins?: number; resources: ResourceMap },
  player: PlayerState,
  left: PlayerState,
  right: PlayerState,
): PaymentOption[] {
  const baseCoinCost = cost.coins ?? 0;
  if (player.coins < baseCoinCost) return [];

  // Build list of needed resources
  const needs: Resource[] = [];
  for (const [res, count] of Object.entries(cost.resources)) {
    for (let i = 0; i < (count ?? 0); i++) {
      needs.push(res as Resource);
    }
  }

  if (needs.length === 0) {
    return [{ left: 0, right: 0, total: baseCoinCost }];
  }

  const selfSlots = getPlayerSlots(player);
  const leftSlots = getNeighborSlots(left);
  const rightSlots = getNeighborSlots(right);
  const tradeCosts = getTradeCosts(player);

  // Build flat list of resource options
  // Each option: {options: Resource[], source, baseCost}
  const allSlots: ResourceSlot[] = [
    ...selfSlots.map(s => ({ options: s, source: 'self' as const, costPerUse: 0 })),
    ...leftSlots.map(s => ({
      options: s,
      source: 'left' as const,
      costPerUse: s.every(r => MFG.includes(r)) ? tradeCosts.leftMfg
        : s.every(r => RAW.includes(r)) ? tradeCosts.leftRaw
        : tradeCosts.leftRaw,  // mixed choice: use raw cost
    })),
    ...rightSlots.map(s => ({
      options: s,
      source: 'right' as const,
      costPerUse: s.every(r => MFG.includes(r)) ? tradeCosts.rightMfg
        : s.every(r => RAW.includes(r)) ? tradeCosts.rightRaw
        : tradeCosts.rightRaw,
    })),
  ];

  // Track which slots are used (by index)
  const usedSlots = new Array(allSlots.length).fill(false);
  const resultSet = new Set<string>();
  const results: PaymentOption[] = [];

  function backtrack(needIdx: number, leftPaid: number, rightPaid: number) {
    if (needIdx === needs.length) {
      const total = leftPaid + rightPaid + baseCoinCost;
      if (total <= player.coins) {
        const key = `${leftPaid},${rightPaid}`;
        if (!resultSet.has(key)) {
          resultSet.add(key);
          results.push({ left: leftPaid, right: rightPaid, total });
        }
      }
      return;
    }
    const need = needs[needIdx];
    for (let i = 0; i < allSlots.length; i++) {
      if (usedSlots[i]) continue;
      const slot = allSlots[i];
      if (!slot.options.includes(need)) continue;
      const addLeft = slot.source === 'left' ? slot.costPerUse : 0;
      const addRight = slot.source === 'right' ? slot.costPerUse : 0;
      if (leftPaid + addLeft + rightPaid + addRight + baseCoinCost > player.coins) continue;
      usedSlots[i] = true;
      backtrack(needIdx + 1, leftPaid + addLeft, rightPaid + addRight);
      usedSlots[i] = false;
    }
  }

  backtrack(0, 0, 0);

  // Deduplicate and sort by total, then left
  results.sort((a, b) => a.total - b.total || a.left - b.left);
  return results;
}

// ─── Check free chain ─────────────────────────────────────────────────────────

export function hasFreeChain(card: CardDef, player: PlayerState): boolean {
  if (!card.freeFrom) return false;
  return player.played.includes(card.freeFrom);
}

// ─── Check if a card can be played (for UI highlighting) ─────────────────────

export function canAffordCard(
  card: CardDef,
  player: PlayerState,
  left: PlayerState,
  right: PlayerState,
): boolean {
  if (hasFreeChain(card, player)) return true;
  if (player.canPlayFreeThisAge) return true;
  return findPaymentOptions(card.cost, player, left, right).length > 0;
}
