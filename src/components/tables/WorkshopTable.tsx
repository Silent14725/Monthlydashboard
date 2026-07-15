import { WorkshopFleet } from '../../types/dashboard';

interface Props {
  data: WorkshopFleet;
}

export function WorkshopTable({ data }: Props) {
  return (
    <div>
      <div
        className="text-center text-xs font-bold uppercase tracking-wide py-1 mb-1"
        style={{ color: '#555', letterSpacing: '0.04em' }}
      >
        Workshop &amp; Recovery
        <br />
        <span style={{ color: '#555' }}>Fleet Summary</span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          <tr>
            <td className="py-0.5 font-semibold" style={{ color: '#66003C', fontSize: '11px' }}>
              Mobile Workshop
            </td>
            <td className="py-0.5 text-right font-bold" style={{ fontSize: '11px' }}>
              {data.mobileWorkshop}
            </td>
          </tr>
          <tr>
            <td className="py-0.5 font-semibold" style={{ color: '#66003C', fontSize: '11px' }}>
              Winch
            </td>
            <td className="py-0.5 text-right font-bold" style={{ fontSize: '11px' }}>
              {data.winch}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
