import axios from 'axios';

const baseURL: string = '/api/v1';
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
}

export enum ConfigKind {
  Unknown = '',
  Secret = 'secret',
  ConfigMap = 'configmap',
}

export const propagationpolicyKey = 'propagationpolicy.karmada.io/name';
// safely extract propagationpolicy
export const extractPropagationPolicy = (r: { objectMeta: ObjectMeta }) => {
  if (!r?.objectMeta?.annotations?.[propagationpolicyKey]) {
    return '';
  }
  return r?.objectMeta?.annotations?.[propagationpolicyKey];
};


