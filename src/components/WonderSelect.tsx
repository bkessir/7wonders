import { useState, useEffect } from 'react';
import type { GameState } from '../types/game';
import { WONDER_MAP } from '../data/wonders';
import { updateGameState } from '../firebase/sync';
import { buildDeck, shuffleDeck, chooseGuilds } from '../data/cards';
import ResourceIcon from './ResourceIcon';

interface Props {
  game: GameState;
  playerId: string;
  gameCode: string;
}

export default function WonderSelect({ game, playerId, gameCode }: Props) {
  const player = game.players[playerId];
  const wonder = player?.wonderId ? WONDER_MAP[player.wonderId] : null;
  const [chosenSide, setChosenSide] = useState<'a' | 'b'>(player?.wonderSide ?? 'a');
  const [confirmed, setConfirmed] = useState(player?.isReady ?? false);
  const isHost = game.hostId === playerId;

  const allConfirmed = game.playerOrder.every(pid => game.players[pid]?.isReady);

  useEffect(() => {
    if (allConfirmed && isHost) {
      startPlaying();
    }
  }, [allConfirmed]);

  async function handleConfirm() {
    const newPlayers = {
      ...game.players,
      [playerId]: { ...game.players[playerId], wonderSide: chosenSide, isReady: true },
    };
    await updateGameState(gameCode, { ...game, players: newPlayers });
    setConfirmed(true);
  }

  async function startPlaying() {
    const n = game.playerOrder.length;
    const seed = Date.now();
    const guilds = chooseGuilds(n);
    const deck = shuffleDeck(buildDeck(1, n, guilds), seed);
    const hands: Record<string, string[]> = {};
    for (let i = 0; i < n; i++) {
      hands[game.playerOrder[i]] = deck.slice(i * 7, (i + 1) * 7);
    }
    const newPlayers = { ...game.players };
    for (const pid of game.playerOrder) {
      newPlayers[pid] = { ...newPlayers[pid], isReady: false };
    }
    await updateGameState(gameCode, {
      ...game,
      phase: 'playing',
      hands,
      players: newPlayers,
      pendingActions: {},
      age: 1,
      turn: 1,
    });
  }

  if (!wonder || !player) return null;

  const side = wonder[chosenSide];
  const confirmedCount = game.playerOrder.filter(pid => game.players[pid]?.isReady).length;
  const totalCount = game.playerOrder.length;

  return (
    <div className="min-h-dvh flex flex-col items-center p-4 pt-6">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-bold gold-text mb-1">Choose Your Side</h2>
        <p className="text-yellow-200/50 text-sm">
          Your wonder: <strong className="text-yellow-200">{wonder.name}</strong>
        </p>
      </div>

      {/* Side selector tabs */}
      <div className="flex gap-3 mb-5 w-full max-w-md">
        {(['a', 'b'] as const).map(s => (
          <button
            key={s}
            disabled={confirmed}
            onClick={() => setChosenSide(s)}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all border-2 ${
              chosenSide === s
                ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300'
                : 'border-white/20 text-white/50'
            } ${confirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            Side {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Wonder stages display */}
      <div className="w-full max-w-md modal-panel mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-yellow-200">{wonder.name}</h3>
            <p className="text-xs text-yellow-200/50">Side {chosenSide.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-yellow-200/50">Starts with</span>
            <ResourceIcon resource={side.startResource} size="sm" />
          </div>
        </div>

        <div className="space-y-3">
          {side.stages.map((stage, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="text-xs font-bold text-yellow-400/70 mt-1 w-5 shrink-0">
                {i + 1}.
              </div>
              <div className="flex-1 rounded-lg p-2 border border-white/10 bg-white/5">
                <div className="flex flex-wrap gap-1 mb-1">
                  {Object.entries(stage.cost).map(([res, count]) =>
                    Array.from({ length: count as number }, (_, j) => (
                      <ResourceIcon key={`${res}-${j}`} resource={res as any} size="sm" />
                    ))
                  )}
                </div>
                <div className="text-xs text-yellow-100/70">
                  {describeEffects(stage.effects)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other players */}
      <div className="w-full max-w-md mb-6">
        <p className="section-header mb-2">Other Players</p>
        <div className="flex flex-wrap gap-2">
          {game.playerOrder.filter(pid => pid !== playerId).map(pid => {
            const p = game.players[pid];
            const w = p?.wonderId ? WONDER_MAP[p.wonderId] : null;
            return (
              <div
                key={pid}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <span className="text-yellow-200/50">{p?.name}:</span>
                <span className="text-yellow-200">{w?.name ?? '?'}</span>
                {p?.isReady && <span className="text-green-400 ml-1">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {confirmed ? (
        <div className="text-center">
          <p className="text-green-400 font-bold mb-1">✓ Side {chosenSide.toUpperCase()} confirmed!</p>
          <p className="text-yellow-200/50 text-sm">
            Waiting for others... ({confirmedCount}/{totalCount})
          </p>
          <div className="flex justify-center gap-1 mt-2">
            {game.playerOrder.map(pid => (
              <span
                key={pid}
                className="w-2 h-2 rounded-full"
                style={{ background: game.players[pid]?.isReady ? '#4ade80' : '#555' }}
                title={game.players[pid]?.name}
              />
            ))}
          </div>
        </div>
      ) : (
        <button className="btn btn-gold px-8 py-3 text-base" onClick={handleConfirm}>
          ✦ Confirm Side {chosenSide.toUpperCase()}
        </button>
      )}
    </div>
  );
}

function describeEffects(effects: any[]): string {
  return effects.map(eff => {
    if (eff.type === 'points') return `+${eff.amount} VP`;
    if (eff.type === 'coins') return `+${eff.amount} coins`;
    if (eff.type === 'military') return `+${eff.shields} shield${eff.shields !== 1 ? 's' : ''}`;
    if (eff.type === 'science') return eff.symbol === 'any' ? 'Any science symbol' : `${eff.symbol}`;
    if (eff.type === 'resource_choice') return `Choose 1: ${eff.resources.join(' / ')}`;
    if (eff.type === 'special') {
      const map: Record<string, string> = {
        play2: 'Play 2 cards on last turn of age',
        discard_free: 'Play 1 card free from discard pile',
        free_per_age: 'Play 1 card free per age',
        raw_discount: 'Raw materials cost 1🪙 from both neighbors',
        copy_guild: "Copy a neighbor's guild at end of game",
      };
      return map[eff.ability] ?? eff.ability;
    }
    return '';
  }).filter(Boolean).join(' · ');
}
