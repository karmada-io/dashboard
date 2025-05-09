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
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/karmada-io/dashboard/pkg/common/errors"
)

// ClusterOverridePolicyDetail contains clusterPropagationPolicy details and non-critical errors.
// ClusterOverridePolicyDetail 包含集群传播策略的详细信息和非关键错误。
type ClusterOverridePolicyDetail struct {
	// 扩展列表项结构。
	ClusterOverridePolicy `json:",inline"`

	// 在资源检索期间发生的非关键错误列表。
	Errors []error `json:"errors"`
}

// GetClusterOverridePolicyDetail 获取集群传播策略的详细信息。
func GetClusterOverridePolicyDetail(client karmadaclientset.Interface, name string) (*ClusterOverridePolicyDetail, error) {
	overridepolicyData, err := client.PolicyV1alpha1().ClusterOverridePolicies().Get(context.TODO(), name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}

	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	propagationpolicy := toOverridePolicyDetail(overridepolicyData, nonCriticalErrors)
	return &propagationpolicy, nil
}

// toOverridePolicyDetail 将ClusterOverridePolicy对象转换为ClusterOverridePolicyDetail对象。
// 它将ClusterOverridePolicy对象转换为ClusterOverridePolicyDetail对象，并添加非关键错误。
func toOverridePolicyDetail(clusterOverridepolicy *v1alpha1.ClusterOverridePolicy, nonCriticalErrors []error) ClusterOverridePolicyDetail {
	return ClusterOverridePolicyDetail{
		ClusterOverridePolicy: toClusterOverridePolicy(clusterOverridepolicy),
		Errors:                nonCriticalErrors,
	}
}
