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

package deployment

import (
	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/deployment"
	"github.com/karmada-io/dashboard/pkg/resource/event"
)

func handleGetMemberDeployments(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := deployment.GetDeploymentList(memberClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetMemberDeploymentDetail(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := c.Param("namespace")
	name := c.Param("deployment")
	result, err := deployment.GetDeploymentDetail(memberClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetMemberDeploymentEvents(c *gin.Context) {
	memberClient := client.InClusterClientForMemberCluster(c.Param("clustername"))
	namespace := c.Param("namespace")
	name := c.Param("deployment")
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetResourceEvents(memberClient, dataSelect, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.MemberV1()
	r.GET("/deployment", handleGetMemberDeployments)
	r.GET("/deployment/:namespace", handleGetMemberDeployments)
	r.GET("/deployment/:namespace/:deployment", handleGetMemberDeploymentDetail)
	r.GET("/deployment/:namespace/:deployment/event", handleGetMemberDeploymentEvents)
}
