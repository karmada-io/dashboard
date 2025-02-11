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

package cluster

import (
	"context"
	"log"

	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
)

// Cluster the definition of a cluster.
type Cluster struct {
	ObjectMeta         types.ObjectMeta          `json:"objectMeta"`
	TypeMeta           types.TypeMeta            `json:"typeMeta"`
	Ready              metav1.ConditionStatus    `json:"ready"`
	KubernetesVersion  string                    `json:"kubernetesVersion,omitempty"`
	SyncMode           v1alpha1.ClusterSyncMode  `json:"syncMode"`
	NodeSummary        *v1alpha1.NodeSummary     `json:"nodeSummary,omitempty"`
	AllocatedResources ClusterAllocatedResources `json:"allocatedResources"`
}

// ClusterList contains a list of clusters.
type ClusterList struct {
	ListMeta types.ListMeta `json:"listMeta"`
	Clusters []Cluster      `json:"clusters"`
	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetClusterList returns a list of all Nodes in the cluster.
func GetClusterList(client karmadaclientset.Interface, dsQuery *dataselect.DataSelectQuery) (*ClusterList, error) {
	clusters, err := client.ClusterV1alpha1().Clusters().List(context.TODO(), helpers.ListEverything)
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}
	return toClusterList(client, clusters.Items, nonCriticalErrors, dsQuery), nil
}

func toClusterList(_ karmadaclientset.Interface, clusters []v1alpha1.Cluster, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ClusterList {
	clusterList := &ClusterList{
		Clusters: make([]Cluster, 0),
		ListMeta: types.ListMeta{TotalItems: len(clusters)},
		Errors:   nonCriticalErrors,
	}
	clusterCells, filteredTotal := dataselect.GenericDataSelectWithFilter(
		toCells(clusters),
		dsQuery,
	)
	clusters = fromCells(clusterCells)
	clusterList.ListMeta = types.ListMeta{TotalItems: filteredTotal}
	for _, cluster := range clusters {
		clusterList.Clusters = append(clusterList.Clusters, toCluster(&cluster))
	}
	return clusterList
}

func toCluster(cluster *v1alpha1.Cluster) Cluster {
	allocatedResources, err := getclusterAllocatedResources(cluster)
	if err != nil {
		log.Printf("Couldn't get allocated resources of %s cluster: %s\n", cluster.Name, err)
	}

	return Cluster{
		ObjectMeta:         types.NewObjectMeta(cluster.ObjectMeta),
		TypeMeta:           types.NewTypeMeta(types.ResourceKindCluster),
		Ready:              getClusterConditionStatus(cluster, metav1.ConditionTrue),
		KubernetesVersion:  cluster.Status.KubernetesVersion,
		AllocatedResources: allocatedResources,
		SyncMode:           cluster.Spec.SyncMode,
		NodeSummary:        cluster.Status.NodeSummary,
	}
}

func getClusterConditionStatus(cluster *v1alpha1.Cluster, conditionType metav1.ConditionStatus) metav1.ConditionStatus {
	for _, condition := range cluster.Status.Conditions {
		if condition.Status == conditionType {
			return condition.Status
		}
	}
	return metav1.ConditionUnknown
}
