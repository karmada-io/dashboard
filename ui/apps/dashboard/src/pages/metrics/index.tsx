/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Card,
  Empty,
  Popconfirm,
  Select,
  Space,
  Tooltip as AntTooltip,
  Typography,
  message,
  theme,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

import Panel from '@/components/panel';
import { Icons } from '@/components/icons';
import {
  GetComponentPods,
  GetSchedulerVisualization,
  GetMetricsDashboards,
  KARMADA_COMPONENTS,
  KarmadaComponentKey,
  MetricCatalogItem,
  SchedulerVisualizationResponse,
} from '@/services/metrics';

import {
  DashboardToolbar,
  DragPanel,
  LazyChart,
  MetricExplorer,
  PanelEditor,
} from './components';
import {
  addPanel,
  buildDefaultConfig,
  getConfiguredMetricNames,
  getDefaultMetricNamesForComponent,
  removePanel,
  reorderPanels,
  resetDashboardConfig,
  selectDefaultCatalogMetrics,
  serializeComponentDashboardConfig,
  saveDashboardConfig,
  updatePanel,
  type DashboardConfig,
  type PanelConfig,
} from './dashboard-config';
import styles from './index.module.less';

const { Title, Text } = Typography;

const defaultWindow = '15m';

type ChartType = 'line' | 'area' | 'bar' | 'gauge';

type SeriesKey = string;

interface ChartPointRow {
  timestamp: string;
  [key: string]: string | number | undefined;
}

interface ChartConfig {
  key: SeriesKey;
  title: string;
  color: string;
  chart: ChartType;
  panelId?: string;
  valueFormatter?: (value: number) => string;
  axisFormatter?: (value: number) => string;
}

const CHART_COLORS = [
  '#2f6fdf',
  '#16877a',
  '#b86f28',
  '#7161c9',
  '#bf4f7f',
  '#2f8b57',
  '#bd4d46',
  '#7a63d2',
  '#178ea7',
  '#c28722',
  '#bd5f95',
  '#229c8c',
  '#c66c2d',
];

function formatNumber(value: number, fractionDigits = 3) {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
  });
}

function formatOps(value: number) {
  if (!Number.isFinite(value)) return '0 ops/s';
  return `${formatNumber(value)} ops/s`;
}

function shortOps(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return formatNumber(value, 1);
}

function getAutoFormatter(metricName: string): {
  valueFormatter?: (v: number) => string;
  axisFormatter?: (v: number) => string;
} {
  if (metricName.includes('_bytes'))
    return { valueFormatter: formatBytes, axisFormatter: shortBytes };
  if (metricName.includes('_seconds') || metricName.includes('_duration')) {
    return { valueFormatter: formatSeconds, axisFormatter: shortSeconds };
  }
  if (metricName.endsWith('_total') || metricName.includes('Rate')) {
    return { valueFormatter: formatOps, axisFormatter: shortOps };
  }
  return {};
}

