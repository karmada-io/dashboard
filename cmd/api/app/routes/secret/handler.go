package service

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/secret"
)

func handleGetSecrets(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	nsQuery := common.ParseNamespacePathParameter(c)
	result, err := secret.GetSecretList(k8sClient, nsQuery, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetSecretDetail(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	namespace := c.Param("namespace")
	name := c.Param("service")
	result, err := secret.GetSecretDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}
func init() {
	r := router.V1()
	r.GET("/secret", handleGetSecrets)
	r.GET("/secret/:namespace", handleGetSecrets)
	r.GET("/secret/:namespace/:service", handleGetSecretDetail)
}
