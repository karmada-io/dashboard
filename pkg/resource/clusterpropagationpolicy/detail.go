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

package clusterpropagationpolicy

import (
	"context"

	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/karmada-io/dashboard/pkg/common/errors"
)

// ClusterPropagationPolicyDetail contains clusterPropagationPolicy details.
type ClusterPropagationPolicyDetail struct {
	// Extends list item structure.
	ClusterPropagationPolicy `json:",inline"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetClusterPropagationPolicyDetail gets clusterPropagationPolicy details.
func GetClusterPropagationPolicyDetail(client karmadaclientset.Interface, name string) (*ClusterPropagationPolicyDetail, error) {
	propagationpolicyData, err := client.PolicyV1alpha1().ClusterPropagationPolicies().Get(context.TODO(), name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}

	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	propagationpolicy := toPropagationPolicyDetail(propagationpolicyData, nonCriticalErrors)
	return &propagationpolicy, nil
}

func toPropagationPolicyDetail(clusterPropagationpolicy *v1alpha1.ClusterPropagationPolicy, nonCriticalErrors []error) ClusterPropagationPolicyDetail {
	return ClusterPropagationPolicyDetail{
		ClusterPropagationPolicy: toClusterPropagationPolicy(clusterPropagationpolicy),
		Errors:                   nonCriticalErrors,
	}
}
