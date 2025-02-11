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
	"github.com/karmada-io/dashboard/pkg/resource/event"
	"github.com/karmada-io/dashboard/pkg/resource/job"
)

func handleGetJob(c *gin.Context) {
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := job.GetJobList(k8sClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetJobDetail(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("statefulset")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := job.GetJobDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetJobEvents(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("statefulset")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}
func init() {
	r := router.V1()
	r.GET("/job", handleGetJob)
	r.GET("/job/:namespace", handleGetJob)
	r.GET("/job/:namespace/:statefulset", handleGetJobDetail)
	r.GET("/job/:namespace/:statefulset/event", handleGetJobEvents)
}
