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

package event

import (
	"context"

	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"

	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
)

// EmptyEventList is a empty list of events.
var EmptyEventList = &common.EventList{
	Events: make([]common.Event, 0),
	ListMeta: types.ListMeta{
		TotalItems: 0,
	},
}

// GetEvents gets events associated to resource with given name.
func GetEvents(client kubernetes.Interface, namespace, resourceName string) ([]v1.Event, error) {
	fieldSelector, err := fields.ParseSelector("involvedObject.name" + "=" + resourceName)

	if err != nil {
		return nil, err
	}

	channels := &common.ResourceChannels{
		EventList: common.GetEventListChannelWithOptions(
			client,
			common.NewSameNamespaceQuery(namespace),
			metaV1.ListOptions{
				LabelSelector: labels.Everything().String(),
				FieldSelector: fieldSelector.String(),
			},
			1),
	}

	eventList := <-channels.EventList.List
	if err := <-channels.EventList.Error; err != nil {
		return nil, err
	}

	return FillEventsType(eventList.Items), nil
}

// FillEventsType is based on event Reason fills event Type in order to allow correct filtering by Type.
func FillEventsType(events []v1.Event) []v1.Event {
	for i := range events {
		// Fill in only events with empty type.
		if len(events[i].Type) == 0 {
			if isFailedReason(events[i].Reason, FailedReasonPartials...) {
				events[i].Type = v1.EventTypeWarning
			} else {
				events[i].Type = v1.EventTypeNormal
			}
		}
	}

	return events
}

// ToEvent converts event api Event to Event model object.
func ToEvent(event v1.Event) common.Event {
	firstTimestamp, lastTimestamp := event.FirstTimestamp, event.LastTimestamp
	eventTime := metaV1.NewTime(event.EventTime.Time)

	if firstTimestamp.IsZero() {
		firstTimestamp = eventTime
	}

	if lastTimestamp.IsZero() {
		lastTimestamp = firstTimestamp
	}

	result := common.Event{
		ObjectMeta:         types.NewObjectMeta(event.ObjectMeta),
		TypeMeta:           types.NewTypeMeta(types.ResourceKindEvent),
		Message:            event.Message,
		SourceComponent:    event.Source.Component,
		SourceHost:         event.Source.Host,
		SubObject:          event.InvolvedObject.FieldPath,
		SubObjectKind:      event.InvolvedObject.Kind,
		SubObjectName:      event.InvolvedObject.Name,
		SubObjectNamespace: event.InvolvedObject.Namespace,
		Count:              event.Count,
		FirstSeen:          firstTimestamp,
		LastSeen:           lastTimestamp,
		Reason:             event.Reason,
		Type:               event.Type,
	}

	return result
}

// GetResourceEvents gets events associated to specified resource.
func GetResourceEvents(client kubernetes.Interface, dsQuery *dataselect.DataSelectQuery, namespace, name string) (
	*common.EventList, error) {
	resourceEvents, err := GetEvents(client, namespace, name)
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return EmptyEventList, err
	}

	events := CreateEventList(resourceEvents, dsQuery)
	events.Errors = nonCriticalErrors
	return &events, nil
}

// GetNamespaceEvents gets events associated to a namespace with given name.
func GetNamespaceEvents(client kubernetes.Interface, dsQuery *dataselect.DataSelectQuery, namespace string) (common.EventList, error) {
	events, _ := client.CoreV1().Events(namespace).List(context.TODO(), helpers.ListEverything)
	return CreateEventList(FillEventsType(events.Items), dsQuery), nil
}

// CreateEventList converts array of api events to common EventList structure
func CreateEventList(events []v1.Event, dsQuery *dataselect.DataSelectQuery) common.EventList {
	eventList := common.EventList{
		Events:   make([]common.Event, 0),
		ListMeta: types.ListMeta{TotalItems: len(events)},
	}

	events = fromCells(dataselect.GenericDataSelect(toCells(events), dsQuery))
	for _, event := range events {
		eventDetail := ToEvent(event)
		eventList.Events = append(eventList.Events, eventDetail)
	}

	return eventList
}

// The code below allows to perform complex data section on []api.Event

// EventCell wraps v1.Event for data selection.
type EventCell v1.Event

// GetProperty returns a property of the cell.
func (c EventCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(c.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(c.ObjectMeta.CreationTimestamp.Time)
	case dataselect.FirstSeenProperty:
		return dataselect.StdComparableTime(c.FirstTimestamp.Time)
	case dataselect.LastSeenProperty:
		return dataselect.StdComparableTime(c.LastTimestamp.Time)
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(c.ObjectMeta.Namespace)
	case dataselect.ReasonProperty:
		return dataselect.StdComparableString(c.Reason)
	default:
		// if name is not supported then just return a constant dummy value, sort will have no effect.
		return nil
	}
}

func toCells(std []v1.Event) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = EventCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []v1.Event {
	std := make([]v1.Event, len(cells))
	for i := range std {
		std[i] = v1.Event(cells[i].(EventCell))
	}
	return std
}
