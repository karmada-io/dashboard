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

// Core client and types
export {
  karmadaClient,
  convertDataSelectQuery,
} from './base';
export type {
  WorkloadKind,
  ServiceKind,
  ConfigKind,
  PolicyScope,
  Mode,
  ObjectMeta,
  TypeMeta,
  Labels,
  Annotations,
  Selector,
  RollingUpdateStrategy,
  IResponse,
  DataSelectQuery,
} from './base';

// Authentication services
export { Login, Me } from './auth';

// Cluster management services
export {
  GetClusters,
  GetClusterDetail,
  CreateCluster,
  UpdateCluster,
  DeleteCluster,
} from './cluster';
export type {
  Cluster,
  ClusterDetail,
  ListClusterResp,
  LabelParam,
  TaintParam,
} from './cluster';

// Namespace services
export { GetNamespaces, CreateNamespace, DeleteNamespace } from './namespace';
export type { Namespace } from './namespace';

// Workload services
export {
  GetWorkloads,
  GetWorkloadDetail,
  GetWorkloadEvents,
  CreateDeployment,
} from './workload';
export * from './workload';

// Config services
export * from './config';

// Service networking
export * from './service';

// Policy management
export * from './propagationpolicy';
export * from './overridepolicy';

// Unstructured resources
export * from './unstructured';

// Terminal services
export * from './terminal';

// Dashboard configuration
export * from './dashboard-config';

// Overview/statistics
export * from './overview';

// Metrics scraper
export * from './metrics';

// Member cluster services
const memberClusterServices = {
  workload: () => import('./member-cluster/workload'),
  pod: () => import('./member-cluster/pod'),
  service: () => import('./member-cluster/service'),
  config: () => import('./member-cluster/config'),
  node: () => import('./member-cluster/node'),
  namespace: () => import('./member-cluster/namespace'),
  event: () => import('./member-cluster/event'),
  storage: () => import('./member-cluster/storage'),
  rbac: () => import('./member-cluster/rbac'),
  network: () => import('./member-cluster/network'),
  scaling: () => import('./member-cluster/scaling'),
  autoscaler: () => import('./member-cluster/autoscaler'),
  log: () => import('./member-cluster/log'),
  crd: () => import('./member-cluster/crd'),
  replicaset: () => import('./member-cluster/replicaset'),
  application: () => import('./member-cluster/application'),
  csrf: () => import('./member-cluster/csrf'),
};
export { memberClusterServices };

