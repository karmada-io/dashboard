package clusteroverridepolicy

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ClusterOverridePolicyDetail struct {
	// Extends list item structure.
	ClusterOverridePolicy `json:",inline"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetClusterOverridePolicyDetail gets clusterPropagationPolicy details.
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

func toOverridePolicyDetail(clusterOverridepolicy *v1alpha1.ClusterOverridePolicy, nonCriticalErrors []error) ClusterOverridePolicyDetail {
	return ClusterOverridePolicyDetail{
		ClusterOverridePolicy: toClusterOverridePolicy(clusterOverridepolicy),
		Errors:                nonCriticalErrors,
	}
}
