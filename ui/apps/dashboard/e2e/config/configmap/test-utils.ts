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
 * Generate test ConfigMap YAML with timestamp
 */
export function generateTestConfigMapYaml() {
    const timestamp = Date.now();
    return `apiVersion: v1
kind: ConfigMap
metadata:
  name: test-configmap-${timestamp}
  namespace: default
  labels:
    app: test-app
data:
  config.yaml: |
    server:
      port: 8080
      host: localhost
  app.properties: |
    app.name=test-app
    app.version=1.0.0`;
}

/**
 * Creates a Kubernetes ConfigMap using the shared K8s utility.
 * @param yamlContent The YAML content of the configmap.
 * @returns A Promise that resolves when the configmap is created.
 */
export async function createK8sConfigMap(yamlContent: string): Promise<void> {
    return createK8sResource('configmap', yamlContent);
}

/**
 * Deletes a Kubernetes ConfigMap using the shared K8s utility.
 * @param configMapName The name of the configmap to delete.
 * @param namespace The namespace of the configmap (default: 'default').
 * @returns A Promise that resolves when the configmap is deleted.
 */
export async function deleteK8sConfigMap(configMapName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('configmap', configMapName, namespace);
}

/**
 * Gets configmap name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The configmap name.
 */
export function getConfigMapNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'configmap');
}
