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

package clusteroverridepolicy

import (
	"context"

	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"

	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
)

// ClusterOverridePolicyList contains a list of overriders in the karmada control-plane.
type ClusterOverridePolicyList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of clusterOverridePolicies.
	ClusterOverridePolicies []ClusterOverridePolicy `json:"clusterOverridePolicies"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// ClusterOverridePolicy contains information about a single clusterOverridePolicy.
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
