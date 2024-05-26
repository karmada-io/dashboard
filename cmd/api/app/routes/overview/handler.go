package overview

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

func handleGetOverview(c *gin.Context) {
	dataSelect := common.ParseDataSelectPathParameter(c)
	karmadaInfo, err := GetControllerManagerInfo()
	if err != nil {
		common.Fail(c, err)
		return
	}
	memberClusterStatus, err := GetMemberClusterInfo(dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}

	clusterResourceStatus, err := GetClusterResourceStatus()
	if err != nil {
		common.Fail(c, err)
		return
	}

	//GetControllerManagerInfo(dataSelect)
	common.Success(c, v1.OverviewResponse{
		KarmadaInfo:           karmadaInfo,
		MemberClusterStatus:   memberClusterStatus,
		ClusterResourceStatus: clusterResourceStatus,
	})
}

func init() {
	/*
		创建时间	2024-01-01
		节点数量：20/20
		CPU使用情况：10000m/20000m
		Memory使用情况：50GiB/500GiB
		Pod分配情况：300/1000
	*/
	r := router.V1()
	r.GET("/overview", handleGetOverview)
}
