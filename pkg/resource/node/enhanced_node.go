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
	"github.com/karmada-io/dashboard/pkg/resource/pod"
)

// EnhancedNode 增强节点信息
type EnhancedNode struct {
	ObjectMeta      types.ObjectMeta `json:"objectMeta"`
	TypeMeta        types.TypeMeta   `json:"typeMeta"`
	Status          v1.NodeStatus    `json:"status"`
	PodSummary      PodSummary       `json:"podSummary"`
	ResourceSummary ResourceSummary  `json:"resourceSummary"`
	ClusterName     string           `json:"clusterName"`
}

// EnhancedNodeList 增强节点列表
type EnhancedNodeList struct {
	ListMeta types.ListMeta `json:"listMeta"`
	Nodes    []EnhancedNode `json:"nodes"`
	Errors   []error        `json:"errors"`
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
func GetPodsOnNode(client kubernetes.Interface, nodeName string, dsQuery *dataselect.DataSelectQuery) (*pod.PodList, error) {
	// 获取节点上的Pod
	fieldSelector := fmt.Sprintf("spec.nodeName=%s", nodeName)
	pods, err := client.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{
		FieldSelector: fieldSelector,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get pods on node %s: %w", nodeName, err)
	}

	// 转换为Pod列表 (使用现有的pod包功能)
	return convertToPodList(pods.Items, dsQuery), nil
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

// convertToPodList 将v1.Pod列表转换为pod.PodList
func convertToPodList(podItems []v1.Pod, dsQuery *dataselect.DataSelectQuery) *pod.PodList {
	result := &pod.PodList{
		Items:    make([]pod.Pod, 0),
		ListMeta: types.ListMeta{TotalItems: len(podItems)},
		Errors:   []error{},
	}

	// 转换为DataCell用于过滤和排序
	podCells := make([]dataselect.DataCell, len(podItems))
	for i, podItem := range podItems {
		podCells[i] = pod.PodCell(podItem)
	}

	filteredCells, filteredTotal := dataselect.GenericDataSelectWithFilter(podCells, dsQuery)
	result.ListMeta = types.ListMeta{TotalItems: filteredTotal}

	// 转换回Pod结构
	for _, cell := range filteredCells {
		podItem := v1.Pod(cell.(pod.PodCell))
		result.Items = append(result.Items, pod.Pod{
			ObjectMeta: types.NewObjectMeta(podItem.ObjectMeta),
			TypeMeta:   types.NewTypeMeta(types.ResourceKindPod),
			Status:     podItem.Status, // 直接使用原状态，不需要NewStatus
		})
	}

	return result
}
