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

package namespace

import (
	"context"
	"log"

	api "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"

	"github.com/karmada-io/dashboard/pkg/dataselect"
)

const (
	skipAutoPropagationLable = "namespace.karmada.io/skip-auto-propagation"
)

// NamespaceSpec is a specification of namespace to create.
type NamespaceSpec struct {
	// Name of the namespace.
	Name string `json:"name"`
	// Whether skip auto propagation
	SkipAutoPropagation bool
}

// CreateNamespace creates namespace based on given specification.
func CreateNamespace(spec *NamespaceSpec, client kubernetes.Interface) error {
	// todo add namespace.karmada.io/skip-auto-propagation: "true"  to avoid auto-propagation
	// https://karmada.io/docs/userguide/bestpractices/namespace-management/#labeling-the-namespace
	log.Printf("Creating namespace %s", spec.Name)
	namespace := &api.Namespace{
		ObjectMeta: metaV1.ObjectMeta{
			Name: spec.Name,
		},
	}
	if spec.SkipAutoPropagation {
		namespace.Labels = map[string]string{
			skipAutoPropagationLable: "true",
		}
	}
	_, err := client.CoreV1().Namespaces().Create(context.TODO(), namespace, metaV1.CreateOptions{})
	return err
}

// The code below allows to perform complex data section on []api.Namespace

// NamespaceCell is a cell representation of Namespace object.
type NamespaceCell api.Namespace

// GetProperty returns specific property of NamespaceCell.
func (self NamespaceCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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

func toCells(std []api.Namespace) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = NamespaceCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []api.Namespace {
	std := make([]api.Namespace, len(cells))
	for i := range std {
		std[i] = api.Namespace(cells[i].(NamespaceCell))
	}
	return std
}
