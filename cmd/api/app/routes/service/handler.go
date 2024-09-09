package service

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/service"
)

func handleGetServices(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	nsQuery := common.ParseNamespacePathParameter(c)
	result, err := service.GetServiceList(k8sClient, nsQuery, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetServiceDetail(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	namespace := c.Param("namespace")
	name := c.Param("service")
	result, err := service.GetServiceDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetServiceEvents(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	namespace := c.Param("namespace")
	name := c.Param("service")
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := service.GetServiceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.V1()
	r.GET("/service", handleGetServices)
	r.GET("/service/:namespace", handleGetServices)
	r.GET("/service/:namespace/:service", handleGetServiceDetail)
	r.GET("/service/:namespace/:service/event", handleGetServiceEvents)
}
