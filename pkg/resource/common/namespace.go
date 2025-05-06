// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package common

import api "k8s.io/api/core/v1"

// NamespaceQuery is a query for namespaces of a list of objects.
// There's three cases:
//  1. No namespace selected: this means "user namespaces" query, i.e., all except kube-system
//  2. Single namespace selected: this allows for optimizations when querying backends
//  3. More than one namespace selected: resources from all namespaces are queried and then
//     filtered here.
type NamespaceQuery struct {
	// namespaces 是命名空间列表
	namespaces []string
}

// NewSameNamespaceQuery creates new namespace query that queries single namespace.
func NewSameNamespaceQuery(namespace string) *NamespaceQuery {
	// 创建一个包含单个命名空间的命名空间查询
	return &NamespaceQuery{[]string{namespace}}
}

// NewNamespaceQuery creates new query for given namespaces.
func NewNamespaceQuery(namespaces []string) *NamespaceQuery {
	// 创建一个包含多个命名空间的命名空间查询
	return &NamespaceQuery{namespaces}
}

// ToRequestParam returns K8s API namespace query for list of objects from this namespaces.
// This is an optimization to query for single namespace if one was selected and for all
// namespaces otherwise.
// 将命名空间查询转换为 K8s API 的命名空间查询参数
func (n *NamespaceQuery) ToRequestParam() string {
	// 如果命名空间列表中只有一个命名空间，则返回该命名空间
	if len(n.namespaces) == 1 {
		return n.namespaces[0]
	}
	// 返回所有命名空间
	return api.NamespaceAll
}

// Matches returns true when the given namespace matches this query.
// 判断给定的命名空间是否匹配此查询
func (n *NamespaceQuery) Matches(namespace string) bool {
	// 如果命名空间列表为空，则返回 true
	if len(n.namespaces) == 0 {
		return true
	}

	// 遍历命名空间列表
	for _, queryNamespace := range n.namespaces {
		// 如果命名空间匹配，则返回 true
		if namespace == queryNamespace {
			return true
		}
	}
	// 如果没有匹配的命名空间，则返回 false
	return false
}
