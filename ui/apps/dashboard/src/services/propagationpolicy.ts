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

import {
  convertDataSelectQuery,
  DataSelectQuery,
  IResponse,
  karmadaClient,
  ObjectMeta,
  TypeMeta,
} from './base';

export interface PropagationPolicy {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  schedulerName: string;
  clusterAffinity: ClusterAffinity;
  deployments: string[];
}

export interface ClusterAffinity {
  clusterNames: string[];
}

export async function GetPropagationPolicies(params: {
  namespace?: string;
  keyword?: string;
}) {
  const { namespace } = params;
  const url = namespace
    ? `/propagationpolicy/${namespace}`
    : '/propagationpolicy';
  const requestData = {} as DataSelectQuery;
  if (params.keyword) {
    requestData.filterBy = ['name', params.keyword];
  }
  const resp = await karmadaClient.get<
    IResponse<{
      errors: string[];
      listMeta: {
        totalItems: number;
      };
      propagationpolicys: PropagationPolicy[];
    }>
  >(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
}

export async function GetPropagationPolicyDetail(params: {
  namespace: string;
  name: string;
}) {
  const { name, namespace } = params;
  const url = `/propagationpolicy/namespace/${namespace}/${name}`;
  const resp = await karmadaClient.get<IResponse<PropagationPolicy>>(url);
  return resp.data;
}

export async function CreatePropagationPolicy(params: {
  isClusterScope: boolean;
  namespace: string;
  name: string;
  propagationData: string;
}) {
  const resp = await karmadaClient.post<IResponse<string>>(
    '/propagationpolicy',
    params,
  );
  return resp.data;
}

export async function UpdatePropagationPolicy(params: {
  isClusterScope: boolean;
  namespace: string;
  name: string;
  propagationData: string;
}) {
  const resp = await karmadaClient.put<IResponse<string>>(
    '/propagationpolicy',
    params,
  );
  return resp.data;
}

export async function DeletePropagationPolicy(params: {
  isClusterScope: boolean;
  namespace: string;
  name: string;
}) {
  const resp = await karmadaClient.delete<IResponse<string>>(
    '/propagationpolicy',
    {
      data: params,
    },
  );
  return resp.data;
}

export interface ClusterPropagationPolicy {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  schedulerName: string;
  clusterAffinity: ClusterAffinity;
  deployments: string[];
}
export async function GetClusterPropagationPolicies(params: {
  keyword?: string;
}) {
  const requestData = {} as DataSelectQuery;
  if (params.keyword) {
    requestData.filterBy = ['name', params.keyword];
  }
  const resp = await karmadaClient.get<
    IResponse<{
      errors: string[];
      listMeta: {
        totalItems: number;
      };
      clusterPropagationPolicies: ClusterPropagationPolicy[];
    }>
  >('/clusterpropagationpolicy', {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
}
