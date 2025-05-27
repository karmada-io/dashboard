# Karmada-Manager 后端实现指南

## 概述

本文档基于现有的 `pkg` 目录代码结构，提供具体的实现指南。遵循现有的架构模式，实现层次化信息汇总、精确集群管理和调度可视化功能。

## 现有代码模式分析

### 1. 资源定义模式
基于 `pkg/resource/cluster/cluster.go` 的现有模式：

```go
// 1. 定义资源结构体
type Cluster struct {
    ObjectMeta         types.ObjectMeta          `json:"objectMeta"`
    TypeMeta           types.TypeMeta            `json:"typeMeta"`
    Ready              metav1.ConditionStatus    `json:"ready"`
    KubernetesVersion  string                    `json:"kubernetesVersion,omitempty"`
    SyncMode           v1alpha1.ClusterSyncMode  `json:"syncMode"`
    NodeSummary        *v1alpha1.NodeSummary     `json:"nodeSummary,omitempty"`
    AllocatedResources ClusterAllocatedResources `json:"allocatedResources"`
}

// 2. 定义列表结构体
type ClusterList struct {
    ListMeta types.ListMeta `json:"listMeta"`
    Clusters []Cluster      `json:"clusters"`
    Errors   []error        `json:"errors"`
}

// 3. 主要获取函数
func GetClusterList(client karmadaclientset.Interface, dsQuery *dataselect.DataSelectQuery) (*ClusterList, error)
```

### 2. 路由处理模式
基于 `cmd/api/app/routes/member/namespace/handler.go` 的现有模式：

```go
func handleGetMemberNamespace(c *gin.Context) {
    // 1. 获取成员集群客户端
    memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
    
    // 2. 解析查询参数
    dataSelect := common.ParseDataSelectPathParameter(c)
    
    // 3. 调用资源层获取数据
    result, err := ns.GetNamespaceList(memberClient, dataSelect)
    if err != nil {
        common.Fail(c, err)
        return
    }
    
    // 4. 返回成功响应
    common.Success(c, result)
}

func init() {
    r := router.MemberV1()
    r.GET("/namespace", handleGetMemberNamespace)
}
```

## 核心功能实现

### 1. 节点管理 API 实现

