/*
Copyright 2024 The Karmada Authors.
Licensed under the Apache License, Version 2.0
*/

package scheduling

import (
	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	schedulingpkg "github.com/karmada-io/dashboard/pkg/resource/scheduling"
)

func handleGetWorkloadScheduling(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	kind := c.Query("kind") // 从查询参数获取kind

	if kind == "" {
		kind = "Deployment" // 默认值
	}

	karmadaClient := client.InClusterKarmadaClient()
	result, err := schedulingpkg.GetWorkloadScheduling(karmadaClient, namespace, name, kind)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func init() {
	r := router.V1()
	r.GET("/workloads/:namespace/:name/scheduling", handleGetWorkloadScheduling)
}
