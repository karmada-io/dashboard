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
