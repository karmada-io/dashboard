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

package job

import (
	batch "k8s.io/api/batch/v1"
	v1 "k8s.io/api/core/v1"

	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
)

// The code below allows to perform complex data section on []batch.Job

// JobCell represents a job cell that implements the DataCell interface.
type JobCell batch.Job

// GetProperty returns a comparable value for a specified property name.
func (c JobCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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

// ToCells converts a slice of Jobs to a slice of DataCells.
func ToCells(std []batch.Job) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = JobCell(std[i])
	}
	return cells
}

// FromCells converts a slice of DataCells to a slice of Jobs.
func FromCells(cells []dataselect.DataCell) []batch.Job {
	std := make([]batch.Job, len(cells))
	for i := range std {
		std[i] = batch.Job(cells[i].(JobCell))
	}
	return std
}

func getStatus(list *batch.JobList, pods []v1.Pod) common.ResourceStatus {
	info := common.ResourceStatus{}
	if list == nil {
		return info
	}

	for _, job := range list.Items {
		matchingPods := common.FilterPodsForJob(job, pods)
		podInfo := common.GetPodInfo(job.Status.Active, job.Spec.Completions, matchingPods)
		jobStatus := getJobStatus(&job)

		if jobStatus.Status == JobStatusFailed {
			info.Failed++
		} else if jobStatus.Status == JobStatusComplete {
			info.Succeeded++
		} else if podInfo.Running > 0 {
			info.Running++
		} else {
			info.Pending++
		}
	}

	return info
}
