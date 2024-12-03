package clusteroverridepolicy

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
)

// ClusterOverridePolicyList contains a list of overriders in the karmada control-plane.
type ClusterOverridePolicyList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of clusterOverridePolicies.
	ClusterOverridePolicies []ClusterOverridePolicy `json:"clusterOverridePolicies"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

type ClusterOverridePolicy struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`
	// Override specificed data
	ResourceSelectors []v1alpha1.ResourceSelector `json:"resourceSelectors"`
	OverrideRules     []v1alpha1.RuleWithCluster  `json:"overrideRules"`
}

// GetClusterOverridePolicyList returns a list of all overiders in the karmada control-plance.
func GetClusterOverridePolicyList(client karmadaclientset.Interface, dsQuery *dataselect.DataSelectQuery) (*ClusterOverridePolicyList, error) {
	clusterOverridePolicies, err := client.PolicyV1alpha1().ClusterOverridePolicies().List(context.TODO(), helpers.ListEverything)
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toClusterOverridePolicyList(clusterOverridePolicies.Items, nonCriticalErrors, dsQuery), nil
}

func toClusterOverridePolicyList(clusterOverridePolicies []v1alpha1.ClusterOverridePolicy, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ClusterOverridePolicyList {
	overridepolicyList := &ClusterOverridePolicyList{
		ClusterOverridePolicies: make([]ClusterOverridePolicy, 0),
		ListMeta:                types.ListMeta{TotalItems: len(clusterOverridePolicies)},
	}
	clusterOverridePolicyCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(clusterOverridePolicies), dsQuery)
	clusterOverridePolicies = fromCells(clusterOverridePolicyCells)
	overridepolicyList.ListMeta = types.ListMeta{TotalItems: filteredTotal}
	overridepolicyList.Errors = nonCriticalErrors

	for _, clusterOverridePolicy := range clusterOverridePolicies {
		clusterOP := toClusterOverridePolicy(&clusterOverridePolicy)
		overridepolicyList.ClusterOverridePolicies = append(overridepolicyList.ClusterOverridePolicies, clusterOP)
	}
	return overridepolicyList
}

func toClusterOverridePolicy(overridepolicy *v1alpha1.ClusterOverridePolicy) ClusterOverridePolicy {
	return ClusterOverridePolicy{
		ObjectMeta:        types.NewObjectMeta(overridepolicy.ObjectMeta),
		TypeMeta:          types.NewTypeMeta(types.ResourceKindClusterOverridePolicy),
		ResourceSelectors: overridepolicy.Spec.ResourceSelectors,
		OverrideRules:     overridepolicy.Spec.OverrideRules,
	}
}
