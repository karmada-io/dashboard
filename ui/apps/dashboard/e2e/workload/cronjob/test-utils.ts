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

import { expect } from '@playwright/test';
import * as k8s from '@kubernetes/client-node';
import { parse } from 'yaml';
import _ from 'lodash';
import { createKarmadaApiClient, setupDashboardAuthentication } from '../../test-utils';

export { setupDashboardAuthentication };

/**
 * Generate test CronJob YAML with timestamp
 */
export function generateTestCronJobYaml() {
    const timestamp = Date.now();
    return `apiVersion: batch/v1
kind: CronJob
metadata:
  name: test-cronjob-${timestamp}
  namespace: default
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: hello
            image: busybox:latest
            imagePullPolicy: IfNotPresent
            command:
            - /bin/sh
            - -c
            - date; echo Hello from the Kubernetes cluster
          restartPolicy: OnFailure`;
}

/**
 * Creates a Kubernetes CronJob using the Kubernetes JavaScript client.
 * This is a more robust way to set up test data than UI interaction.
 * @param yamlContent The YAML content of the cronjob.
 * @returns A Promise that resolves when the cronjob is created.
 */
export async function createK8sCronJob(yamlContent: string): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient(k8s.BatchV1Api);
        const yamlObject = parse(yamlContent) as k8s.V1CronJob;

        // Ensure namespace is always defined
        const namespace = yamlObject.metadata?.namespace || 'default';

        // Ensure metadata object exists
        if (!yamlObject.metadata) {
            yamlObject.metadata = {};
        }
        yamlObject.metadata.namespace = namespace;

        await k8sApi.createNamespacedCronJob({
            namespace: namespace,
            body: yamlObject
        });

    } catch (error: any) {
        throw new Error(`Failed to create cronjob: ${(error as Error).message}`);
    }
}

/**
 * Deletes a Kubernetes CronJob using the Kubernetes JavaScript client.
 * @param cronJobName The name of the cronjob to delete.
 * @param namespace The namespace of the cronjob (default: 'default').
 * @returns A Promise that resolves when the cronjob is deleted.
 */
export async function deleteK8sCronJob(cronJobName: string, namespace: string = 'default'): Promise<void> {
    try {
        const k8sApi = createKarmadaApiClient(k8s.BatchV1Api);

        // Assert parameters are valid for test cronjob
        expect(cronJobName).toBeTruthy();
        expect(cronJobName).not.toBe('');
        expect(namespace).toBeTruthy();

        await k8sApi.deleteNamespacedCronJob({
            name: cronJobName,
            namespace: namespace
        });

    } catch (error: any) {
        if (error.code === 404)  {
            // CronJob not found - already deleted, this is fine
            return;
        }
        throw new Error(`Failed to delete cronjob: ${(error as Error).message}`);
    }
}

/**
 * Gets cronjob name from YAML content using proper YAML parsing.
 * @param yamlContent The YAML content.
 * @returns The cronjob name.
 */
export function getCronJobNameFromYaml(yamlContent: string): string {
    const yamlObject = parse(yamlContent) as Record<string, string>;
    const cronJobName = _.get(yamlObject, 'metadata.name');

    if (!cronJobName) {
        throw new Error('Could not extract cronjob name from YAML');
    }

    return cronJobName;
}
