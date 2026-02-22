import type { GameState, ScoreBreakdown } from '../types/game';
import { WONDER_MAP } from '../data/wonders';
import { scoreAll } from '../engine/scoring';

interface Props {
  game: GameState;
  playerId: string;
}

export default function ScoreBoard({ game, playerId }: Props) {
  const scores = game.scores ?? scoreAll(game);
  const order = [...game.playerOrder].sort(
    (a, b) => (scores[b]?.total ?? 0) - (scores[a]?.total ?? 0)
  );
  const winner = order[0];

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
                className={`rounded-xl p-4 border transition-all ${
                  isMe ? 'border-yellow-400' : 'border-white/10'
                }`}
                style={{ background: isWinner ? 'rgba(234,179,8,0.08)' : 'rgba(255,255,255,0.04)' }}
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
                  <p className="text-2xl font-bold text-yellow-300 shrink-0">
                    {score?.total ?? 0}
                  </p>
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

        <p className="text-center text-white/20 text-xs mt-6">
          Thanks for playing 7 Wonders!
        </p>
      </div>
    </div>
  );
}
