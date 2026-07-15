import { FleetEntry, Month, Quarter } from '../../types/dashboard';
import { fmtNum } from '../../utils/fmt';

interface Props {
  data: FleetEntry[];
  months: (Month | Quarter)[];
}

const ROW_MIN_HEIGHT = 22;

export function CustomerFleetTable({ data, months }: Props) {
  return (
    <div>
      <div
        className="text-left font-bold text-xs mb-1"
        style={{ color: '#555' }}
      >
        Customer Fleet
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
              const val = row[m.toLowerCase() as keyof FleetEntry];
              return (
                <div
                  key={m}
                  style={{
                    fontSize: '11px',
                    color: '#1a1a1a',
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
                  }}
                >
                  {fmtNum(val as number | null)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
