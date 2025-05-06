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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// OverviewResponse represents the response structure for the overview API.
// OverviewResponse 是概览 API 的响应
type OverviewResponse struct {
	// KarmadaInfo 是 Karmada 系统的信息
	KarmadaInfo           *KarmadaInfo           `json:"karmadaInfo"`
	// MemberClusterStatus 是成员集群的状态
	MemberClusterStatus   *MemberClusterStatus   `json:"memberClusterStatus"`
	// ClusterResourceStatus 是集群资源的状态
	ClusterResourceStatus *ClusterResourceStatus `json:"clusterResourceStatus"`
}

// KarmadaInfo contains information about the Karmada system.
// KarmadaInfo 包含 Karmada 系统的信息
type KarmadaInfo struct {
	// Version 是 Karmada 的版本
	Version    *version.Info `json:"version"`
	// Status 是 Karmada 的状态
	Status     string        `json:"status"`
	// CreateTime 是 Karmada 的创建时间
	CreateTime metav1.Time   `json:"createTime"`
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
	TotalCPU     int64   `json:"totalCPU"`
	// AllocatedCPU 是已分配的 CPU
	AllocatedCPU float64 `json:"allocatedCPU"`
}

// MemorySummary provides a summary of memory resource usage.
// MemorySummary 提供内存资源使用的摘要
type MemorySummary struct {
	// TotalMemory 是内存总数
	TotalMemory     int64   `json:"totalMemory"` // Kib => 8 * KiB
	// AllocatedMemory 是已分配的内存
	AllocatedMemory float64 `json:"allocatedMemory"`
}

// PodSummary provides a summary of pod statistics.
// PodSummary 提供 Pod 统计的摘要
type PodSummary struct {
	// TotalPod 是 Pod 总数
	TotalPod     int64 `json:"totalPod"`
	// AllocatedPod 是已分配的 Pod
	AllocatedPod int64 `json:"allocatedPod"`
}

// MemberClusterStatus represents the status of member clusters.
// MemberClusterStatus 表示成员集群的状态
type MemberClusterStatus struct {
	// NodeSummary 是节点统计的摘要
	NodeSummary   *NodeSummary   `json:"nodeSummary"`
	// CPUSummary 是 CPU 资源使用的摘要
	CPUSummary    *CPUSummary    `json:"cpuSummary"`
	// MemorySummary 是内存资源使用的摘要
	MemorySummary *MemorySummary `json:"memorySummary"`
	// PodSummary 是 Pod 统计的摘要
	PodSummary    *PodSummary    `json:"podSummary"`
}

// ClusterResourceStatus represents the status of various resources in the cluster.
// ClusterResourceStatus 表示集群中各种资源的状态
type ClusterResourceStatus struct {
	// PropagationPolicyNum 是传播策略的数量
	PropagationPolicyNum int `json:"propagationPolicyNum"`
	// OverridePolicyNum 是覆盖策略的数量
	OverridePolicyNum    int `json:"overridePolicyNum"`
	// NamespaceNum 是命名空间的数量
	NamespaceNum         int `json:"namespaceNum"`
	// WorkloadNum 是工作负载的数量
	WorkloadNum          int `json:"workloadNum"`
	// ServiceNum 是服务数量
	ServiceNum           int `json:"serviceNum"`
	// ConfigNum 是配置数量
	ConfigNum            int `json:"configNum"`
}
