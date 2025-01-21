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

import (
	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	corev1 "k8s.io/api/core/v1"
)

type PostClusterRequest struct {
	MemberClusterKubeConfig string                   `json:"memberClusterKubeconfig" binding:"required"`
	SyncMode                v1alpha1.ClusterSyncMode `json:"syncMode" binding:"required"`
	MemberClusterName       string                   `json:"memberClusterName" binding:"required"`
	MemberClusterEndpoint   string                   `json:"memberClusterEndpoint"`
	MemberClusterNamespace  string                   `json:"memberClusterNamespace"`
	ClusterProvider         string                   `json:"clusterProvider"`
	ClusterRegion           string                   `json:"clusterRegion"`
	ClusterZones            []string                 `json:"clusterZones"`
}

type PostClusterResponse struct {
}

type LableRequest struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}
type TaintRequest struct {
	Effect corev1.TaintEffect `json:"effect"`
	Key    string             `json:"key"`
	Value  string             `json:"value"`
}
type PutClusterRequest struct {
	Labels *[]LableRequest `json:"labels"`
	Taints *[]TaintRequest `json:"taints"`
}
type PutClusterResponse struct{}

type DeleteClusterRequest struct {
	MemberClusterName string `uri:"name" binding:"required"`
}
type DeleteClusterResponse struct {
}
