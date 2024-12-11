package daemonset

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/daemonset"
	"github.com/karmada-io/dashboard/pkg/resource/event"
)

func handleGetDaemonset(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := daemonset.GetDaemonSetList(memberClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetDaemonsetDetail(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := c.Param("namespace")
	name := c.Param("daemonset")
	result, err := daemonset.GetDaemonSetDetail(memberClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetDaemonsetEvents(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := c.Param("namespace")
	name := c.Param("daemonset")
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
	r.GET("/daemonset", handleGetDaemonset)
	r.GET("/daemonset/:namespace", handleGetDaemonset)
	r.GET("/daemonset/:namespace/:daemonset", handleGetDaemonsetDetail)
	r.GET("/daemonset/:namespace/:daemonset/event", handleGetDaemonsetEvents)
}
