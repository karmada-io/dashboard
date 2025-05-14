// 调度策略（SchedulingPolicy）YAML 模板，含详细注释和常用字段
export const schedulingPolicyTemplates = [
  {
    type: 'NamespaceScoped',
    label: '命名空间级别调度策略（PropagationPolicy）',
    yaml: `# PropagationPolicy 示例（命名空间级别调度策略）
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: example-namespace-policy   # 策略名称
  namespace: default              # 策略作用的命名空间
spec:
  resourceSelectors:              # 需要调度的资源选择器
    - apiVersion: v1
      kind: Service
      name: example-service
  placement:
    clusterAffinity:              # 集群亲和性，指定目标集群
      clusterNames:
        - member1
        - member2
    replicaScheduling:
      replicaSchedulingType: Divided  # 支持 Divided/Duplicated
      replicaDivisionPreference: Weighted  # 支持 Weighted/Aggregated
      weightPreference:
        staticWeightList:
          - targetCluster:
              clusterNames:
                - member1
            weight: 1
          - targetCluster:
              clusterNames:
                - member2
            weight: 2
    spreadConstraint:             # 跨集群分布约束，可选
      - spreadByField: cluster
        minGroups: 1
        maxGroups: 2
        minReplicas: 1
        maxReplicas: 10
`,
  },
  {
    type: 'ClusterScoped',
    label: '集群级别调度策略（ClusterPropagationPolicy）',
    yaml: `# ClusterPropagationPolicy 示例（集群级别调度策略）
apiVersion: policy.karmada.io/v1alpha1
kind: ClusterPropagationPolicy
metadata:
  name: example-cluster-policy    # 策略名称
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: example-deployment
  placement:
    clusterAffinity:
      clusterNames:
        - member1
        - member2
    replicaScheduling:
      replicaSchedulingType: Divided
      replicaDivisionPreference: Weighted
      weightPreference:
        staticWeightList:
          - targetCluster:
              clusterNames:
                - member1
            weight: 1
          - targetCluster:
              clusterNames:
                - member2
            weight: 2
    spreadConstraint:
      - spreadByField: cluster
        minGroups: 1
        maxGroups: 2
        minReplicas: 1
        maxReplicas: 10
`,
  },
]; 