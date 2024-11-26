package pod

import (
	"log"

	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type Pod struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`
	Status     v1.PodStatus     `json:"status"`
}

// PodList contains a list of pod.
type PodList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of Pods
	Items []Pod `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetPodList returns a list of all Pods in all cluster.
func GetPodList(client kubernetes.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*PodList, error) {
	log.Printf("Getting pods")
	channels := &common.ResourceChannels{
		PodList: common.GetPodListChannel(client, nsQuery, 1),
	}

	return GetPodListFromChannels(channels, dsQuery)
}

// GetPodListFromChannels returns a list of all Pods in the cluster reading required resource list once from the channels.
func GetPodListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery) (*PodList, error) {
	pods := <-channels.PodList.List
	err := <-channels.PodList.Error
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	result := toPodList(pods.Items, nonCriticalErrors, dsQuery)

	return result, nil
}

func toPod(meta metav1.ObjectMeta, status v1.PodStatus) Pod {
	return Pod{
		ObjectMeta: types.NewObjectMeta(meta),
		TypeMeta:   types.NewTypeMeta(types.ResourceKindPod),
		Status:     NewStatus(status),
	}
}

func toPodList(pods []v1.Pod, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *PodList {
	result := &PodList{
		Items:    make([]Pod, 0),
		ListMeta: types.ListMeta{TotalItems: len(pods)},
		Errors:   nonCriticalErrors,
	}

	podCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(pods), dsQuery)
	pods = fromCells(podCells)
	result.ListMeta = types.ListMeta{TotalItems: filteredTotal}

	for _, item := range pods {
		result.Items = append(result.Items, toPod(item.ObjectMeta, item.Status))
	}

	return result
}

func NewStatus(status v1.PodStatus) v1.PodStatus {
	return v1.PodStatus{
		Conditions: status.Conditions,
	}
}
