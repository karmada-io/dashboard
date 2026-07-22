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

import type {
  KarmadaComponentKey,
  MetricCatalogItem,
} from '@/services/metrics';

export type ChartType = 'line' | 'area' | 'bar' | 'gauge';
export type AggregationType = 'sum' | 'avg' | 'max' | 'min' | 'rate';

export interface LabelFilter {
  key: string;
  value: string;
}

export interface MetricQuery {
  metric: string;
  aggregation: AggregationType;
  labelFilters?: LabelFilter[];
}

export interface PanelConfig {
  id: string;
  metricName: string;
  chartType: ChartType;
  title: string;
  visible: boolean;
  query?: MetricQuery;
  /** Grid position (order index) */
  order?: number;
}

export interface DashboardConfig {
  version: number;
  component: string;
  panels: PanelConfig[];
}

const STORAGE_PREFIX = 'karmada-metrics-dashboard:';
const CONFIG_VERSION = 1;
const DEFAULT_PANEL_LIMIT = 12;

/**
 * Ordered, component-specific defaults. Only metrics in both this allowlist
 * and the live catalog become automatic panels. Runtime/process metrics stay
 * available in the catalog so an explicit user configuration can add them.
 */
export const DEFAULT_METRIC_NAMES_BY_COMPONENT = {
  'karmada-scheduler': [
    'karmada_scheduler_schedule_attempts_total',
    'karmada_scheduler_queue_incoming_bindings_total',
    'karmada_scheduler_e2e_scheduling_duration_seconds',
    'karmada_scheduler_scheduling_algorithm_duration_seconds',
    'karmada_scheduler_framework_extension_point_duration_seconds',
    'karmada_scheduler_plugin_execution_duration_seconds',
    'scheduler_pending_bindings',
    'leader_election_master_status',
    'workqueue_depth',
    'workqueue_retries_total',
    'workqueue_longest_running_processor_seconds',
    'karmada_build_info',
  ],
  'karmada-controller-manager': [
    'cluster_ready_state',
    'cluster_ready_node_number',
    'cluster_node_number',
    'cluster_cpu_allocatable_number',
    'cluster_cpu_allocated_number',
    'cluster_memory_allocatable_bytes',
    'cluster_memory_allocated_bytes',
    'cluster_pod_allocatable_number',
    'cluster_pod_allocated_number',
    'cluster_sync_status_duration_seconds',
    'policy_apply_attempts_total',
    'resource_apply_policy_duration_seconds',
  ],
  'karmada-agent': [
    'cluster_ready_state',
    'cluster_ready_node_number',
    'cluster_node_number',
    'cluster_cpu_allocatable_number',
    'cluster_cpu_allocated_number',
    'cluster_memory_allocatable_bytes',
    'cluster_memory_allocated_bytes',
    'cluster_pod_allocatable_number',
    'cluster_pod_allocated_number',
    'cluster_sync_status_duration_seconds',
    'sync_workload_duration_seconds',
    'workqueue_depth',
  ],
  'karmada-aggregated-apiserver': [
    'apiserver_request_total',
    'apiserver_request_duration_seconds',
    'apiserver_current_inflight_requests',
    'apiserver_longrunning_requests',
    'apiserver_request_sli_duration_seconds',
    'apiserver_response_sizes',
    'apiserver_storage_objects',
    'apiserver_storage_size_bytes',
    'apiserver_storage_db_total_size_in_bytes',
    'apiserver_tls_handshake_errors_total',
    'apiserver_delegated_authz_request_total',
    'apiserver_delegated_authz_request_duration_seconds',
  ],
  'karmada-apiserver': [
    'apiserver_request_total',
    'apiserver_request_duration_seconds',
    'apiserver_current_inflight_requests',
    'apiserver_current_inqueue_requests',
    'apiserver_longrunning_requests',
    'apiserver_flowcontrol_current_executing_requests',
    'apiserver_flowcontrol_current_inqueue_requests',
    'apiserver_flowcontrol_request_wait_duration_seconds',
    'apiserver_admission_controller_admission_duration_seconds',
    'apiserver_storage_objects',
    'apiserver_storage_size_bytes',
    'apiserver_tls_handshake_errors_total',
  ],
  'karmada-descheduler': [
    'leader_election_master_status',
    'workqueue_depth',
    'workqueue_adds_total',
    'workqueue_retries_total',
    'workqueue_queue_duration_seconds',
    'workqueue_work_duration_seconds',
    'workqueue_longest_running_processor_seconds',
    'workqueue_unfinished_work_seconds',
    'karmada_build_info',
  ],
  'karmada-kube-controller-manager': [
    'node_collector_update_all_nodes_health_duration_seconds',
    'node_collector_update_node_health_duration_seconds',
    'garbagecollector_controller_resources_sync_error_total',
    'ttl_after_finished_controller_job_deletion_duration_seconds',
    'leader_election_master_status',
    'workqueue_depth',
    'workqueue_adds_total',
    'workqueue_retries_total',
    'workqueue_longest_running_processor_seconds',
    'workqueue_unfinished_work_seconds',
  ],
  'karmada-metrics-adapter': [
    'apiserver_request_total',
    'apiserver_request_duration_seconds',
    'apiserver_request_sli_duration_seconds',
    'apiserver_request_slo_duration_seconds',
    'apiserver_request_filter_duration_seconds',
    'apiserver_current_inflight_requests',
    'workqueue_depth',
    'workqueue_adds_total',
    'workqueue_retries_total',
    'karmada_build_info',
  ],
  'karmada-scheduler-estimator-member1': [
    'karmada_scheduler_estimator_estimating_request_total',
    'karmada_scheduler_estimator_estimating_algorithm_duration_seconds',
    'karmada_scheduler_estimator_estimating_plugin_execution_duration_seconds',
    'karmada_scheduler_estimator_estimating_plugin_extension_point_duration_seconds',
    'karmada_build_info',
  ],
  'karmada-scheduler-estimator-member2': [
    'karmada_scheduler_estimator_estimating_request_total',
    'karmada_scheduler_estimator_estimating_algorithm_duration_seconds',
    'karmada_scheduler_estimator_estimating_plugin_execution_duration_seconds',
    'karmada_scheduler_estimator_estimating_plugin_extension_point_duration_seconds',
    'karmada_build_info',
  ],
  'karmada-scheduler-estimator-member3': [
    'karmada_scheduler_estimator_estimating_request_total',
    'karmada_scheduler_estimator_estimating_algorithm_duration_seconds',
    'karmada_scheduler_estimator_estimating_plugin_execution_duration_seconds',
    'karmada_scheduler_estimator_estimating_plugin_extension_point_duration_seconds',
    'karmada_build_info',
  ],
  'karmada-search': [
    'apiserver_request_total',
    'apiserver_request_duration_seconds',
    'apiserver_current_inflight_requests',
    'apiserver_longrunning_requests',
    'apiserver_request_sli_duration_seconds',
    'apiserver_request_slo_duration_seconds',
    'apiserver_request_filter_duration_seconds',
    'apiserver_storage_objects',
    'apiserver_storage_size_bytes',
    'etcd_request_duration_seconds',
    'etcd_requests_total',
    'workqueue_depth',
  ],
  'karmada-webhook': [
    'controller_runtime_webhook_requests_total',
    'controller_runtime_webhook_latency_seconds',
    'controller_runtime_webhook_requests_in_flight',
    'controller_runtime_webhook_panics_total',
    'controller_runtime_conversion_webhook_panics_total',
    'karmada_build_info',
  ],
} satisfies Record<KarmadaComponentKey, readonly string[]>;

