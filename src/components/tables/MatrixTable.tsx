import { MatrixEntry, Month, Quarter } from '../../types/dashboard';
import { fmtNum } from '../../utils/fmt';

interface Props {
  data: MatrixEntry[];
  months: (Month | Quarter)[];
  title: string;
}

function getHeatColor(value: number | null, allValues: number[]): string {
  if (value === null || value === undefined) return 'transparent';
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  if (max === min) return '#9BB5D0';
  const ratio = (value - min) / (max - min);
  if (ratio >= 0.7) return '#2D4A6B';
  if (ratio >= 0.4) return '#9BB5D0';
  return '#F0C8A0';
}

function getTextColor(bg: string): string {
  if (bg === '#2D4A6B') return 'white';
  if (bg === 'transparent') return '#aaa';
  return '#1a1a1a';
}

const ROW_MIN_HEIGHT = 22;

export function MatrixTable({ data, months, title }: Props) {
  const allValues = data
    .flatMap((row) => months.map((m) => row[m.toLowerCase() as keyof MatrixEntry] as number | null))
    .filter((v) => v !== null) as number[];

  return (
    <div>
      <div className="text-center font-bold text-xs mb-1" style={{ color: '#1a1a1a' }}>
        {title}
      </div>
      <div className="w-full">
        {/* Header row */}
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: `1.3fr repeat(${months.length}, 1fr)`,
            minHeight: `${ROW_MIN_HEIGHT}px`,
          }}
        >
          <div style={{ fontSize: '10px', color: '#555', fontWeight: 700, padding: '0 8px' }} />
          {months.map((m) => (
            <div
              key={m}
              style={{
                fontSize: '10px',
                color: '#555',
                fontWeight: 700,
                textAlign: 'center',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: `${ROW_MIN_HEIGHT}px`,
                lineHeight: 1,
              }}
            >
              {m}
            </div>
          ))}
        </div>
        {/* Data rows */}
        {data.map((row, i) => (
          <div
            key={i}
            className="grid items-stretch"
            style={{
              gridTemplateColumns: `1.3fr repeat(${months.length}, 1fr)`,
              minHeight: `${ROW_MIN_HEIGHT}px`,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#333',
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
              }}
            >
              {row.customer}
            </div>
            {months.map((m) => {
              const val = row[m.toLowerCase() as keyof MatrixEntry] as number | null;
              const bg = getHeatColor(val, allValues);
              const color = getTextColor(bg);
              return (
                <div
                  key={m}
                  style={{
                    backgroundColor: bg,
                    color,
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: `${ROW_MIN_HEIGHT}px`,
                    padding: '0 4px',
                    lineHeight: 1,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    borderRadius: '2px',
                  }}
                >
                  {fmtNum(val)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
