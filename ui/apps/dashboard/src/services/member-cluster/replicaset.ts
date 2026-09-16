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

import {
  convertDataSelectQuery,
  DataSelectQuery,
  karmadaMemberClusterClient,
  ObjectMeta,
  TypeMeta,
} from '../base';
import { Event } from './event';
import { Pod } from './pod';
import { Service } from './service';
import { ScaleResource } from './scaling';

export interface PodInfo {
  current: number;
  desired: number;
  running: number;
  pending: number;
  failed: number;
  succeeded: number;
  warnings: Event[];
}

export interface ReplicaSet {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  pods: PodInfo;
  containerImages: string[];
  initContainerImages: string[];
}

export interface ReplicationController {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  pods: PodInfo;
  containerImages: string[];
  initContainerImages: string[];
}

// ReplicaSet APIs
export async function GetReplicaSets(params?: {
  namespace?: string;
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { namespace, keyword, ...queryParams } = params || {};
  const url = namespace ? `/replicaset/${namespace}` : `/replicaset`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    replicaSets: ReplicaSet[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetReplicaSetDetail(params: {
  namespace: string;
  name: string;
}) {
  const { namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
  } & ReplicaSet>(`/replicaset/${namespace}/${name}`);
  return resp;
}

export async function GetReplicaSetEvents(params: {
  namespace: string;
  name: string;
}) {
  const { namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    events: Event[];
  }>(`/replicaset/${namespace}/${name}/event`);
  return resp;
}

export async function GetReplicaSetPods(params: {
  namespace: string;
  name: string;
}) {
  const { namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    pods: Pod[];
  }>(`/replicaset/${namespace}/${name}/pod`);
  return resp;
}

export async function GetReplicaSetServices(params: {
  namespace: string;
  name: string;
}) {
  const { namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    services: Service[];
  }>(`/replicaset/${namespace}/${name}/service`);
  return resp;
}

// ReplicationController APIs
export async function GetReplicationControllers(params?: {
  namespace?: string;
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { namespace, keyword, ...queryParams } = params || {};
  const url = namespace ? `/replicationcontroller/${namespace}` : `/replicationcontroller`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    replicationControllers: ReplicationController[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetReplicationControllerDetail(params: {
  namespace: string;
  name: string;
}) {
  const { namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
  } & ReplicationController>(`/replicationcontroller/${namespace}/${name}`);
  return resp;
}

export async function GetReplicationControllerEvents(params: {
  namespace: string;
  name: string;
}) {
  const { namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    events: Event[];
  }>(`/replicationcontroller/${namespace}/${name}/event`);
  return resp;
}

export async function GetReplicationControllerPods(params: {
  namespace: string;
  name: string;
}) {
  const { namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    pods: Pod[];
  }>(`/replicationcontroller/${namespace}/${name}/pod`);
  return resp;
}

export async function GetReplicationControllerServices(params: {
  namespace: string;
  name: string;
}) {
  const { namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    services: Service[];
  }>(`/replicationcontroller/${namespace}/${name}/service`);
  return resp;
}

export async function ScaleReplicationController(params: {
  namespace: string;
  name: string;
  replicas: number;
}) {
  const { namespace, name, replicas } = params;
  const resp = await karmadaMemberClusterClient.post<ScaleResource>(`/replicationcontroller/${namespace}/${name}/update/pod`, { replicas });
  return resp;
}
