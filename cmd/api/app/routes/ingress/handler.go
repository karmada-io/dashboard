package ingress

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/ingress"
)

func handleGetIngress(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	nsQuery := common.ParseNamespacePathParameter(c)
	result, err := ingress.GetIngressList(k8sClient, nsQuery, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetIngressDetail(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	namespace := c.Param("namespace")
	name := c.Param("service")
	result, err := ingress.GetIngressDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.V1()
	r.GET("/ingress", handleGetIngress)
	r.GET("/ingress/:namespace", handleGetIngress)
	r.GET("/ingress/:namespace/:service", handleGetIngressDetail)
}
