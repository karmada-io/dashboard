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

package dataselect

// NoPagination By default backend pagination will not be applied.
// 默认情况下后端分页不会被应用
// 没有项目会被返回
var NoPagination = NewPaginationQuery(-1, -1)

// EmptyPagination No items will be returned
// 没有项目会被返回
var EmptyPagination = NewPaginationQuery(0, 0)

// DefaultPagination Returns 10 items from page 1
// 返回第 1 页的 10 个项目
var DefaultPagination = NewPaginationQuery(10, 0)

// PaginationQuery 结构体表示分页设置
type PaginationQuery struct {
	// 每页应该返回多少个项目
	ItemsPerPage int
	// 当应用分页时应该返回的页码
	Page int
}

// NewPaginationQuery return pagination query structure based on given parameters
// 根据给定的参数返回一个分页查询结构体
func NewPaginationQuery(itemsPerPage, page int) *PaginationQuery {
	return &PaginationQuery{itemsPerPage, page}
}

// IsValidPagination returns true if pagination has non negative parameters
func (p *PaginationQuery) IsValidPagination() bool {
	return p.ItemsPerPage >= 0 && p.Page >= 0
}

// IsPageAvailable returns true if at least one element can be placed on page. False otherwise
func (p *PaginationQuery) IsPageAvailable(itemsCount, startingIndex int) bool {
	return itemsCount > startingIndex && p.ItemsPerPage > 0
}

// GetPaginationSettings based on number of items and pagination query parameters returns start
// and end index that can be used to return paginated list of items.
func (p *PaginationQuery) GetPaginationSettings(itemsCount int) (startIndex int, endIndex int) {
	startIndex = p.ItemsPerPage * p.Page
	endIndex = startIndex + p.ItemsPerPage

	if endIndex > itemsCount {
		endIndex = itemsCount
	}

	return startIndex, endIndex
}
