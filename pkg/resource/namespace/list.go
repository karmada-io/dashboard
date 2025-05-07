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

	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"

	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	"github.com/karmada-io/dashboard/pkg/common/types"
	"github.com/karmada-io/dashboard/pkg/dataselect"
)

// NamespaceList 包含集群中的命名空间列表
type NamespaceList struct {
	ListMeta types.ListMeta `json:"listMeta"`

	// 未排序的命名空间列表
	Namespaces []Namespace `json:"namespaces"`

	// 在资源检索期间发生的非关键错误列表
	Errors []error `json:"errors"`
}

// Namespace 是 Kubernetes 命名空间的表示层视图。这意味着它是一个命名空间加上
// 其他来源可以获取到的附加增强数据。
type Namespace struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`

	// Phase 是命名空间的当前生命周期阶段。
	Phase               v1.NamespacePhase `json:"phase"`
	SkipAutoPropagation bool              `json:"skipAutoPropagation"`
}

// GetNamespaceList 返回集群中所有命名空间的列表。
func GetNamespaceList(client kubernetes.Interface, dsQuery *dataselect.DataSelectQuery) (*NamespaceList, error) {
	log.Println("Getting list of namespaces")
	namespaces, err := client.CoreV1().Namespaces().List(context.TODO(), helpers.ListEverything)

	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toNamespaceList(namespaces.Items, nonCriticalErrors, dsQuery), nil
}

// toNamespaceList 将命名空间列表转换为命名空间列表
func toNamespaceList(namespaces []v1.Namespace, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *NamespaceList {
	namespaceList := &NamespaceList{
		Namespaces: make([]Namespace, 0),
		ListMeta:   types.ListMeta{TotalItems: len(namespaces)},
	}

	namespaceCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(namespaces), dsQuery)
	namespaces = fromCells(namespaceCells)
	namespaceList.ListMeta = types.ListMeta{TotalItems: filteredTotal}
	namespaceList.Errors = nonCriticalErrors

	for _, namespace := range namespaces {
		namespaceList.Namespaces = append(namespaceList.Namespaces, toNamespace(namespace))
	}

	return namespaceList
}

// toNamespace 将命名空间转换为命名空间
func toNamespace(namespace v1.Namespace) Namespace {
	_, exist := namespace.Labels[skipAutoPropagationLable]

	return Namespace{
		ObjectMeta:          types.NewObjectMeta(namespace.ObjectMeta),
		TypeMeta:            types.NewTypeMeta(types.ResourceKindNamespace),
		Phase:               namespace.Status.Phase,
		SkipAutoPropagation: exist,
	}
}
