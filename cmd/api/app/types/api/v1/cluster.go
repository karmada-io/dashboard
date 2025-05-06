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

// PostClusterRequest is the request body for creating a cluster.
// PostClusterRequest 是创建集群的请求
type PostClusterRequest struct {
	// MemberClusterKubeConfig 是成员集群的 kubeconfig
	MemberClusterKubeConfig string                   `json:"memberClusterKubeconfig" binding:"required"`
	// SyncMode 是集群同步模式
	SyncMode                v1alpha1.ClusterSyncMode `json:"syncMode" binding:"required"`
	// MemberClusterName 是成员集群的名称
	MemberClusterName       string                   `json:"memberClusterName" binding:"required"`
	// MemberClusterEndpoint 是成员集群的端点
	MemberClusterEndpoint   string                   `json:"memberClusterEndpoint"`
	// MemberClusterNamespace 是成员集群的命名空间
	MemberClusterNamespace  string                   `json:"memberClusterNamespace"`
	// ClusterProvider 是集群提供商
	ClusterProvider         string                   `json:"clusterProvider"`
	// ClusterRegion 是集群区域
	ClusterRegion           string                   `json:"clusterRegion"`
	// ClusterZones 是集群区域
	ClusterZones            []string                 `json:"clusterZones"`
}

// PostClusterResponse is the response body for creating a cluster.
// PostClusterResponse 是创建集群的响应
type PostClusterResponse struct {
}

// LabelRequest is the request body for labeling a cluster.
// LabelRequest 是标签集群的请求
type LabelRequest struct {
	// Key 是标签的键
	Key   string `json:"key"`
	// Value 是标签的值
	Value string `json:"value"`
}

// TaintRequest is the request body for tainting a cluster.
// TaintRequest 是污点集群的请求
type TaintRequest struct {
	// Effect 是污点的效果
	Effect corev1.TaintEffect `json:"effect"`
	// Key 是污点的键
	Key    string             `json:"key"`
	// Value 是污点的值
	Value  string             `json:"value"`
}

// PutClusterRequest is the request body for updating a cluster.
// PutClusterRequest 是更新集群的请求
type PutClusterRequest struct {
	// Labels 是标签
	Labels *[]LabelRequest `json:"labels"`
	// Taints 是污点
	Taints *[]TaintRequest `json:"taints"`
}

// PutClusterResponse is the response body for updating a cluster.
// PutClusterResponse 是更新集群的响应
type PutClusterResponse struct{}

// DeleteClusterRequest is the request body for deleting a cluster.
// DeleteClusterRequest 是删除集群的请求
type DeleteClusterRequest struct {
	// MemberClusterName 是成员集群的名称
	MemberClusterName string `uri:"name" binding:"required"`
}

// DeleteClusterResponse is the response body for deleting a cluster.
// DeleteClusterResponse 是删除集群的响应
type DeleteClusterResponse struct {
}
