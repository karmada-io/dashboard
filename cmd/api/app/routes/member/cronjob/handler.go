package cronjob

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/cronjob"
	"github.com/karmada-io/dashboard/pkg/resource/event"
)

func handleGetCronJob(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := cronjob.GetCronJobList(memberClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetCronJobDetail(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := c.Param("namespace")
	name := c.Param("cronjob")
	result, err := cronjob.GetCronJobDetail(memberClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetCronJobEvents(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := c.Param("namespace")
	name := c.Param("cronjob")
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
	r.GET("/cronjob", handleGetCronJob)
	r.GET("/cronjob/:namespace", handleGetCronJob)
	r.GET("/cronjob/:namespace/:cronjob", handleGetCronJobDetail)
	r.GET("/cronjob/:namespace/:cronjob/event", handleGetCronJobEvents)
}
