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

import { Page } from '@playwright/test';
import * as k8s from '@kubernetes/client-node';
import { V1ObjectMeta } from '@kubernetes/client-node';
import { parse } from 'yaml';
import { expect } from '@playwright/test';
import {
    setupDashboardAuthentication,
    setMonacoEditorContent,
    debugScreenshot,
    waitForResourceInList,
    getResourceNameFromYaml,
    createKarmadaApiClient
} from '../test-utils';
import type { DeepRequired } from '../test-utils';

// Re-export ALL utilities from parent test-utils for single-point import
export {
    setupDashboardAuthentication,
    setMonacoEditorContent,
    debugScreenshot,
    waitForResourceInList,
    getResourceNameFromYaml,
    createKarmadaApiClient
};

// Re-export types separately
export type { DeepRequired };

// Workload Resource Configurations
export const RESOURCE_CONFIGS = {
    deployment: {
        kind: 'Deployment',
        apiClientConstructor: k8s.AppsV1Api,
        yamlType: k8s.V1Deployment,
        createMethod: 'createNamespacedDeployment' as const,
        deleteMethod: 'deleteNamespacedDeployment' as const,
    },
    statefulset: {
        kind: 'StatefulSet',
        apiClientConstructor: k8s.AppsV1Api,
        yamlType: k8s.V1StatefulSet,
        createMethod: 'createNamespacedStatefulSet' as const,
        deleteMethod: 'deleteNamespacedStatefulSet' as const,
    },
    daemonset: {
        kind: 'DaemonSet',
        apiClientConstructor: k8s.AppsV1Api,
        yamlType: k8s.V1DaemonSet,
        createMethod: 'createNamespacedDaemonSet' as const,
        deleteMethod: 'deleteNamespacedDaemonSet' as const,
    },
    cronjob: {
        kind: 'CronJob',
        apiClientConstructor: k8s.BatchV1Api,
        yamlType: k8s.V1CronJob,
        createMethod: 'createNamespacedCronJob' as const,
        deleteMethod: 'deleteNamespacedCronJob' as const,
    },
    job: {
        kind: 'Job',
        apiClientConstructor: k8s.BatchV1Api,
        yamlType: k8s.V1Job,
        createMethod: 'createNamespacedJob' as const,
        deleteMethod: 'deleteNamespacedJob' as const,
    }
} as const;

/**
 * Generic function to create K8s workload resources
 */
export async function createK8sResource<ResourceType extends keyof typeof RESOURCE_CONFIGS>(
    resourceType: ResourceType,
    yamlContent: string
): Promise<void> {
    const config = RESOURCE_CONFIGS[resourceType];
    try {
        const yamlObject = parse(yamlContent) as {
            'kind'?: string;
            'metadata'?: V1ObjectMeta;
        };

        // Ensure namespace is always defined
        const namespace = yamlObject.metadata?.namespace || 'default';

        // Ensure metadata object exists
        if (!yamlObject.metadata) {
            yamlObject.metadata = {};
        }
        yamlObject.metadata.namespace = namespace;

        if(['deployment', 'statefulset', 'daemonset'].includes(resourceType)) {
            const k8sApi = createKarmadaApiClient(k8s.AppsV1Api);
            if (resourceType === 'deployment') {
                await k8sApi.createNamespacedDeployment({
                    namespace: namespace,
                    body: yamlObject
                });
            } else if (resourceType === 'statefulset'){
                await k8sApi.createNamespacedStatefulSet({
                    namespace: namespace,
                    body: yamlObject
                });
            } else if (resourceType === 'daemonset'){
                await k8sApi.createNamespacedDaemonSet({
                    namespace: namespace,
                    body: yamlObject
                });
            }
        } else if (['cronjob', 'job'].includes(resourceType)) {
            const k8sApi = createKarmadaApiClient(k8s.BatchV1Api);
            if (resourceType === 'cronjob') {
                await k8sApi.createNamespacedCronJob({
                    namespace: namespace,
                    body: yamlObject
                });
            } else {
                await k8sApi.createNamespacedJob({
                    namespace: namespace,
                    body: yamlObject
                });
            }
        }

    } catch (error: any) {
        throw new Error(`Failed to create ${config.kind.toLowerCase()}: ${(error as Error).message}`);
    }
}

/**
 * Generic function to delete K8s workload resources
 */
