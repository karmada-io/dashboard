package propagationpolicy

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PropagationPolicyDetail is a presentation layer view of Karmada PropagationPolicy resource. This means it is PropagationPolicy plus
// additional augmented data we can get from other sources.
type PropagationPolicyDetail struct {
	// Extends list item structure.
	PropagationPolicy `json:",inline"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetPropagationPolicyDetail gets propagationpolicy details.
func GetPropagationPolicyDetail(client karmadaclientset.Interface, namespace, name string) (*PropagationPolicyDetail, error) {
	propagationpolicyData, err := client.PolicyV1alpha1().PropagationPolicies(namespace).Get(context.TODO(), name, metaV1.GetOptions{})
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

func toPropagationPolicyDetail(propagationpolicy *v1alpha1.PropagationPolicy, nonCriticalErrors []error) PropagationPolicyDetail {
	return PropagationPolicyDetail{
		PropagationPolicy: toPropagationPolicy(propagationpolicy),
		Errors:            nonCriticalErrors,
	}
}
