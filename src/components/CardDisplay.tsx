import type { CardDef, CardColor } from '../types/game';
import { CARD_MAP } from '../data/cards';
import { ResourceCost } from './ResourceIcon';

const COLOR_CLASS: Record<CardColor, string> = {
  brown:  'card-brown',
  grey:   'card-grey',
  blue:   'card-blue',
  yellow: 'card-yellow',
  red:    'card-red',
  green:  'card-green',
  purple: 'card-purple',
};

function effectSummary(card: CardDef): string {
  return card.effects.map(eff => {
    if (eff.type === 'resources') {
      return Object.entries(eff.resources)
        .map(([r, c]) => `${c}${r[0].toUpperCase()}`)
        .join('+');
    }
    if (eff.type === 'resource_choice') {
      return eff.resources.map(r => r[0].toUpperCase()).join('/');
    }
    if (eff.type === 'military') return `${eff.shields}⚔`;
    if (eff.type === 'science') {
      return { compass: '🧭', gear: '⚙', tablet: '📋' }[eff.symbol] ?? '?';
    }
    if (eff.type === 'coins') return `+${eff.amount}🪙`;
    if (eff.type === 'points') return `${eff.amount}★`;
    if (eff.type === 'trade_discount') {
      const dirs = { left: '←', right: '→', both: '↔' };
      return `${dirs[eff.direction]}1🪙`;
    }
    if (eff.type === 'dynamic_yellow') {
      const pts = eff.pointsPerCard > 0 ? `${eff.pointsPerCard}★` : '';
      const cns = eff.coinsPerCard > 0 ? `${eff.coinsPerCard}🪙` : '';
      const who = eff.who === 'self' ? '' : eff.who === 'neighbors' ? '◀▶' : eff.who === 'left' ? '◀' : '▶';
      return `${cns}${pts}/${eff.cardType[0].toUpperCase()}${who}`;
    }
    if (eff.type === 'science_wildcard') return '⚗?';
    return '';
  }).filter(Boolean).join(' ');
}

interface CardProps {
  cardId: string;
  selected?: boolean;
  unaffordable?: boolean;
  onClick?: () => void;
  size?: 'hand' | 'mini';
}

export default function CardDisplay({ cardId, selected, unaffordable, onClick, size = 'hand' }: CardProps) {
  const card = CARD_MAP[cardId];
  if (!card) return null;

  const colorClass = COLOR_CLASS[card.color];
  const summary = effectSummary(card);
  const hasCost = Object.keys(card.cost.resources).length > 0 || (card.cost.coins ?? 0) > 0;

  if (size === 'mini') {
    return (
      <span
        title={`${card.name}: ${summary}`}
        className={`inline-flex items-center justify-center rounded font-bold ${colorClass}`}
        style={{
          width: 22, height: 16, fontSize: 8,
          border: '1.5px solid rgba(255,255,255,0.2)',
          cursor: onClick ? 'pointer' : 'default',
        }}
        onClick={onClick}
      >
        {card.name[0]}
      </span>
    );
  }

  return (
    <div
      className={`hand-card ${colorClass} ${selected ? 'selected' : ''} ${unaffordable ? 'unaffordable' : ''}`}
      onClick={onClick}
    >
      {/* Cost row */}
      <div className="flex flex-wrap gap-0.5 min-h-[18px]">
        {hasCost ? (
          <ResourceCost resources={card.cost.resources} coins={card.cost.coins} />
        ) : (
          <span className="text-green-400 font-bold" style={{ fontSize: 9 }}>FREE</span>
        )}
        {card.freeFrom && (
          <span className="text-yellow-400/60" style={{ fontSize: 8 }}>⛓</span>
        )}
      </div>

      {/* Card name */}
      <div className="text-center px-0.5">
        <p className="text-white font-bold leading-tight" style={{ fontSize: 8.5 }}>
          {card.name}
        </p>
      </div>

      {/* Effect summary */}
      <div className="text-center">
        <p className="text-yellow-100 font-bold" style={{ fontSize: 10 }}>
          {summary}
        </p>
      </div>
    </div>
  );
}

// Compact played card list grouped by color
export function PlayedCards({ cardIds }: { cardIds: string[] }) {
  const order: CardColor[] = ['brown', 'grey', 'blue', 'yellow', 'red', 'green', 'purple'];
  const grouped: Record<CardColor, string[]> = {
    brown: [], grey: [], blue: [], yellow: [], red: [], green: [], purple: [],
  };
  for (const id of cardIds) {
    const card = CARD_MAP[id];
    if (card) grouped[card.color].push(id);
  }

  return (
    <div className="flex flex-wrap gap-1">
      {order.flatMap(color =>
        grouped[color].map(id => <CardDisplay key={id} cardId={id} size="mini" />)
      )}
    </div>
  );
}
