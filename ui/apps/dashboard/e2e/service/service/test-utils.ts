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

import { setupDashboardAuthentication, getResourceNameFromYaml } from '../../test-utils';
import { createK8sResource, deleteK8sResource } from '../test-utils';

export { setupDashboardAuthentication };

/**
 * Generate test YAML with timestamp
 */
export function generateTestServiceYaml() {
    const timestamp = Date.now();
    return `apiVersion: v1
kind: Service
metadata:
  name: test-service-${timestamp}
  namespace: default
  labels:
    app: test-app
spec:
  type: ClusterIP
  selector:
    app: test-app
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP`;
}

/**
 * Creates a Kubernetes Service using the shared K8s utility.
 * @param yamlContent The YAML content of the service.
 * @returns A Promise that resolves when the service is created.
 */
export async function createK8sService(yamlContent: string): Promise<void> {
    return createK8sResource('service', yamlContent);
}

/**
 * Deletes a Kubernetes Service using the shared K8s utility.
 * @param serviceName The name of the service to delete.
 * @param namespace The namespace of the service (default: 'default').
 * @returns A Promise that resolves when the service is deleted.
 */
export async function deleteK8sService(serviceName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('service', serviceName, namespace);
}

/**
 * Gets service name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The service name.
 */
export function getServiceNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'service');
}
