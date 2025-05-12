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

// TopologyNode 表示拓扑图中的节点
type TopologyNode struct {
	// 节点ID，唯一标识
	ID string `json:"id"`
	// 节点名称
	Name string `json:"name"`
	// 节点类型：control-plane, cluster, node, pod
	Type string `json:"type"`
	// 节点状态：ready, notready
	Status string `json:"status"`
	// 父节点ID
	ParentID string `json:"parentId"`
	// 节点元数据
	Metadata map[string]interface{} `json:"metadata,omitempty"`
	// 资源使用情况
	Resources *NodeResources `json:"resources,omitempty"`
	// 标签
	Labels map[string]string `json:"labels,omitempty"`
}

// TopologyEdge 表示拓扑图中的边
type TopologyEdge struct {
	// 边ID
	ID string `json:"id"`
	// 源节点ID
	Source string `json:"source"`
	// 目标节点ID
	Target string `json:"target"`
	// 边类型：control, schedule
	Type string `json:"type"`
	// 边的权重或值
	Value int `json:"value"`
	// 边的元数据
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// NodeResources 表示节点的资源使用情况
type NodeResources struct {
	// CPU使用情况
	CPU *ResourceUsage `json:"cpu,omitempty"`
	// 内存使用情况
	Memory *ResourceUsage `json:"memory,omitempty"`
	// Pod使用情况
	Pods *ResourceUsage `json:"pods,omitempty"`
	// 存储使用情况
	Storage *ResourceUsage `json:"storage,omitempty"`
}

// ResourceUsage 表示资源使用情况
type ResourceUsage struct {
	// 已使用量
	Used string `json:"used"`
	// 总量
	Total string `json:"total"`
	// 使用率（百分比）
	UsageRate float64 `json:"usageRate"`
}

// TopologyData 表示整个拓扑图数据
type TopologyData struct {
	// 节点列表
	Nodes []TopologyNode `json:"nodes"`
	// 边列表
	Edges []TopologyEdge `json:"edges"`
	// 统计信息
	Summary *TopologySummary `json:"summary,omitempty"`
}

// TopologySummary 表示拓扑图的统计信息
type TopologySummary struct {
	// 集群总数
	TotalClusters int `json:"totalClusters"`
	// 节点总数
	TotalNodes int `json:"totalNodes"`
	// Pod总数
	TotalPods int `json:"totalPods"`
	// 资源类型分布
	ResourceDistribution map[string]int `json:"resourceDistribution,omitempty"`
}

// TopologyResponse 表示拓扑图API响应
type TopologyResponse struct {
	// 拓扑图数据
	Data TopologyData `json:"data"`
}
