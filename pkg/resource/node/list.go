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

package node

import (
	"log"

	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"

	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
)

// Node represents a Kubernetes node with additional metadata.
type Node struct {
	ObjectMeta  types.ObjectMeta      `json:"objectMeta"`
	TypeMeta    types.TypeMeta        `json:"typeMeta"`
	NodeSummary *v1alpha1.NodeSummary `json:"nodeSummary,omitempty"`
	Status      v1.NodeStatus         `json:"status"`
}

// NodeList contains a list of node.
type NodeList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of Nodes
	Items []Node `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetNodeList returns a list of all Nodes in all cluster.
func GetNodeList(client kubernetes.Interface, dsQuery *dataselect.DataSelectQuery) (*NodeList, error) {
	log.Printf("Getting nodes")
	channels := &common.ResourceChannels{
		NodeList: common.GetNodeListChannel(client, 1),
	}

	return GetNodeListFromChannels(channels, dsQuery)
}

// GetNodeListFromChannels returns a list of all Nodes in the cluster reading required resource list once from the channels.
func GetNodeListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery) (*NodeList, error) {
	nodes := <-channels.NodeList.List
	err := <-channels.NodeList.Error
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	result := toNodeList(nodes.Items, nonCriticalErrors, dsQuery)

	return result, nil
}

func toNode(meta metav1.ObjectMeta, status v1.NodeStatus) Node {
	return Node{
		ObjectMeta: types.NewObjectMeta(meta),
		TypeMeta:   types.NewTypeMeta(types.ResourceKindNode),
		Status:     NewStatus(status),
	}
}

func toNodeList(nodes []v1.Node, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *NodeList {
	result := &NodeList{
		Items:    make([]Node, 0),
		ListMeta: types.ListMeta{TotalItems: len(nodes)},
		Errors:   nonCriticalErrors,
	}

	nodeCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(nodes), dsQuery)
	nodes = fromCells(nodeCells)
	result.ListMeta = types.ListMeta{TotalItems: filteredTotal}

	for _, item := range nodes {
		result.Items = append(result.Items, toNode(item.ObjectMeta, item.Status))
	}

	return result
}

// NewStatus returns a new status object.
func NewStatus(status v1.NodeStatus) v1.NodeStatus {
	return v1.NodeStatus{
		Capacity:        status.Capacity,
		Allocatable:     status.Allocatable,
		Conditions:      status.Conditions,
		Addresses:       status.Addresses,
		DaemonEndpoints: status.DaemonEndpoints,
		NodeInfo:        status.NodeInfo,
	}
}
