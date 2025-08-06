package overridepolicy

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// OverridePolicyDetail is a presentation layer view of Karmada OverridePolicy resource. This means it is OverridePolicy plus
// additional augmented data we can get from other sources.
type OverridePolicyDetail struct {
	// Extends list item structure.
	OverridePolicy `json:",inline"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetOverridePolicyDetail gets Overridepolicy details.
func GetOverridePolicyDetail(client karmadaclientset.Interface, namespace, name string) (*OverridePolicyDetail, error) {
	OverridepolicyData, err := client.PolicyV1alpha1().OverridePolicies(namespace).Get(context.TODO(), name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}

	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	Overridepolicy := toOverridePolicyDetail(OverridepolicyData, nonCriticalErrors)
	return &Overridepolicy, nil
}

func toOverridePolicyDetail(Overridepolicy *v1alpha1.OverridePolicy, nonCriticalErrors []error) OverridePolicyDetail {
	return OverridePolicyDetail{
		OverridePolicy: toOverridePolicy(Overridepolicy),
		Errors:         nonCriticalErrors,
	}
}
