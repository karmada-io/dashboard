package node

import (
	"log"

	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type Node struct {
	ObjectMeta         types.ObjectMeta       `json:"objectMeta"`
	TypeMeta           types.TypeMeta         `json:"typeMeta"`
	Ready              metav1.ConditionStatus `json:"ready,omitempty"`
	KubernetesVersion  string                 `json:"kubernetesVersion,omitempty"`
	NodeSummary        *v1alpha1.NodeSummary  `json:"nodeSummary,omitempty"`
	AllocatedResources NodeAllocatedResources `json:"allocatedResources"`
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

func toNode(meta metav1.ObjectMeta) Node {
	return Node{
		ObjectMeta: types.NewObjectMeta(meta),
		TypeMeta:   types.NewTypeMeta(types.ResourceKindNode),
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
		result.Items = append(result.Items, toNode(item.ObjectMeta))
	}

	return result
}
