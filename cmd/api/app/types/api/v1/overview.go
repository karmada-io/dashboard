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

package v1

import (
	"github.com/karmada-io/karmada/pkg/version"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// OverviewResponse represents the response structure for the overview API.
// OverviewResponse 是概览 API 的响应
type OverviewResponse struct {
	// KarmadaInfo 是 Karmada 系统的信息
	KarmadaInfo *KarmadaInfo `json:"karmadaInfo"`
	// MemberClusterStatus 是成员集群的状态
	MemberClusterStatus *MemberClusterStatus `json:"memberClusterStatus"`
	// ClusterResourceStatus 是集群资源的状态
	ClusterResourceStatus *ClusterResourceStatus `json:"clusterResourceStatus"`
}

// KarmadaInfo contains information about the Karmada system.
// KarmadaInfo 包含 Karmada 系统的信息
type KarmadaInfo struct {
	// Version 是 Karmada 的版本
	Version *version.Info `json:"version"`
	// Status 是 Karmada 的状态
	Status string `json:"status"`
	// CreateTime 是 Karmada 的创建时间
	CreateTime metav1.Time `json:"createTime"`
}

// NodeSummary provides a summary of node statistics.
// NodeSummary 提供节点统计的摘要
type NodeSummary struct {
	// TotalNum 是节点总数
	TotalNum int32 `json:"totalNum"`
	// ReadyNum 是就绪节点数
	ReadyNum int32 `json:"readyNum"`
}

// CPUSummary provides a summary of CPU resource usage.
// CPUSummary 提供 CPU 资源使用的摘要
type CPUSummary struct {
	// TotalCPU 是 CPU 总数
	TotalCPU int64 `json:"totalCPU"`
	// AllocatedCPU 是已分配的 CPU
	AllocatedCPU float64 `json:"allocatedCPU"`
}

// MemorySummary provides a summary of memory resource usage.
// MemorySummary 提供内存资源使用的摘要
type MemorySummary struct {
	// TotalMemory 是内存总数
	TotalMemory int64 `json:"totalMemory"` // Kib => 8 * KiB
	// AllocatedMemory 是已分配的内存
	AllocatedMemory float64 `json:"allocatedMemory"`
}

// PodSummary provides a summary of pod statistics.
// PodSummary 提供 Pod 统计的摘要
type PodSummary struct {
	// TotalPod 是 Pod 总数
	TotalPod int64 `json:"totalPod"`
	// AllocatedPod 是已分配的 Pod
	AllocatedPod int64 `json:"allocatedPod"`
}

// MemberClusterStatus represents the status of member clusters.
// MemberClusterStatus 表示成员集群的状态
type MemberClusterStatus struct {
	// NodeSummary 是节点统计的摘要
	NodeSummary *NodeSummary `json:"nodeSummary"`
	// CPUSummary 是 CPU 资源使用的摘要
	CPUSummary *CPUSummary `json:"cpuSummary"`
	// MemorySummary 是内存资源使用的摘要
	MemorySummary *MemorySummary `json:"memorySummary"`
	// PodSummary 是 Pod 统计的摘要
	PodSummary *PodSummary `json:"podSummary"`
}

// ClusterResourceStatus represents the status of various resources in the cluster.
// ClusterResourceStatus 表示集群中各种资源的状态
type ClusterResourceStatus struct {
	// PropagationPolicyNum 是传播策略的数量
	PropagationPolicyNum int `json:"propagationPolicyNum"`
	// OverridePolicyNum 是覆盖策略的数量
	OverridePolicyNum int `json:"overridePolicyNum"`
	// NamespaceNum 是命名空间的数量
	NamespaceNum int `json:"namespaceNum"`
	// WorkloadNum 是工作负载的数量
	WorkloadNum int `json:"workloadNum"`
	// ServiceNum 是服务数量
	ServiceNum int `json:"serviceNum"`
	// ConfigNum 是配置数量
	ConfigNum int `json:"configNum"`
}

// ResourcesSummary 表示所有集群资源的汇总统计信息
type ResourcesSummary struct {
	// Node 节点资源统计
	Node struct {
		// Total 总节点数
		Total int64 `json:"total"`
		// Ready 就绪节点数
		Ready int64 `json:"ready"`
	} `json:"node"`

	// Pod Pod资源统计
	Pod struct {
		// Capacity Pod总容量
		Capacity int64 `json:"capacity"`
		// Allocated 已分配Pod数
		Allocated int64 `json:"allocated"`
	} `json:"pod"`

	// CPU CPU资源统计
	CPU struct {
		// Capacity CPU总容量(核)
		Capacity int64 `json:"capacity"`
		// Usage CPU使用量(核)
		Usage int64 `json:"usage"`
	} `json:"cpu"`

	// Memory 内存资源统计
	Memory struct {
		// Capacity 内存总容量(KiB)
		Capacity int64 `json:"capacity"`
		// Usage 内存使用量(KiB)
		Usage int64 `json:"usage"`
	} `json:"memory"`
}

// NodeItem 表示单个节点信息
type NodeItem struct {
	// ClusterName 集群名称
	ClusterName string `json:"clusterName"`
	// Name 节点名称
	Name string `json:"name"`
	// Ready 是否就绪
	Ready bool `json:"ready"`
	// Role 角色 (master/worker)
	Role string `json:"role"`
	// CPUCapacity CPU容量 (核)
	CPUCapacity int64 `json:"cpuCapacity"`
	// CPUUsage CPU使用率
	CPUUsage int64 `json:"cpuUsage"`
	// MemoryCapacity 内存容量 (KB)
	MemoryCapacity int64 `json:"memoryCapacity"`
	// MemoryUsage 内存使用率
	MemoryUsage int64 `json:"memoryUsage"`
	// PodCapacity Pod容量
	PodCapacity int64 `json:"podCapacity"`
	// PodUsage Pod使用量
	PodUsage int64 `json:"podUsage"`
	// Status 状态
	Status string `json:"status"`
	// Labels 标签
	Labels map[string]string `json:"labels"`
	// CreationTimestamp 创建时间
	CreationTimestamp metav1.Time `json:"creationTimestamp"`
}

// NodesResponse 包含所有集群的节点信息
type NodesResponse struct {
	// Items 节点列表
	Items []NodeItem `json:"items"`
	// Summary 节点状态统计
	Summary NodeSummary `json:"summary"`
}

// PodItem 表示单个Pod信息
type PodItem struct {
	// ClusterName 集群名称
	ClusterName string `json:"clusterName"`
	// Namespace 命名空间
	Namespace string `json:"namespace"`
	// Name Pod名称
	Name string `json:"name"`
	// Phase Pod阶段
	Phase v1.PodPhase `json:"phase"`
	// Status Pod状态
	Status string `json:"status"`
	// ReadyContainers 就绪容器数量
	ReadyContainers int `json:"readyContainers"`
	// TotalContainers 总容器数量
	TotalContainers int `json:"totalContainers"`
	// CPURequest CPU请求量(核)
	CPURequest int64 `json:"cpuRequest"`
	// MemoryRequest 内存请求量(KB)
	MemoryRequest int64 `json:"memoryRequest"`
	// CPULimit CPU限制(核)
	CPULimit int64 `json:"cpuLimit"`
	// MemoryLimit 内存限制(KB)
	MemoryLimit int64 `json:"memoryLimit"`
	// RestartCount 重启次数
	RestartCount int32 `json:"restartCount"`
	// PodIP Pod IP
	PodIP string `json:"podIP"`
	// NodeName 节点名称
	NodeName string `json:"nodeName"`
	// CreationTimestamp 创建时间
	CreationTimestamp metav1.Time `json:"creationTimestamp"`
}

// PodSummaryStats 表示Pod状态统计信息
type PodSummaryStats struct {
	// Running 运行中的Pod数量
	Running int `json:"running"`
	// Pending 挂起中的Pod数量
	Pending int `json:"pending"`
	// Succeeded 成功的Pod数量
	Succeeded int `json:"succeeded"`
	// Failed 失败的Pod数量
	Failed int `json:"failed"`
	// Unknown 未知状态的Pod数量
	Unknown int `json:"unknown"`
	// Total 总Pod数量
	Total int `json:"total"`
}

// NamespacePodsStats 表示命名空间Pod统计信息
type NamespacePodsStats struct {
	// Namespace 命名空间名称
	Namespace string `json:"namespace"`
	// PodCount Pod数量
	PodCount int `json:"podCount"`
}

// ClusterPodsStats 表示集群Pod统计信息
type ClusterPodsStats struct {
	// ClusterName 集群名称
	ClusterName string `json:"clusterName"`
	// PodCount Pod数量
	PodCount int `json:"podCount"`
}

// PodsResponse 包含所有集群的Pod信息
type PodsResponse struct {
	// Items Pod列表
	Items []PodItem `json:"items"`
	// StatusStats Pod状态统计
	StatusStats PodSummaryStats `json:"statusStats"`
	// NamespaceStats 命名空间Pod统计
	NamespaceStats []NamespacePodsStats `json:"namespaceStats"`
	// ClusterStats 集群Pod统计
	ClusterStats []ClusterPodsStats `json:"clusterStats"`
}
