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

// handleLogin 处理登录请求
func handleLogin(c *gin.Context) {
	// 创建一个 LoginRequest 对象
	loginRequest := new(v1.LoginRequest)
	// 绑定请求参数
	if err := c.Bind(loginRequest); err != nil {
		klog.ErrorS(err, "Could not read login request")
		// 返回失败响应
		common.Fail(c, err)
		return
	}
	// 调用 login 函数处理登录请求
	response, _, err := login(loginRequest, c.Request)
	if err != nil {
		// 返回失败响应
		common.Fail(c, err)
		return
	}
	common.Success(c, response)
}

// handleMe 处理获取当前用户信息请求
func handleMe(c *gin.Context) {
	// 调用 me 函数获取当前用户信息
	response, _, err := me(c.Request)
	if err != nil {
		klog.ErrorS(err, "Could not get user")
		// 返回失败响应
		common.Fail(c, err)
		return
	}
	// 返回成功响应
	common.Success(c, response)
}

// init 初始化路由
func init() {
	// 添加登录路由
	router.V1().POST("/login", handleLogin)
	// 添加获取当前用户信息路由
	router.V1().GET("/me", handleMe)
}
