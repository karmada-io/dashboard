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
