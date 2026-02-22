import { useState } from 'react';
import type { CardDef, CardColor } from '../types/game';
import { CARD_MAP } from '../data/cards';
import { ResourceCost } from './ResourceIcon';

// Used for mini card tooltips
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
      return `${cns}${pts}/${eff.cardType[0].toUpperCase()}`;
    }
    if (eff.type === 'science_wildcard') return '⚗?';
    return '';
  }).filter(Boolean).join(' ');
}

const COLOR_BORDER: Record<CardColor, string> = {
  brown:  '#7c4a1e',
  grey:   '#5a6578',
  blue:   '#1e3f8a',
  yellow: '#a07010',
  red:    '#8a1c1c',
  green:  '#1c6e34',
  purple: '#5a1a7e',
};

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

  if (size === 'mini') {
    return (
      <span
        title={`${card.name}: ${effectSummary(card)}`}
        style={{
          display: 'inline-block',
          width: 48,
          height: 68,
          borderRadius: 4,
          overflow: 'hidden',
          border: `1.5px solid ${COLOR_BORDER[card.color]}`,
          flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
        }}
        onClick={onClick}
      >
        <img
          src={`/images/cards/${cardId}.png`}
          alt={card.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </span>
    );
  }

  return (
    <div
      className={`hand-card ${selected ? 'selected' : ''} ${unaffordable ? 'unaffordable' : ''}`}
      style={{ padding: 0, overflow: 'hidden', position: 'relative' }}
      onClick={onClick}
    >
      <img
        src={`/images/cards/${cardId}.png`}
        alt={card.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 6 }}
      />
      {/* Chain prerequisite indicator */}
      {card.freeFrom && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          fontSize: 9, lineHeight: 1,
          textShadow: '0 0 4px rgba(0,0,0,0.9)',
        }}>⛓</span>
      )}
    </div>
  );
}

// Compact played card list grouped by color
export function PlayedCards({ cardIds }: { cardIds: string[] }) {
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const order: CardColor[] = ['brown', 'grey', 'blue', 'yellow', 'red', 'green', 'purple'];
  const grouped: Record<CardColor, string[]> = {
    brown: [], grey: [], blue: [], yellow: [], red: [], green: [], purple: [],
  };
  for (const id of cardIds) {
    const card = CARD_MAP[id];
    if (card) grouped[card.color].push(id);
  }

  const zoomedCard = zoomedId ? CARD_MAP[zoomedId] : null;

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {order.flatMap(color =>
          grouped[color].map(id => (
            <CardDisplay key={id} cardId={id} size="mini" onClick={() => setZoomedId(id)} />
          ))
        )}
      </div>

      {zoomedCard && zoomedId && (
        <div
          className="modal-overlay"
          onClick={() => setZoomedId(null)}
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 16 }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={`/images/cards/${zoomedId}.png`}
              alt={zoomedCard.name}
              style={{
                maxHeight: '70vh',
                maxWidth: '90vw',
                borderRadius: 10,
                border: `3px solid ${COLOR_BORDER[zoomedCard.color]}`,
                boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 'bold', fontSize: 16, color: '#f5e6c8' }}>{zoomedCard.name}</p>
              <p style={{ fontSize: 13, color: 'rgba(245,230,200,0.6)', marginTop: 2 }}>{effectSummary(zoomedCard)}</p>
            </div>
            <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setZoomedId(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
