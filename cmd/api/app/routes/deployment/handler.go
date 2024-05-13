package deployment

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"
)

func handlerCreateDeployment(c *gin.Context) {
	ctx := context.Context(c)
	createDeploymentRequest := new(v1.CreateDeploymentRequest)
	if err := c.ShouldBind(&createDeploymentRequest); err != nil {
		common.Fail(c, err)
		return
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

func init() {
	r := router.V1()
	r.POST("/deployment", handlerCreateDeployment)
}
