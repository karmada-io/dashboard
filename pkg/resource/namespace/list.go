package namespace

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
	"log"
)

// NamespaceList contains a list of namespaces in the cluster.
type NamespaceList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of Namespaces.
	Namespaces []Namespace `json:"namespaces"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// Namespace is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type Namespace struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`

	// Phase is the current lifecycle phase of the namespace.
	Phase               v1.NamespacePhase `json:"phase"`
	SkipAutoPropagation bool              `json:"skipAutoPropagation"`
}

// GetNamespaceList returns a list of all namespaces in the cluster.
func GetNamespaceList(client kubernetes.Interface, dsQuery *dataselect.DataSelectQuery) (*NamespaceList, error) {
	log.Println("Getting list of namespaces")
	namespaces, err := client.CoreV1().Namespaces().List(context.TODO(), helpers.ListEverything)

	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toNamespaceList(namespaces.Items, nonCriticalErrors, dsQuery), nil
}

func toNamespaceList(namespaces []v1.Namespace, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *NamespaceList {
	namespaceList := &NamespaceList{
		Namespaces: make([]Namespace, 0),
		ListMeta:   types.ListMeta{TotalItems: len(namespaces)},
	}

	namespaceCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(namespaces), dsQuery)
	namespaces = fromCells(namespaceCells)
	namespaceList.ListMeta = types.ListMeta{TotalItems: filteredTotal}
	namespaceList.Errors = nonCriticalErrors

	for _, namespace := range namespaces {
		namespaceList.Namespaces = append(namespaceList.Namespaces, toNamespace(namespace))
	}

	return namespaceList
}

func toNamespace(namespace v1.Namespace) Namespace {
	_, exist := namespace.Labels[skipAutoPropagationLable]

	return Namespace{
		ObjectMeta:          types.NewObjectMeta(namespace.ObjectMeta),
		TypeMeta:            types.NewTypeMeta(types.ResourceKindNamespace),
		Phase:               namespace.Status.Phase,
		SkipAutoPropagation: exist,
	}
}
