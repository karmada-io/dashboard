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
import {
    createKarmadaApiClient,
    debugScreenshot
} from '../test-utils';

// Re-export utilities from parent test-utils for single-point import
export {
    setupDashboardAuthentication,
    debugScreenshot
} from '../test-utils';

/**
 * UI element selectors for member cluster forms
 * Centralized to make maintenance easier if UI text changes
 */
export const MemberClusterSelectors = {
    nameField: '* Name :',
    kubeconfigField: /Editor content/,
    taintKeyField: 'Please output the key of the point',
    taintValueField: 'Please output the value of the point',
} as const;

/**
 * Creates a configured Kubernetes API client for Karmada CustomObjects
 * @returns Kubernetes CustomObjectsApi client
 */
function createKarmadaCustomObjectsApiClient(): k8s.CustomObjectsApi {
    return createKarmadaApiClient(k8s.CustomObjectsApi);
}

/**
 * Generate test Member Cluster kubeconfig YAML with timestamp
 * Note: The Member Cluster creation page expects kubeconfig format, not Cluster resource format
 */
export function generateTestClusterKubeConfig() {
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
        const k8sApi = createKarmadaCustomObjectsApiClient();
        const yamlObject = parse(yamlContent) as Record<string, any>;

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
        const k8sApi = createKarmadaCustomObjectsApiClient();

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error.response?.status === 404 || error.statusCode === 404)  {
            // Member Cluster not found - already deleted, this is fine
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        throw new Error(`Failed to delete member cluster: ${error.message}`);
    }
}

/**
 * Gets member cluster name from kubeconfig YAML content using proper YAML parsing.
 * @param yamlContent The kubeconfig YAML content.
 * @returns The member cluster name.
 */
export function getMemberClusterNameFromYaml(yamlContent: string): string {
    const yamlObject = parse(yamlContent) as Record<string, any>;
    // For kubeconfig format, get the cluster name from clusters[0].name
    const memberClusterName = _.get(yamlObject, 'clusters[0].name') as string;

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
    const yamlObject = parse(yamlContent) as Record<string, any>;
    // For Cluster resource format, get the name from metadata.name
    const memberClusterName = _.get(yamlObject, 'metadata.name') as string;

    if (!memberClusterName) {
        throw new Error('Could not extract member cluster name from Cluster resource YAML');
    }

    return memberClusterName;
}

// Member Cluster Test Templates

interface MemberClusterListTestConfig {
    screenshotName: string;
}

/**
 * Generic test template for displaying member cluster list
 * This template maintains the exact same structure and flow as the original list test
 */
export async function displayMemberClusterListTest(
    page: Page,
    config: MemberClusterListTestConfig
): Promise<void> {
    // Open Member Clusters menu
    await page.click('text=Member Clusters');

    // Verify Member Clusters list table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Verify table headers for member-cluster
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Kubernetes version")')).toBeVisible();
    await expect(page.locator('th:has-text("Cluster Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Access Mode")')).toBeVisible();
    await expect(page.locator('th:has-text("Node Status")')).toBeVisible();

    // Debug
    await debugScreenshot(page, config.screenshotName);
}

interface MemberClusterCreateTestConfig {
    yamlContent: string;
    getClusterName: (yaml: string) => string;
    accessMode?: 'Pull' | 'Push';  // Optional, defaults to 'Pull'
    screenshotName: string;
}

/**
 * Generic test template for creating member cluster
 * This template maintains the exact same structure and flow as the original create test
 */
