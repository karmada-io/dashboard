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

import { Page, Locator } from '@playwright/test';
import * as k8s from '@kubernetes/client-node';
import { ApiConstructor } from '@kubernetes/client-node';
import { parse } from 'yaml';
import { expect } from '@playwright/test';
import _ from 'lodash';

// Type utilities
export type DeepRequired<T> = {
    [K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : T[K];
};


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
 * @returns Kubernetes API client instance
 */
export function createKarmadaApiClient<ApiType extends k8s.ApiType>(apiClientType: ApiConstructor<ApiType>): ApiType{
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
            return kc.makeApiClient(apiClientType);
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
    return kc.makeApiClient(apiClientType);
}

/**
 * Setup dashboard authentication and navigate to dashboard main page
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
 * Generic function to extract resource name from YAML content
 */
export function getResourceNameFromYaml(yamlContent: string, resourceType: string): string {
    const yamlObject = parse(yamlContent) as Record<string, string>;
    const resourceName = _.get(yamlObject, 'metadata.name');

    if (!resourceName) {
        throw new Error(`Could not extract ${resourceType} name from YAML`);
    }

    return resourceName;
}

/**
 * Sets Monaco editor content and triggers React onChange callback
 * This replaces the duplicated Monaco editor interaction code across all test files
 */
export async function setMonacoEditorContent(page: Page, yamlContent: string): Promise<void> {
    // Set Monaco editor DOM content
    await page.evaluate((yaml) => {
        const textarea = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement;
        if (textarea) {
            textarea.value = yaml;
            textarea.focus();
        }
    }, yamlContent);

    /* eslint-disable */
    // Call React onChange callback to update component state
    await page.evaluate((yaml) => {
        const findReactFiber = (element: any) => {
            const keys = Object.keys(element);
            return keys.find(key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'));
        };

        const monacoContainer = document.querySelector('.monaco-editor');
        if (monacoContainer) {
            const fiberKey = findReactFiber(monacoContainer);
            if (fiberKey) {
                let fiber = (monacoContainer as any)[fiberKey];

                while (fiber) {
                    if (fiber.memoizedProps && fiber.memoizedProps.onChange) {
                        fiber.memoizedProps.onChange(yaml);
                        return;
                    }
                    fiber = fiber.return;
                }
            }
        }

        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
            const fiberKey = findReactFiber(dialog);
            if (fiberKey) {
                let fiber = (dialog as any)[fiberKey];

                const traverse = (node: any, depth = 0) => {
                    if (!node || depth > 20) return false;

                    if (node.memoizedProps && node.memoizedProps.onChange) {
                        node.memoizedProps.onChange(yaml);
                        return true;
                    }

                    if (node.child && traverse(node.child, depth + 1)) return true;
                    if (node.sibling && traverse(node.sibling, depth + 1)) return true;

                    return false;
                };

                traverse(fiber);
            }
        }
    }, yamlContent);
    /* eslint-enable */
}

/**
 * Debug helper for taking screenshots when DEBUG=true
 */
export async function debugScreenshot(page: Page, filename: string): Promise<void> {
    if (process.env.DEBUG === 'true') {
        await page.screenshot({ path: filename, fullPage: true });
    }
}

/**
 * Waits for a resource to appear in the list and returns the target row
 */
export async function waitForResourceInList(page: Page, resourceName: string): Promise<Locator> {
    const table = page.locator('table');
    await expect(table.locator(`text=${resourceName}`)).toBeVisible({ timeout: 30000 });

    const targetRow = page.locator(`table tbody tr:has-text("${resourceName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    return targetRow;
}
