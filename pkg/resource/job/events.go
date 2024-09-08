package job

import (
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	client "k8s.io/client-go/kubernetes"
)

// GetJobEvents gets events associated to job.
func GetJobEvents(client client.Interface, dsQuery *dataselect.DataSelectQuery, namespace, name string) (
	*common.EventList, error) {

	jobEvents, err := event.GetEvents(client, namespace, name)
	if err != nil {
		return event.EmptyEventList, err
	}

	events := event.CreateEventList(jobEvents, dsQuery)
	return &events, nil
}
