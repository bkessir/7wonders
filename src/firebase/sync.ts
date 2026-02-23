import {
  ref, set, get, update, onValue, push, off, DatabaseReference,
  serverTimestamp, remove,
} from 'firebase/database';
import { db } from './config';
import type { GameState, LobbyState, LobbyPlayer, PlayerAction } from '../types/game';

// ─── Local Identity ───────────────────────────────────────────────────────────

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem('sw_player_id');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem('sw_player_id', id);
  }
  return id;
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

function randomGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createGame(hostId: string, hostName: string): Promise<string> {
  let code = randomGameCode();
  // Ensure unique
  for (let attempts = 0; attempts < 10; attempts++) {
    const existing = await get(ref(db, `lobbies/${code}`));
    if (!existing.exists()) break;
    code = randomGameCode();
  }
  const lobby: LobbyState = {
    code,
    hostId,
    players: {
      [hostId]: { id: hostId, name: hostName, joinedAt: Date.now() },
    },
    started: false,
  };
  await set(ref(db, `lobbies/${code}`), lobby);
  return code;
}

export async function joinGame(
  code: string,
  playerId: string,
  playerName: string,
): Promise<{ success: boolean; error?: string }> {
  const snap = await get(ref(db, `lobbies/${code}`));
  if (!snap.exists()) return { success: false, error: 'Game not found.' };
  const lobby = snap.val() as LobbyState;
  if (lobby.started) return { success: false, error: 'Game already started.' };
  const playerCount = Object.keys(lobby.players || {}).length;
  if (playerCount >= 7 && !lobby.players[playerId]) {
    return { success: false, error: 'Game is full (max 7 players).' };
  }
  await update(ref(db, `lobbies/${code}/players/${playerId}`), {
    id: playerId, name: playerName, joinedAt: Date.now(),
  });
  return { success: true };
}

export function subscribeLobby(
  code: string,
  callback: (lobby: LobbyState | null) => void,
): () => void {
  const r = ref(db, `lobbies/${code}`);
  const unsub = onValue(r, snap => callback(snap.exists() ? snap.val() : null));
  return () => off(r);
}

export async function startGameInFirebase(code: string, gameState: GameState): Promise<void> {
  await set(ref(db, `games/${code}`), gameState);
  await update(ref(db, `lobbies/${code}`), { started: true });
}

// ─── Game State ───────────────────────────────────────────────────────────────

// Firebase removes empty arrays/objects from the DB (treated as null).
// Normalize all collections to safe defaults on every read.
function normalizeGameState(raw: any): GameState {
  // Normalize per-player arrays (played, militaryTokens) which start empty
  // and would be removed by Firebase until a card is played / battle resolved.
  const players: Record<string, any> = {};
  for (const [pid, p] of Object.entries(raw.players ?? {})) {
    players[pid] = {
      ...(p as any),
      played: (p as any).played ?? [],
      militaryTokens: (p as any).militaryTokens ?? [],
    };
  }
  // Normalize individual player hands — Firebase removes any key whose value
  // becomes [] (empty array), so a player mid-age could lose their hand entry.
  // Restore it to [] (rather than undefined) for every player in the order.
  const rawHands = raw.hands ?? {};
  const hands: Record<string, string[]> = {};
  for (const pid of (raw.playerOrder ?? []) as string[]) {
    const h = rawHands[pid];
    hands[pid] = Array.isArray(h) ? h : [];
  }
  return {
    ...raw,
    players,
    pendingActions: raw.pendingActions ?? {},
    hands,
    discard: raw.discard ?? [],
  };
}

export function subscribeGame(
  code: string,
  callback: (game: GameState | null) => void,
): () => void {
  const r = ref(db, `games/${code}`);
  const unsub = onValue(r, snap => callback(snap.exists() ? normalizeGameState(snap.val()) : null));
  return () => off(r);
}

export async function submitAction(
  code: string,
  playerId: string,
  action: PlayerAction,
): Promise<void> {
  await set(ref(db, `games/${code}/pendingActions/${playerId}`), action);
}

export async function retractAction(code: string, playerId: string): Promise<void> {
  await remove(ref(db, `games/${code}/pendingActions/${playerId}`));
}

export async function updateGameState(code: string, state: GameState): Promise<void> {
  // JSON round-trip strips `undefined` values — Firebase throws if it encounters them
  const clean = JSON.parse(JSON.stringify(state));
  await set(ref(db, `games/${code}`), clean);
}

export async function updatePlayerName(
  code: string,
  playerId: string,
  name: string,
): Promise<void> {
  await update(ref(db, `games/${code}/players/${playerId}`), { name });
}

export async function setWonderSide(
  code: string,
  playerId: string,
  side: 'a' | 'b',
): Promise<void> {
  await update(ref(db, `games/${code}/players/${playerId}`), { wonderSide: side });
}

export async function confirmWonderSide(
  code: string,
  playerId: string,
  side: 'a' | 'b',
  chosenGuild?: string,
): Promise<void> {
  await update(ref(db, `games/${code}/players/${playerId}`), {
    wonderSide: side,
    isReady: true,
    ...(chosenGuild ? { guildCopy: chosenGuild } : {}),
  });
}
