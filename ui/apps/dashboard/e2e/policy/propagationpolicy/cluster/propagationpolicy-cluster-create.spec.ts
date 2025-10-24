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
    generateTestClusterPropagationPolicyYaml,
    deleteK8sClusterPropagationPolicy,
    getClusterPropagationPolicyNameFromYaml,
    createPropagationPolicyResourceTest
} from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should create a new propagationpolicy', async ({ page }) => {
    const testClusterPropagationPolicyYaml = generateTestClusterPropagationPolicyYaml();

    await createPropagationPolicyResourceTest(page, {
        resourceType: 'clusterpropagationpolicy',
        tabName: 'Cluster level',
        apiEndpoint: '/propagationpolicy',
        yamlContent: testClusterPropagationPolicyYaml,
        getResourceName: getClusterPropagationPolicyNameFromYaml,
        deleteResource: deleteK8sClusterPropagationPolicy,
        screenshotName: 'debug-clusterpropagationpolicy-create.png'
    });
});
