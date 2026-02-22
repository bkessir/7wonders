import { useState } from 'react';
import type { GameState, ScoreBreakdown } from '../types/game';
import { WONDER_MAP } from '../data/wonders';
import { scoreAll } from '../engine/scoring';
import { PlayedCards } from './CardDisplay';

interface Props {
  game: GameState;
  playerId: string;
  onPlayAgain: () => void;
}

export default function ScoreBoard({ game, playerId, onPlayAgain }: Props) {
  const scores = game.scores ?? scoreAll(game);
  const order = [...game.playerOrder].sort(
    (a, b) => (scores[b]?.total ?? 0) - (scores[a]?.total ?? 0)
  );
  const winner = order[0];

  const [detailPid, setDetailPid] = useState<string | null>(null);

  const categories: { key: keyof ScoreBreakdown; label: string; abbr: string; color: string }[] = [
    { key: 'blue',   label: 'Civic',     abbr: 'C',  color: '#3b82f6' },
    { key: 'green',  label: 'Science',   abbr: 'Sc', color: '#22c55e' },
    { key: 'red',    label: 'Military',  abbr: 'M',  color: '#ef4444' },
    { key: 'yellow', label: 'Commerce',  abbr: 'Co', color: '#eab308' },
    { key: 'purple', label: 'Guilds',    abbr: 'G',  color: '#a855f7' },
    { key: 'wonder', label: 'Wonder',    abbr: 'W',  color: '#f59e0b' },
    { key: 'coins',  label: 'Coins',     abbr: '🪙', color: '#fcd34d' },
  ];

  const medals = ['🥇', '🥈', '🥉'];

  const detailPlayer = detailPid ? game.players[detailPid] : null;

  return (
    <div className="min-h-dvh p-4 pb-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 pt-4">
          <h1 className="text-4xl font-bold gold-text mb-2">Game Over!</h1>
          <p className="text-yellow-200/60 text-base">
            🏆 {game.players[winner]?.name} wins with {scores[winner]?.total ?? 0} VP!
          </p>
        </div>

        {/* Player cards */}
        <div className="space-y-3 mb-8">
          {order.map((pid, rank) => {
            const player = game.players[pid];
            const score = scores[pid];
            const wonder = WONDER_MAP[player?.wonderId];
            const isMe = pid === playerId;
            const isWinner = pid === winner;

            return (
              <div
                key={pid}
                className={`rounded-xl p-4 border transition-all cursor-pointer active:opacity-75 ${
                  isMe ? 'border-yellow-400' : 'border-white/10'
                }`}
                style={{ background: isWinner ? 'rgba(234,179,8,0.08)' : 'rgba(255,255,255,0.04)' }}
                onClick={() => setDetailPid(pid)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl w-8 text-center">
                    {rank < 3 ? medals[rank] : `#${rank + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-yellow-200 truncate">
                      {player?.name}
                      {isMe && <span className="text-yellow-400/50 text-xs ml-1">(you)</span>}
                    </p>
                    <p className="text-xs text-yellow-200/30 truncate">
                      {wonder?.name} — Side {player?.wonderSide?.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-2xl font-bold text-yellow-300">{score?.total ?? 0}</p>
                    <span className="text-white/20 text-xs">▶</span>
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => {
                    const val = score?.[cat.key] ?? 0;
                    if (val === 0) return null;
                    return (
                      <div
                        key={cat.key}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                        style={{
                          background: `${cat.color}18`,
                          border: `1px solid ${cat.color}35`,
                        }}
                      >
                        <span style={{ color: cat.color }}>{cat.label}</span>
                        <span className="font-bold text-white">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                <th className="text-left px-3 py-2 text-yellow-200/60 font-normal">Player</th>
                {categories.map(c => (
                  <th
                    key={c.key}
                    className="px-2 py-2 text-center font-bold"
                    style={{ color: c.color }}
                    title={c.label}
                  >
                    {c.abbr}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-yellow-300 font-bold">VP</th>
              </tr>
            </thead>
            <tbody>
              {order.map((pid, rank) => {
                const player = game.players[pid];
                const score = scores[pid];
                return (
                  <tr
                    key={pid}
                    className="border-t border-white/5"
                    style={{ background: pid === playerId ? 'rgba(234,179,8,0.05)' : undefined }}
                  >
                    <td className="px-3 py-2 text-yellow-200 font-medium">
                      {rank < 3 ? medals[rank] : `#${rank + 1}`} {player?.name}
                      {pid === playerId && <span className="text-yellow-400/40 text-xs ml-1">★</span>}
                    </td>
                    {categories.map(c => (
                      <td
                        key={c.key}
                        className="px-2 py-2 text-center"
                        style={{ color: (score?.[c.key] ?? 0) > 0 ? '#e5d5a0' : '#555' }}
                      >
                        {score?.[c.key] ?? 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold text-yellow-300">
                      {score?.total ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center">
          <button className="btn btn-gold px-8 py-3 text-base" onClick={onPlayAgain}>
            ✦ Play Again
          </button>
          <p className="text-white/20 text-xs mt-4">Thanks for playing 7 Wonders!</p>
        </div>
      </div>

      {/* Player card detail modal */}
      {detailPlayer && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setDetailPid(null)}
        >
          <div
            className="flex-1 overflow-y-auto p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="max-w-lg mx-auto pt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-bold text-yellow-200">{detailPlayer.name}</p>
                  <p className="text-xs text-yellow-200/40">
                    {WONDER_MAP[detailPlayer.wonderId]?.name} — Side {detailPlayer.wonderSide.toUpperCase()}
                  </p>
                </div>
                <button
                  className="btn btn-outline text-xs px-3 py-1"
                  onClick={() => setDetailPid(null)}
                >
                  Close
                </button>
              </div>
              {/* Coins and military tokens */}
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="text-sm font-bold text-yellow-300">🪙 {detailPlayer.coins}</span>
                {detailPlayer.shields > 0 && (
                  <span className="text-sm text-red-300">⚔ {detailPlayer.shields} shields</span>
                )}
                {detailPlayer.militaryTokens.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {detailPlayer.militaryTokens.map((t, i) => (
                      <img
                        key={i}
                        src={t === 5 ? '/images/tokens/victory5.png' : t === 3 ? '/images/tokens/victory3.png' : t === 1 ? '/images/tokens/victory1.png' : '/images/tokens/victoryminus1.png'}
                        alt={`${t > 0 ? '+' : ''}${t}`}
                        title={`${t > 0 ? '+' : ''}${t} military`}
                        style={{ width: 28, height: 28, objectFit: 'contain' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {detailPlayer.played.length > 0 ? (
                <>
                  <p className="section-header mb-2">Played Cards ({detailPlayer.played.length})</p>
                  <PlayedCards cardIds={detailPlayer.played} />
                </>
              ) : (
                <p className="text-white/30 text-sm text-center py-8">No cards played.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
