/**
 * Copyright 2024 The Karmada Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useId } from 'react';
import { theme } from 'antd';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

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

const MetricAreaChart = ({
  data,
  title,
  color,
  valueFormatter = (value) => formatNumber(value),
  axisFormatter = (value) => formatNumber(value, 1),
  width,
  height = DEFAULT_HEIGHT,
}: MetricChartProps) => {
  const { token } = theme.useToken();
  const gradientId = useId().replace(/:/g, '');
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
          <AreaChart width={Math.max(width - 8, 0)} height={chartHeight} data={data} margin={{ left: 4, right: 4, top: 6, bottom: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              cursor={{ stroke: token.colorBorder, strokeDasharray: '4 4' }}
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
            <Area
              type="monotoneX"
              dataKey="value"
              stroke={color}
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              strokeWidth={2}
              connectNulls
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </div>
    </div>
  );
};

export default MetricAreaChart;
