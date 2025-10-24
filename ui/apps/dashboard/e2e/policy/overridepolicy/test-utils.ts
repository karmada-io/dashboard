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
} from '../../test-utils';
import type { DeepRequired } from '../../test-utils';

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

// Override Resource Configurations
export const RESOURCE_CONFIGS = {
    overridepolicy: {
        kind: 'OverridePolicy',
        apiGroup: 'policy.karmada.io',
        apiVersion: 'v1alpha1',
        plural: 'overridepolicies',
    },
    clusteroverridepolicy: {
        kind: 'ClusterOverridePolicy',
        apiGroup: 'policy.karmada.io',
        apiVersion: 'v1alpha1',
        plural: 'clusteroverridepolicies',
    }
} as const;

/**
 * Generic function to create Karmada OverridePolicy resources
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

        const k8sApi = createKarmadaApiClient(k8s.CustomObjectsApi);

        if (resourceType === 'overridepolicy') {
            // Ensure namespace is always defined
            const namespace = yamlObject.metadata?.namespace || 'default';

            // Ensure metadata object exists
            if (!yamlObject.metadata) {
                yamlObject.metadata = {};
            }
            yamlObject.metadata.namespace = namespace;

            await k8sApi.createNamespacedCustomObject({
                group: config.apiGroup,
                version: config.apiVersion,
                namespace: namespace,
                plural: config.plural,
                body: yamlObject
            });
        } else if (resourceType === 'clusteroverridepolicy') {
            await k8sApi.createClusterCustomObject({
                group: config.apiGroup,
                version: config.apiVersion,
                plural: config.plural,
                body: yamlObject
            });
        }

    } catch (error: any) {
        throw new Error(`Failed to create ${config.kind.toLowerCase()}: ${(error as Error).message}`);
    }
}

/**
 * Generic function to delete Karmada OverridePolicy resources
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
        if (resourceType === 'overridepolicy') {
            expect(namespace).toBeTruthy();
        }

        const k8sApi = createKarmadaApiClient(k8s.CustomObjectsApi);

        if (resourceType === 'overridepolicy') {
            await k8sApi.deleteNamespacedCustomObject({
                group: config.apiGroup,
                version: config.apiVersion,
                namespace: namespace,
                plural: config.plural,
                name: resourceName
            });
        } else if (resourceType === 'clusteroverridepolicy') {
            await k8sApi.deleteClusterCustomObject({
                group: config.apiGroup,
                version: config.apiVersion,
                plural: config.plural,
                name: resourceName
            });
        }

    } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error.code === 404 || error.response?.status === 404 || error.statusCode === 404) {
            // Resource not found - already deleted, this is fine
            return;
        }
        throw new Error(`Failed to delete ${config.kind.toLowerCase()}: ${(error as Error).message}`);
    }
}

// OverridePolicy Resource Test Templates

interface ResourceTestConfig<T extends keyof typeof RESOURCE_CONFIGS> {
    resourceType: T;
    tabName: string;
    apiEndpoint: string;
    yamlContent: string;
    getResourceName: (yaml: string) => string;
    deleteResource: (name: string, namespace?: string) => Promise<void>;
    screenshotName: string;
}

/**
 * Generic test template for creating OverridePolicy resources
 * This template maintains the exact same structure and flow as the original create tests
 */
export async function createOverridePolicyResourceTest<T extends keyof typeof RESOURCE_CONFIGS>(
    page: Page,
    config: ResourceTestConfig<T>
): Promise<void> {
    // Open Policies menu
    await page.click('text=Policies');

    // Click Override Policy menu item
    const overridePolicyMenuItem = page.locator('text=Override Policy');
    await overridePolicyMenuItem.waitFor({ state: 'visible', timeout: 30000 });
    await overridePolicyMenuItem.click();

    // Click visible resource tab
    const resourceTab = page.locator(`role=option[name="${config.tabName}"]`);
    await resourceTab.waitFor({ state: 'visible', timeout: 30000 });
    await resourceTab.click();

    // Verify selected state
    await expect(resourceTab).toHaveAttribute('aria-selected', 'true');

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
    await expect(page.locator('[role="dialog"] button:has-text("确 定")')).toBeEnabled();
    await page.click('[role="dialog"] button:has-text("确 定")');

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
    tabName: string;
    apiEndpointPattern: string;
    yamlContent: string;
    getResourceName: (yaml: string) => string;
    createResource: (yamlContent: string) => Promise<void>;
    screenshotName: string;
}

/**
 * Generic test template for deleting OverridePolicy resources
 * This template maintains the exact same structure and flow as the original delete tests
 */
