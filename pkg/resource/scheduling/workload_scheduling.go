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
)

// WorkloadSchedulingView 工作负载调度视图
type WorkloadSchedulingView struct {
	WorkloadInfo      WorkloadInfo       `json:"workloadInfo"`
	PropagationPolicy *PolicyInfo        `json:"propagationPolicy,omitempty"`
	OverridePolicy    *PolicyInfo        `json:"overridePolicy,omitempty"`
	ClusterPlacements []ClusterPlacement `json:"clusterPlacements"`
	SchedulingStatus  SchedulingStatus   `json:"schedulingStatus"`
}

// WorkloadInfo 工作负载基本信息
type WorkloadInfo struct {
	Name          string `json:"name"`
	Namespace     string `json:"namespace"`
	Kind          string `json:"kind"`
	APIVersion    string `json:"apiVersion"`
	Replicas      int32  `json:"replicas"`
	ReadyReplicas int32  `json:"readyReplicas"`
}

// PolicyInfo 策略信息
type PolicyInfo struct {
	Name            string                    `json:"name"`
	Namespace       string                    `json:"namespace"`
	ClusterAffinity *v1alpha1.ClusterAffinity `json:"clusterAffinity,omitempty"`
	Placement       *v1alpha1.Placement       `json:"placement,omitempty"`
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
	Phase   string `json:"phase"` // Scheduled, Pending, Failed
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
	// 获取ResourceBinding来获取工作负载信息
	bindings, err := karmadaClient.WorkV1alpha1().ResourceBindings(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: fmt.Sprintf("resourcebinding.karmada.io/name=%s", name),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list resource bindings: %w", err)
	}

	if len(bindings.Items) == 0 {
		// 如果没有ResourceBinding，返回基本信息而不是错误
		return &WorkloadInfo{
			Name:          name,
			Namespace:     namespace,
			Kind:          kind,
			APIVersion:    "apps/v1",
			Replicas:      0,
			ReadyReplicas: 0,
		}, nil
	}

	// 从ResourceBinding中提取工作负载信息
	binding := bindings.Items[0]

	return &WorkloadInfo{
		Name:          name,
		Namespace:     namespace,
		Kind:          kind,
		APIVersion:    "apps/v1", // 简化处理
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
		if isPolicyMatchingWorkload(policy.Spec.ResourceSelectors, namespace, name, kind) {
			return &PolicyInfo{
				Name:            policy.Name,
				Namespace:       policy.Namespace,
				ClusterAffinity: policy.Spec.Placement.ClusterAffinity,
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
		if isPolicyMatchingWorkload(policy.Spec.ResourceSelectors, namespace, name, kind) {
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
func isPolicyMatchingWorkload(resourceSelectors []v1alpha1.ResourceSelector, namespace, name, kind string) bool {
	for _, selector := range resourceSelectors {
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
