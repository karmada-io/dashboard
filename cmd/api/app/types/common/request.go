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

package common

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/common"
)

// parsePaginationPathParameter 解析分页路径参数
// 解析分页路径参数
func parsePaginationPathParameter(request *gin.Context) *dataselect.PaginationQuery {
	// 获取请求的 itemsPerPage 参数并转换为 int64
	itemsPerPage, err := strconv.ParseInt(request.Query("itemsPerPage"), 10, 0)
	if err != nil {
		return dataselect.NoPagination
	}
	// 获取请求的 page 参数并转换为 int64
	page, err := strconv.ParseInt(request.Query("page"), 10, 0)
	if err != nil {
		return dataselect.NoPagination
	}

	// Frontend pages start from 1 and backend starts from 0
	// 前端页面从 1 开始，后端从 0 开始
	return dataselect.NewPaginationQuery(int(itemsPerPage), int(page-1))
}

// parseFilterPathParameter 解析过滤路径参数
// 解析过滤路径参数
func parseFilterPathParameter(request *gin.Context) *dataselect.FilterQuery {
	// 获取请求的 filterBy 参数并转换为字符串
	return dataselect.NewFilterQuery(strings.Split(request.Query("filterBy"), ","))
}

// parseSortPathParameter 解析排序路径参数
// 解析排序路径参数
func parseSortPathParameter(request *gin.Context) *dataselect.SortQuery {
	// 获取请求的 sortBy 参数并转换为字符串
	return dataselect.NewSortQuery(strings.Split(request.Query("sortBy"), ","))
}

// ParseDataSelectPathParameter 解析请求的查询参数并返回一个 DataSelectQuery 对象
func ParseDataSelectPathParameter(request *gin.Context) *dataselect.DataSelectQuery {
	// 解析分页路径参数
	paginationQuery := parsePaginationPathParameter(request)
	// 解析排序路径参数
	sortQuery := parseSortPathParameter(request)
	// 解析过滤路径参数
	filterQuery := parseFilterPathParameter(request)
	// 返回一个 DataSelectQuery 对象
	return dataselect.NewDataSelectQuery(paginationQuery, sortQuery, filterQuery)
}

// ParseNamespacePathParameter parses namespace selector for list pages in path parameter.
// The namespace selector is a comma separated list of namespaces that are trimmed.
// No namespaces mean "view all user namespaces", i.e., everything except kube-system.
// 解析请求的命名空间路径参数并返回一个 NamespaceQuery 对象
func ParseNamespacePathParameter(request *gin.Context) *common.NamespaceQuery {
	// 获取请求的 namespace 参数并转换为字符串
	namespace := request.Param("namespace")
	// 将命名空间参数按逗号分割成一个列表
	namespaces := strings.Split(namespace, ",")
	// 创建一个非空命名空间列表
	var nonEmptyNamespaces []string
	// 遍历命名空间列表
	for _, n := range namespaces {
		// 去除命名空间参数两端的空格
		n = strings.Trim(n, " ")
		// 如果命名空间参数不为空，则添加到非空命名空间列表中
		if len(n) > 0 {
			nonEmptyNamespaces = append(nonEmptyNamespaces, n)
		}
	}
	// 返回一个 NamespaceQuery 对象
	return common.NewNamespaceQuery(nonEmptyNamespaces)
}