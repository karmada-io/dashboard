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
import { createK8sResource, deleteK8sResource} from '../test-utils';

export { setupDashboardAuthentication };

/**
 * Generate test DaemonSet YAML with timestamp
 */
export function generateTestDaemonSetYaml() {
    const timestamp = Date.now();
    return `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: test-daemonset-${timestamp}
  namespace: default
spec:
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80`;
}

/**
 * Creates a Kubernetes DaemonSet using the shared K8s utility.
 * @param yamlContent The YAML content of the daemonset.
 * @returns A Promise that resolves when the daemonset is created.
 */
export async function createK8sDaemonSet(yamlContent: string): Promise<void> {
    return createK8sResource('daemonset', yamlContent);
}

/**
 * Deletes a Kubernetes DaemonSet using the shared K8s utility.
 * @param daemonSetName The name of the daemonset to delete.
 * @param namespace The namespace of the daemonset (default: 'default').
 * @returns A Promise that resolves when the daemonset is deleted.
 */
export async function deleteK8sDaemonSet(daemonSetName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('daemonset', daemonSetName, namespace);
}

/**
 * Gets daemonset name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The daemonset name.
 */
export function getDaemonSetNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'daemonset');
}
