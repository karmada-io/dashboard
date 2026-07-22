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

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { MetricCatalogItem } from '@/services/metrics';

import {
  DEFAULT_METRIC_NAMES_BY_COMPONENT,
  buildDefaultConfig,
  getConfiguredMetricNames,
  selectDefaultCatalogMetrics,
  serializeComponentDashboardConfig,
  type DashboardConfig,
} from './dashboard-config.ts';

const COMPONENTS = [
  'karmada-scheduler',
  'karmada-controller-manager',
  'karmada-agent',
  'karmada-aggregated-apiserver',
  'karmada-apiserver',
  'karmada-descheduler',
  'karmada-kube-controller-manager',
  'karmada-metrics-adapter',
  'karmada-scheduler-estimator-member1',
  'karmada-scheduler-estimator-member2',
  'karmada-scheduler-estimator-member3',
  'karmada-search',
  'karmada-webhook',
] as const;

const INTERNAL_METRIC_PREFIXES = [
  'go_',
  'process_',
  'promhttp_',
  'grpc_',
  'rest_client_',
  'certwatcher_',
];

function catalogItem(name: string): MetricCatalogItem {
  return {
    name,
    help: '',
    prometheusType: 'gauge',
    suggestedChart: 'line',
    group: 'test',
  };
}

test('every dashboard component has non-internal defaults', () => {
  assert.deepEqual(
    Object.keys(DEFAULT_METRIC_NAMES_BY_COMPONENT).sort(),
    [...COMPONENTS].sort(),
  );

  for (const component of COMPONENTS) {
    const defaults = DEFAULT_METRIC_NAMES_BY_COMPONENT[component];
    assert.ok(defaults.length > 0, `${component} has no defaults`);
    for (const metricName of defaults) {
      assert.equal(
        INTERNAL_METRIC_PREFIXES.some((prefix) =>
          metricName.startsWith(prefix),
        ),
        false,
        `${component} unexpectedly defaults to ${metricName}`,
      );
    }
  }
});

test('default metrics preserve allowlist order and require catalog presence', () => {
  const selected = selectDefaultCatalogMetrics(
    'karmada-kube-controller-manager',
    [
      catalogItem('go_gc_duration_seconds'),
      catalogItem('workqueue_depth'),
      catalogItem('node_collector_update_node_health_duration_seconds'),
      catalogItem('node_collector_update_all_nodes_health_duration_seconds'),
    ],
  );

  assert.deepEqual(
    selected.map((item) => item.name),
    [
      'node_collector_update_all_nodes_health_duration_seconds',
      'node_collector_update_node_health_duration_seconds',
      'workqueue_depth',
    ],
  );
});

test('internal metrics are never selected by an automatic fallback', () => {
  const config = buildDefaultConfig('karmada-webhook', [
    catalogItem('go_gc_duration_seconds'),
    catalogItem('process_resident_memory_bytes'),
  ]);
  assert.deepEqual(config.panels, []);
});

test('explicit user configuration keeps internal metrics', () => {
  const config: DashboardConfig = {
    version: 1,
    component: 'karmada-webhook',
    panels: [
      {
        id: 'go-gc',
        metricName: 'go_gc_duration_seconds',
        chartType: 'line',
        title: 'Go GC Duration',
        visible: true,
      },
    ],
  };

  assert.deepEqual(getConfiguredMetricNames(config), [
    'go_gc_duration_seconds',
  ]);
});

test('component export contains only the selected dashboard', () => {
  const config: DashboardConfig = {
    version: 1,
    component: 'karmada-apiserver',
    panels: [
      {
        id: 'request-total',
        metricName: 'apiserver_request_total',
        chartType: 'line',
        title: 'API Server Requests',
        visible: true,
      },
    ],
  };

  assert.deepEqual(JSON.parse(serializeComponentDashboardConfig(config)), {
    metrics_dashboards: [config],
  });
});
