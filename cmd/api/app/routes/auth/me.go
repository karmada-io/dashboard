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
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/golang-jwt/jwt/v5"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/common/errors"
)

const (
	// tokenServiceAccountKey 是 JWT 中的 serviceaccount 键
	tokenServiceAccountKey = "serviceaccount"
)

// me 处理获取当前用户信息请求
// request 是 HTTP 请求
// 返回用户信息、HTTP 状态码和错误
func me(request *http.Request) (*v1.User, int, error) {
	// 获取 Karmada 客户端
	karmadaClient, err := client.GetKarmadaClientFromRequest(request)
	if err != nil {
		code, err := errors.HandleError(err)
		return nil, code, err
	}

	// Make sure that authorization token is valid
	// 检查 Karmada 服务器版本
	if _, err = karmadaClient.Discovery().ServerVersion(); err != nil {
		code, err := errors.HandleError(err)
		return nil, code, err
	}

	// 从请求中获取用户信息
	return getUserFromToken(client.GetBearerToken(request)), http.StatusOK, nil
}

// getUserFromToken 从 JWT 中获取用户信息
// token 是 JWT
// 返回用户信息
func getUserFromToken(token string) *v1.User {
	parsed, _ := jwt.Parse(token, nil)
	if parsed == nil {
		return &v1.User{Authenticated: true}
	}

	// 获取 JWT 中的声明
	claims := parsed.Claims.(jwt.MapClaims)

	// 遍历 JWT 中的声明，查找 serviceaccount 键
	found, value := traverse(tokenServiceAccountKey, claims)
	if !found {
		return &v1.User{Authenticated: true}
	}

	// 将 serviceaccount 键的值转换为 v1.ServiceAccount 类型
	var sa v1.ServiceAccount
	ok := transcode(value, &sa)
	if !ok {
		return &v1.User{Authenticated: true}
	}

	// 返回用户信息
	return &v1.User{Name: sa.Name, Authenticated: true}
}

// traverse 遍历 map，查找 key
// key 是 map 中的键
// m 是 map
// 返回是否找到键和键的值
func traverse(key string, m map[string]interface{}) (found bool, value interface{}) {
	for k, v := range m {
		if k == key {
			return true, v
		}

		if innerMap, ok := v.(map[string]interface{}); ok {
			return traverse(key, innerMap)
		}
	}

	return false, ""
}

// transcode 将 in 转换为 out
// in 是输入
// out 是输出
// 返回是否转换成功
func transcode(in, out interface{}) bool {
	buf := new(bytes.Buffer)
	err := json.NewEncoder(buf).Encode(in)
	if err != nil {
		return false
	}

	// 将 buf 转换为 out
	err = json.NewDecoder(buf).Decode(out)
	return err == nil
}
