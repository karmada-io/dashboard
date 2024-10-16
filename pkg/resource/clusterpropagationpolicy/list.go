package clusterpropagationpolicy

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
)

// ClusterPropagationPolicyList contains a list of propagation in the karmada control-plane.
type ClusterPropagationPolicyList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of PropagationPolicies.
	ClusterPropagationPolicies []ClusterPropagationPolicy `json:"clusterPropagationPolicies"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

type ClusterPropagationPolicy struct {
	ObjectMeta        types.ObjectMeta            `json:"objectMeta"`
	TypeMeta          types.TypeMeta              `json:"typeMeta"`
	SchedulerName     string                      `json:"schedulerName"`
	ClusterAffinity   *v1alpha1.ClusterAffinity   `json:"clusterAffinity"`
	ResourceSelectors []v1alpha1.ResourceSelector `json:"resourceSelectors"`
}

// GetClusterPropagationPolicyList returns a list of all propagations in the karmada control-plance.
func GetClusterPropagationPolicyList(client karmadaclientset.Interface, dsQuery *dataselect.DataSelectQuery) (*ClusterPropagationPolicyList, error) {
	clusterPropagationPolicies, err := client.PolicyV1alpha1().ClusterPropagationPolicies().List(context.TODO(), helpers.ListEverything)
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toClusterPropagationPolicyList(clusterPropagationPolicies.Items, nonCriticalErrors, dsQuery), nil
}

func toClusterPropagationPolicyList(clusterPropagationPolicies []v1alpha1.ClusterPropagationPolicy, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ClusterPropagationPolicyList {
	propagationpolicyList := &ClusterPropagationPolicyList{
		ClusterPropagationPolicies: make([]ClusterPropagationPolicy, 0),
		ListMeta:                   types.ListMeta{TotalItems: len(clusterPropagationPolicies)},
	}
	clusterPropagationPolicyCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(clusterPropagationPolicies), dsQuery)
	clusterPropagationPolicies = fromCells(clusterPropagationPolicyCells)
	propagationpolicyList.ListMeta = types.ListMeta{TotalItems: filteredTotal}
	propagationpolicyList.Errors = nonCriticalErrors

	for _, clusterPropagationPolicy := range clusterPropagationPolicies {
		clusterPP := toClusterPropagationPolicy(&clusterPropagationPolicy)
		propagationpolicyList.ClusterPropagationPolicies = append(propagationpolicyList.ClusterPropagationPolicies, clusterPP)
	}
	return propagationpolicyList
}

func toClusterPropagationPolicy(propagationpolicy *v1alpha1.ClusterPropagationPolicy) ClusterPropagationPolicy {
	return ClusterPropagationPolicy{
		ObjectMeta:      types.NewObjectMeta(propagationpolicy.ObjectMeta),
		TypeMeta:        types.NewTypeMeta(types.ResourceKindClusterPropagationPolicy),
		SchedulerName:   propagationpolicy.Spec.SchedulerName,
		ClusterAffinity: propagationpolicy.Spec.Placement.ClusterAffinity,
	}
}
