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

package errors_test

import (
	"testing"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/karmada-io/dashboard/pkg/common/errors"
)

func TestLocalizeError(t *testing.T) {
	cases := []struct {
		err      error
		expected error
	}{
		{
			nil,
			nil,
		},
		{
			errors.NewInternal("some unknown error"),
			errors.NewInternal("some unknown error"),
		},
		{
			errors.NewInvalid("does not match the namespace"),
			errors.NewInvalid("MSG_DEPLOY_NAMESPACE_MISMATCH_ERROR"),
		},
		{
			errors.NewInvalid("empty namespace may not be set"),
			errors.NewInvalid("MSG_DEPLOY_EMPTY_NAMESPACE_ERROR"),
		},
		// Test top-level k8s error type matching
		{
			k8serrors.NewNotFound(schema.GroupResource{}, "resource"),
			errors.NewNotFound("MSG_RESOURCE_NOT_FOUND_ERROR"),
		},
		{
			k8serrors.NewAlreadyExists(schema.GroupResource{}, "resource"),
			errors.NewAlreadyExists("MSG_RESOURCE_ALREADY_EXISTS_ERROR"),
		},
		{
			k8serrors.NewConflict(schema.GroupResource{}, "resource", nil),
			errors.NewConflict("MSG_RESOURCE_CONFLICT_ERROR"),
		},
		// Test fallback string matching logic
		{
			errors.NewBadRequest("resource not found"),
			errors.NewNotFound("MSG_RESOURCE_NOT_FOUND_ERROR"),
		},
		{
			errors.NewInternal("this resource already exists in cluster"),
			errors.NewAlreadyExists("MSG_RESOURCE_ALREADY_EXISTS_ERROR"),
		},
		{
			errors.NewInternal("there was a conflict updating the resource"),
			errors.NewConflict("MSG_RESOURCE_CONFLICT_ERROR"),
		},
	}
	for _, c := range cases {
		actual := errors.LocalizeError(c.err)
		if !areErrorsEqual(actual, c.expected) {
			t.Errorf("LocalizeError(%+v) == %+v, expected %+v", c.err, actual, c.expected)
		}
	}
}

func areErrorsEqual(err1, err2 error) bool {
	return (err1 != nil && err2 != nil && err1.Error() == err2.Error()) ||
		(err1 == nil && err2 == nil)
}
