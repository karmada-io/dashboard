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
	"net/http"

	"github.com/gin-gonic/gin"
)

// BaseResponse is the base response
type BaseResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"message"`
	Data interface{} `json:"data"`
}

// Success generate success response
func Success(c *gin.Context, obj interface{}) {
	Response(c, nil, obj)
}

// Fail generate fail response
func Fail(c *gin.Context, err error) {
	Response(c, err, nil)
}

// Response generate response
func Response(c *gin.Context, err error, data interface{}) {
	code := 200          // biz status code
	message := "success" // biz status message
	if err != nil {
		code = 500
		message = err.Error()
	}
	c.JSON(http.StatusOK, BaseResponse{
		Code: code,
		Msg:  message,
		Data: data,
	})
}
