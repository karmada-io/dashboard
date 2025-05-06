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
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

const (
	// DefaultQPS is the default globalClient QPS configuration. High enough QPS to fit all expected use cases.
	// QPS=0 is not set here, because globalClient code is overriding it.
	// 默认 QPS
	DefaultQPS = 1e6
	// DefaultBurst is the default globalClient burst configuration. High enough Burst to fit all expected use cases.
	// Burst=0 is not set here, because globalClient code is overriding it.
	// 默认突发
	DefaultBurst = 1e6
	// DefaultUserAgent is the default http header for user-agent
	// 默认用户代理
	DefaultUserAgent = "dashboard"
	// DefaultCmdConfigName is the default cluster/context/auth name to be set in clientcmd config
	// 默认集群/上下文/认证名称
	DefaultCmdConfigName = "kubernetes"
	// ImpersonateUserHeader is the header name to identify username to act as.
	// 模拟用户头名称
	ImpersonateUserHeader = "Impersonate-User"
	// ImpersonateGroupHeader is the header name to identify group name to act as.
	// 模拟组头名称
	ImpersonateGroupHeader = "Impersonate-Group"
	// ImpersonateUserExtraHeader is the header name used to associate extra fields with the user.
	// 模拟用户额外头名称
	// It is optional, and it requires ImpersonateUserHeader to be set.
	ImpersonateUserExtraHeader = "Impersonate-Extra-"
)

// ResourceVerber 是负责对所有支持的资源执行通用 CRUD 操作的接口
type ResourceVerber interface {
	// Update 更新资源
	Update(object *unstructured.Unstructured) error
	// Get 获取资源
	Get(kind string, namespace string, name string) (runtime.Object, error)
	// Delete 删除资源
	Delete(kind string, namespace string, name string, deleteNow bool) error
	// Create 创建资源
	Create(object *unstructured.Unstructured) (*unstructured.Unstructured, error)
}
