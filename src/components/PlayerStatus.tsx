import type { PlayerState, GameState } from '../types/game';
import { WONDER_MAP } from '../data/wonders';
import { CARD_MAP } from '../data/cards';
import { PlayedCards } from './CardDisplay';
import ResourceIcon from './ResourceIcon';

interface ChipProps {
  player: PlayerState;
  game: GameState;
  isSelf?: boolean;
  onClick?: () => void;
}

export function PlayerChip({ player, game, isSelf, onClick }: ChipProps) {
  const wonder = WONDER_MAP[player.wonderId];
  const hasSubmitted = (game.pendingActions ?? {})[player.id] != null;
  const militaryNet = player.militaryTokens.reduce((s, t) => s + t, 0);

  return (
    <div
      className={`player-chip ${isSelf ? 'self' : ''}`}
      onClick={onClick}
      style={{ minWidth: 88 }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-xs font-bold truncate flex-1" title={player.name} style={{ maxWidth: 70 }}>
          {player.name}
        </span>
        {hasSubmitted && <span className="text-green-400 text-xs shrink-0">✓</span>}
      </div>
      <p className="text-yellow-200/30 text-xs truncate" style={{ fontSize: 9 }}>
        {wonder?.name ?? '?'} {player.wonderSide.toUpperCase()}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-yellow-300" style={{ fontSize: 10 }}>🪙{player.coins}</span>
        {player.shields > 0 && (
          <span className="text-red-300" style={{ fontSize: 10 }}>⚔{player.shields}</span>
        )}
        {player.wonderStagesBuilt > 0 && (
          <span className="text-yellow-400/60" style={{ fontSize: 9 }}>
            {'▪'.repeat(player.wonderStagesBuilt)}
          </span>
        )}
      </div>
    </div>
  );
}

interface DetailProps {
  player: PlayerState;
  game: GameState;
  onClose: () => void;
}

export function PlayerDetailPanel({ player, game, onClose }: DetailProps) {
  const wonder = WONDER_MAP[player.wonderId];
  const side = wonder?.[player.wonderSide];
  const militaryNet = player.militaryTokens.reduce((s, t) => s + t, 0);
  const victories = player.militaryTokens.filter(t => t > 0);
  const defeats = player.militaryTokens.filter(t => t < 0);

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-yellow-200">{player.name}</h3>
            <p className="text-yellow-200/40 text-xs">
              {wonder?.name} — Side {player.wonderSide.toUpperCase()}
            </p>
          </div>
          <button
            className="text-white/30 hover:text-white/80 text-2xl ml-2 leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <p className="text-yellow-300 font-bold text-xl">🪙{player.coins}</p>
            <p className="text-xs text-white/40">Coins</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <p className="text-red-300 font-bold text-xl">⚔{player.shields}</p>
            <p className="text-xs text-white/40">Shields</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <p
              className="font-bold text-xl"
              style={{ color: militaryNet >= 0 ? '#4ade80' : '#f87171' }}
            >
              {militaryNet > 0 ? '+' : ''}{militaryNet}
            </p>
            <p className="text-xs text-white/40">Military</p>
          </div>
        </div>

        {/* Military tokens */}
        {player.militaryTokens.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4 items-center">
            {player.militaryTokens.map((t, i) => (
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

        {/* Wonder stages */}
        {side && (
          <div className="mb-4">
            <p className="section-header">Wonder: {wonder?.name}</p>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-yellow-200/40">Produces:</span>
              <ResourceIcon resource={side.startResource} size="sm" />
            </div>
            <div className="flex gap-2">
              {side.stages.map((_, i) => (
                <div
                  key={i}
                  className={`stage-box flex-1 ${
                    i < player.wonderStagesBuilt ? 'built' :
                    i === player.wonderStagesBuilt ? 'next' : 'locked'
                  }`}
                  style={{ minHeight: 36 }}
                >
                  {i < player.wonderStagesBuilt ? '★' : i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Played cards */}
        <div>
          <p className="section-header">Played Cards ({player.played.length})</p>
          {player.played.length > 0
            ? <PlayedCards cardIds={player.played} />
            : <p className="text-white/20 text-xs">None yet</p>
          }
        </div>
      </div>
    </div>
  );
}
