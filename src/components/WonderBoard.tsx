import type { PlayerState, GameState } from '../types/game';
import { WONDER_MAP } from '../data/wonders';
import { CARD_MAP } from '../data/cards';
import ResourceIcon from './ResourceIcon';

interface Props {
  player: PlayerState;
  game: GameState;
  compact?: boolean;
}

export default function WonderBoard({ player, game, compact = false }: Props) {
  const wonder = WONDER_MAP[player.wonderId];
  if (!wonder) return null;
  const side = wonder[player.wonderSide];

  function stageDescription(stage: any): string {
    return stage.effects.map((eff: any) => {
      if (eff.type === 'points') return `+${eff.amount}★`;
      if (eff.type === 'coins') return `+${eff.amount}🪙`;
      if (eff.type === 'military') return `+${eff.shields}⚔`;
      if (eff.type === 'science') return eff.symbol === 'any' ? '⚗?' : { compass: '🧭', gear: '⚙', tablet: '📋' }[eff.symbol as string] ?? '⚗';
      if (eff.type === 'resource_choice') return eff.resources.map((r: string) => r[0].toUpperCase()).join('/');
      if (eff.type === 'special') {
        const map: Record<string, string> = {
          play2: 'Play×2', discard_free: 'Discard→', free_per_age: '1Free', raw_discount: 'Raw1🪙', copy_guild: 'Guild©',
        };
        return map[eff.ability] ?? eff.ability;
      }
      return '';
    }).filter(Boolean).join('·');
  }

  function stageCostStr(cost: Record<string, number>): string {
    return Object.entries(cost).flatMap(([r, c]) =>
      Array.from({ length: c as number }, () => r[0].toUpperCase())
    ).join('');
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <ResourceIcon resource={side.startResource} size="xs" />
        {side.stages.map((stage, i) => (
          <div
            key={i}
            className={`stage-box text-xs ${
              i < player.wonderStagesBuilt ? 'built' :
              i === player.wonderStagesBuilt ? 'next' : 'locked'
            }`}
            style={{ minWidth: 38, minHeight: 32, padding: '2px 4px' }}
            title={`Stage ${i + 1}: ${stageCostStr(stage.cost)} → ${stageDescription(stage)}`}
          >
            {i < player.wonderStagesBuilt ? '★' : stageDescription(stage)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3 border border-yellow-900/40" style={{ background: 'rgba(255,200,100,0.05)' }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-yellow-200 text-sm">{wonder.name}</h3>
          <p className="text-xs text-yellow-200/40">Side {player.wonderSide.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-yellow-200/40">Produces:</span>
          <ResourceIcon resource={side.startResource} size="sm" />
        </div>
      </div>

      <div className="flex gap-2">
        {side.stages.map((stage, i) => (
          <div
            key={i}
            className={`stage-box flex-1 flex-col gap-1 ${
              i < player.wonderStagesBuilt ? 'built' :
              i === player.wonderStagesBuilt ? 'next' : 'locked'
            }`}
            style={{ minWidth: 52, minHeight: 52, padding: '4px 6px' }}
          >
            <div className="flex flex-wrap gap-0.5 justify-center">
              {Object.entries(stage.cost).flatMap(([res, count]) =>
                Array.from({ length: count as number }, (_, j) => (
                  <ResourceIcon key={`${res}-${j}`} resource={res as any} size="xs" />
                ))
              )}
            </div>
            <div className="text-center" style={{ fontSize: 9 }}>
              {i < player.wonderStagesBuilt
                ? <span className="text-yellow-300">Built ★</span>
                : <span className="text-yellow-200/70">{stageDescription(stage)}</span>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
