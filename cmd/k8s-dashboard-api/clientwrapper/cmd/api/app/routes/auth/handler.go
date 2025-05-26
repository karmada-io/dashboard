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

package auth

import (
	"github.com/gin-gonic/gin"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

func handleLogin(c *gin.Context) {
	loginRequest := new(v1.LoginRequest)
	if err := c.Bind(loginRequest); err != nil {
		klog.ErrorS(err, "Could not read login request")
		common.Fail(c, err)
		return
	}
	response, _, err := login(loginRequest, c.Request)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, response)
}

func handleMe(c *gin.Context) {
	response, _, err := me(c.Request)
	if err != nil {
		klog.ErrorS(err, "Could not get user")
		common.Fail(c, err)
		return
	}

	common.Success(c, response)
}

func init() {
	router.V1().POST("/login", handleLogin)
	router.V1().GET("/me", handleMe)
}
