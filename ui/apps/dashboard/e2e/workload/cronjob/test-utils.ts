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

import { setupDashboardAuthentication, createK8sResource, deleteK8sResource, getResourceNameFromYaml } from '../../test-utils';

export { setupDashboardAuthentication };

/**
 * Generate test YAML with timestamp
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
          - name: busybox
            image: busybox:latest
            command:
            - echo
            - "Hello from CronJob"
          restartPolicy: OnFailure`;
}

/**
 * Creates a Kubernetes CronJob using the shared K8s utility.
 * @param yamlContent The YAML content of the cronjob.
 * @returns A Promise that resolves when the cronjob is created.
 */
export async function createK8sCronJob(yamlContent: string): Promise<void> {
    return createK8sResource('cronjob', yamlContent);
}

/**
 * Deletes a Kubernetes CronJob using the shared K8s utility.
 * @param cronJobName The name of the cronjob to delete.
 * @param namespace The namespace of the cronjob (default: 'default').
 * @returns A Promise that resolves when the cronjob is deleted.
 */
export async function deleteK8sCronJob(cronJobName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('cronjob', cronJobName, namespace);
}

/**
 * Gets cronjob name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The cronjob name.
 */
export function getCronJobNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'cronjob');
}
