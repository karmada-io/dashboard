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

package errors

import (
	"fmt"
	"strings"
)

// Errors that can be used directly without localizing
const (
	MsgDeployNamespaceMismatchError    = "MSG_DEPLOY_NAMESPACE_MISMATCH_ERROR"
	MsgDeployEmptyNamespaceError       = "MSG_DEPLOY_EMPTY_NAMESPACE_ERROR"
	MsgLoginUnauthorizedError          = "MSG_LOGIN_UNAUTHORIZED_ERROR"
	MsgForbiddenError                  = "MSG_FORBIDDEN_ERROR"
	MsgDashboardExclusiveResourceError = "MSG_DASHBOARD_EXCLUSIVE_RESOURCE_ERROR"
	MsgTokenExpiredError               = "MSG_TOKEN_EXPIRED_ERROR" //nolint:gosec // mistake `Token` as hardcoded credential
	MsgCSRFValidationError             = "MSG_CSRF_VALIDATION_ERROR"
	MsgResourceNotFoundError           = "MSG_RESOURCE_NOT_FOUND_ERROR"
	MsgResourceAlreadyExistsError      = "MSG_RESOURCE_ALREADY_EXISTS_ERROR"
	MsgResourceConflictError           = "MSG_RESOURCE_CONFLICT_ERROR"
	MsgInternalServerError             = "MSG_INTERNAL_SERVER_ERROR"
)

// This file contains all errors that should be kept in sync with:
// 'src/app/frontend/common/errors/errors.ts' and localized on frontend side.

// partialsToErrorsMap map structure:
// Key - unique partial string that can be used to differentiate error messages
// Value - unique error code string that frontend can use to localize error message created using
//
//	pattern MSG_<VIEW>_<CAUSE_OF_ERROR>_ERROR
//	<VIEW> - optional
var partialsToErrorsMap = map[string]string{
	"does not match the namespace":                               MsgDeployNamespaceMismatchError,
	"empty namespace may not be set":                             MsgDeployEmptyNamespaceError,
	"the server has asked for the client to provide credentials": MsgLoginUnauthorizedError,
	"not found":      MsgResourceNotFoundError,
	"already exists": MsgResourceAlreadyExistsError,
	"conflict":       MsgResourceConflictError,
}

// LocalizeError returns error code (string) that can be used by frontend to localize error message.
func LocalizeError(err error) error {
	if err == nil {
		return nil
	}

	if IsNotFound(err) {
		return NewNotFound(MsgResourceNotFoundError)
	}
	if IsAlreadyExists(err) {
		return NewAlreadyExists(MsgResourceAlreadyExistsError)
	}
	if IsConflict(err) {
		return NewConflict(MsgResourceConflictError)
	}
	if IsUnauthorized(err) {
		return NewUnauthorized(MsgLoginUnauthorizedError)
	}
	if IsForbidden(err) {
		return NewForbidden("", fmt.Errorf("%s", MsgForbiddenError))
	}

	errLower := strings.ToLower(err.Error())
	for partial, errString := range partialsToErrorsMap {
		if strings.Contains(errLower, strings.ToLower(partial)) {
			if strings.Contains(errString, "NOT_FOUND") {
				return NewNotFound(errString)
			}
			if strings.Contains(errString, "ALREADY_EXISTS") {
				return NewAlreadyExists(errString)
			}
			if strings.Contains(errString, "CONFLICT") {
				return NewConflict(errString)
			}

			return NewBadRequest(errString)
		}
	}

	return err
}
