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

// PostPropagationPolicyRequest defines the request structure for creating a propagation policy.
// todo this is only a simple version of pp request, just for POC
type PostPropagationPolicyRequest struct {
	PropagationData string `json:"propagationData" binding:"required"`
	IsClusterScope  bool   `json:"isClusterScope"`
	Namespace       string `json:"namespace"`
}

// PostPropagationPolicyResponse defines the response structure for creating a propagation policy.
type PostPropagationPolicyResponse struct {
}

// PutPropagationPolicyRequest defines the request structure for updating a propagation policy.
type PutPropagationPolicyRequest struct {
	PropagationData string `json:"propagationData" binding:"required"`
	IsClusterScope  bool   `json:"isClusterScope"`
	Namespace       string `json:"namespace"`
	Name            string `json:"name" binding:"required"`
}

// PutPropagationPolicyResponse defines the response structure for updating a propagation policy.
type PutPropagationPolicyResponse struct {
}

// DeletePropagationPolicyRequest defines the request structure for deleting a propagation policy.
type DeletePropagationPolicyRequest struct {
	IsClusterScope bool   `json:"isClusterScope"`
	Namespace      string `json:"namespace"`
	Name           string `json:"name" binding:"required"`
}

// DeletePropagationPolicyResponse defines the response structure for deleting a propagation policy.
type DeletePropagationPolicyResponse struct {
}
