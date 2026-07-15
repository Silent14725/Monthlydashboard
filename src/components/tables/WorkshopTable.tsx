import { WorkshopFleet } from '../../types/dashboard';

interface Props {
  data: WorkshopFleet;
}

const ROW_MIN_HEIGHT = 22;

export function WorkshopTable({ data }: Props) {
  return (
    <div>
      <div
        className="text-center text-xs font-bold uppercase tracking-wide mb-1"
        style={{ color: '#555', letterSpacing: '0.04em' }}
      >
        Workshop &amp; Recovery
        <br />
        <span style={{ color: '#555' }}>Fleet Summary</span>
      </div>
      <div className="w-full">
        {[
          { label: 'Mobile Workshop', value: data.mobileWorkshop },
          { label: 'Winch', value: data.winch },
        ].map((row, i) => (
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
              }}
            >
              {row.label}
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
              }}
            >
              {row.value || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
