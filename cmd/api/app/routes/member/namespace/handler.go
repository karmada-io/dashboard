package namespace

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	ns "github.com/karmada-io/dashboard/pkg/resource/namespace"
)

func handleGetMemberNamespace(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))

	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := ns.GetNamespaceList(memberClient, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetMemberNamespaceDetail(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))

	name := c.Param("name")
	result, err := ns.GetNamespaceDetail(memberClient, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetMemberNamespaceEvents(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))

	name := c.Param("name")
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetNamespaceEvents(memberClient, dataSelect, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.MemberV1()
	r.GET("/namespace", handleGetMemberNamespace)
	r.GET("/namespace/:name", handleGetMemberNamespaceDetail)
	r.GET("/namespace/:name/event", handleGetMemberNamespaceEvents)
}
