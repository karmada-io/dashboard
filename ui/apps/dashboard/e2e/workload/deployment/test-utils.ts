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
 * Generate test Deployment YAML with timestamp
 */
export function generateTestDeploymentYaml() {
    const timestamp = Date.now();
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-deployment-${timestamp}
  namespace: default
spec:
  replicas: 1
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
 * Creates a Kubernetes Deployment using the shared K8s utility.
 * @param yamlContent The YAML content of the deployment.
 * @returns A Promise that resolves when the deployment is created.
 */
export async function createK8sDeployment(yamlContent: string): Promise<void> {
    return createK8sResource('deployment', yamlContent);
}

/**
 * Deletes a Kubernetes Deployment using the shared K8s utility.
 * @param deploymentName The name of the deployment to delete.
 * @param namespace The namespace of the deployment (default: 'default').
 * @returns A Promise that resolves when the deployment is deleted.
 */
export async function deleteK8sDeployment(deploymentName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('deployment', deploymentName, namespace);
}

/**
 * Gets deployment name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The deployment name.
 */
export function getDeploymentNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'deployment');
}
