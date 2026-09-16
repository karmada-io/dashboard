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
import { Event } from './event';

export interface CustomResourceDefinition {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  group: string;
  scope: string;
  names: CRDNames;
  version: string;
  versions: CRDVersion[];
}

export interface CRDNames {
  plural: string;
  singular: string;
  shortNames: string[];
  kind: string;
  listKind: string;
}

export interface CRDVersion {
  name: string;
  served: boolean;
  storage: boolean;
  schema: any;
}

export interface CustomResource {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
}

export async function GetCustomResourceDefinitions(params?: {
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { keyword, ...queryParams } = params || {};
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    customResourceDefinitions: CustomResourceDefinition[];
  }>('/crd', {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetCustomResourceDefinitionDetail(name: string) {
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
  } & CustomResourceDefinition>(`/crd/${name}`);
  return resp;
}

export async function GetCustomResources(params: {
  namespace: string;
  crd: string;
  keyword?: string;
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}) {
  const { namespace, crd, keyword, ...queryParams } = params;
  const requestData = { ...queryParams } as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    objects: CustomResource[];
  }>(`/crd/${namespace}/${crd}/object`, {
    params: convertDataSelectQuery(requestData),
  });
  return resp;
}

export async function GetCustomResourceDetail(params: {
  namespace: string;
  crd: string;
  object: string;
}) {
  const { namespace, crd, object } = params;
  const resp = await karmadaMemberClusterClient.get<
    {
      errors: string[];
    } & CustomResource>(`/crd/${namespace}/${crd}/${object}`);
  return resp;
}

export async function GetCustomResourceEvents(params: {
  namespace: string;
  crd: string;
  object: string;
}) {
  const { namespace, crd, object } = params;
  const resp = await karmadaMemberClusterClient.get<{
    errors: string[];
    listMeta: {
      totalItems: number;
    };
    events: Event[];
  }>(`/crd/${namespace}/${crd}/${object}/event`);
  return resp;
}