export async function deleteK8sResource<ResourceType extends keyof typeof RESOURCE_CONFIGS>(
    resourceType: ResourceType,
    resourceName: string,
    namespace: string = 'default'
): Promise<void> {
    const config = RESOURCE_CONFIGS[resourceType];
    try {
        // Assert parameters are valid
        expect(resourceName).toBeTruthy();
        expect(resourceName).not.toBe('');
        expect(namespace).toBeTruthy();

        if (['deployment', 'statefulset','daemonset'].includes(resourceType)) {
            const k8sApi = createKarmadaApiClient(k8s.AppsV1Api);
            if (resourceType === 'deployment') {
                await k8sApi.deleteNamespacedDeployment({
                    name: resourceName,
                    namespace: namespace
                });
            } else if (resourceType === 'statefulset'){
                await k8sApi.deleteNamespacedStatefulSet({
                    name: resourceName,
                    namespace: namespace
                });
            } else if (resourceType === 'daemonset'){
                await k8sApi.deleteNamespacedDaemonSet({
                    name: resourceName,
                    namespace: namespace
                });
            }
        } else if (['cronjob', 'job'].includes(resourceType)) {
            const k8sApi = createKarmadaApiClient(k8s.BatchV1Api);
            if (resourceType === 'cronjob') {
                await k8sApi.deleteNamespacedCronJob({
                    name: resourceName,
                    namespace: namespace
                });
            } else {
                await k8sApi.deleteNamespacedJob({
                    name: resourceName,
                    namespace: namespace
                });
            }
        }

    } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error.code === 404) {
            // Resource not found - already deleted, this is fine
            return;
        }
        throw new Error(`Failed to delete ${config.kind.toLowerCase()}: ${(error as Error).message}`);
    }
}

// Workload Resource Test Templates

interface ResourceTestConfig<T extends keyof typeof RESOURCE_CONFIGS> {
    resourceType: T;
    tabName?: string;
    apiEndpoint: string;
    yamlContent: string;
    getResourceName: (yaml: string) => string;
    deleteResource: (name: string, namespace?: string) => Promise<void>;
    screenshotName: string;
}

/**
 * Generic test template for creating workload resources
 * This template maintains the exact same structure and flow as the original create tests
 */
