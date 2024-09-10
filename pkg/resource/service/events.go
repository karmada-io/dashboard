package service

import (
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	"log"

	client "k8s.io/client-go/kubernetes"
)

// GetServiceEvents returns model events for a service with the given name in the given namespace.
func GetServiceEvents(client client.Interface, dsQuery *dataselect.DataSelectQuery, namespace, name string) (
	*common.EventList, error) {
	eventList := common.EventList{
		Events:   make([]common.Event, 0),
		ListMeta: types.ListMeta{TotalItems: 0},
	}

	serviceEvents, err := event.GetEvents(client, namespace, name)
	if err != nil {
		return &eventList, err
	}

	eventList = event.CreateEventList(event.FillEventsType(serviceEvents), dsQuery)
	log.Printf("Found %d events related to %s service in %s namespace", len(eventList.Events), name, namespace)
	return &eventList, nil
}
