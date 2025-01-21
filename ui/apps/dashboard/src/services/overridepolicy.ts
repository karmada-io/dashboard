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
import { ClusterAffinity } from '@/services/propagationpolicy.ts';

export interface OverridePolicy {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  resourceSelectors: ResourceSelector[];
  overrideRules: OverrideRule[];
}

export interface ResourceSelector {
  apiVersion: string;
  kind: string;
  namespace: string;
  name: string;
  labelSelector: LabelSelector;
}

export type LabelSelector = Record<string, string>;

export interface OverrideRule {
  targetCluster: ClusterAffinity;
  overriders: Overriders;
}

export interface Overriders {
  imageOverrider: ImageOverrider[];
  commandOverrider: CommandOverrider[];
  argsOverrider: ArgsOverrider[];
  labelsOverrider: LabelsOverrider[];
  annotationsOverrider: AnnotationsOverrider[];
  plaintextOverrider: PlaintextOverrider[];
}

export interface ImageOverrider {
  operator: 'add' | 'remove' | 'replace';
  component: 'Registry' | 'Repository' | 'Tag';
  value: string;
}

export interface CommandOverrider {
  containerName: string;
  operator: 'add' | 'remove';
  value: string[];
}

export interface ArgsOverrider {
  containerName: string;
  operator: 'add' | 'remove';
  value: string[];
}

export interface LabelsOverrider {
  operator: 'add' | 'remove' | 'replace';
  value: Record<string, string>;
}

export interface AnnotationsOverrider {
  operator: 'add' | 'remove' | 'replace';
  value: Record<string, string>;
}

export interface PlaintextOverrider {
  operator: 'add' | 'remove' | 'replace';
  path: string;
  value: string;
}

export function extractOverridePolicyType(rule: OverrideRule): string {
  const overriders = rule.overriders;
  if (overriders.imageOverrider) {
    return 'ImageOverrider';
  }
  if (overriders.commandOverrider) {
    return 'CommandOverrider';
  }
  if (overriders.argsOverrider) {
    return 'ArgsOverrider';
  }
  if (overriders.labelsOverrider) {
    return 'LabelsOverrider';
  }
  if (overriders.annotationsOverrider) {
    return 'AnnotationsOverrider';
  }
  if (overriders.plaintextOverrider) {
    return 'PlaintextOverrider';
  }
  return '';
}

export function extractRuleTypes(op: OverridePolicy): string[] {
  const ruleTypeSets = new Set<string>();
  op.overrideRules.forEach((rule) => {
    const type = extractOverridePolicyType(rule);
    if (type) {
      ruleTypeSets.add(type);
    }
  });
  return Array.from(ruleTypeSets);
}

export function extractClusterNames(op: OverridePolicy): string[] {
  const clusterNames = new Set<string>();
  op.overrideRules.forEach((rule) => {
    (rule.targetCluster?.clusterNames ?? []).forEach((clusterName) => {
      clusterNames.add(clusterName);
    });
  });
  return Array.from(clusterNames);
}

export async function GetOverridePolicies(params: {
  namespace?: string;
  keyword?: string;
}) {
  const { namespace } = params;
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
      overridepolicys: OverridePolicy[];
    }>
  >(`/overridepolicy/${namespace}`, {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
}

export async function GetOverridePolicyDetail(params: {
  namespace: string;
  name: string;
}) {
  const { name, namespace } = params;
  const url = `/overridepolicy/namespace/${namespace}/${name}`;
  const resp = await karmadaClient.get<IResponse<OverridePolicy>>(url);
  return resp.data;
}

export async function CreateOverridePolicy(params: {
  isClusterScope: boolean;
  namespace: string;
  name: string;
  overrideData: string;
}) {
  const resp = await karmadaClient.post<IResponse<string>>(
    '/overridepolicy',
    params,
  );
  return resp.data;
}

export async function UpdateOverridePolicy(params: {
  isClusterScope: boolean;
  namespace: string;
  name: string;
  overrideData: string;
}) {
  const resp = await karmadaClient.put<IResponse<string>>(
    '/overridepolicy',
    params,
  );
  return resp.data;
}

export async function DeleteOverridePolicy(params: {
  isClusterScope: boolean;
  namespace: string;
  name: string;
}) {
  const resp = await karmadaClient.delete<IResponse<string>>(
    '/overridepolicy',
    {
      data: params,
    },
  );
  return resp.data;
}

export interface ClusterOverridePolicy {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  resourceSelectors: ResourceSelector[];
  overrideRules: OverrideRule[];
}
export async function GetClusterOverridePolicies(params: { keyword?: string }) {
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
      clusterOverridePolicies: ClusterOverridePolicy[];
    }>
  >('/clusteroverridepolicy', {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
}
