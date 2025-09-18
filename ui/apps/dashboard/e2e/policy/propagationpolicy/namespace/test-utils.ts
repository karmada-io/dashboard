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
 * @returns Kubernetes CustomObjectsApi client
 */
function createKarmadaApiClient(): k8s.CustomObjectsApi {
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
            return kc.makeApiClient(k8s.CustomObjectsApi);
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
    return kc.makeApiClient(k8s.CustomObjectsApi);
}

/**
 * Setup dashboard authentication and navigate to dashboard page
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
 * Generate test PropagationPolicy YAML with timestamp
 */
export function generateTestPropagationPolicyYaml() {
    const timestamp = Date.now();
    return `apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: test-propagationpolicy-${timestamp}
  namespace: default
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
 * Creates a Kubernetes PropagationPolicy using the Kubernetes JavaScript client.
 * This is a more robust way to set up test data than UI interaction.
 * @param yamlContent The YAML content of the propagationpolicy.
 * @returns A Promise that resolves when the propagationpolicy is created.
 */
export async function createK8sPropagationPolicy(yamlContent: string): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient();
        const yamlObject = parse(yamlContent) as any;

        // Ensure namespace is always defined
        const namespace = yamlObject.metadata?.namespace || 'default';

        // Ensure metadata object exists
        if (!yamlObject.metadata) {
            yamlObject.metadata = {};
        }
        yamlObject.metadata.namespace = namespace;

        await k8sApi.createNamespacedCustomObject({
            group: 'policy.karmada.io',
            version: 'v1alpha1',
            namespace: namespace,
            plural: 'propagationpolicies',
            body: yamlObject
        });

    } catch (error: any) {
        throw new Error(`Failed to create propagationpolicy: ${error.message}`);
    }
}

/**
 * Deletes a Kubernetes PropagationPolicy using the Kubernetes JavaScript client.
 * @param propagationPolicyName The name of the propagationpolicy to delete.
 * @param namespace The namespace of the propagationpolicy (default: 'default').
 * @returns A Promise that resolves when the propagationpolicy is deleted.
 */
export async function deleteK8sPropagationPolicy(propagationPolicyName: string, namespace: string = 'default'): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient();

        // Assert parameters are valid for test propagationpolicy
        expect(propagationPolicyName).toBeTruthy();
        expect(propagationPolicyName).not.toBe('');
        expect(namespace).toBeTruthy();

        await k8sApi.deleteNamespacedCustomObject({
            group: 'policy.karmada.io',
            version: 'v1alpha1',
            namespace: namespace,
            plural: 'propagationpolicies',
            name: propagationPolicyName
        });

    } catch (error: any) {
        if (error.response?.status === 404 || error.statusCode === 404)  {
            // PropagationPolicy not found - already deleted, this is fine
            return;
        }
        throw new Error(`Failed to delete propagationpolicy: ${error.message}`);
    }
}

/**
 * Gets propagationpolicy name from YAML content using proper YAML parsing.
 * @param yamlContent The YAML content.
 * @returns The propagationpolicy name.
 */
export function getPropagationPolicyNameFromYaml(yamlContent: string): string {
    const yamlObject = parse(yamlContent);
    const propagationPolicyName = _.get(yamlObject, 'metadata.name');

    if (!propagationPolicyName) {
        throw new Error('Could not extract propagationpolicy name from YAML');
    }

    return propagationPolicyName;
}
