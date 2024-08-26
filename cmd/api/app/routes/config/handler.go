package config

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/config"
	"k8s.io/klog/v2"
)

func GetDashboardConfig(c *gin.Context) {
	dashboardConfig := config.GetDashboardConfig()
	common.Success(c, dashboardConfig)
}

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
