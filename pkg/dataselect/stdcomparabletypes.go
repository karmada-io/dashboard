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

import (
	"strings"
	"time"
)

// ----------------------- Standard Comparable Types ------------------------
// These types specify how given value should be compared
// They all implement ComparableValueInterface
// You can convert basic types to these types to support auto sorting etc.
// If you cant find your type compare here you will have to implement it yourself :)

// StdComparableInt is a wrapper for int that implements ComparableValueInterface
type StdComparableInt int

// Compare compares two ints.
func (i StdComparableInt) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableInt)
	return intsCompare(int(i), int(other))
}

// Contains checks if other is contained in self.
func (i StdComparableInt) Contains(otherV ComparableValue) bool {
	return i.Compare(otherV) == 0
}

// StdComparableString is a wrapper for string that implements ComparableValueInterface
type StdComparableString string

// Compare compares two strings.
func (s StdComparableString) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableString)
	return strings.Compare(string(s), string(other))
}

// Contains checks if other is contained in self.
func (s StdComparableString) Contains(otherV ComparableValue) bool {
	other := otherV.(StdComparableString)
	return strings.Contains(string(s), string(other))
}

// StdComparableRFC3339Timestamp takes RFC3339 Timestamp strings and compares them as TIMES. In case of time parsing error compares values as strings.
type StdComparableRFC3339Timestamp string

// Compare compares two RFC3339 Timestamp strings. In case of time parsing error compares values as strings.
func (t StdComparableRFC3339Timestamp) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableRFC3339Timestamp)
	// try to compare as timestamp (earlier = smaller)
	selfTime, err1 := time.Parse(time.RFC3339, string(t))
	otherTime, err2 := time.Parse(time.RFC3339, string(other))

	if err1 != nil || err2 != nil {
		// in case of timestamp parsing failure just compare as strings
		return strings.Compare(string(t), string(other))
	}
	return ints64Compare(selfTime.Unix(), otherTime.Unix())
}

// Contains checks if other is contained in self.
func (t StdComparableRFC3339Timestamp) Contains(otherV ComparableValue) bool {
	return t.Compare(otherV) == 0
}

// StdComparableTime takes time.Time and compares them as TIMES.
type StdComparableTime time.Time

// Compare compares two time.Time.
func (t StdComparableTime) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableTime)
	return ints64Compare(time.Time(t).Unix(), time.Time(other).Unix())
}

// Contains checks if other is contained in self.
func (t StdComparableTime) Contains(otherV ComparableValue) bool {
	return t.Compare(otherV) == 0
}

// Int comparison functions. Similar to strings.Compare.
func intsCompare(a, b int) int {
	if a > b {
		return 1
	} else if a == b {
		return 0
	}
	return -1
}

func ints64Compare(a, b int64) int {
	if a > b {
		return 1
	} else if a == b {
		return 0
	}
	return -1
}
