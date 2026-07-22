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

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Select,
  Spin,
  Tag,
  Typography,
  theme,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, Line, LineChart, Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus, X } from 'lucide-react';

import {
  ExploreMetric,
  KarmadaComponentKey,
  LabelFilter,
  MetricCatalogItem,
} from '@/services/metrics';
import type { AggregationType, ChartType, PanelConfig } from '../dashboard-config';
import { generatePanelId } from '../dashboard-config';

const { Text } = Typography;

interface MetricExplorerProps {
  open: boolean;
  onClose: () => void;
  onAddToDashboard: (panel: PanelConfig) => void;
  catalog: MetricCatalogItem[];
  component: KarmadaComponentKey;
  pod: string;
}

const aggregationOptions = [
  { value: 'sum', label: 'Sum — total across all series' },
  { value: 'avg', label: 'Avg — average across series' },
  { value: 'max', label: 'Max — maximum value' },
  { value: 'min', label: 'Min — minimum value' },
  { value: 'rate', label: 'Rate — per-second rate of change' },
];

const chartTypeOptions: { value: ChartType; label: string }[] = [
  { value: 'line', label: '📈 Line' },
  { value: 'area', label: '📊 Area' },
  { value: 'bar', label: '📉 Bar' },
  { value: 'gauge', label: '🎯 Gauge' },
];

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function MetricExplorer({
  open,
  onClose,
  onAddToDashboard,
  catalog,
  component,
  pod,
}: MetricExplorerProps) {
  const { token } = theme.useToken();
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [aggregation, setAggregation] = useState<AggregationType>('sum');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [labelFilters, setLabelFilters] = useState<LabelFilter[]>([]);
  const [panelTitle, setPanelTitle] = useState('');

  // Reset when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectedMetric('');
      setAggregation('sum');
      setChartType('line');
      setLabelFilters([]);
      setPanelTitle('');
    }
  }, [open]);

  // Update chart type and title when metric changes
  useEffect(() => {
    if (selectedMetric) {
      const item = catalog.find((m) => m.name === selectedMetric);
      if (item) {
        setChartType(item.suggestedChart);
        setPanelTitle(item.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
      }
    }
  }, [selectedMetric, catalog]);

  const {
    data: exploreData,
    isLoading: exploring,
    error: exploreError,
  } = useQuery({
    queryKey: ['metricExplore', component, selectedMetric, aggregation, JSON.stringify(labelFilters), pod],
    queryFn: () =>
      ExploreMetric(component, {
        metric: selectedMetric,
        aggregation,
        labels: labelFilters.length > 0 ? labelFilters : undefined,
        window: '15m',
        pod,
      }),
    enabled: open && !!selectedMetric,
    refetchInterval: 10_000,
  });

  const availableLabels = useMemo(
    () => exploreData?.availableLabels ?? {},
    [exploreData?.availableLabels],
  );

  const addLabelFilter = useCallback(() => {
    const keys = Object.keys(availableLabels);
    if (keys.length === 0) return;
    setLabelFilters((prev) => [...prev, { key: keys[0], value: '' }]);
  }, [availableLabels]);

  const updateLabelFilter = useCallback((index: number, updates: Partial<LabelFilter>) => {
    setLabelFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
  }, []);

  const removeLabelFilter = useCallback((index: number) => {
    setLabelFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddToDashboard = () => {
    const panel: PanelConfig = {
      id: generatePanelId(),
      metricName: selectedMetric,
      chartType,
      title: panelTitle || selectedMetric,
      visible: true,
      query: {
        metric: selectedMetric,
        aggregation,
        labelFilters: labelFilters.filter((f) => f.key && f.value),
      },
    };
    onAddToDashboard(panel);
    onClose();
  };

  const renderPreviewChart = () => {
    if (!exploreData?.timeseries?.length) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data for this query" />;
    }

    const data = exploreData.timeseries.map((p) => ({
      timestamp: p.timestamp,
      value: p.value,
    }));

    const chartWidth = 520;
    const chartHeight = 200;
    const commonProps = {
      width: chartWidth,
      height: chartHeight,
      data,
      margin: { left: 4, right: 4, top: 6, bottom: 2 },
    };

    const xAxis = (
      <XAxis
        dataKey="timestamp"
        tickFormatter={formatTimestamp}
        minTickGap={28}
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 11, fill: token.colorTextTertiary }}
      />
    );
    const yAxis = (
      <YAxis
        width={54}
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 11, fill: token.colorTextTertiary }}
      />
    );
    const tooltip = (
      <Tooltip
        contentStyle={{
          borderRadius: 8,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgElevated,
        }}
        labelFormatter={(ts) => new Date(ts as string).toLocaleString()}
      />
    );
    const grid = <CartesianGrid vertical={false} strokeDasharray="2 6" stroke={token.colorBorderSecondary} />;

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}
          <Bar dataKey="value" fill={token.colorPrimary} fillOpacity={0.8} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      );
    }
    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}
          <Line type="monotoneX" dataKey="value" stroke={token.colorPrimary} dot={false} strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      );
    }
    // Default: area
    return (
      <AreaChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tooltip}
        <Area type="monotoneX" dataKey="value" stroke={token.colorPrimary} fill={token.colorPrimaryBg} strokeWidth={2} isAnimationActive={false} />
      </AreaChart>
    );
  };

  return (
    <Drawer
      title="Metric Explorer"
      open={open}
      onClose={onClose}
      width={640}
      extra={
        <Button
          type="primary"
          icon={<Plus size={14} />}
          disabled={!selectedMetric || !exploreData?.timeseries?.length}
          onClick={handleAddToDashboard}
        >
          Add to Dashboard
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Query Builder */}
        <Card size="small" title="Query Builder">
          <div className="space-y-3">
            {/* Metric selector */}
            <div>
              <Text type="secondary" className="text-xs block mb-1">Metric</Text>
              <Select
                showSearch
                placeholder="Search and select a metric..."
                optionFilterProp="label"
                value={selectedMetric || undefined}
                onChange={setSelectedMetric}
                style={{ width: '100%' }}
                options={catalog.map((m) => ({
                  value: m.name,
                  label: `${m.name} (${m.prometheusType})`,
                }))}
              />
              {selectedMetric && (
                <Text type="secondary" className="text-xs mt-1 block">
                  {catalog.find((m) => m.name === selectedMetric)?.help || ''}
                </Text>
              )}
            </div>

            {/* Aggregation */}
            <div>
              <Text type="secondary" className="text-xs block mb-1">Aggregation</Text>
              <Select
                value={aggregation}
                onChange={setAggregation}
                style={{ width: '100%' }}
                options={aggregationOptions}
              />
            </div>

            {/* Chart type */}
            <div>
              <Text type="secondary" className="text-xs block mb-1">Chart Type</Text>
              <Select
                value={chartType}
                onChange={setChartType}
                style={{ width: 200 }}
                options={chartTypeOptions}
              />
            </div>

            {/* Label filters */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Text type="secondary" className="text-xs">Label Filters</Text>
                <Button
                  size="small"
                  type="dashed"
                  icon={<Plus size={12} />}
                  onClick={addLabelFilter}
                  disabled={Object.keys(availableLabels).length === 0}
                >
                  Add Filter
                </Button>
              </div>
              {labelFilters.map((filter, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <Select
                    size="small"
                    value={filter.key}
                    onChange={(key) => updateLabelFilter(index, { key, value: '' })}
                    style={{ width: 160 }}
                    options={Object.keys(availableLabels).map((k) => ({ value: k, label: k }))}
                  />
                  <Text type="secondary">=</Text>
                  <Select
                    size="small"
                    value={filter.value || undefined}
                    onChange={(value) => updateLabelFilter(index, { value })}
                    style={{ width: 200 }}
                    placeholder="Select value..."
                    showSearch
                    options={(availableLabels[filter.key] ?? []).map((v) => ({ value: v, label: v }))}
                  />
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<X size={12} />}
                    onClick={() => removeLabelFilter(index)}
                  />
                </div>
              ))}
              {Object.keys(availableLabels).length === 0 && selectedMetric && !exploring && (
                <Text type="secondary" className="text-xs">No labels available for this metric</Text>
              )}
            </div>

            {/* Panel title */}
            <div>
              <Text type="secondary" className="text-xs block mb-1">Panel Title</Text>
              <Input
                value={panelTitle}
                onChange={(e) => setPanelTitle(e.target.value)}
                placeholder="Enter panel title..."
              />
            </div>
          </div>
        </Card>

        {/* Preview */}
        <Card
          size="small"
          title="Preview"
          extra={
            exploring ? <Spin size="small" /> : (
              exploreData?.timeseries?.length ? (
                <Tag color="green">{exploreData.timeseries.length} points</Tag>
              ) : null
            )
          }
        >
          {!selectedMetric ? (
            <div className="flex items-center justify-center h-[200px]">
              <Text type="secondary">Select a metric to preview</Text>
            </div>
          ) : exploring ? (
            <div className="flex items-center justify-center h-[200px]">
              <Spin />
            </div>
          ) : exploreError ? (
            <div className="flex items-center justify-center h-[200px]">
              <Text type="danger">Query failed: {(exploreError as Error).message}</Text>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md" style={{ background: token.colorFillQuaternary, padding: '8px' }}>
              {renderPreviewChart()}
            </div>
          )}
        </Card>

        {/* Active query summary */}
        {selectedMetric && exploreData && (
          <Card size="small" title="Query DSL">
            <pre className="text-xs overflow-auto" style={{ background: token.colorFillQuaternary, padding: 8, borderRadius: 6 }}>
{JSON.stringify(
  {
    metric: selectedMetric,
    aggregation,
    labelFilters: labelFilters.filter((f) => f.key && f.value),
    chartType,
  },
  null,
  2,
)}
            </pre>
          </Card>
        )}
      </div>
    </Drawer>
  );
}
