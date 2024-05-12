package v1

import "github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"

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

type DeleteClusterRequest struct {
	MemberClusterName string `uri:"memberClusterName" binding:"required"`
}
type DeleteClusterResponse struct {
}
