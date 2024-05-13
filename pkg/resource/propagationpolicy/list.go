package propagationpolicy

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	"log"
)

// PropagationPolicyList contains a list of propagation in the karmada control-plance.
type PropagationPolicyList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of PropagationPolicys.
	PropagationPolicys []PropagationPolicy `json:"propagationpolicys"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

type PropagationPolicy struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`
	// propagation specificed data
	SchedulerName   string                    `json:"schedulerName"`
	ClusterAffinity *v1alpha1.ClusterAffinity `json:"clusterAffinity"`
}

// GetPropagationPolicyList returns a list of all propagations in the karmada control-plance.
func GetPropagationPolicyList(client karmadaclientset.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*PropagationPolicyList, error) {
	log.Println("Getting list of namespaces")
	propagationpolicies, err := client.PolicyV1alpha1().PropagationPolicies(nsQuery.ToRequestParam()).List(context.TODO(), helpers.ListEverything)

	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toPropagationPolicyList(propagationpolicies.Items, nonCriticalErrors, dsQuery), nil
}

func toPropagationPolicyList(propagationpolicies []v1alpha1.PropagationPolicy, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *PropagationPolicyList {
	propagationpolicyList := &PropagationPolicyList{
		PropagationPolicys: make([]PropagationPolicy, 0),
		ListMeta:           types.ListMeta{TotalItems: len(propagationpolicies)},
	}
	propagationpolicyCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(propagationpolicies), dsQuery)
	propagationpolicies = fromCells(propagationpolicyCells)
	propagationpolicyList.ListMeta = types.ListMeta{TotalItems: filteredTotal}
	propagationpolicyList.Errors = nonCriticalErrors

	for _, propagationpolicy := range propagationpolicies {
		propagationpolicyList.PropagationPolicys = append(propagationpolicyList.PropagationPolicys, toPropagationPolicy(&propagationpolicy))
	}
	return propagationpolicyList
}

func toPropagationPolicy(propagationpolicy *v1alpha1.PropagationPolicy) PropagationPolicy {
	return PropagationPolicy{
		ObjectMeta:      types.NewObjectMeta(propagationpolicy.ObjectMeta),
		TypeMeta:        types.NewTypeMeta(types.ResourceKindPropagationPolicy),
		SchedulerName:   propagationpolicy.Spec.SchedulerName,
		ClusterAffinity: propagationpolicy.Spec.Placement.ClusterAffinity,
	}
}
