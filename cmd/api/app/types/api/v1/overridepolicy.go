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

package v1

// PostOverridePolicyRequest is the request body for creating an override policy.
// PostOverridePolicyRequest 是创建覆盖策略的请求
type PostOverridePolicyRequest struct {
	// OverrideData 是覆盖策略的数据
	OverrideData   string `json:"overrideData" binding:"required"`
	// IsClusterScope 是是否集群范围
	IsClusterScope bool   `json:"isClusterScope"`
	// Namespace 是命名空间
	Namespace      string `json:"namespace"`
}

// PostOverridePolicyResponse is the response body for creating an override policy.
// PostOverridePolicyResponse 是创建覆盖策略的响应
type PostOverridePolicyResponse struct {
}

// PutOverridePolicyRequest is the request body for updating an override policy.
// PutOverridePolicyRequest 是更新覆盖策略的请求
type PutOverridePolicyRequest struct {
	// OverrideData 是覆盖策略的数据
	OverrideData   string `json:"overrideData" binding:"required"`
	// IsClusterScope 是是否集群范围
	IsClusterScope bool   `json:"isClusterScope"`
	// Namespace 是命名空间
	Namespace      string `json:"namespace"`
	// Name 是名称
	Name           string `json:"name" binding:"required"`
}

// PutOverridePolicyResponse is the response body for updating an override policy.
// PutOverridePolicyResponse 是更新覆盖策略的响应
type PutOverridePolicyResponse struct {
}

// DeleteOverridePolicyRequest is the request body for deleting an override policy.
// DeleteOverridePolicyRequest 是删除覆盖策略的请求
type DeleteOverridePolicyRequest struct {
	// IsClusterScope 是是否集群范围
	IsClusterScope bool   `json:"isClusterScope"`
	// Namespace 是命名空间
	Namespace      string `json:"namespace"`
	// Name 是名称
	Name           string `json:"name" binding:"required"`
}

// DeleteOverridePolicyResponse is the response body for deleting an override policy.
// DeleteOverridePolicyResponse 是删除覆盖策略的响应
type DeleteOverridePolicyResponse struct {
}
