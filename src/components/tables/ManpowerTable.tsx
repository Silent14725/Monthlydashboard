import { ManpowerEntry } from '../../types/dashboard';

interface Props {
  data: ManpowerEntry[];
}

export function ManpowerTable({ data }: Props) {
  return (
    <div>
      <div
        className="text-center text-xs font-bold uppercase tracking-wide py-1 mb-1"
        style={{ color: '#66003C', letterSpacing: '0.05em' }}
      >
        Manpower
      </div>
      <table className="w-full text-xs">
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={row.count === 0 ? 'opacity-60' : ''}
            >
              <td
                className="py-0.5 pr-2 font-semibold"
                style={{ color: '#66003C', fontSize: '11px' }}
              >
                {row.category}
              </td>
              <td
                className="py-0.5 text-right font-bold"
                style={{ color: '#1a1a1a', fontSize: '11px' }}
              >
                {row.count || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
