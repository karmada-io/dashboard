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
 * Generate test Member Cluster kubeconfig YAML with timestamp
 * Note: The Member Cluster creation page expects kubeconfig format, not Cluster resource format
 */
export function generateTestMemberClusterYaml() {
    const timestamp = Date.now();
    return `apiVersion: v1
kind: Config
clusters:
- cluster:
    insecure-skip-tls-verify: true
    server: https://test-cluster-${timestamp}.example.com:6443
  name: test-membercluster-${timestamp}
contexts:
- context:
    cluster: test-membercluster-${timestamp}
    user: test-user-${timestamp}
  name: test-context-${timestamp}
current-context: test-context-${timestamp}
users:
- name: test-user-${timestamp}
  user:
    token: test-token-${timestamp}`;
}

/**
 * Generate test Member Cluster resource YAML with timestamp in Cluster resource format
 * Note: This generates a Cluster resource that can be created via Karmada API
 */
export function generateTestMemberClusterResourceYaml() {
    const timestamp = Date.now();
    const clusterName = `test-membercluster-${timestamp}`;
    return `apiVersion: cluster.karmada.io/v1alpha1
kind: Cluster
metadata:
  name: ${clusterName}
spec:
  syncMode: Pull
  apiEndpoint: https://test-cluster-${timestamp}.example.com:6443
  secretRef:
    namespace: karmada-cluster
    name: ${clusterName}
  insecureSkipCAVerification: true`;
}

/**
 * Creates a Kubernetes Member Cluster using the Kubernetes JavaScript client.
 * This is a more robust way to set up test data than UI interaction.
 * @param yamlContent The YAML content of the member cluster.
 * @returns A Promise that resolves when the member cluster is created.
 */
export async function createK8sMemberCluster(yamlContent: string): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient();
        const yamlObject = parse(yamlContent) as any;

        // Ensure metadata object exists
        if (!yamlObject.metadata) {
            yamlObject.metadata = {};
        }

        await k8sApi.createClusterCustomObject({
            group: 'cluster.karmada.io',
            version: 'v1alpha1',
            plural: 'clusters',
            body: yamlObject
        });

    } catch (error: any) {
        throw new Error(`Failed to create member cluster: ${error.message}`);
    }
}

/**
 * Deletes a Kubernetes Member Cluster using the Kubernetes JavaScript client.
 * @param memberClusterName The name of the member cluster to delete.
 * @returns A Promise that resolves when the member cluster is deleted.
 */
export async function deleteK8sMemberCluster(memberClusterName: string): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient();

        // Assert parameters are valid for test member cluster
        expect(memberClusterName).toBeTruthy();
        expect(memberClusterName).not.toBe('');

        await k8sApi.deleteClusterCustomObject({
            group: 'cluster.karmada.io',
            version: 'v1alpha1',
            plural: 'clusters',
            name: memberClusterName
        });

    } catch (error: any) {
        if (error.response?.status === 404 || error.statusCode === 404)  {
            // Member Cluster not found - already deleted, this is fine
            return;
        }
        throw new Error(`Failed to delete member cluster: ${error.message}`);
    }
}

/**
 * Gets member cluster name from kubeconfig YAML content using proper YAML parsing.
 * @param yamlContent The kubeconfig YAML content.
 * @returns The member cluster name.
 */
export function getMemberClusterNameFromYaml(yamlContent: string): string {
    const yamlObject = parse(yamlContent);
    // For kubeconfig format, get the cluster name from clusters[0].name
    const memberClusterName = _.get(yamlObject, 'clusters[0].name');

    if (!memberClusterName) {
        throw new Error('Could not extract member cluster name from kubeconfig YAML');
    }

    return memberClusterName;
}

/**
 * Gets member cluster name from Cluster resource YAML content using proper YAML parsing.
 * @param yamlContent The Cluster resource YAML content.
 * @returns The member cluster name.
 */
export function getMemberClusterNameFromResourceYaml(yamlContent: string): string {
    const yamlObject = parse(yamlContent);
    // For Cluster resource format, get the name from metadata.name
    const memberClusterName = _.get(yamlObject, 'metadata.name');

    if (!memberClusterName) {
        throw new Error('Could not extract member cluster name from Cluster resource YAML');
    }

    return memberClusterName;
}
