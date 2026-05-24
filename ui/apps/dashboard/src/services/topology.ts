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

import { IResponse, karmadaClient } from './base';

export type NodeType =
  | 'ResourceTemplate'
  | 'ResourceBinding'
  | 'Work'
  | 'MemberClusterWorkload';

export type NodeStatus = 'healthy' | 'progressing' | 'abnormal';

export interface PropagationPolicyRef {
  name: string;
  namespace?: string;
  isClusterScope: boolean;
}

export interface OverridePolicyRef {
  name: string;
  namespace?: string;
  isClusterScope: boolean;
}

export interface TopologyNode {
  id: string;
  type: NodeType;
  name: string;
  namespace?: string;
  kind?: string;
  cluster?: string;
  status: NodeStatus;
  data?: {
    propagationPolicy?: PropagationPolicyRef;
    overridePolicies?: OverridePolicyRef[];
  };
}

export interface TopologyEdgeData {
  propagationPolicy?: PropagationPolicyRef;
  overridePolicies?: OverridePolicyRef[];
}

export interface TopologyEdge {
  source: string;
  target: string;
  label?: string;
  data?: TopologyEdgeData;
}

export interface TopologyResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export async function GetResourceTopology(
  namespace: string,
  kind: string,
  name: string,
) {
  const resp = await karmadaClient.get<IResponse<TopologyResponse>>(
    `/topology/${namespace}/${kind}/${name}`,
  );
  return resp.data;
}
