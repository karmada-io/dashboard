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
    createK8sResource,
    deleteK8sResource
} from '../test-utils';

// Re-export ALL utilities from parent test-utils for single-point import
export * from '../test-utils';

/**
 * Generate test OverridePolicy YAML with timestamp
 */
export function generateTestOverridePolicyYaml() {
    const timestamp = Date.now();
    return `apiVersion: policy.karmada.io/v1alpha1
kind: OverridePolicy
metadata:
  name: test-overridepolicy-${timestamp}
  namespace: default
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
 * Creates a Kubernetes OverridePolicy using the shared K8s utility.
 * @param yamlContent The YAML content of the overridepolicy.
 * @returns A Promise that resolves when the overridepolicy is created.
 */
export async function createK8sOverridePolicy(yamlContent: string): Promise<void> {
    return createK8sResource('overridepolicy', yamlContent);
}

/**
 * Deletes a Kubernetes OverridePolicy using the shared K8s utility.
 * @param overridePolicyName The name of the overridepolicy to delete.
 * @param namespace The namespace of the overridepolicy (default: 'default').
 * @returns A Promise that resolves when the overridepolicy is deleted.
 */
export async function deleteK8sOverridePolicy(overridePolicyName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('overridepolicy', overridePolicyName, namespace);
}

/**
 * Gets overridepolicy name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The overridepolicy name.
 */
export function getOverridePolicyNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'overridepolicy');
}
