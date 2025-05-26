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
	"context"

	"github.com/gin-gonic/gin"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/deployment"
	"github.com/karmada-io/dashboard/pkg/resource/event"
)

func handlerCreateDeployment(c *gin.Context) {
	ctx := context.Context(c)
	createDeploymentRequest := new(v1.CreateDeploymentRequest)
	if err := c.ShouldBind(&createDeploymentRequest); err != nil {
		common.Fail(c, err)
		return
	}
	if createDeploymentRequest.Namespace == "" {
		createDeploymentRequest.Namespace = "default"
	}

	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		common.Fail(c, err)
		return
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		common.Fail(c, err)
		return
	}
	deployment := appsv1.Deployment{}
	if err = yaml.Unmarshal([]byte(createDeploymentRequest.Content), &deployment); err != nil {
		common.Fail(c, err)
		return
	}
	result, err := clientset.AppsV1().Deployments(createDeploymentRequest.Namespace).Create(ctx, &deployment, metav1.CreateOptions{})
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetDeployments(c *gin.Context) {
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := deployment.GetDeploymentList(k8sClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetDeploymentDetail(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("deployment")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := deployment.GetDeploymentDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetDeploymentEvents(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("deployment")
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
	r.GET("/deployment", handleGetDeployments)
	r.GET("/deployment/:namespace", handleGetDeployments)
	r.GET("/deployment/:namespace/:deployment", handleGetDeploymentDetail)
	r.GET("/deployment/:namespace/:deployment/event", handleGetDeploymentEvents)
	r.POST("/deployment", handlerCreateDeployment)
}
