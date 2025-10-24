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
    generateTestPropagationPolicyYaml,
    createK8sPropagationPolicy,
    getPropagationPolicyNameFromYaml,
    deleteK8sPropagationPolicy,
    viewPropagationPolicyResourceTest
} from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view propagationpolicy details', async ({ page }) => {
    const testPropagationPolicyYaml = generateTestPropagationPolicyYaml();
    await viewPropagationPolicyResourceTest(page, {
        resourceType: 'propagationpolicy',
        tabName: 'Namespace level',
        yamlContent: testPropagationPolicyYaml,
        getResourceName: getPropagationPolicyNameFromYaml,
        createResource: createK8sPropagationPolicy,
        deleteResource: deleteK8sPropagationPolicy,
        screenshotName: 'debug-propagationpolicy-view.png'
    });
});
