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

import MetricAreaChart from './MetricAreaChart';
import MetricBarChart from './MetricBarChart';
import MetricGaugeChart from './MetricGaugeChart';
import MetricLineChart from './MetricLineChart';

export interface MetricChartProps {
  data: Array<{ timestamp: string; value: number }>;
  title: string;
  color: string;
  valueFormatter?: (value: number) => string;
  axisFormatter?: (value: number) => string;
  width: number;
  height?: number;
}

export interface MetricGaugeChartProps extends MetricChartProps {
  min?: number;
  max?: number;
  currentValue: number;
}

export type ChartType = 'line' | 'area' | 'bar' | 'gauge';

export interface ChartFactoryProps extends MetricChartProps {
  chartType: ChartType;
  min?: number;
  max?: number;
  currentValue?: number;
}

function getLatestMetricValue(data: MetricChartProps['data']) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const point = data[index];
    if (typeof point?.value === 'number' && Number.isFinite(point.value)) {
      return point.value;
    }
  }
  return undefined;
}

export const ChartFactory = ({ chartType, currentValue, min, max, ...props }: ChartFactoryProps) => {
  switch (chartType) {
    case 'line':
      return <MetricLineChart {...props} />;
    case 'area':
      return <MetricAreaChart {...props} />;
    case 'bar':
      return <MetricBarChart {...props} />;
    case 'gauge':
      return (
        <MetricGaugeChart
          {...props}
          min={min}
          max={max}
          currentValue={currentValue ?? getLatestMetricValue(props.data) ?? 0}
        />
      );
    default:
      return null;
  }
};

export { default as MetricAreaChart } from './MetricAreaChart';
export { default as MetricBarChart } from './MetricBarChart';
export { default as MetricGaugeChart } from './MetricGaugeChart';
export { default as MetricLineChart } from './MetricLineChart';

export default ChartFactory;
