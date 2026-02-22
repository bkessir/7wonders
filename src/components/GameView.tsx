import { useState, useCallback, useEffect } from 'react';
import type { GameState, PlayerAction, CardDef } from '../types/game';
import { CARD_MAP } from '../data/cards';
import { WONDER_MAP } from '../data/wonders';
import { findPaymentOptions, hasFreeChain, canAffordCard } from '../engine/resources';
import { resolveTurn, getNeighborIds, allPlayersReady } from '../engine/game';
import { submitAction, retractAction, updateGameState } from '../firebase/sync';
import CardDisplay, { PlayedCards } from './CardDisplay';
import WonderBoard from './WonderBoard';
import { PlayerChip, PlayerDetailPanel } from './PlayerStatus';
import PaymentModal from './PaymentModal';

interface Props {
  game: GameState;
  playerId: string;
  gameCode: string;
}

export default function GameView({ game, playerId, gameCode }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'play' | 'build_wonder' | 'trash' | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [detailPlayer, setDetailPlayer] = useState<string | null>(null);
  const [toast, setToast] = useState<string>('');
  const [showHand, setShowHand] = useState(true);

  const player = game.players[playerId];
  const hand = (game.hands ?? {})[playerId] ?? [];
  const myAction = (game.pendingActions ?? {})[playerId];
  const hasSubmitted = myAction != null;

  const { leftId, rightId } = getNeighborIds(playerId, game.playerOrder);
  const leftPlayer = game.players[leftId];
  const rightPlayer = game.players[rightId];

  const isHost = game.hostId === playerId;

  // Host resolves turn when all players ready
  useEffect(() => {
    if (isHost && allPlayersReady(game) && game.phase === 'playing') {
      const timer = setTimeout(() => {
        const newState = resolveTurn(game);
        updateGameState(gameCode, newState);
      }, 1200); // Short delay for UX
      return () => clearTimeout(timer);
    }
  }, [game.pendingActions, isHost, game.phase]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function selectCard(cardId: string) {
    if (hasSubmitted) return;
    setSelectedCardId(prev => prev === cardId ? null : cardId);
    setPendingAction(null);
  }

  async function handlePlay(type: 'play' | 'build_wonder' | 'trash') {
    if (!selectedCardId || !player) return;
    const card = CARD_MAP[selectedCardId];
    if (!card) return;

    if (type === 'trash') {
      const action: PlayerAction = {
        type: 'trash',
        cardId: selectedCardId,
        payment: { left: 0, right: 0 },
      };
      await submitAction(gameCode, playerId, action);
      setSelectedCardId(null);
      setPendingAction(null);
      showToast(`Trashed ${card.name} for +3 coins`);
      return;
    }

    const isFreeChain = hasFreeChain(card, player);
    const isFreeAbility = player.canPlayFreeThisAge && type === 'play';
    const costIsJustCoins = Object.keys(card.cost.resources).length === 0;

    if (isFreeChain || isFreeAbility || costIsJustCoins) {
      // No resource payment needed, possibly just coin cost
      const action: PlayerAction = {
        type,
        cardId: selectedCardId,
        payment: { left: 0, right: 0 },
        ...(type === 'build_wonder' ? { wonderStageIndex: player.wonderStagesBuilt } : {}),
      };
      await submitAction(gameCode, playerId, action);
      setSelectedCardId(null);
      setPendingAction(null);
      const typeStr = type as string;
      showToast(typeStr === 'trash' ? 'Trashed!' : typeStr === 'build_wonder' ? 'Building wonder stage...' : `Playing ${card.name}`);
      return;
    }

    // Need payment selection
    const options = findPaymentOptions(card.cost, player, leftPlayer, rightPlayer);
    if (options.length === 0) {
      showToast("Can't afford this card!");
      return;
    }

    setPendingAction(type);
    setShowPayment(true);
  }

  async function handlePaymentConfirm(payment: { left: number; right: number }) {
    if (!selectedCardId || !pendingAction) return;
    const action: PlayerAction = {
      type: pendingAction,
      cardId: selectedCardId,
      payment,
      ...(pendingAction === 'build_wonder' ? { wonderStageIndex: player?.wonderStagesBuilt } : {}),
    };
    await submitAction(gameCode, playerId, action);
    setShowPayment(false);
    setSelectedCardId(null);
    setPendingAction(null);
    const card = CARD_MAP[selectedCardId];
    showToast(pendingAction === 'build_wonder' ? 'Wonder stage submitted!' : `${card?.name} submitted!`);
  }

  async function handleRetract() {
    await retractAction(gameCode, playerId);
    showToast('Action retracted');
  }

  const selectedCard = selectedCardId ? CARD_MAP[selectedCardId] : null;
  const canBuildWonder = player && player.wonderStagesBuilt < (WONDER_MAP[player.wonderId]?.[player.wonderSide]?.stages.length ?? 0);
  const submittedCount = game.playerOrder.filter(pid => (game.pendingActions ?? {})[pid] != null).length;

  const ageColors: Record<number, string> = { 1: '#8b6914', 2: '#4a6b8a', 3: '#6a2e7a' };

  return (
    <div className="flex flex-col min-h-dvh max-h-dvh overflow-hidden">
      {/* ── Top Bar ── */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ background: ageColors[game.age] ?? '#333', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-200/70">Age {game.age}</span>
          <span className="text-yellow-200/30">|</span>
          <span className="text-xs text-yellow-200/60">Turn {game.turn}/6</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-yellow-300">🪙 {player?.coins ?? 0}</span>
          {player?.shields ? <span className="text-sm text-red-300">⚔ {player.shields}</span> : null}
          {hasSubmitted ? (
            <span className="text-xs text-green-400 font-bold">✓ Waiting {submittedCount}/{game.playerOrder.length}</span>
          ) : (
            <span className="text-xs text-yellow-400 font-bold">Your Turn</span>
          )}
        </div>
      </div>

      {/* ── Other Players Row ── */}
      <div className="shrink-0 overflow-x-auto py-2 px-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex gap-2">
          {game.playerOrder.filter(pid => pid !== playerId).map(pid => (
            <PlayerChip
              key={pid}
              player={game.players[pid]}
              game={game}
              onClick={() => setDetailPlayer(pid)}
            />
          ))}
        </div>
      </div>

      {/* ── Main Scrollable Area ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Wonder board */}
        {player && <WonderBoard player={player} game={game} />}

        {/* Played cards */}
        {player && player.played.length > 0 && (
          <div>
            <p className="section-header">Your Cards ({player.played.length})</p>
            <PlayedCards cardIds={player.played} />
          </div>
        )}

        {/* Military tokens */}
        {player && player.militaryTokens.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {player.militaryTokens.map((t, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{
                  background: t > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  border: `1px solid ${t > 0 ? '#22c55e' : '#ef4444'}`,
                  color: t > 0 ? '#4ade80' : '#f87171',
                }}
              >
                {t > 0 ? '+' : ''}{t}
              </span>
            ))}
          </div>
        )}

        {/* Pending action display */}
        {hasSubmitted && myAction && (
          <div className="rounded-lg p-3 border border-green-500/30" style={{ background: 'rgba(34,197,94,0.08)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-bold text-sm">
                  ✓ {myAction.type === 'trash' ? 'Trashing' : myAction.type === 'build_wonder' ? 'Building Wonder' : 'Playing'}: {CARD_MAP[myAction.cardId]?.name}
                </p>
                {(myAction.payment.left > 0 || myAction.payment.right > 0) && (
                  <p className="text-xs text-white/40">
                    Paying: {myAction.payment.left > 0 ? `${myAction.payment.left}🪙 ← ` : ''}
                    {myAction.payment.right > 0 ? `${myAction.payment.right}🪙 →` : ''}
                  </p>
                )}
              </div>
              <button className="btn btn-outline text-xs py-1 px-2" onClick={handleRetract}>
                Undo
              </button>
            </div>
          </div>
        )}

        {/* Discard info */}
        {game.discard.length > 0 && (
          <p className="text-xs text-white/20 text-center">{game.discard.length} cards in discard pile</p>
        )}
      </div>

      {/* ── Hand Section ── */}
      {!hasSubmitted && hand.length > 0 && (
        <div className="shrink-0 border-t border-white/10" style={{ background: 'rgba(0,0,0,0.4)' }}>
          {/* Selected card actions */}
          {selectedCard && (
            <div className="flex gap-2 px-3 pt-2 pb-1">
              <button
                className="btn btn-gold flex-1 py-2 text-sm"
                onClick={() => handlePlay('play')}
                disabled={!player || player.played.includes(selectedCardId!) || !canAffordCard(selectedCard, player, leftPlayer, rightPlayer)}
              >
                ▶ Play
              </button>
              {canBuildWonder && (
                <button
                  className="btn btn-outline flex-1 py-2 text-sm"
                  onClick={() => handlePlay('build_wonder')}
                >
                  🏛 Wonder
                </button>
              )}
              <button
                className="btn btn-red flex-1 py-2 text-sm"
                style={{ fontSize: 13 }}
                onClick={() => handlePlay('trash')}
              >
                🗑 +3🪙
              </button>
            </div>
          )}

          {/* Card hand */}
          <div className="hand-scroll pb-2">
            {hand.map(cardId => {
              const card = CARD_MAP[cardId];
              const affordable = player ? canAffordCard(card, player, leftPlayer, rightPlayer) : false;
              const alreadyPlayed = player?.played.includes(cardId) ?? false;
              return (
                <CardDisplay
                  key={cardId}
                  cardId={cardId}
                  selected={selectedCardId === cardId}
                  unaffordable={!affordable && !alreadyPlayed}
                  onClick={() => selectCard(cardId)}
                />
              );
            })}
          </div>

          {hand.length === 0 && (
            <p className="text-center text-white/30 text-sm py-4">No cards in hand</p>
          )}
        </div>
      )}

      {/* ── Waiting state (after submission) ── */}
      {hasSubmitted && (
        <div className="shrink-0 px-3 py-3 border-t border-white/10 text-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <p className="text-yellow-200/50 text-sm">
            Waiting for {game.playerOrder.length - submittedCount} more player{game.playerOrder.length - submittedCount !== 1 ? 's' : ''}...
          </p>
          <div className="flex justify-center gap-1 mt-2">
            {game.playerOrder.map(pid => (
              <span
                key={pid}
                className="w-2 h-2 rounded-full"
                style={{ background: (game.pendingActions ?? {})[pid] ? '#4ade80' : '#555' }}
                title={game.players[pid]?.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {showPayment && selectedCard && player && (
        <PaymentModal
          card={selectedCard}
          player={player}
          leftPlayer={leftPlayer}
          rightPlayer={rightPlayer}
          onConfirm={handlePaymentConfirm}
          onCancel={() => { setShowPayment(false); setPendingAction(null); }}
          actionType={pendingAction as 'play' | 'build_wonder'}
        />
      )}

      {/* ── Player Detail Modal ── */}
      {detailPlayer && (
        <PlayerDetailPanel
          player={game.players[detailPlayer]}
          game={game}
          onClose={() => setDetailPlayer(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