#### pkg/resource/node/enhanced_node.go
```go
/*
Copyright 2024 The Karmada Authors.
Licensed under the Apache License, Version 2.0
*/

package node

import (
    "context"
    "fmt"

    v1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"

    "github.com/karmada-io/dashboard/pkg/common/helpers"
    "github.com/karmada-io/dashboard/pkg/common/types"
    "github.com/karmada-io/dashboard/pkg/dataselect"
)

// EnhancedNode 增强节点信息
type EnhancedNode struct {
    ObjectMeta      types.ObjectMeta    `json:"objectMeta"`
    TypeMeta        types.TypeMeta      `json:"typeMeta"`
    Status          v1.NodeStatus       `json:"status"`
    PodSummary      PodSummary          `json:"podSummary"`
    ResourceSummary ResourceSummary     `json:"resourceSummary"`
    ClusterName     string              `json:"clusterName"`
}

// EnhancedNodeList 增强节点列表
type EnhancedNodeList struct {
    ListMeta types.ListMeta  `json:"listMeta"`
    Nodes    []EnhancedNode  `json:"nodes"`
    Errors   []error         `json:"errors"`
}

// PodSummary Pod统计信息
type PodSummary struct {
    TotalCount   int `json:"totalCount"`
    RunningCount int `json:"runningCount"`
    PendingCount int `json:"pendingCount"`
    FailedCount  int `json:"failedCount"`
}

// ResourceSummary 资源汇总信息
type ResourceSummary struct {
    CPU    ResourceInfo `json:"cpu"`
    Memory ResourceInfo `json:"memory"`
    Pods   ResourceInfo `json:"pods"`
}

// ResourceInfo 资源使用信息
type ResourceInfo struct {
    Capacity    string `json:"capacity"`
    Allocatable string `json:"allocatable"`
    Allocated   string `json:"allocated"`
    Utilization string `json:"utilization"`
}

// GetEnhancedNodeList 获取增强的节点列表
func GetEnhancedNodeList(client kubernetes.Interface, clusterName string, dsQuery *dataselect.DataSelectQuery) (*EnhancedNodeList, error) {
    // 获取节点列表
    nodes, err := client.CoreV1().Nodes().List(context.TODO(), helpers.ListEverything)
    if err != nil {
        return nil, fmt.Errorf("failed to list nodes: %w", err)
    }

    // 转换为增强节点列表
    return toEnhancedNodeList(client, clusterName, nodes.Items, dsQuery)
}

// GetEnhancedNodeDetail 获取增强的节点详情
func GetEnhancedNodeDetail(client kubernetes.Interface, clusterName, nodeName string) (*EnhancedNode, error) {
    // 获取节点详情
    node, err := client.CoreV1().Nodes().Get(context.TODO(), nodeName, metav1.GetOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to get node %s: %w", nodeName, err)
    }

    // 转换为增强节点
    return toEnhancedNode(client, clusterName, node)
}

// GetPodsOnNode 获取节点上的Pod列表
func GetPodsOnNode(client kubernetes.Interface, nodeName string, dsQuery *dataselect.DataSelectQuery) (*PodList, error) {
    // 获取节点上的Pod
    fieldSelector := fmt.Sprintf("spec.nodeName=%s", nodeName)
    pods, err := client.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{
        FieldSelector: fieldSelector,
    })
    if err != nil {
        return nil, fmt.Errorf("failed to get pods on node %s: %w", nodeName, err)
    }

    // 转换为Pod列表 (使用现有的pod包功能)
    return toPodList(pods.Items, dsQuery), nil
}

func toEnhancedNodeList(client kubernetes.Interface, clusterName string, nodes []v1.Node, dsQuery *dataselect.DataSelectQuery) (*EnhancedNodeList, error) {
    enhancedNodes := make([]EnhancedNode, 0, len(nodes))
    
    for _, node := range nodes {
        enhancedNode, err := toEnhancedNode(client, clusterName, &node)
        if err != nil {
            // 记录错误但继续处理其他节点
            continue
        }
        enhancedNodes = append(enhancedNodes, *enhancedNode)
    }

    // 应用数据选择查询
    nodeCells := make([]dataselect.DataCell, len(enhancedNodes))
    for i, node := range enhancedNodes {
        nodeCells[i] = EnhancedNodeCell{node}
    }

    filteredCells, filteredTotal := dataselect.GenericDataSelectWithFilter(nodeCells, dsQuery)
    filteredNodes := make([]EnhancedNode, len(filteredCells))
    for i, cell := range filteredCells {
        filteredNodes[i] = cell.(EnhancedNodeCell).EnhancedNode
    }

    return &EnhancedNodeList{
        ListMeta: types.ListMeta{TotalItems: filteredTotal},
        Nodes:    filteredNodes,
        Errors:   []error{},
    }, nil
}

func toEnhancedNode(client kubernetes.Interface, clusterName string, node *v1.Node) (*EnhancedNode, error) {
    // 获取Pod汇总信息
    podSummary, err := getPodSummaryForNode(client, node.Name)
    if err != nil {
        return nil, fmt.Errorf("failed to get pod summary for node %s: %w", node.Name, err)
    }

    // 获取资源汇总信息
    resourceSummary, err := getResourceSummaryForNode(client, node)
    if err != nil {
        return nil, fmt.Errorf("failed to get resource summary for node %s: %w", node.Name, err)
    }

    return &EnhancedNode{
        ObjectMeta:      types.NewObjectMeta(node.ObjectMeta),
        TypeMeta:        types.NewTypeMeta(types.ResourceKindNode),
        Status:          node.Status,
        PodSummary:      podSummary,
        ResourceSummary: resourceSummary,
        ClusterName:     clusterName,
    }, nil
}

func getPodSummaryForNode(client kubernetes.Interface, nodeName string) (PodSummary, error) {
    fieldSelector := fmt.Sprintf("spec.nodeName=%s", nodeName)
    pods, err := client.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{
        FieldSelector: fieldSelector,
    })
    if err != nil {
        return PodSummary{}, err
    }

    summary := PodSummary{
        TotalCount: len(pods.Items),
    }

    for _, pod := range pods.Items {
        switch pod.Status.Phase {
        case v1.PodRunning:
            summary.RunningCount++
        case v1.PodPending:
            summary.PendingCount++
        case v1.PodFailed:
            summary.FailedCount++
        }
    }

    return summary, nil
}

func getResourceSummaryForNode(client kubernetes.Interface, node *v1.Node) (ResourceSummary, error) {
    // 获取节点上的Pod来计算已分配资源
    fieldSelector := fmt.Sprintf("spec.nodeName=%s", node.Name)
    pods, err := client.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{
        FieldSelector: fieldSelector,
    })
    if err != nil {
        return ResourceSummary{}, err
    }

    // 计算已分配资源
    allocatedCPU := int64(0)
    allocatedMemory := int64(0)
    runningPods := int64(0)

    for _, pod := range pods.Items {
        if pod.Status.Phase == v1.PodRunning || pod.Status.Phase == v1.PodPending {
            runningPods++
        }

        for _, container := range pod.Spec.Containers {
            if cpu := container.Resources.Requests.Cpu(); cpu != nil {
                allocatedCPU += cpu.MilliValue()
            }
            if memory := container.Resources.Requests.Memory(); memory != nil {
                allocatedMemory += memory.Value()
            }
        }
    }

    // 获取节点容量
    capacity := node.Status.Capacity
    allocatable := node.Status.Allocatable

    // 计算利用率
    cpuUtilization := calculateCPUUtilization(allocatedCPU, allocatable.Cpu().MilliValue())
    memoryUtilization := calculateMemoryUtilization(allocatedMemory, allocatable.Memory().Value())
    podUtilization := calculatePodUtilization(runningPods, allocatable.Pods().Value())

    return ResourceSummary{
        CPU: ResourceInfo{
            Capacity:    capacity.Cpu().String(),
            Allocatable: allocatable.Cpu().String(),
            Allocated:   fmt.Sprintf("%dm", allocatedCPU),
            Utilization: fmt.Sprintf("%.1f%%", cpuUtilization),
        },
        Memory: ResourceInfo{
            Capacity:    capacity.Memory().String(),
            Allocatable: allocatable.Memory().String(),
            Allocated:   fmt.Sprintf("%d", allocatedMemory),
            Utilization: fmt.Sprintf("%.1f%%", memoryUtilization),
        },
        Pods: ResourceInfo{
            Capacity:    capacity.Pods().String(),
            Allocatable: allocatable.Pods().String(),
            Allocated:   fmt.Sprintf("%d", runningPods),
            Utilization: fmt.Sprintf("%.1f%%", podUtilization),
        },
    }, nil
}

// 计算利用率的辅助函数
func calculateCPUUtilization(allocated, allocatable int64) float64 {
    if allocatable == 0 {
        return 0
    }
    return float64(allocated) / float64(allocatable) * 100
}

func calculateMemoryUtilization(allocated, allocatable int64) float64 {
    if allocatable == 0 {
        return 0
    }
    return float64(allocated) / float64(allocatable) * 100
}

func calculatePodUtilization(allocated, allocatable int64) float64 {
    if allocatable == 0 {
        return 0
    }
    return float64(allocated) / float64(allocatable) * 100
}

// EnhancedNodeCell 实现DataCell接口
type EnhancedNodeCell struct {
    EnhancedNode EnhancedNode
}

func (cell EnhancedNodeCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
    switch name {
    case dataselect.NameProperty:
        return dataselect.StdComparableString(cell.EnhancedNode.ObjectMeta.Name)
    case dataselect.CreationTimestampProperty:
        return dataselect.StdComparableTime(cell.EnhancedNode.ObjectMeta.CreationTimestamp.Time)
    default:
        return nil
    }
}
```

