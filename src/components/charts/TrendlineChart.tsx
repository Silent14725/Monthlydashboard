import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendlineData } from '../../types/dashboard';

interface Props {
  data: TrendlineData[];
  title: string;
  color?: string;
}

function formatVal(v: number): string {
  const rounded = Math.round(v);
  if (Math.abs(rounded) >= 1000000) return (rounded / 1000000).toFixed(1) + 'M';
  if (Math.abs(rounded) >= 1000) return rounded.toLocaleString();
  return String(rounded);
}

const CustomDot = (props: any) => {
  const { cx, cy, value } = props;
  if (value === null || value === undefined) return null;
  return <circle cx={cx} cy={cy} r={3.5} fill="#66003C" stroke="white" strokeWidth={1.5} />;
};

const CustomLabel = (props: any) => {
  const { x, y, value, index, data } = props;
  if (value === null || value === undefined || value === 0) return null;
  const total = data ? data.length : 3;
  let anchor: string;
  if (index === 0) anchor = 'start';
  else if (index === total - 1) anchor = 'end';
  else anchor = 'middle';
  return (
    <text x={x} y={y - 7} fill="#333" textAnchor={anchor} fontSize={8.5} fontWeight="600">
      {formatVal(value)}
    </text>
  );
};

export function TrendlineChart({ data, title, color = '#66003C' }: Props) {
  const allZero = data.every((d) => !d.value || d.value === 0);

  const chartData = allZero
    ? data.map((d) => ({ ...d, value: 0 }))
    : data;

  return (
    <div className="bg-white rounded border border-gray-200 px-2 pt-1 pb-0.5" style={{ flexShrink: 0 }}>
      <p className="font-semibold mb-0" style={{ color: '#555', fontSize: '9px' }}>
        Monthly Trendline - {title}
      </p>
      {/* Outer wrapper: overflow visible so labels aren't clipped by the container */}
      <div style={{ overflow: 'visible', width: '100%' }}>
        <ResponsiveContainer width="100%" height={68}>
          <LineChart data={chartData} margin={{ top: 14, right: 28, left: 28, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 8, fill: '#555', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={allZero ? [0, 1] : ['auto', 'auto']} />
            <Tooltip
              formatter={(val: number) => [formatVal(val), title]}
              contentStyle={{ fontSize: 9, padding: '2px 6px' }}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={<CustomDot />}
              label={<CustomLabel data={chartData} />}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
