import type { Resource } from '../types/game';

interface Props {
  resource: Resource;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function ResourceIcon({ resource, size = 'sm' }: Props) {
  const dims = { xs: 14, sm: 18, md: 24, lg: 32 }[size];
  return (
    <img
      src={`/images/tokens/${resource}.png`}
      alt={resource}
      title={resource}
      style={{ width: dims, height: dims, objectFit: 'contain', flexShrink: 0, display: 'inline-block' }}
    />
  );
}

export function ResourceCost({
  resources,
  coins,
}: {
  resources: Record<string, number>;
  coins?: number;
}) {
  return (
    <div className="flex flex-wrap gap-0.5 items-center">
      {coins ? (
        <span
          title={`${coins} coin${coins !== 1 ? 's' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 18, height: 18 }}
        >
          <img src="/images/tokens/coin.png" alt="coin" style={{ width: 18, height: 18, objectFit: 'contain' }} />
          {coins > 1 && (
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              background: '#1a0e00', borderRadius: '50%',
              width: 10, height: 10, fontSize: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', color: '#fcd34d', lineHeight: 1,
            }}>{coins}</span>
          )}
        </span>
      ) : null}
      {Object.entries(resources).flatMap(([res, count]) =>
        Array.from({ length: count as number }, (_, i) => (
          <ResourceIcon key={`${res}-${i}`} resource={res as Resource} size="sm" />
        ))
      )}
    </div>
  );
}