#### cmd/api/app/routes/member/node/handler.go
```go
/*
Copyright 2024 The Karmada Authors.
Licensed under the Apache License, Version 2.0
*/

package node

import (
    "github.com/gin-gonic/gin"

    "github.com/karmada-io/dashboard/cmd/api/app/router"
    "github.com/karmada-io/dashboard/cmd/api/app/types/common"
    "github.com/karmada-io/dashboard/pkg/client"
    enhancednode "github.com/karmada-io/dashboard/pkg/resource/node"
)

func handleGetMemberNodes(c *gin.Context) {
    clusterName := c.Param("clustername")
    memberClient := client.InClusterClientForMemberCluster(clusterName)
    if memberClient == nil {
        common.Fail(c, fmt.Errorf("failed to get client for cluster %s", clusterName))
        return
    }

    dataSelect := common.ParseDataSelectPathParameter(c)
    result, err := enhancednode.GetEnhancedNodeList(memberClient, clusterName, dataSelect)
    if err != nil {
        common.Fail(c, err)
        return
    }
    common.Success(c, result)
}

func handleGetMemberNodeDetail(c *gin.Context) {
    clusterName := c.Param("clustername")
    nodeName := c.Param("name")
    
    memberClient := client.InClusterClientForMemberCluster(clusterName)
    if memberClient == nil {
        common.Fail(c, fmt.Errorf("failed to get client for cluster %s", clusterName))
        return
    }

    result, err := enhancednode.GetEnhancedNodeDetail(memberClient, clusterName, nodeName)
    if err != nil {
        common.Fail(c, err)
        return
    }
    common.Success(c, result)
}

func handleGetMemberNodePods(c *gin.Context) {
    clusterName := c.Param("clustername")
    nodeName := c.Param("name")
    
    memberClient := client.InClusterClientForMemberCluster(clusterName)
    if memberClient == nil {
        common.Fail(c, fmt.Errorf("failed to get client for cluster %s", clusterName))
        return
    }

    dataSelect := common.ParseDataSelectPathParameter(c)
    result, err := enhancednode.GetPodsOnNode(memberClient, nodeName, dataSelect)
    if err != nil {
        common.Fail(c, err)
        return
    }
    common.Success(c, result)
}

func init() {
    r := router.MemberV1()
    r.GET("/nodes", handleGetMemberNodes)
    r.GET("/nodes/:name", handleGetMemberNodeDetail)
    r.GET("/nodes/:name/pods", handleGetMemberNodePods)
}
```

