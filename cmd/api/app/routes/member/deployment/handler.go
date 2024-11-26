package deployment

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/deployment"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func handleGetMemberDeployments(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	_, err := karmadaClient.ClusterV1alpha1().Clusters().Get(context.TODO(), c.Param("clustername"), metav1.GetOptions{})
	if err != nil {
		common.Fail(c, err)
		return
	}
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := deployment.GetDeploymentList(memberClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetMemberDeploymentDetail(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	_, err := karmadaClient.ClusterV1alpha1().Clusters().Get(context.TODO(), c.Param("clustername"), metav1.GetOptions{})
	if err != nil {
		common.Fail(c, err)
		return
	}
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := c.Param("namespace")
	name := c.Param("deployment")
	result, err := deployment.GetDeploymentDetail(memberClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetMemberDeploymentEvents(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	_, err := karmadaClient.ClusterV1alpha1().Clusters().Get(context.TODO(), c.Param("clustername"), metav1.GetOptions{})
	if err != nil {
		common.Fail(c, err)
		return
	}
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := c.Param("namespace")
	name := c.Param("deployment")
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetResourceEvents(memberClient, dataSelect, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.MemberV1()
	r.GET("/deployment", handleGetMemberDeployments)
	r.GET("/deployment/:namespace", handleGetMemberDeployments)
	r.GET("/deployment/:namespace/:deployment", handleGetMemberDeploymentDetail)
	r.GET("/deployment/:namespace/:deployment/event", handleGetMemberDeploymentEvents)
}
