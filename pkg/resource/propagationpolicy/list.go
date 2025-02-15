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

package propagationpolicy

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	"k8s.io/client-go/kubernetes"

	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
)

// PropagationPolicyList contains a list of propagation in the karmada control-plance.
type PropagationPolicyList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of PropagationPolicys.
	PropagationPolicys []PropagationPolicy `json:"propagationpolicys"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// PropagationPolicy contains information about a single propagation.
type PropagationPolicy struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`
	// propagation specificed data
	SchedulerName    string                    `json:"schedulerName"`
	ClusterAffinity  *v1alpha1.ClusterAffinity `json:"clusterAffinity"`
	RelatedResources []string                  `json:"relatedResources"`
}

// GetPropagationPolicyList returns a list of all propagations in the karmada control-plance.
func GetPropagationPolicyList(client karmadaclientset.Interface, k8sClient kubernetes.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*PropagationPolicyList, error) {
	log.Println("Getting list of namespaces")
	propagationpolicies, err := client.PolicyV1alpha1().PropagationPolicies(nsQuery.ToRequestParam()).List(context.TODO(), helpers.ListEverything)
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toPropagationPolicyList(k8sClient, propagationpolicies.Items, nonCriticalErrors, dsQuery), nil
}

func toPropagationPolicyList(_ kubernetes.Interface, propagationpolicies []v1alpha1.PropagationPolicy, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *PropagationPolicyList {
	propagationpolicyList := &PropagationPolicyList{
		PropagationPolicys: make([]PropagationPolicy, 0),
		ListMeta:           types.ListMeta{TotalItems: len(propagationpolicies)},
	}
	propagationpolicyCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(propagationpolicies), dsQuery)
	propagationpolicies = fromCells(propagationpolicyCells)
	propagationpolicyList.ListMeta = types.ListMeta{TotalItems: filteredTotal}
	propagationpolicyList.Errors = nonCriticalErrors

	verberClient, err := client.VerberClient(nil)
	if err != nil {
		panic(err)
	}
	for _, propagationpolicy := range propagationpolicies {
		relatedResources := make([]string, 0)
		for _, rs := range propagationpolicy.Spec.ResourceSelectors {
			getRes, getErr := verberClient.Get(strings.ToLower(rs.Kind), rs.Namespace, rs.Name)
			if getErr != nil {
				continue
			}
			if errors.IsNotFound(err) || getRes == nil {
				continue
			}
			relatedResources = append(relatedResources, fmt.Sprintf("%s/%s", rs.Namespace, rs.Name))
		}

		pp := toPropagationPolicy(&propagationpolicy)
		pp.RelatedResources = relatedResources
		propagationpolicyList.PropagationPolicys = append(propagationpolicyList.PropagationPolicys, pp)
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
