package namespace

import (
	"context"
	"log"

	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sClient "k8s.io/client-go/kubernetes"
)

// NamespaceDetail is a presentation layer view of Kubernetes Namespace resource. This means it is Namespace plus
// additional augmented data we can get from other sources.
type NamespaceDetail struct {
	// Extends list item structure.
	Namespace `json:",inline"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetNamespaceDetail gets namespace details.
func GetNamespaceDetail(client k8sClient.Interface, name string) (*NamespaceDetail, error) {
	log.Printf("Getting details of %s namespace\n", name)

	namespace, err := client.CoreV1().Namespaces().Get(context.TODO(), name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}

	namespaceDetails := toNamespaceDetail(*namespace)
	return &namespaceDetails, nil
}

func toNamespaceDetail(namespace v1.Namespace) NamespaceDetail {
	return NamespaceDetail{
		Namespace: toNamespace(namespace),
	}
}
