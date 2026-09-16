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
  TypeMeta
} from '../base';
import { Event } from './event';
import { Pod } from './pod';
export interface NodeCondition {
  type: string;
  status: string;
  lastHeartbeatTime: string;
  lastTransitionTime: string;
  reason: string;
  message: string;
}

export interface NodeAddress {
  type: string;
  address: string;
}

export interface NodeSystemInfo {
  machineID: string;
  systemUUID: string;
  bootID: string;
  kernelVersion: string;
  osImage: string;
  containerRuntimeVersion: string;
  kubeletVersion: string;
  kubeProxyVersion: string;
  operatingSystem: string;
  architecture: string;
}

export interface NodeSpec {
  podCIDR: string;
  taints: any[];
  unschedulable: boolean;
}

export interface NodeStatus {
  capacity: Record<string, string>;
  allocatable: Record<string, string>;
  phase: string;
  conditions: NodeCondition[];
  addresses: NodeAddress[];
  nodeInfo: NodeSystemInfo;
}

export interface Node {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  ready: string;
  allocatedResources: AllocatedResources;
  nodeInfo: NodeSystemInfo;
}

export interface AllocatedResources {
  cpuCapacity: number;
  cpuFraction: number;
  memoryCapacity: number;
  memoryFraction: number;
  allocatedPods: number;
  podCapacity: number;
  podFraction: number;
}

export interface NodeDetail extends Node {
  spec: NodeSpec;
  status: NodeStatus;
  pods: Pod[];
  events: Event[];
}

export async function GetMemberClusterNodes(params: {
  memberClusterName: string;
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { memberClusterName, keyword, ...queryParams } = params;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    nodes: Node[];
  }>(`/clusterapi/${memberClusterName}/api/v1/node`, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetMemberClusterNodeDetail(params: {
  memberClusterName: string;
  name: string;
}) {
  const { memberClusterName, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
  } & NodeDetail>(`/clusterapi/${memberClusterName}/api/v1/node/${name}`);
  return resp;
}

export async function GetMemberClusterNodeEvents(params: {
  memberClusterName: string;
  name: string;
}) {
  const { memberClusterName, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    events: Event[];
  }>(`/clusterapi/${memberClusterName}/api/v1/node/${name}/event`);
  return resp;
}

export async function GetMemberClusterNodePods(params: {
  memberClusterName: string;
  name: string;
}) {
  const { memberClusterName, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    pods: Pod[];
  }>(`/clusterapi/${memberClusterName}/api/v1/node/${name}/pod`);
  return resp;
}

export async function DrainMemberClusterNode(params: {
  memberClusterName: string;
  name: string;
}) {
  const { memberClusterName, name } = params;
  const resp = await karmadaMemberClusterClient.put<any>(
    `/clusterapi/${memberClusterName}/api/v1/node/${name}/drain`,
  );
  return resp;
}