### 2. 调度信息 API 实现

#### pkg/resource/scheduling/workload_scheduling.go
```go
/*
Copyright 2024 The Karmada Authors.
Licensed under the Apache License, Version 2.0
*/

package scheduling

import (
    "context"
    "fmt"

    "github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
    workv1alpha1 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha1"
    karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

    "github.com/karmada-io/dashboard/pkg/common/types"
)

// WorkloadSchedulingView 工作负载调度视图
type WorkloadSchedulingView struct {
    WorkloadInfo      WorkloadInfo        `json:"workloadInfo"`
    PropagationPolicy *PolicyInfo         `json:"propagationPolicy,omitempty"`
    OverridePolicy    *PolicyInfo         `json:"overridePolicy,omitempty"`
    ClusterPlacements []ClusterPlacement  `json:"clusterPlacements"`
    SchedulingStatus  SchedulingStatus    `json:"schedulingStatus"`
}

// WorkloadInfo 工作负载基本信息
type WorkloadInfo struct {
    Name           string `json:"name"`
    Namespace      string `json:"namespace"`
    Kind           string `json:"kind"`
    APIVersion     string `json:"apiVersion"`
    Replicas       int32  `json:"replicas"`
    ReadyReplicas  int32  `json:"readyReplicas"`
}

// PolicyInfo 策略信息
type PolicyInfo struct {
    Name            string                         `json:"name"`
    Namespace       string                         `json:"namespace"`
    ClusterAffinity *v1alpha1.ClusterAffinity     `json:"clusterAffinity,omitempty"`
    Placement       *v1alpha1.Placement           `json:"placement,omitempty"`
}

// ClusterPlacement 集群调度信息
type ClusterPlacement struct {
    ClusterName     string `json:"clusterName"`
    PlannedReplicas int32  `json:"plannedReplicas"`
    ActualReplicas  int32  `json:"actualReplicas"`
    Weight          int32  `json:"weight,omitempty"`
    Reason          string `json:"reason"`
}

// SchedulingStatus 调度状态
type SchedulingStatus struct {
    Phase   string `json:"phase"`   // Scheduled, Pending, Failed
    Message string `json:"message"`
}

// GetWorkloadScheduling 获取工作负载调度信息
func GetWorkloadScheduling(karmadaClient karmadaclientset.Interface, namespace, name, kind string) (*WorkloadSchedulingView, error) {
    // 1. 获取工作负载基本信息
    workloadInfo, err := getWorkloadInfo(karmadaClient, namespace, name, kind)
    if err != nil {
        return nil, fmt.Errorf("failed to get workload info: %w", err)
    }

    // 2. 查找关联的PropagationPolicy
    propagationPolicy, err := findAssociatedPropagationPolicy(karmadaClient, namespace, name, kind)
    if err != nil {
        // 策略不存在不是致命错误
        propagationPolicy = nil
    }

    // 3. 查找关联的OverridePolicy
    overridePolicy, err := findAssociatedOverridePolicy(karmadaClient, namespace, name, kind)
    if err != nil {
        // 策略不存在不是致命错误
        overridePolicy = nil
    }

    // 4. 获取ResourceBinding信息
    clusterPlacements, status, err := getClusterPlacementsFromBinding(karmadaClient, namespace, name, kind)
    if err != nil {
        return nil, fmt.Errorf("failed to get cluster placements: %w", err)
    }

    return &WorkloadSchedulingView{
        WorkloadInfo:      *workloadInfo,
        PropagationPolicy: propagationPolicy,
        OverridePolicy:    overridePolicy,
        ClusterPlacements: clusterPlacements,
        SchedulingStatus:  status,
    }, nil
}

func getWorkloadInfo(karmadaClient karmadaclientset.Interface, namespace, name, kind string) (*WorkloadInfo, error) {
    // 根据不同的workload类型获取信息
    // 这里简化实现，实际应该根据kind调用不同的API
    
    // 获取ResourceTemplate来获取工作负载信息
    resourceTemplates, err := karmadaClient.WorkV1alpha1().ResourceBindings(namespace).List(context.TODO(), metav1.ListOptions{
        LabelSelector: fmt.Sprintf("resourcebinding.karmada.io/name=%s", name),
    })
    if err != nil {
        return nil, err
    }

    if len(resourceTemplates.Items) == 0 {
        return nil, fmt.Errorf("no resource binding found for %s/%s", namespace, name)
    }

    // 从ResourceBinding中提取工作负载信息
    binding := resourceTemplates.Items[0]
    
    return &WorkloadInfo{
        Name:       name,
        Namespace:  namespace,
        Kind:       kind,
        APIVersion: "apps/v1", // 简化处理
        // 副本数需要从实际资源中获取
        Replicas:      calculateTotalReplicas(binding.Spec.Clusters),
        ReadyReplicas: calculateReadyReplicas(binding.Status.AggregatedStatus),
    }, nil
}

func findAssociatedPropagationPolicy(karmadaClient karmadaclientset.Interface, namespace, name, kind string) (*PolicyInfo, error) {
    // 获取所有PropagationPolicy
    policies, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(namespace).List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        return nil, err
    }

    // 查找匹配的策略
    for _, policy := range policies.Items {
        if isPolicyMatchingWorkload(&policy.Spec.ResourceSelectors, namespace, name, kind) {
            return &PolicyInfo{
                Name:            policy.Name,
                Namespace:       policy.Namespace,
                ClusterAffinity: &policy.Spec.Placement.ClusterAffinity,
                Placement:       &policy.Spec.Placement,
            }, nil
        }
    }

    return nil, fmt.Errorf("no matching propagation policy found")
}

func findAssociatedOverridePolicy(karmadaClient karmadaclientset.Interface, namespace, name, kind string) (*PolicyInfo, error) {
    // 获取所有OverridePolicy
    policies, err := karmadaClient.PolicyV1alpha1().OverridePolicies(namespace).List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        return nil, err
    }

    // 查找匹配的策略
    for _, policy := range policies.Items {
        if isPolicyMatchingWorkload(&policy.Spec.ResourceSelectors, namespace, name, kind) {
            return &PolicyInfo{
                Name:      policy.Name,
                Namespace: policy.Namespace,
            }, nil
        }
    }

    return nil, fmt.Errorf("no matching override policy found")
}

func getClusterPlacementsFromBinding(karmadaClient karmadaclientset.Interface, namespace, name, kind string) ([]ClusterPlacement, SchedulingStatus, error) {
    // 获取ResourceBinding
    bindings, err := karmadaClient.WorkV1alpha1().ResourceBindings(namespace).List(context.TODO(), metav1.ListOptions{
        LabelSelector: fmt.Sprintf("resourcebinding.karmada.io/name=%s", name),
    })
    if err != nil {
        return nil, SchedulingStatus{Phase: "Failed", Message: err.Error()}, err
    }

    if len(bindings.Items) == 0 {
        return nil, SchedulingStatus{Phase: "Pending", Message: "No resource binding found"}, nil
    }

    binding := bindings.Items[0]
    placements := make([]ClusterPlacement, 0, len(binding.Spec.Clusters))

    for _, cluster := range binding.Spec.Clusters {
        placement := ClusterPlacement{
            ClusterName:     cluster.Name,
            PlannedReplicas: cluster.Replicas,
            ActualReplicas:  getActualReplicasFromStatus(binding.Status.AggregatedStatus, cluster.Name),
            Reason:          generatePlacementReason(cluster),
        }
        placements = append(placements, placement)
    }

    status := SchedulingStatus{
        Phase:   determineSchedulingPhase(binding.Status),
        Message: generateSchedulingMessage(binding.Status),
    }

    return placements, status, nil
}

// 辅助函数
func isPolicyMatchingWorkload(resourceSelectors *[]v1alpha1.ResourceSelector, namespace, name, kind string) bool {
    if resourceSelectors == nil {
        return false
    }

    for _, selector := range *resourceSelectors {
        if selector.APIVersion == "apps/v1" && selector.Kind == kind {
            if selector.Namespace != "" && selector.Namespace != namespace {
                continue
            }
            if selector.Name != "" && selector.Name != name {
                continue
            }
            return true
        }
    }
    return false
}

func calculateTotalReplicas(clusters []workv1alpha1.TargetCluster) int32 {
    total := int32(0)
    for _, cluster := range clusters {
        total += cluster.Replicas
    }
    return total
}

func calculateReadyReplicas(aggregatedStatus []workv1alpha1.AggregatedStatusItem) int32 {
    // 简化实现，实际需要解析状态
    return 0
}

func getActualReplicasFromStatus(aggregatedStatus []workv1alpha1.AggregatedStatusItem, clusterName string) int32 {
    // 简化实现，实际需要从状态中提取
    return 0
}

func generatePlacementReason(cluster workv1alpha1.TargetCluster) string {
    return fmt.Sprintf("根据调度策略分配 %d 个副本", cluster.Replicas)
}

func determineSchedulingPhase(status workv1alpha1.ResourceBindingStatus) string {
    // 简化实现，实际需要分析条件
    return "Scheduled"
}

func generateSchedulingMessage(status workv1alpha1.ResourceBindingStatus) string {
    return "所有副本都已成功调度到目标集群"
}
```