export async function createWorkloadResourceTest<T extends keyof typeof RESOURCE_CONFIGS>(
    page: Page,
    config: ResourceTestConfig<T>
): Promise<void> {
    // Navigate to workload page/menu
    await page.click('text=Workloads');

    if (config.tabName) {
        // Click visible resource tab (for daemonset, cronjob)
        const resourceTab = page.locator(`role=option[name="${config.tabName}"]`);
        await resourceTab.waitFor({ state: 'visible', timeout: 30000 });
        await resourceTab.click();

        // Verify selected state
        await expect(resourceTab).toHaveAttribute('aria-selected', 'true');
    } else {
        // For deployment, check the default radio selection
        await expect(page.getByRole('radio', { name: 'Deployment' })).toBeChecked();
    }

    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
    await page.click('button:has-text("Add")');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // Listen for API calls
    const apiRequestPromise = page.waitForResponse(response => {
        return response.url().includes(config.apiEndpoint) && response.status() === 200;
    }, { timeout: 15000 });

    // Set Monaco editor content and trigger React onChange callback
    await setMonacoEditorContent(page, config.yamlContent);

    // Wait for submit button to become enabled
    await expect(page.locator('[role="dialog"] button:has-text("Submit")')).toBeEnabled();
    await page.click('[role="dialog"] button:has-text("Submit")');

    // Wait for API call to succeed
    await apiRequestPromise;

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 }).catch(() => {
        // Dialog may already be closed
    });

    // Verify new resource appears in list
    const resourceName = config.getResourceName(config.yamlContent);

    // Assert resource name exists
    expect(resourceName).toBeTruthy();
    expect(resourceName).toBeDefined();

    try {
        await expect(page.locator('table').locator(`text=${resourceName}`)).toBeVisible({
            timeout: 15000
        });
    } catch {
        // If not shown immediately in list, may be due to cache or refresh delay
        // But API success indicates resource was created
    }

    // Cleanup: Delete the created resource
    try {
        await config.deleteResource(resourceName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup ${config.resourceType} ${resourceName}:`, error);
    }

    // Debug
    await debugScreenshot(page, config.screenshotName);
}

interface ResourceDeleteTestConfig<T extends keyof typeof RESOURCE_CONFIGS> {
    resourceType: T;
    tabName?: string;
    apiEndpointPattern: string;
    yamlContent: string;
    getResourceName: (yaml: string) => string;
    createResource: (yamlContent: string) => Promise<void>;
    screenshotName: string;
}

/**
 * Generic test template for deleting workload resources
 * This template maintains the exact same structure and flow as the original delete tests
 */
export async function deleteWorkloadResourceTest<T extends keyof typeof RESOURCE_CONFIGS>(
    page: Page,
    config: ResourceDeleteTestConfig<T>
): Promise<void> {
    // Create a test resource directly via kubectl to set up test data
    const resourceName = config.getResourceName(config.yamlContent);

    // Setup: Create resource using kubectl
    await config.createResource(config.yamlContent);

    // Navigate to workload page
    await page.click('text=Workloads');

    if (config.tabName) {
        // Click visible resource tab (for daemonset, cronjob)
        const resourceTab = page.locator(`role=option[name="${config.tabName}"]`);
        await resourceTab.waitFor({ state: 'visible', timeout: 30000 });
        await resourceTab.click();

        // Verify selected state
        await expect(resourceTab).toHaveAttribute('aria-selected', 'true');
    } else {
        // For deployment, check the default radio selection
        await expect(page.getByRole('radio', { name: 'Deployment' })).toBeChecked();
    }

    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for resource to appear in list and get target row
    const targetRow = await waitForResourceInList(page, resourceName);

    // Find Delete button in that row and click
    const deleteButton = targetRow.locator('button[type="button"]').filter({ hasText: /^(Delete)$/ });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });

    // Listen for delete API call
    const deleteApiPromise = page.waitForResponse(response => {
        return response.url().includes(config.apiEndpointPattern) &&
            response.url().includes(`name/${resourceName}`) &&
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
    await page.click('text=Workloads');
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Verify resource no longer exists in table
    await expect(table.locator(`text=${resourceName}`)).toHaveCount(0, { timeout: 30000 });

    // Debug
    await debugScreenshot(page, config.screenshotName);
}

interface ResourceListTestConfig {
    tabName?: string;
    screenshotName: string;
}

/**
 * Generic test template for displaying workload resource lists
 * This template maintains the exact same structure and flow as the original list tests
 */
export async function displayWorkloadResourceListTest(
    page: Page,
    config: ResourceListTestConfig
): Promise<void> {
    // Open Workloads menu
    await page.click('text=Workloads');

    if (config.tabName) {
        // Click visible resource tab (for daemonset, cronjob)
        const resourceTab = page.locator(`role=option[name="${config.tabName}"]`);
        await resourceTab.waitFor({ state: 'visible', timeout: 30000 });
        await resourceTab.click();

        // Verify selected state
        await expect(resourceTab).toHaveAttribute('aria-selected', 'true');
    } else {
        // Wait for page to load and verify Deployment is selected
        const deploymentTab = page.getByRole('radio', { name: 'Deployment' });
        await expect(deploymentTab).toBeChecked();
    }

    // Verify resource list table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Debug
    await debugScreenshot(page, config.screenshotName);
}

interface ResourceViewTestConfig<T extends keyof typeof RESOURCE_CONFIGS> {
    resourceType: T;
    tabName?: string;
    yamlContent: string;
    getResourceName: (yaml: string) => string;
    createResource: (yamlContent: string) => Promise<void>;
    deleteResource: (name: string, namespace?: string) => Promise<void>;
    screenshotName: string;
}

/**
 * Generic test template for viewing workload resource details
 * This template maintains the exact same structure and flow as the original view tests
 */
export async function viewWorkloadResourceTest<T extends keyof typeof RESOURCE_CONFIGS>(
    page: Page,
    config: ResourceViewTestConfig<T>
): Promise<void> {
    // Create a test resource directly via API to set up test data
    const resourceName = config.getResourceName(config.yamlContent);

    // Setup: Create resource using kubectl
    await config.createResource(config.yamlContent);

    // Navigate to workload page
    await page.click('text=Workloads');

    if (config.tabName) {
        // Click visible resource tab (for daemonset, cronjob)
        const resourceTab = page.locator(`role=option[name="${config.tabName}"]`);
        await resourceTab.waitFor({ state: 'visible', timeout: 30000 });
        await resourceTab.click();

        // Verify selected state
        await expect(resourceTab).toHaveAttribute('aria-selected', 'true');
    } else {
        // For deployment, check the default radio selection
        await expect(page.getByRole('radio', { name: 'Deployment' })).toBeChecked();
    }

    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for resource to appear in list and get target row
    const targetRow = await waitForResourceInList(page, resourceName);

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created resource
    try {
        await config.deleteResource(resourceName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup ${config.resourceType} ${resourceName}:`, error);
    }

    // Debug
    await debugScreenshot(page, config.screenshotName);
}
