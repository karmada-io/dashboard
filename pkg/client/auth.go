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

package client

import (
	"net/http"
	"strings"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

const (
	// authorizationHeader is the default authorization header name.
	// 授权头名称
	authorizationHeader = "Authorization"
	// authorizationTokenPrefix is the default bearer token prefix.
	// 授权令牌前缀
	authorizationTokenPrefix = "Bearer "
)

// karmadaConfigFromRequest 从 HTTP 请求创建一个 Karmada 配置
func karmadaConfigFromRequest(request *http.Request) (*rest.Config, error) {
	// 构建授权信息
	authInfo, err := buildAuthInfo(request)
	if err != nil {
		return nil, err
	}

	return buildConfigFromAuthInfo(authInfo)
}

// buildConfigFromAuthInfo 从授权信息构建一个 Karmada 配置
func buildConfigFromAuthInfo(authInfo *clientcmdapi.AuthInfo) (*rest.Config, error) {
	// clientcmdapi.AuthInfo 是 clientcmd 包中的一个结构体，用于存储认证信息
	// clientcmdapi 是 client-go 包中的一个子包，用于存储客户端配置
	// clientcmd.NewDefaultClientConfig 是 client-go 包中的一个函数，用于创建一个默认的客户端配置
	// clientcmd.ConfigOverrides 是 client-go 包中的一个结构体，用于存储客户端配置的覆盖信息
	// clientcmd.NewConfig 是 client-go 包中的一个函数，用于创建一个默认的客户端配置

	// 创建一个 Karmada 配置
	cmdCfg := clientcmdapi.NewConfig()
	// 设置集群
	cmdCfg.Clusters[DefaultCmdConfigName] = &clientcmdapi.Cluster{
		// 设置集群的 Server
		Server:                   karmadaRestConfig.Host,
		// 设置集群的 CertificateAuthority
		CertificateAuthority:     karmadaRestConfig.TLSClientConfig.CAFile,
		// 设置集群的 CertificateAuthorityData
		CertificateAuthorityData: karmadaRestConfig.TLSClientConfig.CAData,
		// 设置集群的 InsecureSkipTLSVerify
		InsecureSkipTLSVerify:    karmadaRestConfig.TLSClientConfig.Insecure,
	}
	// 设置认证信息
	cmdCfg.AuthInfos[DefaultCmdConfigName] = authInfo
	// 设置上下文
	cmdCfg.Contexts[DefaultCmdConfigName] = &clientcmdapi.Context{
		// 设置上下文的集群
		Cluster:  DefaultCmdConfigName,
		// 设置上下文的认证信息
		AuthInfo: DefaultCmdConfigName,
	}
	// 设置当前上下文
	cmdCfg.CurrentContext = DefaultCmdConfigName
	// 返回 Karmada 配置
	return clientcmd.NewDefaultClientConfig(
		*cmdCfg,
		&clientcmd.ConfigOverrides{},
	).ClientConfig()
}

// buildAuthInfo 构建授权信息
func buildAuthInfo(request *http.Request) (*clientcmdapi.AuthInfo, error) {
	// 检查请求头中是否包含授权信息
	if !HasAuthorizationHeader(request) {
		return nil, k8serrors.NewUnauthorized("MSG_LOGIN_UNAUTHORIZED_ERROR")
	}
	// 获取授权令牌
	token := GetBearerToken(request)
	// 创建授权信息
	authInfo := &clientcmdapi.AuthInfo{
		Token:                token,
		ImpersonateUserExtra: make(map[string][]string),
	}
	// 处理模拟用户
	handleImpersonation(authInfo, request)
	// 返回授权信息
	return authInfo, nil
}

// HasAuthorizationHeader 检查请求头中是否包含授权信息
func HasAuthorizationHeader(req *http.Request) bool {
	// 获取请求头中的授权信息
	header := req.Header.Get(authorizationHeader)
	// 如果授权信息为空，则返回 false
	if len(header) == 0 {
		return false
	}
	// 提取授权令牌
	token := extractBearerToken(header)
	// 如果授权令牌为空，则返回 false
	if len(token) == 0 {
		return false
	}
	// 返回授权信息
	return strings.HasPrefix(header, authorizationTokenPrefix) && len(token) > 0
}

// GetBearerToken 从授权头中获取授权令牌
func GetBearerToken(req *http.Request) string {
	// 获取请求头中的授权信息
	header := req.Header.Get(authorizationHeader)
	// 提取授权令牌
	return extractBearerToken(header)
}

// SetAuthorizationHeader sets the authorization header for the given request.
// 设置授权头
func SetAuthorizationHeader(req *http.Request, token string) {
	// 设置授权头
	req.Header.Set(authorizationHeader, authorizationTokenPrefix+token)
}

// extractBearerToken 提取授权令牌
func extractBearerToken(header string) string {
	return strings.TrimPrefix(header, authorizationTokenPrefix)
}

// handleImpersonation 处理模拟用户
func handleImpersonation(authInfo *clientcmdapi.AuthInfo, request *http.Request) {
	// 获取请求头中的模拟用户
	user := request.Header.Get(ImpersonateUserHeader)
	// 获取请求头中的模拟组
	groups := request.Header[ImpersonateGroupHeader]
	// 如果模拟用户为空，则返回
	if len(user) == 0 {
		return
	}
	// Impersonate user
	authInfo.Impersonate = user
	// 如果模拟组可用，则设置模拟组
	if len(groups) > 0 {
		authInfo.ImpersonateGroups = groups
	}
	// 如果模拟用户额外信息可用，则设置模拟用户额外信息
	for name, values := range request.Header {
		if strings.HasPrefix(name, ImpersonateUserExtraHeader) {
			extraName := strings.TrimPrefix(name, ImpersonateUserExtraHeader)
			authInfo.ImpersonateUserExtra[extraName] = values
		}
	}
}
