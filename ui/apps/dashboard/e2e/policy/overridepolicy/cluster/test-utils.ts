/*
Copyright 2025 The Karmada Authors.

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
    getResourceNameFromYaml,
    createKarmadaResource,
    deleteKarmadaResource
} from '../test-utils';

// Re-export ALL utilities from parent test-utils for single-point import
export * from '../test-utils';

/**
 * Generate test ClusterOverridePolicy YAML with timestamp
 */
export function generateTestClusterOverridePolicyYaml() {
    const timestamp = Date.now();
    return `apiVersion: policy.karmada.io/v1alpha1
kind: ClusterOverridePolicy
metadata:
  name: test-clusteroverridepolicy-${timestamp}
  labels:
    app: test-app
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
  overrideRules:
    - targetCluster:
        clusterNames:
          - member1
      overriders:
        plaintext:
          - path: "/spec/replicas"
            operator: replace
            value: 2`;
}

/**
 * Creates a Kubernetes ClusterOverridePolicy using the shared K8s utility.
 * @param yamlContent The YAML content of the cluster overridepolicy.
 * @returns A Promise that resolves when the cluster overridepolicy is created.
 */
export async function createK8sClusterOverridePolicy(yamlContent: string): Promise<void> {
    return createKarmadaResource('clusteroverridepolicy', yamlContent);
}

/**
 * Deletes a Kubernetes ClusterOverridePolicy using the shared K8s utility.
 * @param clusterOverridePolicyName The name of the cluster overridepolicy to delete.
 * @param namespace The namespace of the cluster overridepolicy (default: 'default').
 * @returns A Promise that resolves when the cluster overridepolicy is deleted.
 */
export async function deleteK8sClusterOverridePolicy(clusterOverridePolicyName: string, namespace: string = 'default'): Promise<void> {
    return deleteKarmadaResource('clusteroverridepolicy', clusterOverridePolicyName, namespace);
}

/**
 * Gets cluster overridepolicy name from YAML content using proper YAML parsing.
 * @param yamlContent The YAML content.
 * @returns The cluster overridepolicy name.
 */
export function getClusterOverridePolicyNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'clusteroverridepolicy');
}
