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

import {convertDataSelectQuery, DataSelectQuery, karmadaMemberClusterClient, ObjectMeta, TypeMeta,} from '../base';

export interface ConfigMap {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  data: Record<string, string>;
  binaryData: Record<string, string>;
}

export interface ConfigMapDetail extends ConfigMap {
  keys: string[];
}

export interface Secret {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  type: string;
  data: Record<string, string>;
}

export interface SecretDetail extends Secret {
  keys: string[];
}

export interface PersistentVolumeClaim {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  status: string;
  volume: string;
  capacity: Record<string, string>;
  accessModes: string[];
  storageClass: string;
}
export interface PersistentVolumeClaimDetail extends PersistentVolumeClaim {
}

export interface ImagePullSecretSpec {
  name: string;
  namespace: string;
  data: {
    '.dockerconfigjson': string;
  };
}

// Member Cluster ConfigMap APIs
export async function GetMemberClusterConfigMaps(params: {
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
    ? `/clusterapi/${memberClusterName}/api/v1/configmap/${namespace}`
    : `/clusterapi/${memberClusterName}/api/v1/configmap`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  return await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    items: ConfigMap[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
}

export async function GetMemberClusterConfigMapDetail(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  return await karmadaMemberClusterClient.get<{
    errors: string[];
  } & ConfigMapDetail>(`/clusterapi/${memberClusterName}/api/v1/configmap/${namespace}/${name}`);
}

export async function GetMemberClusterSecrets(params: {
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
    ? `/clusterapi/${memberClusterName}/api/v1/secret/${namespace}`
    : `/clusterapi/${memberClusterName}/api/v1/secret`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  return await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    secrets: Secret[]
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
}

export async function GetMemberClusterSecretDetail(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  return await karmadaMemberClusterClient.get<{
    errors: string[];
  } & SecretDetail>(`/clusterapi/${memberClusterName}/api/v1/secret/${namespace}/${name}`);
}

// Member Cluster PersistentVolumeClaim APIs
export async function GetMemberClusterPersistentVolumeClaims(params: {
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
    ? `/clusterapi/${memberClusterName}/api/v1/persistentvolumeclaim/${namespace}`
    : `/clusterapi/${memberClusterName}/api/v1/persistentvolumeclaim`;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  return await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    items: PersistentVolumeClaim[];
  }>(url, {
    params: convertDataSelectQuery(requestData),
  });
}

export async function GetMemberClusterPersistentVolumeClaimDetail(params: {
  memberClusterName: string;
  namespace: string;
  name: string;
}) {
  const { memberClusterName, namespace, name } = params;
  return await karmadaMemberClusterClient.get<{
    errors: string[];
  } & PersistentVolumeClaimDetail>(`/clusterapi/${memberClusterName}/api/v1/persistentvolumeclaim/${namespace}/${name}`);
}

export async function CreateMemberClusterImagePullSecret(params: {
  memberClusterName: string;
  spec: ImagePullSecretSpec;
}) {
  const { memberClusterName, spec } = params;
  return await karmadaMemberClusterClient.post<Secret>(
      `/clusterapi/${memberClusterName}/api/v1/secret`,
      spec,
  );
}