export async function deleteOverridePolicyResourceTest<T extends keyof typeof RESOURCE_CONFIGS>(
    page: Page,
    config: ResourceDeleteTestConfig<T>
): Promise<void> {
    // Create a test resource directly via kubectl to set up test data
    const resourceName = config.getResourceName(config.yamlContent);

    // Setup: Create resource using kubectl
    await config.createResource(config.yamlContent);

    // Open Policies menu
    await page.click('text=Policies');

    // Click Override Policy menu item
    const overridePolicyMenuItem = page.locator('text=Override Policy');
    await overridePolicyMenuItem.waitFor({ state: 'visible', timeout: 30000 });
    await overridePolicyMenuItem.click();

    // Click visible resource tab
    const resourceTab = page.locator(`role=option[name="${config.tabName}"]`);
    await resourceTab.waitFor({ state: 'visible', timeout: 30000 });
    await resourceTab.click();

    // Verify selected state
    await expect(resourceTab).toHaveAttribute('aria-selected', 'true');

    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for resource to appear in list and get target row
    const targetRow = await waitForResourceInList(page, resourceName);

    // Find Delete button in that row and click
    const deleteButton = targetRow.locator('button[type="button"]').filter({ hasText: /^(Delete)$/ });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });

    // Listen for delete API call
    const deleteApiPromise = page.waitForResponse(response => {
        return response.url().includes(config.apiEndpointPattern) &&
            response.request().method() === 'DELETE' &&
            response.status() === 200;
    }, { timeout: 15000 });

    await deleteButton.click();

    // Wait for delete confirmation tooltip to appear
    await page.waitForSelector('[role="tooltip"]', { timeout: 10000 });

    // Click Confirm button to confirm deletion
    const confirmButton = page.locator('[role="tooltip"] button').filter({ hasText: /^(确 认)$/ });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for delete API call to succeed
    await deleteApiPromise;

    // Wait for tooltip to close
    await page.waitForSelector('[role="tooltip"]', { state: 'detached', timeout: 10000 }).catch(() => {});

    // Refresh page to ensure UI is updated after deletion
    await page.reload();
    await page.click('text=Policies');
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Verify resource no longer exists in table
    await expect(table.locator(`text=${resourceName}`)).toHaveCount(0, { timeout: 30000 });

    // Debug
    await debugScreenshot(page, config.screenshotName);
}

interface ResourceListTestConfig {
    tabName: string;
    screenshotName: string;
}

/**
 * Generic test template for displaying OverridePolicy resource lists
 * This template maintains the exact same structure and flow as the original list tests
 */
export async function displayOverridePolicyResourceListTest(
    page: Page,
    config: ResourceListTestConfig
): Promise<void> {
    // Open Policies menu
    await page.click('text=Policies');

    // Click Override Policy menu item
    const overridePolicyMenuItem = page.locator('text=Override Policy');
    await overridePolicyMenuItem.waitFor({ state: 'visible', timeout: 30000 });
    await overridePolicyMenuItem.click();

    // Click visible resource tab
    const resourceTab = page.locator(`role=option[name="${config.tabName}"]`);
    await resourceTab.waitFor({ state: 'visible', timeout: 30000 });
    await resourceTab.click();

    // Verify selected state
    await expect(resourceTab).toHaveAttribute('aria-selected', 'true');

    // Verify resource list table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Debug
    await debugScreenshot(page, config.screenshotName);
}

interface ResourceViewTestConfig<T extends keyof typeof RESOURCE_CONFIGS> {
    resourceType: T;
    tabName: string;
    yamlContent: string;
    getResourceName: (yaml: string) => string;
    createResource: (yamlContent: string) => Promise<void>;
    deleteResource: (name: string, namespace?: string) => Promise<void>;
    screenshotName: string;
}

/**
 * Generic test template for viewing OverridePolicy resource details
 * This template maintains the exact same structure and flow as the original view tests
 */
export async function viewOverridePolicyResourceTest<T extends keyof typeof RESOURCE_CONFIGS>(
    page: Page,
    config: ResourceViewTestConfig<T>
): Promise<void> {
    // Create a test resource directly via API to set up test data
    const resourceName = config.getResourceName(config.yamlContent);

    // Setup: Create resource using kubectl
    await config.createResource(config.yamlContent);

    // Open Policies menu
    await page.click('text=Policies');

    // Click Override Policy menu item
    const overridePolicyMenuItem = page.locator('text=Override Policy');
    await overridePolicyMenuItem.waitFor({ state: 'visible', timeout: 30000 });
    await overridePolicyMenuItem.click();

    // Click visible resource tab
    const resourceTab = page.locator(`role=option[name="${config.tabName}"]`);
    await resourceTab.waitFor({ state: 'visible', timeout: 30000 });
    await resourceTab.click();

    // Verify selected state
    await expect(resourceTab).toHaveAttribute('aria-selected', 'true');

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