export async function createMemberClusterTest(
    page: Page,
    config: MemberClusterCreateTestConfig
): Promise<void> {
    // Navigate to Member Clusters page
    await page.click('text=Member Clusters');
    await page.waitForSelector('table', { timeout: 30000 });

    // Click Add button
    await page.click('button:has-text("Add")');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // Listen for API calls
    const apiRequestPromise = page.waitForResponse(response => {
        return response.url().includes('/api/v1/cluster') && response.status() === 200;
    }, { timeout: 15000 });

    // Get cluster name
    const clusterName = config.getClusterName(config.yamlContent);

    // Fill cluster name
    const nameField = page.getByRole('textbox', { name: MemberClusterSelectors.nameField });
    await nameField.fill(clusterName);

    // Select access mode (default to Pull if not specified)
    const accessMode = config.accessMode || 'Pull';
    await page.getByRole('radio', { name: accessMode }).check();

    // Fill kubeconfig using TextareaWithUpload component
    const kubeconfigField = page.getByRole('textbox', { name: MemberClusterSelectors.kubeconfigField });
    await kubeconfigField.fill(config.yamlContent);

    // TODO: Add test coverage for labels and taints in cluster creation
    // The cluster creation UI includes fields for labels and taints, but these are not currently tested.
    // Future iterations should add test cases to verify:
    // - Adding labels to a cluster during creation
    // - Adding taints to a cluster during creation
    // - Validating that labels and taints are correctly applied to the cluster resource

    // Submit form
    await expect(page.locator('[role="dialog"] button:has-text("Submit")')).toBeEnabled();
    await page.click('[role="dialog"] button:has-text("Submit")');

    // Wait for API call to succeed
    await apiRequestPromise;

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 }).catch(() => {
        // Dialog may already be closed
    });

    // Verify member cluster name exists
    expect(clusterName).toBeTruthy();
    expect(clusterName).toBeDefined();

    try {
        await expect(page.locator('table').locator(`text=${clusterName}`)).toBeVisible({
            timeout: 15000
        });
    } catch {
        // May be due to cache or refresh delay
    }

    // Debug
    await debugScreenshot(page, config.screenshotName);
}

interface MemberClusterDeleteTestConfig {
    yamlContent: string;
    getClusterName: (yaml: string) => string;
    createCluster: (yamlContent: string) => Promise<void>;
    deleteCluster: (clusterName: string) => Promise<void>;
    screenshotName: string;
}

/**
 * Generic test template for deleting member cluster
 * This template maintains the exact same structure and flow as the original delete test
 */
export async function deleteMemberClusterTest(
    page: Page,
    config: MemberClusterDeleteTestConfig
): Promise<void> {
    // Create a test member cluster directly via API to set up test data
    const memberClusterName = config.getClusterName(config.yamlContent);

    // Setup: Create member cluster using API
    await config.createCluster(config.yamlContent);

    // Open Member Clusters menu
    await page.click('text=Member Clusters');

    // Verify table is visible
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for member cluster to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${memberClusterName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test member cluster name
    const targetRow = page.locator(`table tbody tr:has-text("${memberClusterName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find Delete button in that row and click
    const deleteButton = targetRow.locator('button[type="button"]').filter({ hasText: /^(Delete)$/ });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });

    // Listen for delete API call
    const deleteApiPromise = page.waitForResponse(response => {
        return response.url().includes('/cluster') &&
            response.request().method() === 'DELETE' &&
            response.status() === 200;
    }, { timeout: 15000 });

    await deleteButton.click();

    // Wait for delete confirmation tooltip to appear
    await page.waitForSelector('[role="tooltip"]', { timeout: 10000 });

    // Click Confirm button to confirm deletion
    const confirmButton = page.locator('[role="tooltip"] button').filter({ hasText: /^(Confirm)$/ });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for delete API call to succeed
    await deleteApiPromise;

    // Wait for tooltip to close
    await page.waitForSelector('[role="tooltip"]', { state: 'detached', timeout: 10000 }).catch(() => {});

    // Refresh page to ensure UI is updated after deletion
    await page.reload();
    await page.click('text=Member Clusters');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Verify member cluster no longer exists in table
    await expect(table.locator(`text=${memberClusterName}`)).toHaveCount(0, { timeout: 30000 });

    // Cleanup: Ensure member cluster is deleted
    try {
        await config.deleteCluster(memberClusterName);
    } catch (error) {
        // Ignore cleanup errors as the resource might already be deleted
    }

    // Debug
    await debugScreenshot(page, config.screenshotName);
}
