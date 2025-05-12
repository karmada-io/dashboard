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

package topology

import (
	"github.com/gin-gonic/gin"
	"k8s.io/klog/v2"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

// HandleGetTopology 处理获取拓扑图数据的请求
func HandleGetTopology(c *gin.Context) {
	// 获取查询参数
	showResources := c.DefaultQuery("showResources", "true") == "true"
	showNodes := c.DefaultQuery("showNodes", "true") == "true"
	showPods := c.DefaultQuery("showPods", "false") == "true"

	// 获取拓扑图数据
	topologyData, err := GetTopologyData(showResources, showNodes, showPods)
	if err != nil {
		klog.ErrorS(err, "Failed to get topology data")
		common.Fail(c, err)
		return
	}

	// 返回成功响应
	common.Success(c, &v1.TopologyResponse{
		Data: *topologyData,
	})
}

// HandleGetClusterTopology 处理获取特定集群拓扑图数据的请求
func HandleGetClusterTopology(c *gin.Context) {
	// 获取集群名称
	clusterName := c.Param("clusterName")
	if clusterName == "" {
		common.Fail(c, common.NewBadRequestError("cluster name is required"))
		return
	}

	// 获取查询参数
	showResources := c.DefaultQuery("showResources", "true") == "true"
	showNodes := c.DefaultQuery("showNodes", "true") == "true"
	showPods := c.DefaultQuery("showPods", "false") == "true"

	// 获取特定集群的拓扑图数据
	topologyData, err := GetClusterTopologyData(clusterName, showResources, showNodes, showPods)
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster topology data", "cluster", clusterName)
		common.Fail(c, err)
		return
	}

	// 返回成功响应
	common.Success(c, &v1.TopologyResponse{
		Data: *topologyData,
	})
}

// RegisterRoutes 注册拓扑图相关的路由
func RegisterRoutes(r gin.IRoutes) {
	r.GET("/overview/topology", HandleGetTopology)
	r.GET("/overview/topology/:clusterName", HandleGetClusterTopology)
}
