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

package deployment

import (
	apps "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"

	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
	"github.com/karmada-io/dashboard/pkg/resource/event"
)

// DeploymentCell is a wrapper for the k8s deployment
type DeploymentCell apps.Deployment

// GetProperty is used to get property of the deployment
func (c DeploymentCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(c.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(c.ObjectMeta.CreationTimestamp.Time)
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(c.ObjectMeta.Namespace)
	default:
		// if name is not supported then just return a constant dummy value, sort will have no effect.
		return nil
	}
}

func toCells(std []apps.Deployment) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = DeploymentCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []apps.Deployment {
	std := make([]apps.Deployment, len(cells))
	for i := range std {
		std[i] = apps.Deployment(cells[i].(DeploymentCell))
	}
	return std
}

func getStatus(list *apps.DeploymentList, rs []apps.ReplicaSet, pods []v1.Pod, events []v1.Event) common.ResourceStatus {
	info := common.ResourceStatus{}
	if list == nil {
		return info
	}

	for _, deployment := range list.Items {
		matchingPods := common.FilterDeploymentPodsByOwnerReference(deployment, rs, pods)
		podInfo := common.GetPodInfo(deployment.Status.Replicas, deployment.Spec.Replicas, matchingPods)
		warnings := event.GetPodsEventWarnings(events, matchingPods)

		if len(warnings) > 0 {
			info.Failed++
		} else if podInfo.Pending > 0 {
			info.Pending++
		} else {
			info.Running++
		}
	}

	return info
}

func getConditions(deploymentConditions []apps.DeploymentCondition) []common.Condition {
	conditions := make([]common.Condition, 0)

	for _, condition := range deploymentConditions {
		conditions = append(conditions, common.Condition{
			Type:               string(condition.Type),
			Status:             condition.Status,
			Reason:             condition.Reason,
			Message:            condition.Message,
			LastTransitionTime: condition.LastTransitionTime,
			LastProbeTime:      condition.LastUpdateTime,
		})
	}

	return conditions
}
