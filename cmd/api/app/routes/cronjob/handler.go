package deployment

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/cronjob"
	"github.com/karmada-io/dashboard/pkg/resource/event"
)

func handleGetCronJob(c *gin.Context) {
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	k8sClient := client.InClusterClientForKarmadaApiServer()
	result, err := cronjob.GetCronJobList(k8sClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetCronJobDetail(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("statefulset")
	k8sClient := client.InClusterClientForKarmadaApiServer()
	result, err := cronjob.GetCronJobDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetCronJobEvents(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("statefulset")
	k8sClient := client.InClusterClientForKarmadaApiServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}
func init() {
	r := router.V1()
	r.GET("/cronjob", handleGetCronJob)
	r.GET("/cronjob/:namespace", handleGetCronJob)
	r.GET("/cronjob/:namespace/:statefulset", handleGetCronJobDetail)
	r.GET("/cronjob/:namespace/:statefulset/event", handleGetCronJobEvents)
}
