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

import axios from 'axios';
import _ from 'lodash';

let pathPrefix = window.__path_prefix__ || '';
if (!pathPrefix.startsWith('/')) {
  pathPrefix = '/' + pathPrefix;
}
if (!pathPrefix.endsWith('/')) {
  pathPrefix = pathPrefix + '/';
}

const metricsBaseURL: string = _.join(
  [pathPrefix, 'metrics-scraper/api/v1'],
  '',
);

export const metricsScraperClient = axios.create({
  baseURL: metricsBaseURL,
});

export const KARMADA_COMPONENTS = [
  { key: 'karmada-scheduler', label: 'Scheduler' },
  { key: 'karmada-controller-manager', label: 'Controller Manager' },
  { key: 'karmada-agent', label: 'Agent' },
  { key: 'karmada-aggregated-apiserver', label: 'Aggregated APIServer' },
  { key: 'karmada-apiserver', label: 'APIServer' },
  { key: 'karmada-descheduler', label: 'Descheduler' },
  { key: 'karmada-kube-controller-manager', label: 'Kube Controller Manager' },
  { key: 'karmada-metrics-adapter', label: 'Metrics Adapter' },
  { key: 'karmada-scheduler-estimator-member1', label: 'Scheduler Estimator (member1)' },
  { key: 'karmada-scheduler-estimator-member2', label: 'Scheduler Estimator (member2)' },
  { key: 'karmada-scheduler-estimator-member3', label: 'Scheduler Estimator (member3)' },
  { key: 'karmada-search', label: 'Search' },
  { key: 'karmada-webhook', label: 'Webhook' },
] as const;

export type KarmadaComponentKey = (typeof KARMADA_COMPONENTS)[number]['key'];

export interface MetricValue {
  labels?: Record<string, string>;
  value: string;
  measure: string;
}

export interface Metric {
  name: string;
  help: string;
  type: string;
  values?: MetricValue[];
}

export interface ParsedData {
  currentTime: string;
  metrics: Record<string, Metric>;
}

export interface VisualizationPoint {
  timestamp: string;
  value: number;
}

export interface SchedulerVisualizationMeta {
  appName: string;
  window: string;
  podMode: string;
  sampleIntervalSec: number;
  generatedAt: string;
}

export interface MetricInfo {
  name: string;
  type: string;
  suggestedChart: 'line' | 'area' | 'bar' | 'gauge';
}

export interface MetricCatalogItem {
  name: string;
  help: string;
  prometheusType: 'gauge' | 'counter' | 'histogram' | 'summary';
  suggestedChart: 'line' | 'area' | 'bar' | 'gauge';
  group: string;
}

export interface SchedulerVisualizationResponse {
  meta: SchedulerVisualizationMeta;
  timeseries: Record<string, VisualizationPoint[]>;
  pods: string[];
  warnings?: string[];
  availableMetrics?: MetricInfo[];
  metricsCatalog?: MetricCatalogItem[];
}

export interface ComponentPodsResponse {
  appName: string;
  pods: string[];
  warnings?: string[];
}

/** Response from GET /metrics/:app_name — maps pod name → parsed metrics snapshot */
export type ComponentMetricsResponse = Record<string, ParsedData>;

/** Response from GET /metrics?type=sync_status — maps component name → syncing */
export type SyncStatusResponse = Record<string, boolean>;

export async function GetComponentMetrics(
  appName: string,
): Promise<ComponentMetricsResponse> {
  const resp =
    await metricsScraperClient.get<ComponentMetricsResponse>(
      `/metrics/${appName}`,
    );
  return resp.data;
}

export async function GetSyncStatus(): Promise<SyncStatusResponse> {
  const resp = await metricsScraperClient.get<SyncStatusResponse>('/metrics', {
    params: { type: 'sync_status' },
  });
  return resp.data;
}

export async function SetComponentSync(
  appName: string | null,
  enabled: boolean,
): Promise<void> {
  const type = enabled ? 'sync_on' : 'sync_off';
  if (appName) {
    await metricsScraperClient.get(`/metrics/${appName}`, {
      params: { type },
    });
  } else {
    await metricsScraperClient.get('/metrics', { params: { type } });
  }
}

export async function GetSchedulerVisualization(
  appName: string,
  params?: {
    window?: string;
    pod?: string;
    refresh?: boolean;
    metrics?: string[];
  },
): Promise<SchedulerVisualizationResponse> {
  const queryParams: Record<string, string | boolean | undefined> = {
    window: params?.window,
    pod: params?.pod,
    refresh: params?.refresh,
  };
  if (params?.metrics?.length) {
    queryParams.metrics = params.metrics.join(',');
  }
  const resp =
    await metricsScraperClient.get<SchedulerVisualizationResponse>(
      `/metrics/${appName}/visualization`,
      { params: queryParams },
    );
  return resp.data;
}

export async function GetComponentPods(
  appName: string,
): Promise<ComponentPodsResponse> {
  const resp = await metricsScraperClient.get<ComponentPodsResponse>(
    `/metrics/${appName}/pods`,
  );
  return resp.data;
}

export interface LabelFilter {
  key: string;
  value: string;
}

export interface ExploreResponse {
  meta: {
    metric: string;
    aggregation: string;
    labels: LabelFilter[];
    window: string;
    podMode: string;
    generatedAt: string;
  };
  timeseries: VisualizationPoint[];
  availableLabels: Record<string, string[]>;
}

export async function ExploreMetric(
  appName: string,
  params: {
    metric: string;
    aggregation?: string;
    labels?: LabelFilter[];
    window?: string;
    pod?: string;
  },
): Promise<ExploreResponse> {
  const queryParams: Record<string, string | undefined> = {
    metric: params.metric,
    aggregation: params.aggregation,
    window: params.window,
    pod: params.pod,
  };
  if (params.labels?.length) {
    queryParams.labels = JSON.stringify(params.labels);
  }
  const resp = await metricsScraperClient.get<ExploreResponse>(
    `/metrics/${appName}/explore`,
    { params: queryParams },
  );
  return resp.data;
}

export interface MetricsDashboardPanel {
  id: string;
  metricName: string;
  chartType: 'line' | 'area' | 'bar' | 'gauge';
  title: string;
  visible: boolean;
  query?: {
    metric: string;
    aggregation: string;
    labelFilters?: { key: string; value: string }[];
  };
  order?: number;
}

export interface MetricsDashboard {
  version: number;
  component: string;
  panels: MetricsDashboardPanel[];
}

export interface MetricsDashboardConfigResponse {
  dashboards: MetricsDashboard[];
}

/** Fetch all persisted metrics dashboards (from the dashboard ConfigMap). */
export async function GetMetricsDashboards(): Promise<MetricsDashboard[]> {
  const resp = await metricsScraperClient.get<MetricsDashboardConfigResponse>(
    '/metrics-config',
  );
  return resp.data?.dashboards ?? [];
}

/** Persist (upsert) a single component's metrics dashboard to the ConfigMap. */
export async function SaveMetricsDashboard(
  dashboard: MetricsDashboard,
): Promise<MetricsDashboard[]> {
  const resp = await metricsScraperClient.put<MetricsDashboardConfigResponse>(
    '/metrics-config',
    { dashboard },
  );
  return resp.data?.dashboards ?? [];
}
