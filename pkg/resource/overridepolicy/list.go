package overridepolicy

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	"k8s.io/client-go/kubernetes"
	"log"
)

// OverridePolicyList contains a list of propagation in the karmada control-plance.
type OverridePolicyList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of OverridePolicys.
	OverridePolicys []OverridePolicy `json:"overridepolicys"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

type OverridePolicy struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`
	// Override specificed data
	ResourceSelectors []v1alpha1.ResourceSelector `json:"resourceSelectors"`
	OverrideRules     []v1alpha1.RuleWithCluster  `json:"overrideRules"`
}

// GetOverridePolicyList returns a list of all propagations in the karmada control-plance.
func GetOverridePolicyList(client karmadaclientset.Interface, k8sClient kubernetes.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*OverridePolicyList, error) {
	log.Println("Getting list of overridepolicy")
	overridePolicies, err := client.PolicyV1alpha1().OverridePolicies(nsQuery.ToRequestParam()).List(context.TODO(), helpers.ListEverything)
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toOverridePolicyList(k8sClient, overridePolicies.Items, nonCriticalErrors, dsQuery), nil
}

func toOverridePolicyList(k8sClient kubernetes.Interface, overridepolicies []v1alpha1.OverridePolicy, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *OverridePolicyList {
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

func toOverridePolicy(overridepolicy *v1alpha1.OverridePolicy) OverridePolicy {
	return OverridePolicy{
		ObjectMeta:        types.NewObjectMeta(overridepolicy.ObjectMeta),
		TypeMeta:          types.NewTypeMeta(types.ResourceKindOverridePolicy),
		ResourceSelectors: overridepolicy.Spec.ResourceSelectors,
		OverrideRules:     overridepolicy.Spec.OverrideRules,
	}
}
