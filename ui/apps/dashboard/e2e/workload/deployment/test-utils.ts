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

import { expect } from '@playwright/test';
import * as k8s from '@kubernetes/client-node';
import { parse } from 'yaml';
import _ from 'lodash';
import { createKarmadaApiClient, setupDashboardAuthentication } from '../../test-utils';

export { setupDashboardAuthentication };

/**
 * Generate test YAML with timestamp
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
 * Creates a Kubernetes Deployment using the Kubernetes JavaScript client.
 * This is a more robust way to set up test data than UI interaction.
 * @param yamlContent The YAML content of the deployment.
 * @returns A Promise that resolves when the deployment is created.
 */
export async function createK8sDeployment(yamlContent: string): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient(k8s.AppsV1Api);
        const yamlObject = parse(yamlContent) as k8s.V1Deployment;
        
        // Ensure namespace is always defined
        const namespace = yamlObject.metadata?.namespace || 'default';
        
        // Ensure metadata object exists
        if (!yamlObject.metadata) {
            yamlObject.metadata = {};
        }
        yamlObject.metadata.namespace = namespace;

        await k8sApi.createNamespacedDeployment({
            namespace: namespace,
            body: yamlObject
        });
        
    } catch (error: any) {
        throw new Error(`Failed to create deployment: ${(error as Error).message}`);
    }
}

/**
 * Deletes a Kubernetes Deployment using the Kubernetes JavaScript client.
 * @param deploymentName The name of the deployment to delete.
 * @param namespace The namespace of the deployment (default: 'default').
 * @returns A Promise that resolves when the deployment is deleted.
 */
export async function deleteK8sDeployment(deploymentName: string, namespace: string = 'default'): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient(k8s.AppsV1Api);
        
        // Assert parameters are valid for test deployment
        expect(deploymentName).toBeTruthy();
        expect(deploymentName).not.toBe('');
        expect(namespace).toBeTruthy();

        // await k8sApi.deleteNamespacedDeployment(deploymentName, namespace);
        await k8sApi.deleteNamespacedDeployment({
            name: deploymentName,
            namespace: namespace
        });
        
    } catch (error: any) {
        if (error.code === 404) {
            // Deployment not found - already deleted, this is fine
            return;
        }
        throw new Error(`Failed to delete deployment: ${(error as Error).message}`);
    }
}

/**
 * Gets deployment name from YAML content using proper YAML parsing.
 * @param yamlContent The YAML content.
 * @returns The deployment name.
 */
export function getDeploymentNameFromYaml(yamlContent: string): string {
    const yamlObject = parse(yamlContent) as Record<string, string>;
    const deploymentName = _.get(yamlObject, 'metadata.name');

    if (!deploymentName) {
        throw new Error('Could not extract deployment name from YAML');
    }

    return deploymentName;
}
