package node

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/node"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func handleGetClusterNode(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	_, err := karmadaClient.ClusterV1alpha1().Clusters().Get(context.TODO(), c.Param("clustername"), metav1.GetOptions{})
	if err != nil {
		common.Fail(c, err)
		return
	}
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := node.GetNodeList(memberClient, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.MemberV1()
	r.GET("/node", handleGetClusterNode)
}
