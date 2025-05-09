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

package overridepolicy

import (
	"context"
	"log"

	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	"k8s.io/client-go/kubernetes"

	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
)

// OverridePolicyList contains a list of override policies in the karmada control-plane.
// OverridePolicyList 包含Karmada控制平面中的覆盖策略列表。
type OverridePolicyList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// 未排序的OverridePolicy列表。
	OverridePolicys []OverridePolicy `json:"overridepolicys"`

	// 在资源检索期间发生的非关键错误列表。
	Errors []error `json:"errors"`
}

// OverridePolicy 包含有关单个覆盖策略的信息。
type OverridePolicy struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`
	// 覆盖特定数据
	ResourceSelectors []v1alpha1.ResourceSelector `json:"resourceSelectors"`
	OverrideRules     []v1alpha1.RuleWithCluster  `json:"overrideRules"`
}

// GetOverridePolicyList 返回Karmada控制平面中所有覆盖策略的列表。
func GetOverridePolicyList(client karmadaclientset.Interface, k8sClient kubernetes.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*OverridePolicyList, error) {
	log.Println("Getting list of overridepolicy")
	overridePolicies, err := client.PolicyV1alpha1().OverridePolicies(nsQuery.ToRequestParam()).List(context.TODO(), helpers.ListEverything)
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toOverridePolicyList(k8sClient, overridePolicies.Items, nonCriticalErrors, dsQuery), nil
}

// toOverridePolicyList 将v1alpha1.OverridePolicy对象列表转换为OverridePolicyList对象。
func toOverridePolicyList(_ kubernetes.Interface, overridepolicies []v1alpha1.OverridePolicy, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *OverridePolicyList {
	overridepolicyList := &OverridePolicyList{
		OverridePolicys: make([]OverridePolicy, 0),
		ListMeta:        types.ListMeta{TotalItems: len(overridepolicies)},
	}
	overridepolicyCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(overridepolicies), dsQuery)
	overridepolicies = fromCells(overridepolicyCells)
	overridepolicyList.ListMeta = types.ListMeta{TotalItems: filteredTotal}
	overridepolicyList.Errors = nonCriticalErrors

	for _, overridepolicy := range overridepolicies {
		op := toOverridePolicy(&overridepolicy)
		overridepolicyList.OverridePolicys = append(overridepolicyList.OverridePolicys, op)
	}
	return overridepolicyList
}

// toOverridePolicy 将v1alpha1.OverridePolicy对象转换为OverridePolicy对象。
func toOverridePolicy(overridepolicy *v1alpha1.OverridePolicy) OverridePolicy {
	return OverridePolicy{
		ObjectMeta:        types.NewObjectMeta(overridepolicy.ObjectMeta),
		TypeMeta:          types.NewTypeMeta(types.ResourceKindOverridePolicy),
		ResourceSelectors: overridepolicy.Spec.ResourceSelectors,
		OverrideRules:     overridepolicy.Spec.OverrideRules,
	}
}