export function getDefaultMetricNamesForComponent(
  component: string,
): readonly string[] {
  return (
    DEFAULT_METRIC_NAMES_BY_COMPONENT[component as KarmadaComponentKey] ?? []
  );
}

/**
 * Generate a unique panel ID
 */
export function generatePanelId(): string {
  return `panel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Load dashboard config from localStorage for a specific component.
 * Returns null if no config exists.
 */
export function loadDashboardConfig(component: string): DashboardConfig | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${component}`);
    if (!raw) return null;
    const config = JSON.parse(raw) as DashboardConfig;
    if (config.version !== CONFIG_VERSION) return null;
    return config;
  } catch {
    return null;
  }
}

/**
 * Save dashboard config to localStorage for a specific component.
 */
export function saveDashboardConfig(config: DashboardConfig): void {
  localStorage.setItem(
    `${STORAGE_PREFIX}${config.component}`,
    JSON.stringify(config),
  );
}

/**
 * Reset (delete) the dashboard config for a component.
 */
export function resetDashboardConfig(component: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${component}`);
}

/**
 * Create a PanelConfig from a MetricCatalogItem with sensible defaults.
 */
export function createPanelFromCatalogItem(
  item: MetricCatalogItem,
): PanelConfig {
  return {
    id: generatePanelId(),
    metricName: item.name,
    chartType: item.suggestedChart,
    title: item.name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    visible: true,
  };
}

/**
 * Pick a compact default metric subset centered on Karmada control-plane health.
 */
export function selectDefaultCatalogMetrics(
  component: string,
  catalog: MetricCatalogItem[],
): MetricCatalogItem[] {
  const catalogByName = new Map(catalog.map((item) => [item.name, item]));
  return getDefaultMetricNamesForComponent(component)
    .map((name) => catalogByName.get(name))
    .filter((item): item is MetricCatalogItem => item !== undefined)
    .slice(0, DEFAULT_PANEL_LIMIT);
}

/**
 * Build a compact default config from catalog.
 */
export function buildDefaultConfig(
  component: string,
  catalog: MetricCatalogItem[],
): DashboardConfig {
  return {
    version: CONFIG_VERSION,
    component,
    panels: selectDefaultCatalogMetrics(component, catalog).map(
      createPanelFromCatalogItem,
    ),
  };
}

/**
 * Add a panel to the config and save.
 */
export function addPanel(
  config: DashboardConfig,
  panel: PanelConfig,
): DashboardConfig {
  const updated = {
    ...config,
    panels: [...config.panels, panel],
  };
  saveDashboardConfig(updated);
  return updated;
}

/**
 * Remove a panel by ID and save.
 */
export function removePanel(
  config: DashboardConfig,
  panelId: string,
): DashboardConfig {
  const updated = {
    ...config,
    panels: config.panels.filter((p) => p.id !== panelId),
  };
  saveDashboardConfig(updated);
  return updated;
}

/**
 * Update a panel by ID and save.
 */
export function updatePanel(
  config: DashboardConfig,
  panelId: string,
  updates: Partial<PanelConfig>,
): DashboardConfig {
  const updated = {
    ...config,
    panels: config.panels.map((p) =>
      p.id === panelId ? { ...p, ...updates } : p,
    ),
  };
  saveDashboardConfig(updated);
  return updated;
}

/**
 * Reorder panels and save.
 */
export function reorderPanels(
  config: DashboardConfig,
  panels: PanelConfig[],
): DashboardConfig {
  const updated = { ...config, panels };
  saveDashboardConfig(updated);
  return updated;
}

/**
 * Get the list of metric names from the config (for API filtering).
 */
export function getConfiguredMetricNames(config: DashboardConfig): string[] {
  return config.panels.filter((p) => p.visible).map((p) => p.metricName);
}

/** Serialize one component dashboard in the ConfigMap-compatible JSON shape. */
export function serializeComponentDashboardConfig(
  config: DashboardConfig,
): string {
  return JSON.stringify({ metrics_dashboards: [config] }, null, 2);
}
