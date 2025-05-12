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

// ErrorResponse 表示API错误响应
type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// Error 实现error接口
func (e *ErrorResponse) Error() string {
	return e.Message
}

// NewBadRequestError 创建一个400错误
func NewBadRequestError(message string) error {
	return &ErrorResponse{
		Code:    400,
		Message: message,
	}
}

// NewInternalServerError 创建一个500错误
func NewInternalServerError(message string) error {
	return &ErrorResponse{
		Code:    500,
		Message: message,
	}
}

// NewNotFoundError 创建一个404错误
func NewNotFoundError(message string) error {
	return &ErrorResponse{
		Code:    404,
		Message: message,
	}
}

// NewForbiddenError 创建一个403错误
func NewForbiddenError(message string) error {
	return &ErrorResponse{
		Code:    403,
		Message: message,
	}
}

// NewUnauthorizedError 创建一个401错误
func NewUnauthorizedError(message string) error {
	return &ErrorResponse{
		Code:    401,
		Message: message,
	}
}
