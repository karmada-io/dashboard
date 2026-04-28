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

export interface Container {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  env: EnvVar[];
}

export interface EnvVar {
  name: string;
  value: string;
}

export interface ContainerStatus {
  name: string;
  ready: boolean;
  restartCount: number;
  image: string;
  imageID: string;
  state: any;
  lastState: any;
}

export interface Pod {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  status: string;
  podPhase: string;
  podIP: string;
  nodeName: string;
  restartCount: number;
  containers: Container[];
  containerStatuses: ContainerStatus[];
  warnings: any[];
}

export interface PodDetail extends Pod {
  controller: any;
  creationTimestamp: string;
  startTime: string;
  tolerations: any[];
  nodeSelector: Record<string, string>;
  serviceAccountName: string;
}

export async function GetMemberClusterPods(params: {
  memberClusterName: string;
  namespace?: string;
  keyword?: string;
}) {
  const { memberClusterName, namespace, keyword } = params;
  const url = namespace
    ? `/api/v1/member/${memberClusterName}/pod/${namespace}`
    : `/api/v1/member/${memberClusterName}/pod`;
  const requestData = {} as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    pods: Pod[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetMemberClusterPodDetail(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
  } & PodDetail>(`/api/v1/member/${memberClusterName}/pod/${namespace}/${name}`);
  return resp;
}

export async function GetMemberClusterPodContainers(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    containers: Container[];
  }>(
    `/api/v1/member/${memberClusterName}/pod/${namespace}/${name}/container`,
  );
  return resp;
}

export async function GetMemberClusterPodEvents(params: {
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
    events: any[];
  }>(`/api/v1/member/${memberClusterName}/pod/${namespace}/${name}/event`);
  return resp;
}

export async function GetMemberClusterPodPersistentVolumeClaims(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  const resp = await karmadaMemberClusterClient.get<{
    persistentVolumeClaims: any[];
  }>(
    `/api/v1/member/${memberClusterName}/pod/${namespace}/${name}/persistentvolumeclaim`,
  );
  return resp;
}

export async function GetMemberClusterPodShell(params: {
  memberClusterName: string;
  namespace: string;
  pod: string;
  container: string;
}) {
  const { memberClusterName, namespace, pod, container } = params;
  const resp = await karmadaMemberClusterClient.get<any>(
    `/api/v1/member/${memberClusterName}/pod/${namespace}/${pod}/shell/${container}`,
  );
  return resp;
}