function metricNameToTitle(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function shortBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}G`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return formatNumber(bytes, 0);
}

function formatSeconds(value: number) {
  if (!Number.isFinite(value)) return '0 s';
  if (value < 0.001) return `${(value * 1000).toFixed(2)} ms`;
  if (value < 1) return `${(value * 1000).toFixed(1)} ms`;
  return `${value.toFixed(3)} s`;
}

function shortSeconds(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (value < 0.001) return `${(value * 1000).toFixed(1)}ms`;
  if (value < 1) return `${(value * 1000).toFixed(0)}ms`;
  return `${value.toFixed(2)}s`;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDateTime(value: string | number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function mapVisualizationRows(
  data?: SchedulerVisualizationResponse,
): ChartPointRow[] {
  if (!data?.timeseries) return [];

  const rowMap = new Map<string, ChartPointRow>();

  Object.entries(data.timeseries).forEach(([seriesName, points]) => {
    if (!Array.isArray(points) || points.length === 0) return;

    points.forEach((point) => {
      const row = rowMap.get(point.timestamp) ?? { timestamp: point.timestamp };
      row[seriesName] = point.value;
      rowMap.set(point.timestamp, row);
    });
  });

  return Array.from(rowMap.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
}

function getLatestSeriesValue(rows: ChartPointRow[], key: SeriesKey) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const value = rows[i][key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function getSeriesBounds(rows: ChartPointRow[], key: SeriesKey) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  rows.forEach((row) => {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  });

  if (min === Number.POSITIVE_INFINITY || max === Number.NEGATIVE_INFINITY) {
    return undefined;
  }
  return { min, max };
}

function buildChartConfigFromCatalog(
  item: MetricCatalogItem,
  index: number,
): ChartConfig {
  const formatters = getAutoFormatter(item.name);
  return {
    key: item.name,
    title: metricNameToTitle(item.name),
    color: CHART_COLORS[index % CHART_COLORS.length],
    chart: item.suggestedChart,
    valueFormatter: formatters.valueFormatter,
    axisFormatter: formatters.axisFormatter,
  };
}

const MetricsPage = () => {
  const queryClient = useQueryClient();
  const { token } = theme.useToken();

  const [activeComponent, setActiveComponent] = useState<KarmadaComponentKey>(
    KARMADA_COMPONENTS[0].key,
  );
  const [visualizationPod, setVisualizationPod] = useState<string>('all');
  const [hasInitializedPodSelection, setHasInitializedPodSelection] =
    useState<boolean>(false);
  const [editMode, setEditMode] = useState(false);
  // "committedConfig" drives API queries; "draftConfig" is used during editing
  const [committedConfig, setCommittedConfig] =
    useState<DashboardConfig | null>(null);
  const [draftConfig, setDraftConfig] = useState<DashboardConfig | null>(null);
  const [panelEditorOpen, setPanelEditorOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<PanelConfig | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);

  // The active config for rendering panels (draft in edit mode, committed otherwise)
  const dashboardConfig = editMode ? draftConfig : committedConfig;

  // Metrics display follows the backend config (ConfigMap). Fetch all persisted
  // component dashboards; the active component's dashboard drives the layout.
  const { data: remoteDashboards } = useQuery({
    queryKey: ['metricsDashboards'],
    queryFn: GetMetricsDashboards,
  });

  const editModeRef = useRef(editMode);
  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);

  useEffect(() => {
    // Only re-apply the remote config on component switch or when the backend
    // config changes — never merely because edit mode toggled (that would drop
    // in-session edits). Skip while actively editing to avoid clobbering.
    if (editModeRef.current) return;
    const remote = remoteDashboards?.find(
      (item) => item.component === activeComponent,
    );
    const config = remote ? (remote as DashboardConfig) : null;
    setCommittedConfig(config);
    setDraftConfig(config);
    setPanelEditorOpen(false);
    setEditingPanel(null);
  }, [activeComponent, remoteDashboards]);

  // API queries are driven ONLY by committedConfig (not draft)
  const configuredMetrics = useMemo(
    () =>
      committedConfig ? getConfiguredMetricNames(committedConfig) : undefined,
    [committedConfig],
  );
  const configuredMetricsKey = configuredMetrics?.join(',') ?? 'default';

  const {
    data: visualizationData,
    isLoading: visualizationLoading,
    error: visualizationError,
  } = useQuery({
    queryKey: [
      'componentVisualization',
      activeComponent,
      visualizationPod,
      defaultWindow,
      configuredMetricsKey,
    ],
    queryFn: () =>
      GetSchedulerVisualization(activeComponent, {
        window: defaultWindow,
        pod: visualizationPod,
        refresh: false,
        metrics: configuredMetrics,
      }),
    enabled: !!activeComponent,
    refetchInterval: 10_000,
  });

  const { data: podScopeData } = useQuery({
    queryKey: ['componentPodScope', activeComponent],
    queryFn: () => GetComponentPods(activeComponent),
    enabled: !!activeComponent,
    refetchInterval: 10_000,
  });

  const refreshVisualizationMutation = useMutation({
    mutationFn: () =>
      GetSchedulerVisualization(activeComponent, {
        window: defaultWindow,
        pod: visualizationPod,
        refresh: true,
        metrics: configuredMetrics,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'componentVisualization',
          activeComponent,
          visualizationPod,
          defaultWindow,
        ],
      });
    },
  });

  const visualizationRows = useMemo(
    () => mapVisualizationRows(visualizationData),
    [visualizationData],
  );

  const visualizationPods = useMemo(
    () => podScopeData?.pods ?? visualizationData?.pods ?? [],
    [podScopeData, visualizationData],
  );

  const activeComponentLabel = useMemo(
    () =>
      KARMADA_COMPONENTS.find((item) => item.key === activeComponent)?.label ??
      activeComponent,
    [activeComponent],
  );

  const generatedAtLabel = visualizationData?.meta?.generatedAt
    ? formatDateTime(visualizationData.meta.generatedAt)
    : 'Waiting for data';

  const sampleIntervalLabel = visualizationData?.meta?.sampleIntervalSec
    ? `${visualizationData.meta.sampleIntervalSec}s`
    : '--';

  useEffect(() => {
    if (committedConfig || draftConfig) return;
    if (!visualizationData?.metricsCatalog?.length) return;
    if (visualizationData.meta.appName !== activeComponent) return;

    const config = buildDefaultConfig(
      activeComponent,
      visualizationData.metricsCatalog,
    );
    saveDashboardConfig(config);
    setCommittedConfig(config);
    setDraftConfig(config);
  }, [activeComponent, committedConfig, draftConfig, visualizationData]);

  useEffect(() => {
    if (hasInitializedPodSelection || visualizationPods.length === 0) return;
    setVisualizationPod(visualizationPods[0]);
    setHasInitializedPodSelection(true);
  }, [hasInitializedPodSelection, visualizationPods]);

  useEffect(() => {
    if (visualizationPod === 'all' || visualizationPods.length === 0) return;
    if (!visualizationPods.includes(visualizationPod)) {
      setVisualizationPod(visualizationPods[0]);
    }
  }, [visualizationPod, visualizationPods]);

  const seriesKeysWithData = useMemo(() => {
    if (!visualizationData?.timeseries) return [] as SeriesKey[];
    return Object.keys(visualizationData.timeseries).filter(
      (key) => (visualizationData.timeseries[key] ?? []).length > 0,
    );
  }, [visualizationData]);

  const handleAddPanels = (panels: PanelConfig[]) => {
    if (panels.length === 0) return;
    const catalog = visualizationData?.metricsCatalog ?? [];
    let config = draftConfig ?? buildDefaultConfig(activeComponent, catalog);
    for (const panel of panels) {
      config = addPanel(config, panel);
    }
    setDraftConfig(config);
    if (!editMode) {
      setCommittedConfig(config);
    }
  };

  const handleUpdatePanel = (panel: PanelConfig) => {
    if (!draftConfig) return;
    const updated = updatePanel(draftConfig, panel.id, panel);
    setDraftConfig(updated);
    if (!editMode) {
      setCommittedConfig(updated);
    }
  };

  const handleDeletePanel = (panelId: string) => {
    if (!draftConfig) return;
    const updated = removePanel(draftConfig, panelId);
    setDraftConfig(updated);
    if (!editMode) {
      setCommittedConfig(updated);
    }
  };

  const handleResetConfig = () => {
    resetDashboardConfig(activeComponent);
    setCommittedConfig(null);
    setDraftConfig(null);
    setEditMode(false);
  };

  const handleSavePanel = (panels: PanelConfig[]) => {
    if (editingPanel) {
      if (panels[0]) handleUpdatePanel(panels[0]);
    } else {
      handleAddPanels(panels);
    }
    setEditingPanel(null);
  };

  const handleEnterEditMode = useCallback(() => {
    if (!draftConfig && visualizationData?.metricsCatalog?.length) {
      const config = buildDefaultConfig(
        activeComponent,
        visualizationData.metricsCatalog,
      );
      saveDashboardConfig(config);
      setDraftConfig(config);
      setCommittedConfig(config);
    }
    setEditMode(true);
  }, [draftConfig, visualizationData, activeComponent]);

  const handleExitEditMode = useCallback(() => {
    // Commit draft to storage and update committed state
    if (draftConfig) {
      saveDashboardConfig(draftConfig);
      setCommittedConfig(draftConfig);
    }
    setEditMode(false);
  }, [draftConfig]);

  // Copy the active component layout so it can be reviewed or pasted into the
  // dashboard ConfigMap. Draft edits take precedence while edit mode is open.
  const [exporting, setExporting] = useState(false);

  const handleCopyComponentConfig = useCallback(async () => {
    const current =
      draftConfig ??
      committedConfig ??
      buildDefaultConfig(
        activeComponent,
        visualizationData?.metricsCatalog ?? [],
      );
    const text = serializeComponentDashboardConfig(current);
    setExporting(true);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      message.success(
        `Copied ${current.component} metrics JSON (${current.panels.length} panels)`,
      );
    } catch (err) {
      message.error(`Failed to copy configuration: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  }, [draftConfig, committedConfig, activeComponent, visualizationData]);

  const handleExplorerAddPanel = useCallback(
    (panel: PanelConfig) => {
      const catalog = visualizationData?.metricsCatalog ?? [];
      const config =
        draftConfig ??
        committedConfig ??
        buildDefaultConfig(activeComponent, catalog);
      const updated = addPanel(config, panel);
      saveDashboardConfig(updated);
      setDraftConfig(updated);
      setCommittedConfig(updated);
    },
    [draftConfig, committedConfig, activeComponent, visualizationData],
  );

  // DnD sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !draftConfig) return;

      const oldIndex = draftConfig.panels.findIndex((p) => p.id === active.id);
      const newIndex = draftConfig.panels.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newPanels = [...draftConfig.panels];
      const [moved] = newPanels.splice(oldIndex, 1);
      newPanels.splice(newIndex, 0, moved);

      const updated = reorderPanels(draftConfig, newPanels);
      setDraftConfig(updated);
    },
    [draftConfig],
  );

  const panelIds = useMemo(
    () =>
      (dashboardConfig?.panels ?? []).filter((p) => p.visible).map((p) => p.id),
    [dashboardConfig],
  );

  const visibleCharts = useMemo((): ChartConfig[] => {
    if (dashboardConfig?.panels?.length) {
      return dashboardConfig.panels
        .filter((panel) => panel.visible)
        .map((panel, idx) => {
          const formatters = getAutoFormatter(panel.metricName);
          return {
            key: panel.metricName,
            title: panel.title,
            color: CHART_COLORS[idx % CHART_COLORS.length],
            chart: panel.chartType as ChartType,
            panelId: panel.id,
            valueFormatter: formatters.valueFormatter,
            axisFormatter: formatters.axisFormatter,
          };
        });
    }

    if (visualizationData?.metricsCatalog?.length) {
      const keysWithData = new Set(seriesKeysWithData);
      return selectDefaultCatalogMetrics(
        activeComponent,
        visualizationData.metricsCatalog,
      )
        .filter((item) => keysWithData.has(item.name))
        .map((item, idx) => buildChartConfigFromCatalog(item, idx));
    }

    const defaultMetricNames = new Set(
      getDefaultMetricNamesForComponent(activeComponent),
    );
    return seriesKeysWithData
      .filter((key) => defaultMetricNames.has(key))
      .map((key, idx) => {
        const formatters = getAutoFormatter(key);
        return {
          key,
          title: metricNameToTitle(key),
          color: CHART_COLORS[idx % CHART_COLORS.length],
          chart: 'line' as ChartType,
          valueFormatter: formatters.valueFormatter,
          axisFormatter: formatters.axisFormatter,
        };
      });
  }, [activeComponent, seriesKeysWithData, visualizationData, dashboardConfig]);

  const visualizationErrorDescription = useMemo(() => {
    if (!visualizationError) return null;

    if (axios.isAxiosError(visualizationError)) {
      const status = visualizationError.response?.status;
      if (status === 400) {
        return 'Invalid query parameters. Check selected component, pod mode, and window.';
      }
      if (status === 502) {
        return 'Failed to reach upstream metrics endpoint. Verify proxy endpoint and component service.';
      }
      if (status === 503) {
        return 'No usable metrics in the selected window. Wait for new samples or switch pod scope.';
      }
    }

    return (visualizationError as Error).message;
  }, [visualizationError]);

  const isNoDataError = useMemo(() => {
    if (!visualizationError) return false;
    return (
      axios.isAxiosError(visualizationError) &&
      visualizationError.response?.status === 503
    );
  }, [visualizationError]);

  const renderGauge = (
    config: ChartConfig,
    currentValue: number,
    bounds: { min: number; max: number } | undefined,
  ) => {
    const min = bounds?.min ?? 0;
    const max = bounds?.max ?? (currentValue * 1.5 || 100);
    const ratio =
      max > min ? Math.min((currentValue - min) / (max - min), 1) : 0;
    const angle = ratio * 180;
    const valueFormatter =
      config.valueFormatter ?? ((v: number) => formatNumber(v));

    const cx = 120;
    const cy = 100;
    const r = 80;
    const startAngle = Math.PI;
    const endAngle = Math.PI - (angle * Math.PI) / 180;

    const arcX1 = cx + r * Math.cos(startAngle);
    const arcY1 = cy - r * Math.sin(startAngle);
    const arcX2 = cx + r * Math.cos(endAngle);
    const arcY2 = cy - r * Math.sin(endAngle);
    const largeArc = angle > 180 ? 1 : 0;

    return (
      <div className="flex flex-col items-center justify-center h-[240px]">
        <svg width="240" height="140" viewBox="0 0 240 140">
          {/* Background arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={token.colorBorderSecondary}
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Value arc */}
          {angle > 0 && (
            <path
              d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 ${largeArc} 1 ${arcX2} ${arcY2}`}
              fill="none"
              stroke={config.color}
              strokeWidth="12"
              strokeLinecap="round"
            />
          )}
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill={token.colorText}
          >
            {valueFormatter(currentValue)}
          </text>
          <text
            x={cx - r}
            y={cy + 28}
            textAnchor="start"
            fontSize="10"
            fill={token.colorTextTertiary}
          >
            {valueFormatter(min)}
          </text>
          <text
            x={cx + r}
            y={cy + 28}
            textAnchor="end"
            fontSize="10"
            fill={token.colorTextTertiary}
          >
            {valueFormatter(max)}
          </text>
        </svg>
      </div>
    );
  };

  const renderChartContent = (config: ChartConfig) => {
    const gradientId = `series-gradient-${config.key}`;

    if (config.chart === 'gauge') {
      const latestValue = getLatestSeriesValue(visualizationRows, config.key);
      const bounds = getSeriesBounds(visualizationRows, config.key);
      return renderGauge(config, latestValue ?? 0, bounds);
    }

    if (config.chart === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={visualizationRows}
            margin={{ left: 4, right: 8, top: 10, bottom: 2 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="2 6"
              stroke={token.colorBorderSecondary}
            />
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
              tickFormatter={
                config.axisFormatter ?? ((value) => formatNumber(value, 1))
              }
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: token.colorTextTertiary }}
            />
            <Tooltip
              cursor={{ fill: token.colorFillQuaternary }}
              contentStyle={{
                borderRadius: 10,
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: token.boxShadowSecondary,
                background: token.colorBgElevated,
              }}
              labelStyle={{ color: token.colorTextSecondary, fontSize: 12 }}
              labelFormatter={(ts) => formatDateTime(ts as string)}
              formatter={(value) => {
                const numericValue =
                  typeof value === 'number' ? value : Number(value);
                return [
                  (config.valueFormatter ?? formatNumber)(numericValue),
                  config.title,
                ];
              }}
            />
            <Bar
              dataKey={config.key}
              fill={config.color}
              fillOpacity={0.82}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (config.chart === 'line') {
      return (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={visualizationRows}
            margin={{ left: 4, right: 8, top: 10, bottom: 2 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="2 6"
              stroke={token.colorBorderSecondary}
            />
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
              tickFormatter={
                config.axisFormatter ?? ((value) => formatNumber(value, 1))
              }
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: token.colorTextTertiary }}
            />
            <Tooltip
              cursor={{ stroke: token.colorBorder, strokeDasharray: '4 4' }}
              contentStyle={{
                borderRadius: 10,
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: token.boxShadowSecondary,
                background: token.colorBgElevated,
              }}
              labelStyle={{ color: token.colorTextSecondary, fontSize: 12 }}
              labelFormatter={(ts) => formatDateTime(ts as string)}
              formatter={(value) => {
                const numericValue =
                  typeof value === 'number' ? value : Number(value);
                return [
                  (config.valueFormatter ?? formatNumber)(numericValue),
                  config.title,
                ];
              }}
            />
            <Line
              type="monotoneX"
              dataKey={config.key}
              stroke={config.color}
              dot={false}
              activeDot={{
                r: 4,
                fill: config.color,
                stroke: token.colorBgContainer,
                strokeWidth: 2,
              }}
              strokeWidth={2.4}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Default: area chart
    return (
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={visualizationRows}
          margin={{ left: 4, right: 8, top: 10, bottom: 2 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity={0.24} />
              <stop offset="65%" stopColor={config.color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="2 6"
            stroke={token.colorBorderSecondary}
          />
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
            tickFormatter={
              config.axisFormatter ?? ((value) => formatNumber(value, 1))
            }
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: token.colorTextTertiary }}
          />
          <Tooltip
            cursor={{ stroke: token.colorBorder, strokeDasharray: '4 4' }}
            contentStyle={{
              borderRadius: 10,
              border: `1px solid ${token.colorBorderSecondary}`,
              boxShadow: token.boxShadowSecondary,
              background: token.colorBgElevated,
            }}
            labelStyle={{ color: token.colorTextSecondary, fontSize: 12 }}
            labelFormatter={(ts) => formatDateTime(ts as string)}
            formatter={(value) => {
              const numericValue =
                typeof value === 'number' ? value : Number(value);
              return [
                (config.valueFormatter ?? formatNumber)(numericValue),
                config.title,
              ];
            }}
          />
          <Area
            type="monotoneX"
            dataKey={config.key}
            stroke={config.color}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            strokeWidth={2.4}
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderChartCard = (config: ChartConfig) => {
    const latestValue = getLatestSeriesValue(visualizationRows, config.key);
    const valueFormatter =
      config.valueFormatter ?? ((value: number) => formatNumber(value));
    const bounds = getSeriesBounds(visualizationRows, config.key);
    const panel = config.panelId
      ? dashboardConfig?.panels.find((item) => item.id === config.panelId)
      : undefined;

    return (
      <Card
        key={config.panelId ?? config.key}
        size="small"
        variant="borderless"
        className={styles.chartCard}
        title={
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleRow}>
              <Space size={8} className={styles.chartName}>
                <Text strong className={styles.chartTitle}>
                  {config.title}
                </Text>
              </Space>
              <Text className={styles.latestValue}>
                {typeof latestValue === 'number'
                  ? valueFormatter(latestValue)
                  : '--'}
              </Text>
            </div>
            {bounds ? (
              <Text type="secondary" className={styles.chartRange}>
                {valueFormatter(bounds.min)} to {valueFormatter(bounds.max)}
              </Text>
            ) : null}
          </div>
        }
      >
        {editMode && panel ? (
          <Space size="small" className={styles.panelActions}>
            <Button
              size="small"
              type="text"
              onClick={() => {
                setEditingPanel(panel);
                setPanelEditorOpen(true);
              }}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete this panel?"
              onConfirm={() => handleDeletePanel(panel.id)}
            >
              <Button size="small" type="text" danger>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ) : null}
        {visualizationRows.length === 0 ? (
          <LazyChart height={252} loading={visualizationLoading}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No samples in this window"
            />
          </LazyChart>
        ) : (
          <LazyChart height={252} loading={visualizationLoading}>
            <div className={styles.chartCanvas}>
              {renderChartContent(config)}
            </div>
          </LazyChart>
        )}
      </Card>
    );
  };

  return (
    <Panel>
      <main className={styles.metricsPage}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <Text className={styles.eyebrow}>Karmada telemetry</Text>
            <Title level={2} className={styles.pageTitle}>
              Control plane metrics
            </Title>
            <div className={styles.heroMeta}>
              <span>{activeComponentLabel}</span>
              <span>
                {visualizationPod === 'all' ? 'All pods' : visualizationPod}
              </span>
              <span>{generatedAtLabel}</span>
            </div>
          </div>

          <div className={styles.heroActions}>
            <AntTooltip title="Refresh now">
              <Button
                icon={<Icons.spinner size={14} />}
                size="middle"
                className={styles.refreshButton}
                loading={refreshVisualizationMutation.isPending}
                onClick={() => refreshVisualizationMutation.mutate()}
              />
            </AntTooltip>
            <DashboardToolbar
              editMode={editMode}
              hasCustomConfig={!!committedConfig}
              onToggleEdit={() => {
                if (editMode) {
                  handleExitEditMode();
                } else {
                  handleEnterEditMode();
                }
              }}
              onAddPanel={() => {
                setEditingPanel(null);
                setPanelEditorOpen(true);
              }}
              onReset={handleResetConfig}
              onExplore={() => setExplorerOpen(true)}
              onCopy={handleCopyComponentConfig}
              exporting={exporting}
            />
          </div>
        </section>

        <Card size="small" variant="borderless" className={styles.scopeCard}>
          <div className={styles.scopeGrid}>
            <label className={styles.controlField}>
              <Text strong className={styles.controlLabel}>
                Component
              </Text>
              <Select
                size="middle"
                variant="filled"
                showSearch={{ optionFilterProp: 'label' }}
                value={activeComponent}
                options={KARMADA_COMPONENTS.map((item) => ({
                  value: item.key,
                  label: item.label,
                }))}
                className={styles.componentSelect}
                onChange={(value) => {
                  setActiveComponent(value as KarmadaComponentKey);
                  setVisualizationPod('all');
                  setHasInitializedPodSelection(false);
                  setEditMode(false);
                }}
              />
            </label>

            <label className={styles.controlField}>
              <Text strong className={styles.controlLabel}>
                Window
              </Text>
              <Select
                size="middle"
                variant="filled"
                value={defaultWindow}
                disabled
                options={[{ label: '15 minutes', value: defaultWindow }]}
                className={styles.windowSelect}
              />
            </label>

            <label className={styles.controlField}>
              <Text strong className={styles.controlLabel}>
                Pod
              </Text>
              <Select
                size="middle"
                variant="filled"
                showSearch={{ optionFilterProp: 'label' }}
                value={visualizationPod}
                className={styles.podSelect}
                options={[
                  { label: 'All pods (sum)', value: 'all' },
                  ...visualizationPods.map((pod) => ({
                    label: pod,
                    value: pod,
                  })),
                ]}
                onChange={(value) => setVisualizationPod(value)}
              />
            </label>

            <div className={styles.scopeMeta}>
              {visualizationData?.meta?.sampleIntervalSec ? (
                <Text type="secondary" className={styles.metaLine}>
                  Sample interval: {visualizationData.meta.sampleIntervalSec}s
                </Text>
              ) : null}
              {visualizationData?.meta?.generatedAt ? (
                <Text type="secondary" className={styles.metaLine}>
                  Last fetched: {formatDateTime(visualizationData.meta.generatedAt)}
                </Text>
              ) : null}
            </div>
          </div>
        </Card>

        <section className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>Panels</Text>
            <Text className={styles.summaryValue}>{visibleCharts.length}</Text>
          </div>
          <div className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>Pods</Text>
            <Text className={styles.summaryValue}>
              {visualizationPods.length || '--'}
            </Text>
          </div>
          <div className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>Sample</Text>
            <Text className={styles.summaryValue}>{sampleIntervalLabel}</Text>
          </div>
          <div className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>Window</Text>
            <Text className={styles.summaryValue}>15m</Text>
          </div>
        </section>

        {visualizationData?.warnings?.length ? (
          <Alert
            type="warning"
            className={styles.inlineAlert}
            title="Partial data detected"
            description={visualizationData.warnings.join(' ')}
          />
        ) : null}

        <section className={styles.metricsSection}>
          {visualizationError && !isNoDataError ? (
            <Alert
              type="error"
              className={styles.inlineAlert}
              title={`Failed to load ${activeComponent} visualization`}
              description={visualizationErrorDescription}
              action={
                <Button
                  size="small"
                  onClick={() => refreshVisualizationMutation.mutate()}
                >
                  Retry now
                </Button>
              }
            />
          ) : isNoDataError ? (
            <Card
              size="small"
              variant="borderless"
              className={styles.emptyCard}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No metrics available in the selected window. Wait for new samples or switch pod scope."
              >
                <Button
                  size="small"
                  onClick={() => refreshVisualizationMutation.mutate()}
                >
                  Refresh
                </Button>
              </Empty>
            </Card>
          ) : (
            <div className="space-y-4">
              {visibleCharts.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={panelIds}
                    strategy={rectSortingStrategy}
                  >
                    <div className={styles.chartGrid}>
                      {visibleCharts.map((chart) => (
                        <DragPanel
                          key={chart.panelId ?? chart.key}
                          id={chart.panelId ?? chart.key}
                          disabled={!editMode}
                        >
                          {renderChartCard(chart)}
                        </DragPanel>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <Card
                  size="small"
                  variant="borderless"
                  className={styles.emptyCard}
                >
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No chartable metric series for this scope."
                  />
                </Card>
              )}
            </div>
          )}
        </section>
        <PanelEditor
          open={panelEditorOpen}
          onClose={() => {
            setPanelEditorOpen(false);
            setEditingPanel(null);
          }}
          onSave={handleSavePanel}
          catalog={visualizationData?.metricsCatalog ?? []}
          editingPanel={editingPanel}
          existingMetricNames={(dashboardConfig?.panels ?? []).map((p) => p.metricName)}
        />
        <MetricExplorer
          open={explorerOpen}
          onClose={() => setExplorerOpen(false)}
          onAddToDashboard={handleExplorerAddPanel}
          catalog={visualizationData?.metricsCatalog ?? []}
          component={activeComponent}
          pod={visualizationPod}
        />
      </main>
    </Panel>
  );
};

export default MetricsPage;
