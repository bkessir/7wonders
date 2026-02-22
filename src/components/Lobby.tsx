import type { LobbyState } from '../types/game';

interface Props {
  lobby: LobbyState;
  playerId: string;
  gameCode: string;
  onStartGame: () => void;
  error: string;
}

export default function Lobby({ lobby, playerId, gameCode, onStartGame, error }: Props) {
  const isHost = lobby.hostId === playerId;
  const players = Object.values(lobby.players).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const playerCount = players.length;
  const canStart = isHost && playerCount >= 3 && playerCount <= 7;

  const copyCode = () => {
    navigator.clipboard?.writeText(gameCode).catch(() => {});
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gold-text mb-1">7 Wonders</h1>
          <p className="text-yellow-200/60 text-xs uppercase tracking-widest">Waiting Room</p>
        </div>

        <div className="modal-panel">
          {/* Game code */}
          <div className="text-center mb-5">
            <p className="section-header mb-1">Game Code</p>
            <button
              onClick={copyCode}
              className="text-3xl font-bold gold-text tracking-widest hover:opacity-80 transition-opacity"
              title="Click to copy"
            >
              {gameCode}
            </button>
            <p className="text-yellow-200/40 text-xs mt-1">Share this code with friends</p>
          </div>

          <hr className="divider border mb-4" />

          {/* Players list */}
          <div className="mb-4">
            <p className="section-header">{playerCount} / 7 Players</p>
            <div className="space-y-2">
              {players.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {p.id === lobby.hostId && (
                    <span className="text-yellow-400 text-xs">👑</span>
                  )}
                  <span className="flex-1 text-sm">{p.name}</span>
                  {p.id === playerId && (
                    <span className="text-xs text-yellow-400/60">(you)</span>
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 3 - playerCount) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed"
                  style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-white/20 text-sm italic">Waiting for player...</span>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

          {isHost ? (
            <button
              className="btn btn-gold w-full py-3"
              disabled={!canStart}
              onClick={onStartGame}
            >
              {playerCount < 3
                ? `Need ${3 - playerCount} more player${3 - playerCount !== 1 ? 's' : ''}`
                : '▶ Start Game'}
            </button>
          ) : (
            <p className="text-center text-yellow-200/40 text-sm">
              Waiting for the host to start...
            </p>
          )}

          {isHost && playerCount >= 3 && (
            <p className="text-center text-yellow-200/40 text-xs mt-2">
              {playerCount} player{playerCount !== 1 ? 's' : ''} ready
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
