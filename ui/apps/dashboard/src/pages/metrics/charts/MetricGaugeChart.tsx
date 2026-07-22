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

import { useId, useMemo } from 'react';
import { theme } from 'antd';

import type { MetricGaugeChartProps } from './index';

const DEFAULT_HEIGHT = 320;
const HEADER_HEIGHT = 44;

function formatNumber(value: number, fractionDigits = 2) {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
}

const MetricGaugeChart = ({
  title,
  color,
  valueFormatter = (value) => formatNumber(value),
  width,
  height = DEFAULT_HEIGHT,
  min = 0,
  max = 100,
  currentValue,
}: MetricGaugeChartProps) => {
  const { token } = theme.useToken();
  const gradientId = useId().replace(/:/g, '');
  const safeMax = max <= min ? min + 1 : max;
  const progress = Math.min(Math.max((currentValue - min) / (safeMax - min), 0), 1);
  const chartWidth = Math.max(width - 24, 160);
  const chartHeight = Math.max(height - HEADER_HEIGHT, 180);

  const { backgroundArc, valueArc, cx, cy, radius, strokeWidth } = useMemo(() => {
    const localCx = chartWidth / 2;
    const localCy = chartHeight * 0.72;
    const localRadius = Math.min(chartWidth * 0.34, chartHeight * 0.5);
    const angle = progress * 180;
    const endAngle = Math.PI - (angle * Math.PI) / 180;
    const arcX2 = localCx + localRadius * Math.cos(endAngle);
    const arcY2 = localCy - localRadius * Math.sin(endAngle);

    return {
      backgroundArc: `M ${localCx - localRadius} ${localCy} A ${localRadius} ${localRadius} 0 0 1 ${localCx + localRadius} ${localCy}`,
      valueArc:
        angle > 0
          ? `M ${localCx - localRadius} ${localCy} A ${localRadius} ${localRadius} 0 0 1 ${arcX2} ${arcY2}`
          : undefined,
      cx: localCx,
      cy: localCy,
      radius: localRadius,
      strokeWidth: Math.max(12, Math.min(18, chartWidth * 0.04)),
    };
  }, [chartHeight, chartWidth, progress]);

  return (
    <div className="flex flex-col gap-3" style={{ width }}>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium" style={{ color: token.colorTextHeading }}>
          {title}
        </span>
      </div>

      <div className="overflow-hidden rounded-md px-3 py-4" style={{ backgroundColor: token.colorFillQuaternary }}>
        <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={title}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={token.colorError} />
              <stop offset="55%" stopColor={token.colorWarning} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>

          <path
            d={backgroundArc}
            fill="none"
            stroke={token.colorBorderSecondary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {valueArc ? (
            <path
              d={valueArc}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          ) : null}

          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="28" fontWeight="600" fill={token.colorTextHeading}>
            {valueFormatter(currentValue)}
          </text>
          <text x={cx - radius} y={cy + 30} textAnchor="start" fontSize="12" fill={token.colorTextSecondary}>
            {valueFormatter(min)}
          </text>
          <text x={cx + radius} y={cy + 30} textAnchor="end" fontSize="12" fill={token.colorTextSecondary}>
            {valueFormatter(safeMax)}
          </text>
        </svg>
      </div>
    </div>
  );
};

export default MetricGaugeChart;
