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
