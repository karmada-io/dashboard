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
type PostOverridePolicyRequest struct {
	OverrideData   string `json:"overrideData" binding:"required"`
	IsClusterScope bool   `json:"isClusterScope"`
	Namespace      string `json:"namespace"`
}

// PostOverridePolicyResponse is the response body for creating an override policy.
type PostOverridePolicyResponse struct {
}

// PutOverridePolicyRequest is the request body for updating an override policy.
type PutOverridePolicyRequest struct {
	OverrideData   string `json:"overrideData" binding:"required"`
	IsClusterScope bool   `json:"isClusterScope"`
	Namespace      string `json:"namespace"`
	Name           string `json:"name" binding:"required"`
}

// PutOverridePolicyResponse is the response body for updating an override policy.
type PutOverridePolicyResponse struct {
}

// DeleteOverridePolicyRequest is the request body for deleting an override policy.
type DeleteOverridePolicyRequest struct {
	IsClusterScope bool   `json:"isClusterScope"`
	Namespace      string `json:"namespace"`
	Name           string `json:"name" binding:"required"`
}

// DeleteOverridePolicyResponse is the response body for deleting an override policy.
type DeleteOverridePolicyResponse struct {
}
