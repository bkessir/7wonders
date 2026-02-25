import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [discardChoice, setDiscardChoice] = useState<string | null>(null);

  const player = game.players[playerId];
  const hand = (game.hands ?? {})[playerId] ?? [];
  const myAction = (game.pendingActions ?? {})[playerId];
  const hasSubmitted = myAction != null;

  const { leftId, rightId } = getNeighborIds(playerId, game.playerOrder);
  const leftPlayer = game.players[leftId];
  const rightPlayer = game.players[rightId];

  const isHost = game.hostId === playerId;

  // Babylon B "play last card" bonus turn
  const isBabylonBonusTurn = (game.babylonBonusPlayers?.length ?? 0) > 0;
  const isBabylonPlayer = isBabylonBonusTurn && (game.babylonBonusPlayers?.includes(playerId) ?? false);

  // ── Per-turn result modals ────────────────────────────────────────────────
  type CoinModalData = { fromLeft: number; fromRight: number; fromCard: number; cardName: string; actionType: string };
  type MilitaryModalData = { gains: Record<string, number[]>; age: number };

  const [coinModal, setCoinModal] = useState<CoinModalData | null>(null);
  const [militaryModal, setMilitaryModal] = useState<MilitaryModalData | null>(null);
  const pendingCoinRef = useRef<CoinModalData | null>(null);
  const shownResolutionRef = useRef('');

  useEffect(() => {
    if (!game.lastResolved) return;
    const key = `${game.lastResolved.age}-${game.lastResolved.turn}`;
    if (key === shownResolutionRef.current) return;
    shownResolutionRef.current = key;

    // Build coin modal data
    const changes = game.lastResolved.coinChanges?.[playerId];
    const received = changes
      ? (changes.fromLeftNeighbor ?? 0) + (changes.fromRightNeighbor ?? 0) + (changes.fromCard ?? 0)
      : 0;
    let coinData: CoinModalData | null = null;
    if (changes && received > 0) {
      const myAction = game.lastResolved.actions?.[playerId];
      coinData = {
        fromLeft: changes.fromLeftNeighbor ?? 0,
        fromRight: changes.fromRightNeighbor ?? 0,
        fromCard: changes.fromCard ?? 0,
        cardName: CARD_MAP[myAction?.cardId ?? '']?.name ?? '',
        actionType: myAction?.type ?? 'play',
      };
    }

    // If military ran, show it first; defer coin modal until after
    if (game.lastResolved.militaryResolved) {
      setMilitaryModal({ gains: game.lastResolved.militaryGains ?? {}, age: game.lastResolved.age });
      pendingCoinRef.current = coinData;
    } else if (coinData) {
      setCoinModal(coinData);
    }
  }, [game.lastResolved?.age, game.lastResolved?.turn]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeMilitaryModal() {
    setMilitaryModal(null);
    if (pendingCoinRef.current) {
      setCoinModal(pendingCoinRef.current);
      pendingCoinRef.current = null;
    }
  }

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
        ...(player.pendingDiscardPlay && discardChoice ? { discardChoice } : {}),
      };
      await submitAction(gameCode, playerId, action);
      setSelectedCardId(null);
      setPendingAction(null);
      setDiscardChoice(null);
      showToast(`Trashed ${card.name} for +3 coins`);
      return;
    }

    // For build_wonder the card is sacrificed; cost to pay is the wonder stage cost, not the card's cost.
    const wonderStage = type === 'build_wonder'
      ? WONDER_MAP[player.wonderId]?.[player.wonderSide]?.stages[player.wonderStagesBuilt]
      : null;
    const effectiveCost = wonderStage
      ? { resources: wonderStage.cost }
      : card.cost;

    // Chain and free-play abilities only apply when actually playing a card, not building a wonder.
    const isFreeChain = type === 'play' && hasFreeChain(card, player);
    const isFreeAbility = player.canPlayFreeThisAge && type === 'play';
    const costIsJustCoins = Object.keys(effectiveCost.resources).length === 0;

    if (isFreeChain || isFreeAbility || costIsJustCoins) {
      // No resource payment needed, possibly just coin cost
      const action: PlayerAction = {
        type,
        cardId: selectedCardId,
        payment: { left: 0, right: 0 },
        ...(type === 'build_wonder' ? { wonderStageIndex: player.wonderStagesBuilt } : {}),
        ...(player.pendingDiscardPlay && discardChoice ? { discardChoice } : {}),
      };
      await submitAction(gameCode, playerId, action);
      setSelectedCardId(null);
      setPendingAction(null);
      setDiscardChoice(null);
      const typeStr = type as string;
      showToast(typeStr === 'trash' ? 'Trashed!' : typeStr === 'build_wonder' ? 'Building wonder stage...' : `Playing ${card.name}`);
      return;
    }

    // Need payment selection
    const options = findPaymentOptions(effectiveCost, player, leftPlayer, rightPlayer);
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
      ...(player?.pendingDiscardPlay && discardChoice ? { discardChoice } : {}),
    };
    await submitAction(gameCode, playerId, action);
    setShowPayment(false);
    setSelectedCardId(null);
    setPendingAction(null);
    setDiscardChoice(null);
    const card = CARD_MAP[selectedCardId];
    showToast(pendingAction === 'build_wonder' ? 'Wonder stage submitted!' : `${card?.name} submitted!`);
  }

  async function handleRetract() {
    await retractAction(gameCode, playerId);
    setDiscardChoice(null);
    showToast('Action retracted');
  }

  // Halikarnassus end-of-age bonus: submit just a discard pick (no hand card required)
  async function handlePickDiscard() {
    const action: PlayerAction = {
      type: 'pick_discard',
      cardId: discardChoice ?? '',
      payment: { left: 0, right: 0 },
    };
    await submitAction(gameCode, playerId, action);
    setDiscardChoice(null);
  }

  // Host-only: auto-trash the first hand card for any player who hasn't submitted.
  // Used when a player is stuck and unable to take their turn.
  async function handleForceAdvance() {
    const submissions: Promise<void>[] = [];
    for (const pid of game.playerOrder) {
      if ((game.pendingActions ?? {})[pid] == null) {
        const pidHand = (game.hands ?? {})[pid] ?? [];
        if (pidHand.length > 0) {
          submissions.push(submitAction(gameCode, pid, {
            type: 'trash',
            cardId: pidHand[0],
            payment: { left: 0, right: 0 },
          }));
        }
      }
    }
    if (submissions.length === 0) {
      showToast('All players have already submitted');
    } else {
      await Promise.all(submissions);
      showToast('Force-advanced: trashed first card for stuck players');
    }
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
          <span className="text-xs text-yellow-200/60">
            {isBabylonBonusTurn ? 'Last Card' : `Turn ${game.turn}/6`}
          </span>
          <span className="text-yellow-200/30">|</span>
          <span className="text-xs text-yellow-200/50" title="Direction cards are passing this age">
            {game.age === 2 ? '← passing left' : '→ passing right'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-yellow-300">🪙 {player?.coins ?? 0}</span>
          {player?.shields ? <span className="text-sm text-red-300">⚔ {player.shields}</span> : null}
          {isBabylonBonusTurn && !isBabylonPlayer ? (
            <span className="text-xs text-yellow-200/50 font-bold">Age Ending...</span>
          ) : hasSubmitted ? (
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
              direction={pid === leftId ? 'left' : pid === rightId ? 'right' : undefined}
              onClick={() => setDetailPlayer(pid)}
            />
          ))}
        </div>
      </div>

      {/* ── Main Scrollable Area ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

        {/* Bonus turn: non-bonus players wait (Babylon B or Halikarnassus) */}
        {isBabylonBonusTurn && !isBabylonPlayer && (
          <div className="rounded-xl border p-3 text-center" style={{ background: 'rgba(30,15,60,0.5)', borderColor: 'rgba(139,92,246,0.35)' }}>
            <p className="text-purple-300 font-bold text-sm mb-1">⌛ Age Ending — Bonus Actions</p>
            <p className="text-xs text-white/45">
              {game.babylonBonusPlayers!.map(pid => game.players[pid]?.name).join(', ')} {game.babylonBonusPlayers!.length === 1 ? 'is' : 'are'} completing a bonus action before the age ends.
            </p>
          </div>
        )}

        {/* Babylon B: prompt the active player (not shown for Halikarnassus bonus) */}
        {isBabylonBonusTurn && isBabylonPlayer && !hasSubmitted && !player?.pendingDiscardPlay && (
          <div className="rounded-xl border p-3" style={{ background: 'rgba(30,15,60,0.5)', borderColor: 'rgba(139,92,246,0.6)' }}>
            <p className="text-purple-300 font-bold text-sm">🏛 Babylon Bonus — Play your last card!</p>
            <p className="text-xs text-white/45 mt-0.5">Instead of discarding your final card, you may play, trash, or build wonder with it.</p>
          </div>
        )}

        {/* Halikarnassus: pick a card from the discard pile */}
        {player?.pendingDiscardPlay && !hasSubmitted && (
          <div className="rounded-xl border p-3" style={{ background: 'rgba(120,50,180,0.12)', borderColor: 'rgba(192,132,252,0.4)' }}>
            <p className="section-header" style={{ color: '#c084fc' }}>
              🏛 Halikarnassus — Pick a card from the discard (optional)
            </p>
            {game.discard.length === 0 ? (
              <>
                <p className="text-xs text-white/30">The discard pile is empty — nothing to pick.</p>
                {/* Bonus turn: still need to submit even if nothing to pick */}
                {isBabylonBonusTurn && isBabylonPlayer && (
                  <button className="btn btn-outline text-xs mt-2 px-3 py-1 w-full" onClick={handlePickDiscard}>
                    Skip (nothing to pick)
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="hand-scroll pb-2">
                  {game.discard.map(cardId => (
                    <CardDisplay
                      key={cardId}
                      cardId={cardId}
                      selected={discardChoice === cardId}
                      onClick={() => setDiscardChoice(prev => prev === cardId ? null : cardId)}
                    />
                  ))}
                </div>
                {isBabylonBonusTurn && isBabylonPlayer ? (
                  /* Bonus turn: submit the pick directly (no hand card needed) */
                  <div className="flex gap-2 mt-2">
                    <button
                      className="btn btn-gold flex-1 py-1.5 text-xs"
                      disabled={!discardChoice}
                      onClick={handlePickDiscard}
                    >
                      {discardChoice ? `✓ Take ${CARD_MAP[discardChoice]?.name}` : 'Select a card'}
                    </button>
                    <button className="btn btn-outline text-xs py-1.5 px-3" onClick={handlePickDiscard}>
                      Skip
                    </button>
                  </div>
                ) : (
                  <p className="text-xs mt-1" style={{ color: discardChoice ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                    {discardChoice
                      ? `✓ Will play ${CARD_MAP[discardChoice]?.name} for free — now choose your hand card below.`
                      : 'Tap a card to select it, or leave blank to skip.'}
                  </p>
                )}
              </>
            )}
          </div>
        )}

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
          <div className="flex flex-wrap gap-1 items-center">
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
                {myAction.discardChoice && (
                  <p className="text-xs text-purple-300/70">
                    + Taking {CARD_MAP[myAction.discardChoice]?.name ?? myAction.discardChoice} from discard
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
      {/* Hidden for Halikarnassus bonus players — their last hand card is auto-discarded */}
      {!hasSubmitted && hand.length > 0 && !(isBabylonBonusTurn && isBabylonPlayer && player?.pendingDiscardPlay) && (
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

      {/* ── Babylon bonus: non-Babylon players show a waiting bar ── */}
      {isBabylonBonusTurn && !isBabylonPlayer && (
        <div className="shrink-0 px-3 py-3 border-t border-white/10 text-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <p className="text-yellow-200/40 text-sm">Waiting for Babylon player...</p>
          <div className="flex justify-center gap-1 mt-2">
            {game.babylonBonusPlayers!.map(pid => (
              <span key={pid} className="text-xs text-purple-300/60">{game.players[pid]?.name}</span>
            ))}
          </div>
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
          {isHost && submittedCount < game.playerOrder.length && (
            <button
              className="btn btn-outline text-xs mt-3 px-3 py-1 opacity-50 hover:opacity-100"
              onClick={handleForceAdvance}
              title="Emergency: auto-trash first card for any player who cannot submit"
            >
              Force Advance Turn
            </button>
          )}
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

      {/* ── Military Modal (end of age) ── */}
      {militaryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={closeMilitaryModal}
        >
          <div
            className="rounded-xl p-5 mx-4 max-w-sm w-full"
            style={{ background: '#100a08', border: '1px solid rgba(239,68,68,0.45)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-red-300 font-bold text-base mb-4">⚔ Age {militaryModal.age} Military Results</p>

            {/* Matchup vs each neighbor */}
            {([{ neighbor: leftPlayer, label: '← Left' }, { neighbor: rightPlayer, label: 'Right →' }] as const).map(({ neighbor, label }) => {
              if (!neighbor || !player) return null;
              const mine = player.shields;
              const theirs = neighbor.shields;
              const result = mine > theirs ? 'win' : mine < theirs ? 'loss' : 'tie';
              return (
                <div key={label} className="flex items-center justify-between mb-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-white/35 text-xs">{label} </span>
                    <span className="text-white/80 truncate">{neighbor.name}</span>
                    <span className="text-white/30 text-xs ml-1">({theirs}⚔)</span>
                  </div>
                  <span className={
                    result === 'win' ? 'text-green-400 font-bold ml-2' :
                    result === 'loss' ? 'text-red-400 ml-2' :
                    'text-white/30 ml-2'
                  }>
                    {result === 'win' ? '✓ WIN' : result === 'loss' ? '✗ LOSS' : '= TIE'}
                  </span>
                </div>
              );
            })}

            {/* New tokens */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-white/35 mb-1.5">Your tokens this age:</p>
              {(militaryModal.gains[playerId] ?? []).length > 0 ? (
                <div className="flex gap-1.5 flex-wrap">
                  {(militaryModal.gains[playerId] ?? []).map((t, i) => (
                    <img
                      key={i}
                      src={t === 5 ? '/images/tokens/victory5.png' : t === 3 ? '/images/tokens/victory3.png' : t === 1 ? '/images/tokens/victory1.png' : '/images/tokens/victoryminus1.png'}
                      alt={`${t > 0 ? '+' : ''}${t}`}
                      style={{ width: 38, height: 38, objectFit: 'contain' }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/25">No new tokens (all tied).</p>
              )}
            </div>

            <button className="btn btn-outline text-xs w-full mt-4 py-2" onClick={closeMilitaryModal}>
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Coin Modal (received coins this turn) ── */}
      {coinModal && !militaryModal && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4 px-4"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="rounded-xl p-4 w-full max-w-sm"
            style={{ background: 'rgba(12,9,2,0.97)', border: '1px solid rgba(234,179,8,0.35)', pointerEvents: 'auto' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-yellow-300 font-bold text-sm">🪙 Coins Received</p>
              <button className="text-white/30 text-lg leading-none" onClick={() => setCoinModal(null)}>✕</button>
            </div>
            <div className="space-y-1.5">
              {coinModal.fromLeft > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/55">Trade · {leftPlayer?.name}</span>
                  <span className="text-yellow-300 font-bold">+{coinModal.fromLeft}</span>
                </div>
              )}
              {coinModal.fromRight > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/55">Trade · {rightPlayer?.name}</span>
                  <span className="text-yellow-300 font-bold">+{coinModal.fromRight}</span>
                </div>
              )}
              {coinModal.fromCard > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/55">
                    {coinModal.actionType === 'trash' ? 'Trashed card' :
                     coinModal.actionType === 'build_wonder' ? 'Wonder stage' :
                     coinModal.cardName || 'Card effect'}
                  </span>
                  <span className="text-yellow-300 font-bold">+{coinModal.fromCard}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-1.5 flex justify-between text-sm font-bold">
                <span className="text-white/70">Total received</span>
                <span className="text-yellow-300">+{coinModal.fromLeft + coinModal.fromRight + coinModal.fromCard}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
