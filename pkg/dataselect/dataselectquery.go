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

// DataSelectQuery is options for GenericDataSelect which takes []GenericDataCell and returns selected data.
// Can be extended to include any kind of selection - for example filtering.
// Currently included only Pagination and Sort options.
type DataSelectQuery struct {
	// PaginationQuery holds options for pagination of data select.
	PaginationQuery *PaginationQuery
	// SortQuery holds options for sort functionality of data select.
	SortQuery *SortQuery
	// FilterQuery holds options for filter functionality of data select.
	FilterQuery *FilterQuery
	//MetricQuery     *MetricQuery
}

// SortQuery holds options for sort functionality of data select.
type SortQuery struct {
	// SortByList is a list of sort criteria for data selection.
	SortByList []SortBy
}

// SortBy holds the name of the property that should be sorted and whether order should be ascending or descending.
type SortBy struct {
	// Property is the name of the field or attribute to sort by.
	Property PropertyName
	// Ascending determines the sort order
	Ascending bool
}

// NoSort is as option for no sort.
var NoSort = &SortQuery{
	// SortByList is a list of sort criteria for data selection.
	SortByList: []SortBy{},
}

// FilterQuery holds options for filter functionality of data select.
type FilterQuery struct {
	// FilterByList is a list of filter criteria for data selection.
	FilterByList []FilterBy
}

// FilterBy defines a filter criterion for data selection.
// It specifies a property to filter on and the value to compare against.
type FilterBy struct {
	// Property is the name of the field or attribute to filter by.
	Property PropertyName

	// Value is the comparable value to match against the specified property.
	Value ComparableValue
}

// NoFilter is an option for no filter.
var NoFilter = &FilterQuery{
	// FilterByList is a list of filter criteria for data selection.
	FilterByList: []FilterBy{},
}

// NoDataSelect is an option for no data select (same data will be returned).
var NoDataSelect = NewDataSelectQuery(NoPagination, NoSort, NoFilter)

// NewDataSelectQuery creates DataSelectQuery object from simpler data select queries.
func NewDataSelectQuery(paginationQuery *PaginationQuery, sortQuery *SortQuery, filterQuery *FilterQuery) *DataSelectQuery {
	return &DataSelectQuery{
		PaginationQuery: paginationQuery,
		SortQuery:       sortQuery,
		FilterQuery:     filterQuery,
	}
}

// NewSortQuery takes raw sort options list and returns SortQuery object. For example:
// ["a", "parameter1", "d", "parameter2"] - means that the data should be sorted by
// parameter1 (ascending) and later - for results that return equal under parameter 1 sort - by parameter2 (descending)
func NewSortQuery(sortByListRaw []string) *SortQuery {
	if sortByListRaw == nil || len(sortByListRaw)%2 == 1 {
		// Empty sort list or invalid (odd) length
		return NoSort
	}
	sortByList := []SortBy{}
	for i := 0; i+1 < len(sortByListRaw); i += 2 {
		// parse order option
		var ascending bool
		orderOption := sortByListRaw[i]
		if orderOption == "a" {
			ascending = true
		} else if orderOption == "d" {
			ascending = false
		} else {
			//  Invalid order option. Only ascending (a), descending (d) options are supported
			return NoSort
		}

		// parse property name
		propertyName := sortByListRaw[i+1]
		sortBy := SortBy{
			Property:  PropertyName(propertyName),
			Ascending: ascending,
		}
		// Add to the sort options.
		sortByList = append(sortByList, sortBy)
	}
	return &SortQuery{
		SortByList: sortByList,
	}
}

// NewFilterQuery takes raw filter options list and returns FilterQuery object. For example:
// ["parameter1", "value1", "parameter2", "value2"] - means that the data should be filtered by
// parameter1 equals value1 and parameter2 equals value2
func NewFilterQuery(filterByListRaw []string) *FilterQuery {
	if filterByListRaw == nil || len(filterByListRaw)%2 == 1 {
		return NoFilter
	}
	filterByList := []FilterBy{}
	for i := 0; i+1 < len(filterByListRaw); i += 2 {
		propertyName := filterByListRaw[i]
		propertyValue := filterByListRaw[i+1]
		filterBy := FilterBy{
			Property: PropertyName(propertyName),
			Value:    StdComparableString(propertyValue),
		}
		// Add to the filter options.
		filterByList = append(filterByList, filterBy)
	}
	return &FilterQuery{
		FilterByList: filterByList,
	}
}
