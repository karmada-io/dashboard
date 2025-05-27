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

package node

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	enhancednode "github.com/karmada-io/dashboard/pkg/resource/node"
)

func handleGetMemberNodes(c *gin.Context) {
	clusterName := c.Param("clustername")
	memberClient := client.InClusterClientForMemberCluster(clusterName)
	if memberClient == nil {
		common.Fail(c, fmt.Errorf("failed to get client for cluster %s", clusterName))
		return
	}

	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := enhancednode.GetEnhancedNodeList(memberClient, clusterName, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetMemberNodeDetail(c *gin.Context) {
	clusterName := c.Param("clustername")
	nodeName := c.Param("name")

	memberClient := client.InClusterClientForMemberCluster(clusterName)
	if memberClient == nil {
		common.Fail(c, fmt.Errorf("failed to get client for cluster %s", clusterName))
		return
	}

	result, err := enhancednode.GetEnhancedNodeDetail(memberClient, clusterName, nodeName)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetMemberNodePods(c *gin.Context) {
	clusterName := c.Param("clustername")
	nodeName := c.Param("name")

	memberClient := client.InClusterClientForMemberCluster(clusterName)
	if memberClient == nil {
		common.Fail(c, fmt.Errorf("failed to get client for cluster %s", clusterName))
		return
	}

	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := enhancednode.GetPodsOnNode(memberClient, nodeName, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.MemberV1()
	r.GET("/nodes", handleGetMemberNodes)
	r.GET("/nodes/:name", handleGetMemberNodeDetail)
	r.GET("/nodes/:name/pods", handleGetMemberNodePods)
}
