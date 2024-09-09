package cronjob

import (
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	client "k8s.io/client-go/kubernetes"
)

// GetCronJobEvents gets events associated to cron job.
func GetCronJobEvents(client client.Interface, dsQuery *dataselect.DataSelectQuery, namespace, name string) (
	*common.EventList, error) {

	raw, err := event.GetEvents(client, namespace, name)
	if err != nil {
		return event.EmptyEventList, err
	}

	events := event.CreateEventList(raw, dsQuery)
	return &events, nil
}
