/*
Copyright 2026 The Karmada Authors.

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

import { convertDataSelectQuery, karmadaMemberClusterClient } from '../base';
import type { ObjectMeta, TypeMeta, WorkloadKind, Selector, RollingUpdateStrategy, DataSelectQuery } from '../base';

export interface DeploymentWorkload {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  pods: Pods;
  containerImages: string[];
  initContainerImages: any;
}

export interface StatefulsetWorkload {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  pods: Pods;
  containerImages: string[];
  initContainerImages: any;
}
export type Workload = DeploymentWorkload | StatefulsetWorkload;

export interface Pods {
  current: number;
  desired: number;
  running: number;
  pending: number;
  failed: number;
  succeeded: number;
  warnings: any[];
}

export interface WorkloadStatus {
  running: number;
  pending: number;
  failed: number;
  succeeded: number;
  terminating: number;
}

export async function GetMemberClusterWorkloads(params: {
  memberClusterName: string;
  namespace?: string;
  kind: WorkloadKind;
  keyword?: string;
}) {
  const { memberClusterName, kind, namespace } = params;
  const requestData = {} as DataSelectQuery;
  if (params.keyword) {
    requestData.filterBy = ['name', params.keyword];
  }
  const url = namespace
    ? `/api/v1/member/${memberClusterName}/${kind}/${namespace}`
    : `/api/v1/member/${memberClusterName}/${kind}`;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    status: WorkloadStatus;
    deployments?: Workload[];
    statefulSets?: Workload[];
    daemonSets?: Workload[];
    jobs?: Workload[];
    items?: Workload[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

// Specific workload list functions
export async function GetMemberClusterDeployments(params: {
  memberClusterName: string;
  namespace?: string;
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { memberClusterName, namespace, keyword, ...queryParams } = params;
  const url = namespace
    ? `/api/v1/member/${memberClusterName}/deployment/${namespace}`
    : `/api/v1/member/${memberClusterName}/deployment`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    status?: WorkloadStatus;
    deployments: Workload[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetMemberClusterDaemonSets(params: {
  memberClusterName: string;
  namespace?: string;
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { memberClusterName, namespace, keyword, ...queryParams } = params;
  const url = namespace
    ? `/clusterapi/${memberClusterName}/api/v1/daemonset/${namespace}`
    : `/clusterapi/${memberClusterName}/api/v1/daemonset`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    status?: WorkloadStatus;
    daemonSets: Workload[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetMemberClusterStatefulSets(params: {
  memberClusterName: string;
  namespace?: string;
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { memberClusterName, namespace, keyword, ...queryParams } = params;
  const url = namespace
    ? `/clusterapi/${memberClusterName}/api/v1/statefulset/${namespace}`
    : `/clusterapi/${memberClusterName}/api/v1/statefulset`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    status?: WorkloadStatus;
    statefulSets: Workload[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetMemberClusterJobs(params: {
  memberClusterName: string;
  namespace?: string;
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { memberClusterName, namespace, keyword, ...queryParams } = params;
  const url = namespace
    ? `/clusterapi/${memberClusterName}/api/v1/job/${namespace}`
    : `/clusterapi/${memberClusterName}/api/v1/job`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    status?: WorkloadStatus;
    jobs: Workload[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetMemberClusterCronJobs(params: {
  memberClusterName: string;
  namespace?: string;
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { memberClusterName, namespace, keyword, ...queryParams } = params;
  const url = namespace
    ? `/clusterapi/${memberClusterName}/api/v1/cronjob/${namespace}`
    : `/clusterapi/${memberClusterName}/api/v1/cronjob`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    status?: WorkloadStatus;
    cronJobs: Workload[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export interface WorkloadDetail {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  pods: Pods;
  containerImages: string[];
  initContainerImages: any;
  selector: Selector;
  statusInfo: WorkloadStatusInfo;
  conditions: any[];
  strategy: string;
  minReadySeconds: number;
  rollingUpdateStrategy: RollingUpdateStrategy;
  revisionHistoryLimit: number;
}

export interface WorkloadStatusInfo {
  replicas: number;
  updated: number;
  available: number;
  unavailable: number;
}

export async function GetMemberClusterWorkloadDetail(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
  kind: WorkloadKind;
}) {
  const { memberClusterName, kind, name, namespace } = params;
  const url = `/api/v1/member/${memberClusterName}/${kind}/${namespace}/${name}`;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
  } & WorkloadDetail>(url);
  return resp;
}

export interface WorkloadEvent {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  message: string;
  sourceComponent: string;
  sourceHost: string;
  object: string;
  objectKind: string;
  objectName: string;
  objectNamespace: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  reason: string;
  type: string;
}

export async function GetMemberClusterWorkloadEvents(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
  kind: WorkloadKind;
}) {
  const { memberClusterName, kind, name, namespace } = params;
  const url = `/api/v1/member/${memberClusterName}/${kind}/${namespace}/${name}/event`;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    events: WorkloadEvent[];
  }>(url);
  return resp;
}

export async function CreateMemberClusterDeployment(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
  content: string;
}) {
  const { memberClusterName, ...deploymentParams } = params;
  const resp = await karmadaMemberClusterClient.post<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    events: WorkloadEvent[];
  }>(`/api/v1/member/${memberClusterName}/deployment`, deploymentParams);
  return resp;
}

// Additional Deployment operations
export async function GetMemberClusterDeploymentNewReplicaSets(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    replicaSets: any[];
  }>(
    `/api/v1/member/${memberClusterName}/deployment/${namespace}/${name}/newreplicaset`,
  );
  return resp;
}

export async function GetMemberClusterDeploymentOldReplicaSets(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    replicaSets: any[];
  }>(
    `/api/v1/member/${memberClusterName}/deployment/${namespace}/${name}/oldreplicaset`,
  );
  return resp;
}

export async function PauseMemberClusterDeployment(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.put<any>(
    `/api/v1/member/${memberClusterName}/deployment/${namespace}/${name}/pause`,
  );
  return resp;
}

export async function ResumeMemberClusterDeployment(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.put<any>(
    `/api/v1/member/${memberClusterName}/deployment/${namespace}/${name}/resume`,
  );
  return resp;
}

export async function RestartMemberClusterDeployment(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.put<any>(
    `/api/v1/member/${memberClusterName}/deployment/${namespace}/${name}/restart`,
  );
  return resp;
}

export async function RollbackMemberClusterDeployment(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
  targetRevision?: number;
}) {
  const { memberClusterName, namespace, name, targetRevision } = params;
  const resp = await karmadaMemberClusterClient.put<any>(
    `/api/v1/member/${memberClusterName}/deployment/${namespace}/${name}/rollback`,
    { targetRevision },
  );
  return resp;
}

// DaemonSet operations
export async function GetMemberClusterDaemonSetPods(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    pods: any[];
  }>(
    `/clusterapi/${memberClusterName}/api/v1/daemonset/${namespace}/${name}/pod`,
  );
  return resp;
}

export async function GetMemberClusterDaemonSetServices(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    services: any[];
  }>(
    `/clusterapi/${memberClusterName}/api/v1/daemonset/${namespace}/${name}/service`,
  );
  return resp;
}

// StatefulSet operations
export async function GetMemberClusterStatefulSetPods(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    pods: any[];
  }>(
    `/clusterapi/${memberClusterName}/api/v1/statefulset/${namespace}/${name}/pod`,
  );
  return resp;
}

// Job operations
export async function GetMemberClusterJobPods(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    pods: any[];
  }>(`/clusterapi/${memberClusterName}/api/v1/job/${namespace}/${name}/pod`);
  return resp;
}

// CronJob operations
export async function GetMemberClusterCronJobJobs(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    jobs: any[];
  }>(`/clusterapi/${memberClusterName}/api/v1/cronjob/${namespace}/${name}/job`);
  return resp;
}

export async function TriggerMemberClusterCronJob(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.put<any>(
    `/clusterapi/${memberClusterName}/api/v1/cronjob/${namespace}/${name}/trigger`,
  );
  return resp;
}
