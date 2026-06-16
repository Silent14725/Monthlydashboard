import { LocationData, Month, Quarter } from '../types/dashboard';
import { SaptcoLogo } from '../components/layout/SaptcoLogo';
import { SlideFooter } from '../components/layout/SlideFooter';
import { MonthlyTrendChart } from '../components/charts/MonthlyTrendChart';
import { TrendlineChart } from '../components/charts/TrendlineChart';
import { ManpowerTable } from '../components/tables/ManpowerTable';
import { WorkshopTable } from '../components/tables/WorkshopTable';
import { CustomerFleetTable } from '../components/tables/CustomerFleetTable';
import { MatrixTable } from '../components/tables/MatrixTable';
import { useCollapse } from '../context/CollapseContext';
import { collapseLocationData } from '../utils/collapseData';

interface Props {
  data: LocationData;
  pageNumber: number;
  slideId?: string;
}

export function LocationPage({ data, pageNumber, slideId }: Props) {
  const { collapsed } = useCollapse();
  const display = collapsed ? collapseLocationData(data) : data;
  const months = display.months as (Month | Quarter)[];

  return (
    <div
      id={slideId ?? `slide-${data.location.toLowerCase().replace(/\s+/g, '-')}`}
      className="bg-white flex flex-col"
      style={{ width: '100%', height: '100%', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-2 pb-1">
        <h2
          className="font-black"
          style={{ color: '#66003C', fontSize: '20px', lineHeight: 1.2 }}
        >
          {data.location} Q{data.quarter.slice(1)}-{data.year}
        </h2>
        <SaptcoLogo />
      </div>

      {/* Divider */}
      <div className="mx-6 mb-1.5" style={{ height: '2px', backgroundColor: '#66003C', flexShrink: 0 }} />

      {/* Main body - 3 columns */}
      <div className="flex flex-1 gap-2 px-3 pb-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* LEFT column - Monthly trend + WO/STD trendlines */}
        <div
          className="flex flex-col gap-1.5 flex-shrink-0"
          style={{ width: '27%', minWidth: 0 }}
        >
          <div className="rounded border border-gray-200 bg-white px-2 pt-1.5 pb-0.5 flex-shrink-0">
            <MonthlyTrendChart data={display.monthlyTrend} />
          </div>
          <TrendlineChart data={display.trendlineWoCount} title="WO Count" />
          <TrendlineChart data={display.trendlineStdHours} title="Standard Hours" />
          <TrendlineChart data={display.trendlineInsurance} title="Insurance" />
          <TrendlineChart data={display.trendlineExternalSales} title="External Sales" />
        </div>

        {/* MIDDLE column - Manpower/Workshop/Fleet + WO matrix + STD matrix */}
        <div
          className="flex flex-col gap-1.5 flex-1"
          style={{ minWidth: 0 }}
        >
          {/* Top row: Manpower | Workshop | Customer Fleet */}
          <div className="flex gap-1.5 flex-shrink-0">
            <div className="rounded border border-gray-200 bg-white px-2 py-1.5" style={{ minWidth: '110px' }}>
              <ManpowerTable data={display.manpower} />
            </div>
            <div className="rounded border border-gray-200 bg-white px-2 py-1.5" style={{ minWidth: '90px' }}>
              <WorkshopTable data={display.workshopFleet} />
            </div>
            {display.customerFleet.length > 0 && (
              <div className="rounded border border-gray-200 bg-white px-2 py-1.5 flex-1">
                <CustomerFleetTable data={display.customerFleet} months={months} />
              </div>
            )}
          </div>

          {/* WO Count matrix */}
          <div className="rounded border border-gray-200 bg-white px-2 py-1.5 flex-shrink-0">
            <MatrixTable data={display.woCount} months={months} title="WO Count" />
          </div>

          {/* STD Hours matrix */}
          <div className="rounded border border-gray-200 bg-white px-2 py-1.5 flex-shrink-0">
            <MatrixTable data={display.stdHours} months={months} title="Standard Hours" />
          </div>
        </div>

        {/* RIGHT column - trendlines */}
        <div
          className="flex flex-col gap-1.5 flex-shrink-0"
          style={{ width: '27%', minWidth: 0 }}
        >
          <TrendlineChart data={display.trendlineWarrantyClaims} title="Warranty Claims" />
          <TrendlineChart data={display.trendlineWashCount} title="Wash Count" />
        </div>
      </div>

      <SlideFooter pageNumber={pageNumber} />
    </div>
  );
}
