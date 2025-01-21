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

package cluster

import (
	"context"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/cluster"
	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/klog/v2"
	"time"
)

func handleGetClusterList(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := cluster.GetClusterList(karmadaClient, dataSelect)
	if err != nil {
		klog.ErrorS(err, "GetClusterList failed")
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetClusterDetail(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	name := c.Param("name")
	result, err := cluster.GetClusterDetail(karmadaClient, name)
	if err != nil {
		klog.ErrorS(err, "GetClusterDetail failed")
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handlePostCluster(c *gin.Context) {
	clusterRequest := new(v1.PostClusterRequest)
	if err := c.ShouldBind(clusterRequest); err != nil {
		klog.ErrorS(err, "Could not read cluster request")
		common.Fail(c, err)
		return
	}
	memberClusterEndpoint, err := parseEndpointFromKubeconfig(clusterRequest.MemberClusterKubeConfig)
	if err != nil {
		klog.ErrorS(err, "Could not parse member cluster endpoint")
		common.Fail(c, err)
		return
	}
	clusterRequest.MemberClusterEndpoint = memberClusterEndpoint
	karmadaClient := client.InClusterKarmadaClient()

	if clusterRequest.SyncMode == v1alpha1.Pull {
		memberClusterClient, err := client.KubeClientSetFromKubeConfig(clusterRequest.MemberClusterKubeConfig)
		if err != nil {
			klog.ErrorS(err, "Generate kubeclient from memberClusterKubeconfig failed")
			common.Fail(c, err)
			return
		}
		_, apiConfig, err := client.GetKarmadaConfig()
		if err != nil {
			klog.ErrorS(err, "Get apiConfig for karmada failed")
			common.Fail(c, err)
			return
		}
		opts := &PullModeOption{
			karmadaClient:          karmadaClient,
			karmadaAgentCfg:        apiConfig,
			memberClusterNamespace: clusterRequest.MemberClusterNamespace,
			memberClusterClient:    memberClusterClient,
			memberClusterName:      clusterRequest.MemberClusterName,
			memberClusterEndpoint:  clusterRequest.MemberClusterEndpoint,
		}
		if err = AccessClusterInPullMode(opts); err != nil {
			klog.ErrorS(err, "AccessClusterInPullMode failed")
			common.Fail(c, err)
		} else {
			klog.Infof("AccessClusterInPullMode success")
			common.Success(c, "ok")
		}
	} else if clusterRequest.SyncMode == v1alpha1.Push {
		memberClusterRestConfig, err := client.LoadeRestConfigFromKubeConfig(clusterRequest.MemberClusterKubeConfig)
		if err != nil {
			klog.ErrorS(err, "Generate rest config from memberClusterKubeconfig failed")
			common.Fail(c, err)
			return
		}
		restConfig, _, err := client.GetKarmadaConfig()
		if err != nil {
			klog.ErrorS(err, "Get restConfig failed")
			common.Fail(c, err)
			return
		}
		opts := &PushModeOption{
			karmadaClient:           karmadaClient,
			clusterName:             clusterRequest.MemberClusterName,
			karmadaRestConfig:       restConfig,
			memberClusterRestConfig: memberClusterRestConfig,
		}
		if err := AccessClusterInPushMode(opts); err != nil {
			klog.ErrorS(err, "AccessClusterInPushMode failed")
			common.Fail(c, err)
			return
		}
		klog.Infof("AccessClusterInPushMode success")
		common.Success(c, "ok")
	} else {
		klog.Errorf("Unknown sync mode %s", clusterRequest.SyncMode)
		common.Fail(c, fmt.Errorf("unknown sync mode %s", clusterRequest.SyncMode))
	}
}

func handlePutCluster(c *gin.Context) {
	clusterRequest := new(v1.PutClusterRequest)
	name := c.Param("name")
	if err := c.ShouldBind(clusterRequest); err != nil {
		klog.ErrorS(err, "Could not read handlePutCluster request")
		common.Fail(c, err)
		return
	}
	karmadaClient := client.InClusterKarmadaClient()
	memberCluster, err := karmadaClient.ClusterV1alpha1().Clusters().Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		klog.ErrorS(err, "Get cluster failed")
		common.Fail(c, err)
		return
	}

	// assume that the frontend can fetch the whole labels and taints
	labels := make(map[string]string)
	if clusterRequest.Labels != nil {
		for _, labelItem := range *clusterRequest.Labels {
			labels[labelItem.Key] = labelItem.Value
		}
		memberCluster.Labels = labels
	}

	taints := make([]corev1.Taint, 0)
	if clusterRequest.Taints != nil {
		for _, taintItem := range *clusterRequest.Taints {
			taints = append(taints, corev1.Taint{
				Key:    taintItem.Key,
				Value:  taintItem.Value,
				Effect: taintItem.Effect,
			})
		}
		memberCluster.Spec.Taints = taints
	}

	_, err = karmadaClient.ClusterV1alpha1().Clusters().Update(context.TODO(), memberCluster, metav1.UpdateOptions{})
	if err != nil {
		klog.ErrorS(err, "Update cluster failed")
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}

func handleDeleteCluster(c *gin.Context) {
	ctx := context.Context(c)
	clusterRequest := new(v1.DeleteClusterRequest)
	if err := c.ShouldBindUri(&clusterRequest); err != nil {
		common.Fail(c, err)
		return
	}
	clusterName := clusterRequest.MemberClusterName
	karmadaClient := client.InClusterKarmadaClient()
	waitDuration := time.Second * 60

	err := karmadaClient.ClusterV1alpha1().Clusters().Delete(ctx, clusterName, metav1.DeleteOptions{})
	if apierrors.IsNotFound(err) {
		common.Fail(c, fmt.Errorf("no cluster object %s found in karmada control Plane", clusterName))
		return
	}
	if err != nil {
		klog.Errorf("Failed to delete cluster object. cluster name: %s, error: %v", clusterName, err)
		common.Fail(c, err)
		return
	}

	// make sure the given cluster object has been deleted
	err = wait.Poll(1*time.Second, waitDuration, func() (done bool, err error) {
		_, err = karmadaClient.ClusterV1alpha1().Clusters().Get(ctx, clusterName, metav1.GetOptions{})
		if apierrors.IsNotFound(err) {
			return true, nil
		}
		if err != nil {
			klog.Errorf("Failed to get cluster %s. err: %v", clusterName, err)
			return false, err
		}
		klog.Infof("Waiting for the cluster object %s to be deleted", clusterName)
		return false, nil
	})
	if err != nil {
		klog.Errorf("Failed to delete cluster object. cluster name: %s, error: %v", clusterName, err)
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
	return
}

func parseEndpointFromKubeconfig(kubeconfigContents string) (string, error) {
	restConfig, err := client.LoadeRestConfigFromKubeConfig(kubeconfigContents)
	if err != nil {
		return "", err
	}
	return restConfig.Host, nil
}

func init() {
	r := router.V1()
	r.GET("/cluster", handleGetClusterList)
	r.GET("/cluster/:name", handleGetClusterDetail)
	r.POST("/cluster", handlePostCluster)
	r.PUT("/cluster/:name", handlePutCluster)
	r.DELETE("/cluster/:name", handleDeleteCluster)
}
