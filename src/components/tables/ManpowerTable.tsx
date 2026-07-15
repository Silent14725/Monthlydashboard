import { ManpowerEntry } from '../../types/dashboard';

interface Props {
  data: ManpowerEntry[];
}

const ROW_MIN_HEIGHT = 22;

export function ManpowerTable({ data }: Props) {
  return (
    <div>
      <div
        className="text-center text-xs font-bold uppercase tracking-wide mb-1"
        style={{ color: '#66003C', letterSpacing: '0.05em' }}
      >
        Manpower
      </div>
      <div className="w-full">
        {data.map((row, i) => (
          <div
            key={i}
            className="grid items-stretch"
            style={{
              gridTemplateColumns: '1.3fr 1fr',
              minHeight: `${ROW_MIN_HEIGHT}px`,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#66003C',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                height: '100%',
                minHeight: `${ROW_MIN_HEIGHT}px`,
                padding: '0 8px',
                lineHeight: 1,
                boxSizing: 'border-box',
                overflow: 'hidden',
                opacity: row.count === 0 ? 0.6 : 1,
              }}
            >
              {row.category}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#1a1a1a',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: `${ROW_MIN_HEIGHT}px`,
                padding: '0 8px',
                lineHeight: 1,
                boxSizing: 'border-box',
                overflow: 'hidden',
                opacity: row.count === 0 ? 0.6 : 1,
              }}
            >
              {row.count || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
