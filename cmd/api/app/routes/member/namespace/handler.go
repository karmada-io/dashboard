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

package namespace

import (
	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	ns "github.com/karmada-io/dashboard/pkg/resource/namespace"
)

// 获取成员集群的namespace列表
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

// 获取成员集群的namespace详情
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

// 获取成员集群的namespace事件
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

// 初始化路由
func init() {
	r := router.MemberV1()
	// 获取成员集群的namespace列表
	r.GET("/namespace", handleGetMemberNamespace)
	// 获取成员集群的namespace详情
	r.GET("/namespace/:name", handleGetMemberNamespaceDetail)
	// 获取成员集群的namespace事件
	r.GET("/namespace/:name/event", handleGetMemberNamespaceEvents)
}
