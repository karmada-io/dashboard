import { theme } from 'antd';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import type { MetricChartProps } from './index';

const DEFAULT_HEIGHT = 320;
const HEADER_HEIGHT = 40;

function formatNumber(value: number, fractionDigits = 3) {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getLatestValue(data: MetricChartProps['data']) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const point = data[index];
    if (typeof point?.value === 'number' && Number.isFinite(point.value)) {
      return point.value;
    }
  }
  return undefined;
}

const MetricBarChart = ({
  data,
  title,
  color,
  valueFormatter = (value) => formatNumber(value),
  axisFormatter = (value) => formatNumber(value, 1),
  width,
  height = DEFAULT_HEIGHT,
}: MetricChartProps) => {
  const { token } = theme.useToken();
  const latestValue = getLatestValue(data);
  const chartHeight = Math.max(height - HEADER_HEIGHT, 180);

  return (
    <div className="flex flex-col gap-3" style={{ width }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium" style={{ color: token.colorTextHeading }}>
            {title}
          </span>
        </div>
        <span className="text-sm font-medium" style={{ color: token.colorText }}>
          {typeof latestValue === 'number' ? valueFormatter(latestValue) : '--'}
        </span>
      </div>

      <div
        className="w-full min-w-0 overflow-hidden rounded-md px-1 pt-2"
        style={{ backgroundColor: token.colorFillQuaternary }}
      >
        {data.length === 0 ? (
          <div
            className="flex items-center justify-center text-sm"
            style={{ height: chartHeight, color: token.colorTextTertiary }}
          >
            No data available
          </div>
        ) : (
          <BarChart width={Math.max(width - 8, 0)} height={chartHeight} data={data} margin={{ left: 4, right: 4, top: 6, bottom: 2 }}>
            <CartesianGrid vertical={false} strokeDasharray="2 6" stroke={token.colorBorderSecondary} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              minTickGap={28}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: token.colorTextTertiary }}
            />
            <YAxis
              width={54}
              tickFormatter={axisFormatter}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: token.colorTextTertiary }}
            />
            <Tooltip
              cursor={{ fill: token.colorFillQuaternary }}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: token.boxShadowSecondary,
                background: token.colorBgElevated,
              }}
              labelStyle={{ color: token.colorTextSecondary, fontSize: 12 }}
              labelFormatter={(timestamp) => new Date(timestamp as string).toLocaleString()}
              formatter={(tooltipValue) => [valueFormatter(Number(tooltipValue)), title]}
            />
            <Bar dataKey="value" fill={color} fillOpacity={0.8} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        )}
      </div>
    </div>
  );
};

export default MetricBarChart;
