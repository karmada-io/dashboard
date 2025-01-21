/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
