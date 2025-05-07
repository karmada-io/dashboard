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

package router

import (
	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/pkg/environment"
)

// router 是 Gin 引擎实例
var (
	router *gin.Engine
	// v1 是 /api/v1 的路由组
	v1 *gin.RouterGroup
	// member 是 /api/v1/member/:clustername 的路由组
	member *gin.RouterGroup
)

// init 初始化路由
func init() {
	// 如果环境变量 IS_DEV 为 false，则设置 Gin 为生产模式
	if !environment.IsDev() {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建 Gin 引擎实例
	router = gin.Default()
	// 设置可信代理
	// SetTrustedProxies set a list of network origins (IPv4 addresses, IPv4 CIDRs, IPv6 addresses or IPv6 CIDRs) from which to trust request's headers that contain alternative client IP when `(*gin.Engine).ForwardedByClientIP` is `true`. `TrustedProxies` feature is enabled by default, and it also trusts all proxies by default. If you want to disable this feature, use Engine.SetTrustedProxies(nil), then Context.ClientIP() will return the remote address directly.
	// SetTrustedProxies 设置一个网络源列表，从这些源中信任请求的头部，当 `(*gin.Engine).ForwardedByClientIP` 为 `true` 时。`TrustedProxies` 功能默认启用，并默认信任所有代理。如果想要禁用此功能，请使用 Engine.SetTrustedProxies(nil)，然后 Context.ClientIP() 将直接返回远程地址。
	_ = router.SetTrustedProxies(nil)
	// 创建 /api/v1 的路由组
	v1 = router.Group("/api/v1")
	// 为全局API添加CORS中间件
	v1.Use(CorsMiddleware())
	// 创建 /api/v1/member/:clustername 的路由组
	member = v1.Group("/member/:clustername")
	// 使用 EnsureMemberClusterMiddleware 中间件
	member.Use(EnsureMemberClusterMiddleware())
	// 使用 CorsMiddleware 中间件
	member.Use(CorsMiddleware())

	// 创建 /livez 的路由
	router.GET("/livez", func(c *gin.Context) {
		c.String(200, "livez")
	})
	// 创建 /readyz 的路由
	router.GET("/readyz", func(c *gin.Context) {
		c.String(200, "readyz")
	})
}

// V1 returns the router group for /api/v1 which for resources in control plane endpoints.
// V1 返回 /api/v1 的路由组，用于控制平面资源的 API 端点。
func V1() *gin.RouterGroup {
	return v1
}

// Router returns the main Gin engine instance.
// Router 返回主 Gin 引擎实例。
func Router() *gin.Engine {
	return router
}

// MemberV1 returns the router group for /api/v1/member/:clustername which for resources in specific member cluster.
// MemberV1 返回用于特定成员集群资源的 /api/v1/member/:clustername 的路由组。
func MemberV1() *gin.RouterGroup {
	return member
}
