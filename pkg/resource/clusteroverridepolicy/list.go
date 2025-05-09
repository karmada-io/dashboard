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
// ClusterOverridePolicyList 包含Karmada控制平面中的覆盖策略列表。
type ClusterOverridePolicyList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// 未排序的clusterOverridePolicies列表。
	ClusterOverridePolicies []ClusterOverridePolicy `json:"clusterOverridePolicies"`

	// 在资源检索期间发生的非关键错误列表。
	Errors []error `json:"errors"`
}

// ClusterOverridePolicy 包含有关单个集群覆盖策略的信息。
type ClusterOverridePolicy struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`
	// 覆盖特定数据
	ResourceSelectors []v1alpha1.ResourceSelector `json:"resourceSelectors"`
	OverrideRules     []v1alpha1.RuleWithCluster  `json:"overrideRules"`
}

// GetClusterOverridePolicyList 返回Karmada控制平面中所有覆盖策略的列表。
func GetClusterOverridePolicyList(client karmadaclientset.Interface, dsQuery *dataselect.DataSelectQuery) (*ClusterOverridePolicyList, error) {
	clusterOverridePolicies, err := client.PolicyV1alpha1().ClusterOverridePolicies().List(context.TODO(), helpers.ListEverything)
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toClusterOverridePolicyList(clusterOverridePolicies.Items, nonCriticalErrors, dsQuery), nil
}

// toClusterOverridePolicyList 将v1alpha1.ClusterOverridePolicy对象列表转换为ClusterOverridePolicyList对象。
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

// toClusterOverridePolicy 将v1alpha1.ClusterOverridePolicy对象转换为ClusterOverridePolicy对象。
func toClusterOverridePolicy(overridepolicy *v1alpha1.ClusterOverridePolicy) ClusterOverridePolicy {
	return ClusterOverridePolicy{
		ObjectMeta:        types.NewObjectMeta(overridepolicy.ObjectMeta),
		TypeMeta:          types.NewTypeMeta(types.ResourceKindClusterOverridePolicy),
		ResourceSelectors: overridepolicy.Spec.ResourceSelectors,
		OverrideRules:     overridepolicy.Spec.OverrideRules,
	}
}
