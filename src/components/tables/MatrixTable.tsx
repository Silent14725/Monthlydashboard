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

export function MatrixTable({ data, months, title }: Props) {
  const allValues = data
    .flatMap((row) => months.map((m) => row[m.toLowerCase() as keyof MatrixEntry] as number | null))
    .filter((v) => v !== null) as number[];

  return (
    <div>
      <div className="text-center font-bold text-xs mb-1" style={{ color: '#1a1a1a' }}>
        {title}
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-0.5 pr-2 font-bold" style={{ color: '#555', fontSize: '10px' }}></th>
            {months.map((m) => (
              <th key={m} className="text-center py-0.5 font-bold uppercase" style={{ color: '#555', fontSize: '10px' }}>
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td className="py-0.5 pr-2 font-semibold" style={{ fontSize: '11px', color: '#333' }}>
                {row.customer}
              </td>
              {months.map((m) => {
                const val = row[m.toLowerCase() as keyof MatrixEntry] as number | null;
                const bg = getHeatColor(val, allValues);
                const color = getTextColor(bg);
                return (
                  <td
                    key={m}
                    className="text-center py-0.5 font-bold rounded"
                    style={{
                      backgroundColor: bg,
                      color,
                      fontSize: '11px',
                      padding: '2px 4px',
                    }}
                  >
                    {fmtNum(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
