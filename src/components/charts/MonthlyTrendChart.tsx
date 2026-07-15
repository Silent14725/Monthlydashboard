import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { MonthlyTrendData } from '../../types/dashboard';
import { readExportParams } from '../../lib/exportMode';

interface Props {
  data: MonthlyTrendData[];
}

const PRODUCTIVITY_COLOR = '#66003C';
const EFFICIENCY_COLOR = '#C49EA0';
const UTILIZATION_COLOR = '#2D4A6B';

const CustomLabel = ({ x, y, width, value }: any) => {
  if (value === null || value === undefined) return null;
  return (
    <text x={x + width / 2} y={y - 2} fill="#333" textAnchor="middle" fontSize={8.5} fontWeight="700">
      {value}%
    </text>
  );
};

const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex items-center justify-center gap-3 mt-0.5">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span style={{ fontSize: '8px', color: '#555' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function MonthlyTrendChart({ data }: Props) {
  const { isExportMode } = readExportParams();
  return (
    <div>
      <p style={{ fontSize: '9px', fontWeight: 600, color: '#333', marginBottom: '2px' }}>Monthly Trend</p>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart
          data={data}
          barCategoryGap="15%"
          barGap={1}
          margin={{ top: 16, right: 2, left: -24, bottom: 0 }}
        >
          <XAxis
            dataKey="month"
            tick={{ fontSize: 9, fill: '#666' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            formatter={(val: number, name: string) => [`${val}%`, name]}
            contentStyle={{ fontSize: 9, padding: '2px 6px' }}
          />
          <Bar dataKey="productivity" name="Productivity" fill={PRODUCTIVITY_COLOR} radius={[2, 2, 0, 0]} isAnimationActive={!isExportMode}>
            <LabelList content={<CustomLabel />} />
          </Bar>
          <Bar dataKey="efficiency" name="Efficiency" fill={EFFICIENCY_COLOR} radius={[2, 2, 0, 0]} isAnimationActive={!isExportMode}>
            <LabelList content={<CustomLabel />} />
          </Bar>
          <Bar dataKey="utilization" name="Utilization" fill={UTILIZATION_COLOR} radius={[2, 2, 0, 0]} isAnimationActive={!isExportMode}>
            <LabelList content={<CustomLabel />} />
          </Bar>
          <Legend content={renderLegend} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
