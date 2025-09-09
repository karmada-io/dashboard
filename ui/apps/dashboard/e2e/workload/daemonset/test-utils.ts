/*Copyright 2024 The Karmada Authors.
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

import { Page, expect } from '@playwright/test';
import * as k8s from '@kubernetes/client-node';
import { parse } from 'yaml';
import _ from 'lodash';

// Set webServer.url and use.baseURL with the location of the WebServer
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 5173;
const baseURL = `http://${HOST}:${PORT}`;
const basePath = '/multicloud-resource-manage';
const token = process.env.KARMADA_TOKEN || '';

// Karmada API server configuration - can be overridden by environment variables
const KARMADA_HOST = process.env.KARMADA_HOST || 'localhost';
const KARMADA_PORT = process.env.KARMADA_PORT || '5443'; // Standard Karmada API server port
const KARMADA_API_SERVER = `https://${KARMADA_HOST}:${KARMADA_PORT}`;

/**
 * Creates a configured Kubernetes API client for Karmada
 * @returns Kubernetes AppsV1Api client
 */
function createKarmadaApiClient(): k8s.AppsV1Api {
    const kc = new k8s.KubeConfig();
    
    // Try to use existing kubeconfig first (for CI)
    if (process.env.KUBECONFIG) {
        try {
            kc.loadFromFile(process.env.KUBECONFIG);
            // Set context to karmada-apiserver if available
            const contexts = kc.getContexts();
            const karmadaContext = contexts.find(c => c.name === 'karmada-apiserver');
            if (karmadaContext) {
                kc.setCurrentContext('karmada-apiserver');
            }
            return kc.makeApiClient(k8s.AppsV1Api);
        } catch (error) {
            console.error('Failed to load kubeconfig:', error);
        }
    }
    
    // Fallback to custom config for local development
    const kubeConfigYaml = `
apiVersion: v1
kind: Config
clusters:
- cluster:
    insecure-skip-tls-verify: true
    server: ${KARMADA_API_SERVER}
  name: karmada-apiserver
contexts:
- context:
    cluster: karmada-apiserver
    user: karmada-dashboard
  name: default
current-context: default
users:
- name: karmada-dashboard
  user:
    token: ${token}
`;
    
    kc.loadFromString(kubeConfigYaml);
    return kc.makeApiClient(k8s.AppsV1Api);
}

/**
 * Setup dashboard authentication and navigate to workload page
 */
export async function setupDashboardAuthentication(page: Page) {
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.goto(`${baseURL}${basePath}`, { waitUntil: 'networkidle' });
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('text=Overview', { timeout: 30000 });
}

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
 * Creates a Kubernetes DaemonSet using the Kubernetes JavaScript client.
 * This is a more robust way to set up test data than UI interaction.
 * @param yamlContent The YAML content of the daemonset.
 * @returns A Promise that resolves when the daemonset is created.
 */
export async function createK8sDaemonSet(yamlContent: string): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient();
        const yamlObject = parse(yamlContent) as k8s.V1DaemonSet;
        
        // Ensure namespace is always defined
        const namespace = yamlObject.metadata?.namespace || 'default';
        
        // Ensure metadata object exists
        if (!yamlObject.metadata) {
            yamlObject.metadata = {};
        }
        yamlObject.metadata.namespace = namespace;

        await k8sApi.createNamespacedDaemonSet({
            namespace: namespace,
            body: yamlObject
        });
        
    } catch (error: any) {
        throw new Error(`Failed to create daemonset: ${(error as Error).message}`);
    }
}

/**
 * Deletes a Kubernetes DaemonSet using the Kubernetes JavaScript client.
 * @param daemonSetName The name of the daemonset to delete.
 * @param namespace The namespace of the daemonset (default: 'default').
 * @returns A Promise that resolves when the daemonset is deleted.
 */
export async function deleteK8sDaemonSet(daemonSetName: string, namespace: string = 'default'): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient();
        
        // Assert parameters are valid for test daemonset
        expect(daemonSetName).toBeTruthy();
        expect(daemonSetName).not.toBe('');
        expect(namespace).toBeTruthy();

        await k8sApi.deleteNamespacedDaemonSet({
            name: daemonSetName,
            namespace: namespace
        });
        
    } catch (error: any) {
        if (error.code === 404) {
            // DaemonSet not found - already deleted, this is fine
            return;
        }
        throw new Error(`Failed to delete daemonset: ${(error as Error).message}`);
    }
}

/**
 * Gets daemonset name from YAML content using proper YAML parsing.
 * @param yamlContent The YAML content.
 * @returns The daemonset name.
 */
export function getDaemonSetNameFromYaml(yamlContent: string): string {
    const yamlObject = parse(yamlContent) as Record<string, string>;
    const daemonSetName = _.get(yamlObject, 'metadata.name');

    if (!daemonSetName) {
        throw new Error('Could not extract daemonset name from YAML');
    }

    return daemonSetName;
}
