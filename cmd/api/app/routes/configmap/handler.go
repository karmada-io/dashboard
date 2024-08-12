package service

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/configmap"
)

func handleGetConfigMap(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	nsQuery := common.ParseNamespacePathParameter(c)
	result, err := configmap.GetConfigMapList(k8sClient, nsQuery, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetConfigMapDetail(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	namespace := c.Param("namespace")
	name := c.Param("name")
	result, err := configmap.GetConfigMapDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.V1()
	r.GET("/configmap", handleGetConfigMap)
	r.GET("/configmap/:namespace", handleGetConfigMap)
	r.GET("/configmap/:namespace/:name", handleGetConfigMapDetail)
}
