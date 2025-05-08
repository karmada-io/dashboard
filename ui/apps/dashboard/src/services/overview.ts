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

import { IResponse, karmadaClient } from '@/services/base.ts';

export interface OverviewInfo {
  karmadaInfo: KarmadaInfo;
  memberClusterStatus: MemberClusterStatus;
  clusterResourceStatus: ClusterResourceStatus;
}

export interface KarmadaInfo {
  version: Version;
  status: string;
  createTime: string;
}

export interface Version {
  gitVersion: string;
  gitCommit: string;
  gitTreeState: string;
  buildDate: string;
  goVersion: string;
  compiler: string;
  platform: string;
}

export interface MemberClusterStatus {
  nodeSummary: NodeSummary;
  cpuSummary: CpuSummary;
  memorySummary: MemorySummary;
  podSummary: PodSummary;
}

export interface NodeSummary {
  totalNum: number;
  readyNum: number;
}

export interface CpuSummary {
  totalCPU: number;
  allocatedCPU: number;
}

export interface MemorySummary {
  totalMemory: number;
  allocatedMemory: number;
}

export interface PodSummary {
  totalPod: number;
  allocatedPod: number;
}

export interface ClusterResourceStatus {
  propagationPolicyNum: number;
  overridePolicyNum: number;
  namespaceNum: number;
  workloadNum: number;
  serviceNum: number;
  configNum: number;
}

export async function GetOverview() {
  const resp = await karmadaClient.get<IResponse<OverviewInfo>>('/overview');
  return resp.data;
}

// 节点汇总API相关类型定义
export interface NodeItem {
  clusterName: string;
  name: string;
  ready: boolean;
  role: string;
  cpuCapacity: number;
  cpuUsage: number;
  memoryCapacity: number;
  memoryUsage: number;
  podCapacity: number;
  podUsage: number;
  status: string;
  labels: Record<string, string>;
  creationTimestamp: string;
}

export interface NodesResponse {
  items: NodeItem[];
  summary: NodeSummary;
}

// 获取节点汇总信息
export async function GetNodeSummary() {
  const resp = await karmadaClient.get<IResponse<NodesResponse>>('/overview/nodes');
  return resp.data;
}

// Pod汇总API相关类型定义
export interface PodItem {
  clusterName: string;
  namespace: string;
  name: string;
  phase: string;
  status: string;
  readyContainers: number;
  totalContainers: number;
  cpuRequest: number;
  memoryRequest: number;
  cpuLimit: number;
  memoryLimit: number;
  restartCount: number;
  podIP: string;
  nodeName: string;
  creationTimestamp: string;
}

export interface PodSummaryStats {
  running: number;
  pending: number;
  succeeded: number;
  failed: number;
  unknown: number;
  total: number;
}

export interface NamespacePodsStats {
  namespace: string;
  podCount: number;
}

export interface ClusterPodsStats {
  clusterName: string;
  podCount: number;
}

export interface PodsResponse {
  items: PodItem[];
  statusStats: PodSummaryStats;
  namespaceStats: NamespacePodsStats[];
  clusterStats: ClusterPodsStats[];
}

// 获取Pod汇总信息
export async function GetPodSummary() {
  const resp = await karmadaClient.get<IResponse<PodsResponse>>('/overview/pods');
  return resp.data;
}

// 集群调度预览API相关类型定义
export interface ScheduleNode {
  id: string;
  name: string;
  type: string;
}

export interface ScheduleLink {
  source: string;
  target: string;
  value: number;
  type: string;
}

export interface ClusterDistribution {
  clusterName: string;
  count: number;
}

export interface ResourceTypeDistribution {
  resourceType: string;
  clusterDist: ClusterDistribution[];
}

// 添加实际资源部署状态相关类型
export interface ResourceDeploymentStatus {
  scheduled: boolean;
  actual: boolean;
  scheduledCount: number;
  actualCount: number;
}

export interface ActualClusterDistribution {
  clusterName: string;
  scheduledCount: number;
  actualCount: number;
  status: ResourceDeploymentStatus;
}

export interface ActualResourceTypeDistribution {
  resourceType: string;
  resourceGroup: string;
  clusterDist: ActualClusterDistribution[];
  totalScheduledCount: number;
  totalActualCount: number;
  resourceNames?: string[];
}

export interface ScheduleSummary {
  totalClusters: number;
  totalPropagationPolicy: number;
  totalResourceBinding: number;
}

export interface SchedulePreviewResponse {
  nodes: ScheduleNode[];
  links: ScheduleLink[];
  resourceDist: ResourceTypeDistribution[];
  summary: ScheduleSummary;
  // 添加实际资源分布信息字段
  actualResourceDist?: ActualResourceTypeDistribution[];
}

// 获取集群调度预览信息
export async function GetSchedulePreview() {
  const resp = await karmadaClient.get<IResponse<SchedulePreviewResponse>>('/overview/schedule');
  return resp.data;
}

// 获取所有集群资源预览信息
export async function GetAllClusterResourcesPreview() {
  const resp = await karmadaClient.get<IResponse<SchedulePreviewResponse>>('/overview/all-resources');
  return resp.data;
}
