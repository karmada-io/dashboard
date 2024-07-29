package namespace

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	ns "github.com/karmada-io/dashboard/pkg/resource/namespace"
)

func handleCreateNamespace(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	createNamespaceRequest := new(v1.CreateNamesapceRequest)
	if err := c.ShouldBind(&createNamespaceRequest); err != nil {
		common.Fail(c, err)
		return
	}
	spec := &ns.NamespaceSpec{
		Name:                createNamespaceRequest.Name,
		SkipAutoPropagation: createNamespaceRequest.SkipAutoPropagation,
	}
	if err := ns.CreateNamespace(spec, k8sClient); err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}
func handleGetNamespaces(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := ns.GetNamespaceList(k8sClient, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}
func handleGetNamespaceDetail(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	name := c.Param("name")
	result, err := ns.GetNamespaceDetail(k8sClient, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}
func handleGetNamespaceEvents(c *gin.Context) {
	k8sClient := client.InClusterClientForKarmadaApiServer()
	name := c.Param("name")
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetNamespaceEvents(k8sClient, dataSelect, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}
func init() {
	r := router.V1()
	r.POST("/namespace", handleCreateNamespace)
	r.GET("/namespace", handleGetNamespaces)
	r.GET("/namespace/:name", handleGetNamespaceDetail)
	r.GET("/namespace/:name/event", handleGetNamespaceEvents)
}
