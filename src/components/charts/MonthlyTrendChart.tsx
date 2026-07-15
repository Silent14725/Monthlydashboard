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

interface Props {
  data: MonthlyTrendData[];
}

const PRODUCTIVITY_COLOR = '#66003C';
const EFFICIENCY_COLOR = '#C49EA0';
const UTILIZATION_COLOR = '#2D4A6B';

const CustomLabel = ({ x, y, width, value }: any) => {
  if (value === null || value === undefined) return null;
  return (
    <text x={x + width / 2} y={y - 3} fill="#333" textAnchor="middle" fontSize={8.5} fontWeight="700">
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
  return (
    <div>
      <p style={{ fontSize: '9px', fontWeight: 600, color: '#333', marginBottom: '2px' }}>Monthly Trend</p>
      {/* overflow: visible lets % labels above bars escape the SVG clip rect */}
      <div style={{ overflow: 'visible' }}>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart
            data={data}
            barCategoryGap="15%"
            barGap={1}
            // top: 22 gives enough room for the tallest % label (≈12 px text + 3 px gap)
            // left: 8 keeps the first bar's label well inside the card
            margin={{ top: 22, right: 8, left: 8, bottom: 0 }}
          >
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: '#666' }}
              axisLine={false}
              tickLine={false}
              // padding prevents first/last bar from sitting flush against the edge
              padding={{ left: 12, right: 12 }}
            />
            <YAxis hide />
            <Tooltip
              formatter={(val: any) => [`${val}%`, ''] as [string, string]}
              contentStyle={{ fontSize: 9, padding: '2px 6px' }}
            />
            <Bar dataKey="productivity" name="Productivity" fill={PRODUCTIVITY_COLOR} radius={[2, 2, 0, 0]} isAnimationActive={false}>
              <LabelList content={<CustomLabel />} />
            </Bar>
            <Bar dataKey="efficiency" name="Efficiency" fill={EFFICIENCY_COLOR} radius={[2, 2, 0, 0]} isAnimationActive={false}>
              <LabelList content={<CustomLabel />} />
            </Bar>
            <Bar dataKey="utilization" name="Utilization" fill={UTILIZATION_COLOR} radius={[2, 2, 0, 0]} isAnimationActive={false}>
              <LabelList content={<CustomLabel />} />
            </Bar>
            <Legend content={renderLegend} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
