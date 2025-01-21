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

type OverviewResponse struct {
	KarmadaInfo           *KarmadaInfo           `json:"karmadaInfo"`
	MemberClusterStatus   *MemberClusterStatus   `json:"memberClusterStatus"`
	ClusterResourceStatus *ClusterResourceStatus `json:"clusterResourceStatus"`
}

type KarmadaInfo struct {
	Version    *version.Info `json:"version"`
	Status     string        `json:"status"`
	CreateTime metav1.Time   `json:"createTime"`
}

type NodeSummary struct {
	TotalNum int32 `json:"totalNum"`
	ReadyNum int32 `json:"readyNum"`
}
type CPUSummary struct {
	TotalCPU     int64   `json:"totalCPU"`
	AllocatedCPU float64 `json:"allocatedCPU"`
}
type MemorySummary struct {
	TotalMemory     int64   `json:"totalMemory"` // Kib => 8 * KiB
	AllocatedMemory float64 `json:"allocatedMemory"`
}
type PodSummary struct {
	TotalPod     int64 `json:"totalPod"`
	AllocatedPod int64 `json:"allocatedPod"`
}

type MemberClusterStatus struct {
	NodeSummary   *NodeSummary   `json:"nodeSummary"`
	CPUSummary    *CPUSummary    `json:"cpuSummary"`
	MemorySummary *MemorySummary `json:"memorySummary"`
	PodSummary    *PodSummary    `json:"podSummary"`
}

type ClusterResourceStatus struct {
	PropagationPolicyNum int `json:"propagationPolicyNum"`
	OverridePolicyNum    int `json:"overridePolicyNum"`
	NamespaceNum         int `json:"namespaceNum"`
	WorkloadNum          int `json:"workloadNum"`
	ServiceNum           int `json:"serviceNum"`
	ConfigNum            int `json:"configNum"`
}
