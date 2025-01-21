/*
Copyright 2024 The Karmada Authors.

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

/*
const data = {
    "member_cluster_kubeconfig": `**`,
    "sync_mode": "pull",
    "member_cluster_name": "memberx",
    "member_cluster_endpoint": "https://192.168.10.7:6443",
    "member_cluster_namespace": "example"
}

console.log(JSON.stringify(data))
*/

const data = {
  propagationData: `apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: nginx-propagation
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx
  placement:
    clusterAffinity:
      clusterNames:
        - member1
    replicaScheduling:
      replicaDivisionPreference: Weighted
      replicaSchedulingType: Divided
      weightPreference:
        staticWeightList:
          - targetCluster:
              clusterNames:
                - member1
            weight: 1
`,
  isClusterScope: false,
  namespace: 'default',
  name: 'nginx-propagation',
};
console.log(JSON.stringify(data));
