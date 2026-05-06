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

import axios from 'axios';
import _ from 'lodash';
import { notification } from 'antd';

let pathPrefix = window.__path_prefix__ || '';
if (!pathPrefix.startsWith('/')) {
  pathPrefix = '/' + pathPrefix;
}
if (!pathPrefix.endsWith('/')) {
  pathPrefix = pathPrefix + '/';
}
export const routerBase = pathPrefix;
const baseURL: string = _.join([pathPrefix, 'api/v1'], '');
const memberclusterBaseURL: string = pathPrefix;

export const karmadaClient = axios.create({
  baseURL,
});

export const karmadaMemberClusterClient = axios.create({
  baseURL: memberclusterBaseURL,
});

export interface IResponse<Data = {}> {
  code: number;
  message: string;
  data: Data;
}

export interface DataSelectQuery {
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}
export const convertDataSelectQuery = (query: DataSelectQuery) => {
  const dsQuery = {} as Record<string, string | number>;
  if (query.filterBy) {
    dsQuery['filterBy'] = query.filterBy.join(',');
  }
  if (query.sortBy) {
    dsQuery['sortBy'] = query.sortBy.join(',');
  }
  if (query.itemsPerPage && query.page) {
    dsQuery['itemsPerPage'] = query.itemsPerPage;
    dsQuery['page'] = query.page;
  }
  return dsQuery;
};

export type Labels = Record<string, string>;
export type Annotations = Record<string, string>;

export interface ObjectMeta {
  name: string;
  namespace: string;
  labels: Labels;
  annotations: Annotations;
  creationTimestamp: string;
  uid: string;
}

export interface TypeMeta {
  kind: string;
  scalable: boolean;
  restartable: boolean;
}
export type Selector = Record<string, string>;

export interface RollingUpdateStrategy {
  maxSurge: string;
  maxUnavailable: string;
}

export enum WorkloadKind {
  Unknown = '',
  Deployment = 'deployment',
  Statefulset = 'statefulset',
  Daemonset = 'daemonset',
  Cronjob = 'cronjob',
  Job = 'job',
}

export enum ServiceKind {
  Unknown = '',
  Ingress = 'ingress',
  Service = 'service',
}

export enum ConfigKind {
  Unknown = '',
  Secret = 'secret',
  ConfigMap = 'configmap',
}

export enum PolicyScope {
  Namespace = 'namespace-scope',
  Cluster = 'cluster-scope',
}

export enum Mode {
  Create = 'create',
  Edit = 'edit',
  Detail = 'detail',
}

export const propagationpolicyKey = 'propagationpolicy.karmada.io/name';
// safely extract propagationpolicy
export const extractPropagationPolicy = (r: { objectMeta: ObjectMeta }) => {
  if (!r?.objectMeta?.annotations?.[propagationpolicyKey]) {
    return '';
  }
  return r?.objectMeta?.annotations?.[propagationpolicyKey];
};


// interceptor for karmadaMemberClusterClient
interface K8sErrStatus {
  status?: string;
  message?: string;
  reason?: string;
  code?: number;
  details?: {
    group?: string;
    kind?: string;
  };
}

interface MemberClusterErrorItem {
  ErrStatus?: K8sErrStatus;
}

interface MemberClusterResponse {
  errors?: MemberClusterErrorItem[];
}

karmadaMemberClusterClient.interceptors.response.use(
  (response) => {
    const data = response.data as MemberClusterResponse | undefined;
    const errors = data?.errors ?? [];

    if (Array.isArray(errors) && errors.length > 0) {
      const messages = errors
        .map((e) => e.ErrStatus?.message)
        .filter((m): m is string => !!m);

      if (messages.length > 0) {
        messages.forEach((msg) => {
          notification.error({
            message: '成员集群请求失败',
            description: msg,
            duration: 5,
          });
        });
      }
    }

    return response;
  },
  (error) => {
    const status = error?.response?.status;
    if (status === 403) {
      notification.error({
        message: '成员集群权限不足',
        description: '当前账号没有访问成员集群相关资源的权限（HTTP 403）',
        duration: 5,
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Generates a unique key for a policy based on its scope.
 * For cluster-scoped policies, returns just the name.
 * For namespace-scoped policies, returns namespace-name format.
 */
export const getPolicyKey = (
  policy: { objectMeta: ObjectMeta },
  scope: PolicyScope,
): string => {
  return scope === PolicyScope.Cluster
    ? policy.objectMeta.name
    : `${policy.objectMeta.namespace}-${policy.objectMeta.name}`;
};