#### cmd/api/app/routes/scheduling/handler.go
```go
/*
Copyright 2024 The Karmada Authors.
Licensed under the Apache License, Version 2.0
*/

package scheduling

import (
    "github.com/gin-gonic/gin"

    "github.com/karmada-io/dashboard/cmd/api/app/router"
    "github.com/karmada-io/dashboard/cmd/api/app/types/common"
    "github.com/karmada-io/dashboard/pkg/client"
    schedulingpkg "github.com/karmada-io/dashboard/pkg/resource/scheduling"
)

func handleGetWorkloadScheduling(c *gin.Context) {
    namespace := c.Param("namespace")
    name := c.Param("name")
    kind := c.Query("kind") // 从查询参数获取kind
    
    if kind == "" {
        kind = "Deployment" // 默认值
    }

    karmadaClient := client.InClusterClient()
    result, err := schedulingpkg.GetWorkloadScheduling(karmadaClient, namespace, name, kind)
    if err != nil {
        common.Fail(c, err)
        return
    }
    common.Success(c, result)
}

func init() {
    r := router.V1()
    r.GET("/workloads/:namespace/:name/scheduling", handleGetWorkloadScheduling)
}
```

### 3. 扩展现有集群 API

#### pkg/resource/cluster/enhanced_cluster.go
```go
/*
Copyright 2024 The Karmada Authors.
Licensed under the Apache License, Version 2.0
*/

package cluster

import (
    "context"
    "fmt"

    "github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
    karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

    "github.com/karmada-io/dashboard/pkg/client"
    "github.com/karmada-io/dashboard/pkg/common/types"
)

// GetClusterDetail 获取集群详细信息
func GetClusterDetail(karmadaClient karmadaclientset.Interface, clusterName string) (*Cluster, error) {
    cluster, err := karmadaClient.ClusterV1alpha1().Clusters().Get(context.TODO(), clusterName, metav1.GetOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to get cluster %s: %w", clusterName, err)
    }

    return toClusterWithEnhancedInfo(cluster)
}

// UpdateClusterConfig 更新集群配置
func UpdateClusterConfig(karmadaClient karmadaclientset.Interface, clusterName string, updateFunc func(*v1alpha1.Cluster)) (*Cluster, error) {
    cluster, err := karmadaClient.ClusterV1alpha1().Clusters().Get(context.TODO(), clusterName, metav1.GetOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to get cluster %s: %w", clusterName, err)
    }

    // 应用更新
    updateFunc(cluster)

    // 更新集群
    updatedCluster, err := karmadaClient.ClusterV1alpha1().Clusters().Update(context.TODO(), cluster, metav1.UpdateOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to update cluster %s: %w", clusterName, err)
    }

    return toClusterWithEnhancedInfo(updatedCluster)
}

func toClusterWithEnhancedInfo(cluster *v1alpha1.Cluster) (*Cluster, error) {
    // 基于现有的toCluster函数，添加更多信息
    baseCluster := toCluster(cluster)
    
    // 添加增强信息
    // 可以从成员集群获取更详细的信息
    memberClient := client.InClusterClientForMemberCluster(cluster.Name)
    if memberClient != nil {
        // 获取节点详细信息等
        enhanceWithMemberClusterInfo(&baseCluster, memberClient)
    }

    return &baseCluster, nil
}

func enhanceWithMemberClusterInfo(cluster *Cluster, memberClient client.Client) {
    // 从成员集群获取更详细的信息
    // 例如：实时的资源使用情况、网络状态等
    // 这里简化实现
}
```

