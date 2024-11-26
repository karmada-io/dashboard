package pod

import (
	"context"

	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type PodDeatil struct {
	ObjectMeta metaV1.ObjectMeta `json:"objectMeta"`
	TypeMeta   metaV1.TypeMeta   `json:"typeMeta"`
	Spec       v1.PodSpec        `json:"podSpec"`
	Status     v1.PodStatus      `json:"status"`
}

// GetPodDetail returns a Pod detail
func GetPodDetail(client kubernetes.Interface, namespace, name string) (*v1.Pod, error) {
	podData, err := client.CoreV1().Pods(namespace).Get(context.TODO(), name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}
	return podData, nil
}
