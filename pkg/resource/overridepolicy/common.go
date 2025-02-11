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

package overridepolicy

import (
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"

	"github.com/karmada-io/dashboard/pkg/dataselect"
)

// OverridePolicyCell represents an OverridePolicy that implements the DataCell interface.
type OverridePolicyCell v1alpha1.OverridePolicy

// GetProperty returns a comparable value for a specified property name.
func (c OverridePolicyCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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

func toCells(std []v1alpha1.OverridePolicy) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = OverridePolicyCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []v1alpha1.OverridePolicy {
	std := make([]v1alpha1.OverridePolicy, len(cells))
	for i := range std {
		std[i] = v1alpha1.OverridePolicy(cells[i].(OverridePolicyCell))
	}
	return std
}
