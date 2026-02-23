import { useState, useEffect } from 'react';
import type { CardDef, PlayerState } from '../types/game';
import type { PaymentOption } from '../engine/resources';
import { findPaymentOptions, hasFreeChain } from '../engine/resources';
import { WONDER_MAP } from '../data/wonders';
import { ResourceCost } from './ResourceIcon';

interface Props {
  card: CardDef;
  player: PlayerState;
  leftPlayer: PlayerState;
  rightPlayer: PlayerState;
  onConfirm: (payment: { left: number; right: number }) => void;
  onCancel: () => void;
  actionType: 'play' | 'build_wonder';
}

export default function PaymentModal({
  card, player, leftPlayer, rightPlayer, onConfirm, onCancel, actionType,
}: Props) {
  const isFreeChain = actionType === 'play' && hasFreeChain(card, player);
  const isFreeAbility = player.canPlayFreeThisAge && actionType === 'play';
  const isFree = isFreeChain || isFreeAbility;

  // For build_wonder, use the wonder stage cost
  const wonder = WONDER_MAP[player.wonderId];
  const stageIdx = player.wonderStagesBuilt;
  const stageCost = actionType === 'build_wonder'
    ? wonder?.[player.wonderSide]?.stages[stageIdx]?.cost ?? {}
    : null;

  const effectiveCost = actionType === 'build_wonder' && stageCost
    ? { resources: stageCost, coins: 0 }
    : card.cost;

  const options: PaymentOption[] = isFree
    ? [{ left: 0, right: 0, total: effectiveCost.coins ?? 0 }]
    : findPaymentOptions(effectiveCost, player, leftPlayer, rightPlayer);

  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(
    options.length > 0 ? options[0] : null
  );

  useEffect(() => {
    setSelectedOption(options.length > 0 ? options[0] : null);
  }, []);

  const hasResources = Object.values(effectiveCost.resources ?? {}).some(v => (v ?? 0) > 0);

  function handleConfirm() {
    if (!selectedOption) {
      onConfirm({ left: 0, right: 0 });
      return;
    }
    onConfirm({ left: selectedOption.left, right: selectedOption.right });
  }

  const costLabel = actionType === 'build_wonder'
    ? `Wonder Stage ${stageIdx + 1}`
    : card.name;

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal-panel">
        <h3 className="text-lg font-bold gold-text mb-1">
          {actionType === 'build_wonder' ? '🏛 Build Wonder Stage' : '▶ Play Card'}
        </h3>
        <p className="text-yellow-200/70 text-sm mb-4">{costLabel}</p>

        {/* Cost */}
        <div className="mb-4">
          <p className="section-header">Cost</p>
          {isFreeChain && (
            <p className="text-green-400 text-sm">✓ Free (chain prerequisite met)</p>
          )}
          {isFreeAbility && !isFreeChain && (
            <p className="text-green-400 text-sm">✓ Free (Olympia A ability)</p>
          )}
          {!isFree && (
            <ResourceCost
              resources={effectiveCost.resources ?? {}}
              coins={effectiveCost.coins}
            />
          )}
        </div>

        {/* Cannot afford */}
        {!isFree && hasResources && options.length === 0 && (
          <div
            className="rounded-lg p-3 mb-4"
            style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)' }}
          >
            <p className="text-red-400 text-sm font-bold">Cannot afford this!</p>
            <p className="text-red-300/70 text-xs mt-1">
              You lack the resources and can't buy enough from neighbors.
            </p>
          </div>
        )}

        {/* Payment options */}
        {!isFree && hasResources && options.length > 0 && (
          <div className="mb-4">
            <p className="section-header">How to pay ({options.length} option{options.length !== 1 ? 's' : ''})</p>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                    selectedOption === opt
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-white/10 bg-white/5 hover:border-white/25'
                  }`}
                >
                  <div className="flex-1 space-y-0.5">
                    {opt.left > 0 && (
                      <p className="text-blue-300 text-xs">
                        ← {opt.left}🪙 to {leftPlayer.name}
                      </p>
                    )}
                    {opt.right > 0 && (
                      <p className="text-orange-300 text-xs">
                        {opt.right}🪙 to {rightPlayer.name} →
                      </p>
                    )}
                    {opt.left === 0 && opt.right === 0 && (
                      <p className="text-green-400 text-xs">Use own resources</p>
                    )}
                  </div>
                  <span className="font-bold text-yellow-300 text-sm shrink-0">
                    {opt.total}🪙
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Coin-only cost */}
        {(effectiveCost.coins ?? 0) > 0 && !isFree && (
          <p className="text-yellow-200/50 text-xs mb-3">
            Includes {effectiveCost.coins} coin base cost
          </p>
        )}

        {/* Balance preview */}
        {selectedOption !== null && (
          <div
            className="rounded-lg px-3 py-2 mb-4 flex justify-between text-sm"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <span className="text-yellow-200/50">Remaining coins:</span>
            <span className="font-bold text-yellow-300">
              {player.coins - (selectedOption?.total ?? 0)} 🪙
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <button className="btn btn-outline flex-1 py-2" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-gold flex-1 py-2"
            disabled={!isFree && hasResources && (selectedOption === null || options.length === 0)}
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
