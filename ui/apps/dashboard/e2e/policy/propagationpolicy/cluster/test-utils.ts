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
 * Generate test ClusterPropagationPolicy YAML with timestamp
 */
export function generateTestClusterPropagationPolicyYaml() {
    const timestamp = Date.now();
    return `apiVersion: policy.karmada.io/v1alpha1
kind: ClusterPropagationPolicy
metadata:
  name: test-clusterpropagationpolicy-${timestamp}
  labels:
    app: test-app
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx-deployment
  placement:
    clusterAffinity:
      clusterNames:
        - member1
        - member2`;
}

/**
 * Creates a Kubernetes ClusterPropagationPolicy using the shared K8s utility.
 * @param yamlContent The YAML content of the clusterpropagationpolicy.
 * @returns A Promise that resolves when the clusterpropagationpolicy is created.
 */
export async function createK8sClusterPropagationPolicy(yamlContent: string): Promise<void> {
    return createK8sResource('clusterpropagationpolicy', yamlContent);
}

/**
 * Deletes a Kubernetes ClusterPropagationPolicy using the shared K8s utility.
 * @param clusterPropagationPolicyName The name of the clusterpropagationpolicy to delete.
 * @param namespace The namespace of the clusterpropagationpolicy (default: 'default').
 * @returns A Promise that resolves when the clusterpropagationpolicy is deleted.
 */
export async function deleteK8sClusterPropagationPolicy(clusterPropagationPolicyName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('clusterpropagationpolicy', clusterPropagationPolicyName, namespace);
}

/**
 * Gets clusterpropagationpolicy name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The clusterpropagationpolicy name.
 */
export function getClusterPropagationPolicyNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'clusterpropagationpolicy');
}
