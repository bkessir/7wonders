import type { Resource } from '../types/game';

const RESOURCE_STYLES: Record<Resource, { bg: string; text: string; label: string }> = {
  stone:  { bg: '#7a7a7a', text: '#fff',    label: 'S' },
  wood:   { bg: '#6b3d1e', text: '#fff',    label: 'W' },
  ore:    { bg: '#8a8aaa', text: '#fff',    label: 'O' },
  clay:   { bg: '#a05030', text: '#fff',    label: 'C' },
  linen:  { bg: '#c8a020', text: '#1a0a00', label: 'L' },
  glass:  { bg: '#2060a0', text: '#fff',    label: 'G' },
  paper:  { bg: '#c8c890', text: '#1a0a00', label: 'P' },
};

interface Props {
  resource: Resource;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function ResourceIcon({ resource, size = 'sm' }: Props) {
  const style = RESOURCE_STYLES[resource];
  if (!style) return null;

  const dims = { xs: 14, sm: 18, md: 24, lg: 32 }[size];
  const fontSize = { xs: 8, sm: 10, md: 13, lg: 16 }[size];

  return (
    <span
      title={resource}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dims,
        height: dims,
        borderRadius: '50%',
        background: style.bg,
        color: style.text,
        fontSize,
        fontWeight: 'bold',
        border: '1.5px solid rgba(255,255,255,0.3)',
        flexShrink: 0,
      }}
    >
      {style.label}
    </span>
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
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: '#c8a020', color: '#1a0a00',
            fontSize: 10, fontWeight: 'bold', border: '1.5px solid rgba(255,255,255,0.3)',
          }}
        >
          {coins}
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
