import axios from 'axios';
import _ from 'lodash';

let pathPrefix = window.__path_prefix__ || '';
if (!pathPrefix.startsWith('/')) {
  pathPrefix = '/' + pathPrefix;
}
if (!pathPrefix.endsWith('/')) {
  pathPrefix = pathPrefix + '/';
}
export const routerBase = pathPrefix;
const baseURL: string = _.join([pathPrefix, 'api/v1'], '');

export const karmadaClient = axios.create({
  baseURL,
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
