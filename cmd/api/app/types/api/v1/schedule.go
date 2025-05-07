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

// ScheduleNode 表示调度图中的一个节点
type ScheduleNode struct {
	// ID 节点唯一标识
	ID string `json:"id"`
	// Name 节点显示名称
	Name string `json:"name"`
	// Type 节点类型 (control-plane/member-cluster)
	Type string `json:"type"`
}

// ScheduleLink 表示调度图中的连接线
type ScheduleLink struct {
	// Source 源节点ID
	Source string `json:"source"`
	// Target 目标节点ID
	Target string `json:"target"`
	// Value 连接的权重/值
	Value int `json:"value"`
	// Type 资源类型
	Type string `json:"type"`
}

// ClusterDistribution 表示资源在单个集群中的分布情况
type ClusterDistribution struct {
	// ClusterName 集群名称
	ClusterName string `json:"clusterName"`
	// Count 资源数量
	Count int `json:"count"`
}

// ResourceTypeDistribution 表示单种资源类型在各集群中的分布情况
type ResourceTypeDistribution struct {
	// ResourceType 资源类型
	ResourceType string `json:"resourceType"`
	// ClusterDist 各集群分布情况
	ClusterDist []ClusterDistribution `json:"clusterDist"`
}

// ScheduleSummary 调度概览统计信息
type ScheduleSummary struct {
	// TotalClusters 总集群数
	TotalClusters int `json:"totalClusters"`
	// TotalPropagationPolicy 总传播策略数
	TotalPropagationPolicy int `json:"totalPropagationPolicy"`
	// TotalResourceBinding 总资源绑定数
	TotalResourceBinding int `json:"totalResourceBinding"`
}

// SchedulePreviewResponse 集群调度预览响应
type SchedulePreviewResponse struct {
	// Nodes 节点列表
	Nodes []ScheduleNode `json:"nodes"`
	// Links 连接线列表
	Links []ScheduleLink `json:"links"`
	// ResourceDist 资源分布统计
	ResourceDist []ResourceTypeDistribution `json:"resourceDist"`
	// Summary 概览统计信息
	Summary ScheduleSummary `json:"summary"`
}
