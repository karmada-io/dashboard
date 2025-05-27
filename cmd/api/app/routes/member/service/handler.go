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

package service

import (
	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/service"
)

// return a services list
func handleGetMemberService(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	dataSelect := common.ParseDataSelectPathParameter(c)
	nsQuery := common.ParseNamespacePathParameter(c)
	result, err := service.GetServiceList(memberClient, nsQuery, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

// return a service detail
func handleGetMemberServiceDetail(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := c.Param("namespace")
	name := c.Param("name")
	result, err := service.GetServiceDetail(memberClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.MemberV1()
	r.GET("/service", handleGetMemberService)
	r.GET("/services", handleGetMemberService) // 复数形式
	r.GET("/service/:namespace", handleGetMemberService)
	r.GET("/service/:namespace/:name", handleGetMemberServiceDetail)
}
