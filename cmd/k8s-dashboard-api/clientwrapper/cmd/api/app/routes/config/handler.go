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

package config

import (
	"github.com/gin-gonic/gin"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/config"
)

// GetDashboardConfig handles the request to retrieve the dashboard configuration.
func GetDashboardConfig(c *gin.Context) {
	dashboardConfig := config.GetDashboardConfig()
	common.Success(c, dashboardConfig)
}

// SetDashboardConfig handles the request to update the dashboard configuration.
func SetDashboardConfig(c *gin.Context) {
	setDashboardConfigRequest := new(v1.SetDashboardConfigRequest)
	if err := c.ShouldBind(setDashboardConfigRequest); err != nil {
		klog.ErrorS(err, "Could not read SetDashboardConfigRequest")
		common.Fail(c, err)
		return
	}

	dashboardConfig := config.GetDashboardConfig()
	if len(setDashboardConfigRequest.DockerRegistries) > 0 {
		dashboardConfig.DockerRegistries = setDashboardConfigRequest.DockerRegistries
	}
	if len(setDashboardConfigRequest.ChartRegistries) > 0 {
		dashboardConfig.ChartRegistries = setDashboardConfigRequest.ChartRegistries
	}
	if len(setDashboardConfigRequest.MenuConfigs) > 0 {
		dashboardConfig.MenuConfigs = setDashboardConfigRequest.MenuConfigs
	}
	k8sClient := client.InClusterClient()
	err := config.UpdateDashboardConfig(k8sClient, dashboardConfig)
	if err != nil {
		klog.ErrorS(err, "Error updating dashboard config")
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}

func init() {
	r := router.V1()
	r.GET("/config", GetDashboardConfig)
	r.POST("/config", SetDashboardConfig)
}
