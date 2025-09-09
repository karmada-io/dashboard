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
 * Generate test Job YAML with timestamp
 */
export function generateTestJobYaml() {
    const timestamp = Date.now();
    return `apiVersion: batch/v1
kind: Job
metadata:
  name: test-job-${timestamp}
  namespace: default
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
        - echo Hello from the Kubernetes job; sleep 10
      restartPolicy: Never
  backoffLimit: 4`;
}

/**
 * Creates a Kubernetes Job using the shared K8s utility.
 * @param yamlContent The YAML content of the job.
 * @returns A Promise that resolves when the job is created.
 */
export async function createK8sJob(yamlContent: string): Promise<void> {
    return createK8sResource('job', yamlContent);
}

/**
 * Deletes a Kubernetes Job using the shared K8s utility.
 * @param jobName The name of the job to delete.
 * @param namespace The namespace of the job (default: 'default').
 * @returns A Promise that resolves when the job is deleted.
 */
export async function deleteK8sJob(jobName: string, namespace: string = 'default'): Promise<void> {
    return deleteK8sResource('job', jobName, namespace);
}

/**
 * Gets job name from YAML content using shared utility.
 * @param yamlContent The YAML content.
 * @returns The job name.
 */
export function getJobNameFromYaml(yamlContent: string): string {
    return getResourceNameFromYaml(yamlContent, 'job');
}
