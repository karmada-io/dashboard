package configmap

import (
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
	"log"

	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ConfigMapList contains a list of Config Maps in the cluster.
type ConfigMapList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// Unordered list of Config Maps
	Items []ConfigMap `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// ConfigMap API resource provides mechanisms to inject containers with configuration data while keeping
// containers agnostic of Kubernetes
type ConfigMap struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`
}

// GetConfigMapList returns a list of all ConfigMaps in the cluster.
func GetConfigMapList(client kubernetes.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*ConfigMapList, error) {
	log.Printf("Getting list config maps in the namespace %s", nsQuery.ToRequestParam())
	channels := &common.ResourceChannels{
		ConfigMapList: common.GetConfigMapListChannel(client, nsQuery, 1),
	}

	return GetConfigMapListFromChannels(channels, dsQuery)
}

// GetConfigMapListFromChannels returns a list of all Config Maps in the cluster reading required resource list once from the channels.
func GetConfigMapListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery) (*ConfigMapList, error) {
	configMaps := <-channels.ConfigMapList.List
	err := <-channels.ConfigMapList.Error
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	result := toConfigMapList(configMaps.Items, nonCriticalErrors, dsQuery)

	return result, nil
}

func toConfigMap(meta metaV1.ObjectMeta) ConfigMap {
	return ConfigMap{
		ObjectMeta: types.NewObjectMeta(meta),
		TypeMeta:   types.NewTypeMeta(types.ResourceKindConfigMap),
	}
}

func toConfigMapList(configMaps []v1.ConfigMap, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ConfigMapList {
	result := &ConfigMapList{
		Items:    make([]ConfigMap, 0),
		ListMeta: types.ListMeta{TotalItems: len(configMaps)},
		Errors:   nonCriticalErrors,
	}

	configMapCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(configMaps), dsQuery)
	configMaps = fromCells(configMapCells)
	result.ListMeta = types.ListMeta{TotalItems: filteredTotal}

	for _, item := range configMaps {
		result.Items = append(result.Items, toConfigMap(item.ObjectMeta))
	}

	return result
}
