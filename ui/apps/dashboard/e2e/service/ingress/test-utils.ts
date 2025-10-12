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
 * Generate test Ingress YAML with timestamp
 */
export function generateTestIngressYaml() {
    const timestamp = Date.now();
    return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress-${timestamp}
  namespace: default
  labels:
    app: test-app
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: test-service
            port:
              number: 80`;
}

/**
 * Creates a Kubernetes Ingress using the shared K8s utility.
 * @param yamlContent The YAML content of the ingress.
 * @returns A Promise that resolves when the ingress is created.
 */
export async function createK8sIngress(yamlContent: string): Promise<void> {
    return createK8sResource('ingress', yamlContent);
}

/**
 * Deletes a Kubernetes Ingress using the shared K8s utility.
 * @param ingressName The name of the ingress to delete.
 * @param namespace The namespace of the ingress (default: 'default').
 * @returns A Promise that resolves when the ingress is deleted.
 */
export async function deleteK8sIngress(ingressName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('ingress', ingressName, namespace);
}

/**
 * Gets ingress name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The ingress name.
 */
export function getIngressNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'ingress');
}
