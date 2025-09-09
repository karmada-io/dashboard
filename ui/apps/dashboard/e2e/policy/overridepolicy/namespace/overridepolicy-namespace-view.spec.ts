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

import { test } from '@playwright/test';
import {
    setupDashboardAuthentication,
    generateTestOverridePolicyYaml,
    createK8sOverridePolicy,
    getOverridePolicyNameFromYaml,
    deleteK8sOverridePolicy,
    viewOverridePolicyResourceTest
} from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view overridepolicy details', async ({ page }) => {
    const testOverridePolicyYaml = generateTestOverridePolicyYaml();
    await viewOverridePolicyResourceTest(page, {
        resourceType: 'overridepolicy',
        tabName: 'Namespace level',
        yamlContent: testOverridePolicyYaml,
        getResourceName: getOverridePolicyNameFromYaml,
        createResource: createK8sOverridePolicy,
        deleteResource: deleteK8sOverridePolicy,
        screenshotName: 'debug-override-view.png'
    });
});
