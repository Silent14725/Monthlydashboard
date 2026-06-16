import { FleetEntry, Month, Quarter } from '../../types/dashboard';
import { fmtNum } from '../../utils/fmt';

interface Props {
  data: FleetEntry[];
  months: (Month | Quarter)[];
}

export function CustomerFleetTable({ data, months }: Props) {
  return (
    <div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th
              className="text-left py-0.5 pr-2 font-bold text-xs"
              style={{ color: '#555' }}
            >
              Customer Fleet
            </th>
            {months.map((m) => (
              <th key={m} className="text-center py-0.5 font-bold text-xs" style={{ color: '#555' }}>
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-0.5 pr-2 font-semibold" style={{ color: '#333', fontSize: '11px' }}>
                {row.customer}
              </td>
              {months.map((m) => {
                const val = row[m.toLowerCase() as keyof FleetEntry];
                return (
                  <td key={m} className="text-center py-0.5 font-bold" style={{ fontSize: '11px' }}>
                    {fmtNum(val as number | null)}
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
