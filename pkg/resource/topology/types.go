/*
Copyright 2026 The Karmada Authors.

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

package topology

// NodeType represents the type of a topology node.
type NodeType string

// NodeType constants define the possible types of topology nodes.
const (
	NodeTypeResourceTemplate      NodeType = "ResourceTemplate"
	NodeTypeResourceBinding       NodeType = "ResourceBinding"
	NodeTypeWork                  NodeType = "Work"
	NodeTypeMemberClusterWorkload NodeType = "MemberClusterWorkload"
	NodeTypePod                   NodeType = "Pod"
)

// NodeStatus represents the health status of a topology node.
type NodeStatus string

// NodeStatus constants define the possible health states of a topology node.
const (
	NodeStatusHealthy     NodeStatus = "healthy"
	NodeStatusProgressing NodeStatus = "progressing"
	NodeStatusAbnormal    NodeStatus = "abnormal"
)

// TopologyNode represents a single node in the topology graph.
type TopologyNode struct {
	// Unique identifier for this node.
	ID string `json:"id"`
	// Type of the resource this node represents.
	Type NodeType `json:"type"`
	// Resource name.
	Name string `json:"name"`
	// Resource namespace, empty for cluster-scoped resources.
	Namespace string `json:"namespace,omitempty"`
	// Resource kind (e.g. Deployment, StatefulSet).
	Kind string `json:"kind,omitempty"`
	// Cluster name, only set for Work and MemberClusterWorkload nodes.
	Cluster string `json:"cluster,omitempty"`
	// Health status of this node.
	Status NodeStatus `json:"status"`
	// Extra data depending on node type.
	Data interface{} `json:"data,omitempty"`
}

// TopologyEdge represents a directed edge between two topology nodes.
type TopologyEdge struct {
	Source string            `json:"source"`
	Target string            `json:"target"`
	Label  string            `json:"label,omitempty"`
	Data   *TopologyEdgeData `json:"data,omitempty"`
}

// TopologyEdgeData carries extra info for edges.
type TopologyEdgeData struct {
	PropagationPolicy *PropagationPolicyRef `json:"propagationPolicy,omitempty"`
	OverridePolicies  []OverridePolicyRef   `json:"overridePolicies,omitempty"`
}

// TopologyResponse is the complete topology graph returned by the API.
type TopologyResponse struct {
	Nodes []TopologyNode `json:"nodes"`
	Edges []TopologyEdge `json:"edges"`
}

// OverridePolicyRef is a reference to an applied OverridePolicy, attached to Work node data.
type OverridePolicyRef struct {
	Name           string `json:"name"`
	Namespace      string `json:"namespace,omitempty"`
	IsClusterScope bool   `json:"isClusterScope"`
}

// PropagationPolicyRef is a reference to the matched PropagationPolicy, attached to ResourceTemplate node data.
type PropagationPolicyRef struct {
	Name           string `json:"name"`
	Namespace      string `json:"namespace,omitempty"`
	IsClusterScope bool   `json:"isClusterScope"`
}

// ResourceTemplateNodeData carries extra info for ResourceTemplate type nodes.
type ResourceTemplateNodeData struct {
	PropagationPolicy *PropagationPolicyRef `json:"propagationPolicy,omitempty"`
}

// WorkNodeData carries extra info for Work type nodes.
type WorkNodeData struct {
	OverridePolicies []OverridePolicyRef `json:"overridePolicies,omitempty"`
}

// PodNodeData carries extra info for Pod type nodes.
type PodNodeData struct {
	Ready bool   `json:"ready"`
	Phase string `json:"phase"`
}
