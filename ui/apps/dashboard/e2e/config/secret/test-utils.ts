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
 * Generate test Secret YAML with timestamp
 */
export function generateTestSecretYaml() {
    const timestamp = Date.now();
    return `apiVersion: v1
kind: Secret
metadata:
  name: test-secret-${timestamp}
  namespace: default
  labels:
    app: test-app
type: Opaque
data:
  username: dGVzdC11c2Vy  # test-user base64 encoded
  password: dGVzdC1wYXNzd29yZA==  # test-password base64 encoded
  config.json: eyJ0ZXN0IjogInZhbHVlIn0=  # {"test": "value"} base64 encoded`;
}

/**
 * Creates a Kubernetes Secret using the shared K8s utility.
 * @param yamlContent The YAML content of the secret.
 * @returns A Promise that resolves when the secret is created.
 */
export async function createK8sSecret(yamlContent: string): Promise<void> {
    return createK8sResource('secret', yamlContent);
}

/**
 * Deletes a Kubernetes Secret using the shared K8s utility.
 * @param secretName The name of the secret to delete.
 * @param namespace The namespace of the secret (default: 'default').
 * @returns A Promise that resolves when the secret is deleted.
 */
export async function deleteK8sSecret(secretName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('secret', secretName, namespace);
}

/**
 * Gets secret name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The secret name.
 */
export function getSecretNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'secret');
}
