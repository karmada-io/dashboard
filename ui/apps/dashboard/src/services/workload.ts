import {
  convertDataSelectQuery,
  DataSelectQuery,
  IResponse,
  karmadaClient,
  RollingUpdateStrategy,
  Selector,
  WorkloadKind,
} from '@/services/base.ts';
import { ObjectMeta, TypeMeta } from '@/services/base';

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

export async function GetWorkloads(params: {
  namespace?: string;
  kind: WorkloadKind;
  keyword?: string;
}) {
  const { kind, namespace } = params;
  const requestData = {} as DataSelectQuery;
  if (params.keyword) {
    requestData.filterBy = ['name', params.keyword];
  }
  const url = namespace ? `/${kind}/${namespace}` : `/${kind}`;
  const resp = await karmadaClient.get<
    IResponse<{
      errors: string[];
      listMeta: {
        totalItems: number;
      };
      status: WorkloadStatus;
      deployments?: Workload[];
      statefulSets?: Workload[];
    }>
  >(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
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

export async function GetWorkloadDetail(params: {
  namespace?: string;
  name: string;
  kind: WorkloadKind;
}) {
  // /deployment/:namespace/:deployment
  const { kind, name, namespace } = params;
  const url = `/${kind}/${namespace}/${name}`;
  const resp = await karmadaClient.get<
    IResponse<
      {
        errors: string[];
      } & WorkloadDetail
    >
  >(url);
  return resp.data;
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

export async function GetWorkloadEvents(params: {
  namespace: string;
  name: string;
  kind: WorkloadKind;
}) {
  const { kind, name, namespace } = params;
  const url = `/${kind}/${namespace}/${name}/event`;
  const resp = await karmadaClient.get<
    IResponse<{
      errors: string[];
      listMeta: {
        totalItems: number;
      };
      events: WorkloadEvent[];
    }>
  >(url);
  return resp.data;
}

export async function CreateDeployment(params: {
  namespace: string;
  name: string;
  content: string;
}) {
  const resp = await karmadaClient.post<
    IResponse<{
      errors: string[];
      listMeta: {
        totalItems: number;
      };
      events: WorkloadEvent[];
    }>
  >(`/deployment`, params);
  return resp.data;
}