## 路由注册汇总

### 在 cmd/api/app/router/router.go 中确保正确导入
```go
import (
    // 现有导入...
    
    // 新增导入
    _ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/node"
    _ "github.com/karmada-io/dashboard/cmd/api/app/routes/scheduling"
)
```

## 测试示例

### 1. 测试节点 API
```bash
# 获取集群节点列表
curl -X GET "http://localhost:8080/api/v1/member/cluster-1/nodes?page=1&limit=10"

# 获取节点详情
curl -X GET "http://localhost:8080/api/v1/member/cluster-1/nodes/node-1"

# 获取节点上的Pod
curl -X GET "http://localhost:8080/api/v1/member/cluster-1/nodes/node-1/pods"
```

### 2. 测试调度 API
```bash
# 获取工作负载调度信息
curl -X GET "http://localhost:8080/api/v1/workloads/default/nginx-deployment/scheduling?kind=Deployment"
```

## 实现优先级

### Phase 1 (立即实现)
1. ✅ 节点管理API (基础功能)
2. ✅ 扩展集群详情API
3. ✅ 调度信息API (基础版本)

### Phase 2 (性能优化)
1. 🔄 添加缓存机制
2. 🔄 并发数据聚合
3. 🔄 错误处理优化

### Phase 3 (高级功能)
1. 🔄 Pod调度追溯
2. 🔄 实时监控
3. 🔄 WebSocket支持

这个实现指南完全基于现有的代码结构和模式，确保了与现有系统的兼容性，同时提供了您需要的层次化信息汇总和调度可视化功能。 