package overridepolicy

import (
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
)

type OverridePolicyCell v1alpha1.OverridePolicy

func (self OverridePolicyCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.NamespaceProperty:

		return dataselect.StdComparableString(self.ObjectMeta.Namespace)
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
