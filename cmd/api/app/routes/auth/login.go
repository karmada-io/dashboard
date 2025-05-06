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
	"net/http"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/common/errors"
)

// login 处理登录请求
// spec 是登录请求参数
// request 是 HTTP 请求
// 返回登录响应、HTTP 状态码和错误
func login(spec *v1.LoginRequest, request *http.Request) (*v1.LoginResponse, int, error) {
	// 确保请求头中包含授权信息
	ensureAuthorizationHeader(spec, request)
	// 获取 Karmada 客户端
	karmadaClient, err := client.GetKarmadaClientFromRequest(request)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	// 检查 Karmada 服务器版本
	if _, err = karmadaClient.Discovery().ServerVersion(); err != nil {
		// 处理错误
		code, err := errors.HandleError(err)
		return nil, code, err
	}
	// 返回登录响应
	return &v1.LoginResponse{Token: spec.Token}, http.StatusOK, nil
}

// ensureAuthorizationHeader 确保请求头中包含授权信息
// spec 是登录请求参数
// request 是 HTTP 请求
func ensureAuthorizationHeader(spec *v1.LoginRequest, request *http.Request) {
	// 设置授权头
	client.SetAuthorizationHeader(request, spec.Token)
}
