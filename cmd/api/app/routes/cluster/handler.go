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
	"time"

	"github.com/gin-gonic/gin"
	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/cluster"
)

// 获取集群列表
func handleGetClusterList(c *gin.Context) {
	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()
	// 解析数据选择路径参数
	dataSelect := common.ParseDataSelectPathParameter(c)
	// 获取集群列表
	result, err := cluster.GetClusterList(karmadaClient, dataSelect)
	if err != nil {
		// 打印错误信息
		klog.ErrorS(err, "GetClusterList failed")
		// 返回错误
		common.Fail(c, err)
		return
	}
	// 返回成功
	common.Success(c, result)
}

// 获取集群详情
func handleGetClusterDetail(c *gin.Context) {
	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()
	// 获取集群名称
	name := c.Param("name")
	// 获取集群详情
	result, err := cluster.GetClusterDetail(karmadaClient, name)
	if err != nil {
		// 打印错误信息
		klog.ErrorS(err, "GetClusterDetail failed")
		// 返回错误
		common.Fail(c, err)
		return
	}
	// 返回成功
	common.Success(c, result)
}

// 创建集群
func handlePostCluster(c *gin.Context) {
	// 获取集群请求
	clusterRequest := new(v1.PostClusterRequest)
	// 解析集群请求
	if err := c.ShouldBind(clusterRequest); err != nil {
		// 打印错误信息
		klog.ErrorS(err, "Could not read cluster request")
		// 返回错误
		common.Fail(c, err)
		return
	}
	// 解析成员集群端点
	memberClusterEndpoint, err := parseEndpointFromKubeconfig(clusterRequest.MemberClusterKubeConfig)
	if err != nil {
		// 打印错误信息
		klog.ErrorS(err, "Could not parse member cluster endpoint")
		// 返回错误
		common.Fail(c, err)
		return
	}
	clusterRequest.MemberClusterEndpoint = memberClusterEndpoint
	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()
	// 如果同步模式为拉取模式
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
		// 创建拉取模式选项
		opts := &pullModeOption{
			karmadaClient:          karmadaClient,
			karmadaAgentCfg:        apiConfig,
			memberClusterNamespace: clusterRequest.MemberClusterNamespace,
			memberClusterClient:    memberClusterClient,
			memberClusterName:      clusterRequest.MemberClusterName,
			memberClusterEndpoint:  clusterRequest.MemberClusterEndpoint,
		}
		// 访问集群
		if err = accessClusterInPullMode(opts); err != nil {
			klog.ErrorS(err, "accessClusterInPullMode failed")
			common.Fail(c, err)
		} else {
			klog.Infof("accessClusterInPullMode success")
			common.Success(c, "ok")
		}
	} else if clusterRequest.SyncMode == v1alpha1.Push {
		// 获取成员集群REST配置
		memberClusterRestConfig, err := client.LoadRestConfigFromKubeConfig(clusterRequest.MemberClusterKubeConfig)
		if err != nil {
			klog.ErrorS(err, "Generate rest config from memberClusterKubeconfig failed")
			// 返回错误
			common.Fail(c, err)
			return
		}
		// 获取Karmada配置
		restConfig, _, err := client.GetKarmadaConfig()
		if err != nil {
			klog.ErrorS(err, "Get restConfig failed")
			// 返回错误
			common.Fail(c, err)
			return
		}
		opts := &pushModeOption{
			karmadaClient:           karmadaClient,
			clusterName:             clusterRequest.MemberClusterName,
			karmadaRestConfig:       restConfig,
			memberClusterRestConfig: memberClusterRestConfig,
		}
		// 访问集群
		if err := accessClusterInPushMode(opts); err != nil {
			klog.ErrorS(err, "accessClusterInPushMode failed")
			// 返回错误
			common.Fail(c, err)
			return
		}
		// 打印成功信息
		klog.Infof("accessClusterInPushMode success")
		// 返回成功
		common.Success(c, "ok")
	} else {
		// 打印错误信息
		klog.Errorf("Unknown sync mode %s", clusterRequest.SyncMode)
		// 返回错误
		common.Fail(c, fmt.Errorf("unknown sync mode %s", clusterRequest.SyncMode))
	}
}

// 更新集群
func handlePutCluster(c *gin.Context) {
	clusterRequest := new(v1.PutClusterRequest)
	name := c.Param("name")
	if err := c.ShouldBind(clusterRequest); err != nil {
		// 打印错误信息
		klog.ErrorS(err, "Could not read handlePutCluster request")
		// 返回错误
		common.Fail(c, err)
		return
	}
	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()
	memberCluster, err := karmadaClient.ClusterV1alpha1().Clusters().Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		// 打印错误信息
		klog.ErrorS(err, "Get cluster failed")
		// 返回错误
		common.Fail(c, err)
		return
	}
	// 假设前端可以获取整个标签和污点
	labels := make(map[string]string)
	if clusterRequest.Labels != nil {
		for _, labelItem := range *clusterRequest.Labels {
			labels[labelItem.Key] = labelItem.Value
		}
		memberCluster.Labels = labels
	}
	// 假设前端可以获取整个污点
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
	// 更新集群
	_, err = karmadaClient.ClusterV1alpha1().Clusters().Update(context.TODO(), memberCluster, metav1.UpdateOptions{})
	if err != nil {
		// 打印错误信息
		klog.ErrorS(err, "Update cluster failed")
		// 返回错误
		common.Fail(c, err)
		return
	}
	// 返回成功
	common.Success(c, "ok")
}

// 删除集群
func handleDeleteCluster(c *gin.Context) {
	// 获取上下文
	ctx := context.Context(c)
	// 获取删除集群请求
	clusterRequest := new(v1.DeleteClusterRequest)
	// 解析删除集群请求
	if err := c.ShouldBindUri(&clusterRequest); err != nil {
		// 返回错误
		common.Fail(c, err)
		return
	}
	clusterName := clusterRequest.MemberClusterName
	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()
	// 等待时间
	waitDuration := time.Second * 60

	err := karmadaClient.ClusterV1alpha1().Clusters().Delete(ctx, clusterName, metav1.DeleteOptions{})
	if apierrors.IsNotFound(err) {
		// 返回错误
		common.Fail(c, fmt.Errorf("no cluster object %s found in karmada control Plane", clusterName))
		return
	}
	if err != nil {
		// 打印错误信息
		klog.Errorf("Failed to delete cluster object. cluster name: %s, error: %v", clusterName, err)
		// 返回错误
		common.Fail(c, err)
		return
	}

	// make sure the given cluster object has been deleted
	err = wait.PollUntilContextTimeout(ctx, 1*time.Second, waitDuration, true, func(ctx context.Context) (done bool, err error) {
		// 获取集群
		_, err = karmadaClient.ClusterV1alpha1().Clusters().Get(ctx, clusterName, metav1.GetOptions{})
		if apierrors.IsNotFound(err) {
			return true, nil
		}
		if err != nil {
			// 打印错误信息
			klog.Errorf("Failed to get cluster %s. err: %v", clusterName, err)
			// 返回错误
			return false, err
		}
		// 打印信息
		klog.Infof("Waiting for the cluster object %s to be deleted", clusterName)
		// 返回false
		return false, nil
	})
	if err != nil {
		// 打印错误信息
		klog.Errorf("Failed to delete cluster object. cluster name: %s, error: %v", clusterName, err)
		// 返回错误
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}

// 解析kubeconfig中的endpoint
func parseEndpointFromKubeconfig(kubeconfigContents string) (string, error) {
	// 解析kubeconfig
	restConfig, err := client.LoadRestConfigFromKubeConfig(kubeconfigContents)
	if err != nil {
		// 返回错误
		return "", err
	}
	// 返回端点
	return restConfig.Host, nil
}

// 初始化路由
func init() {
	// 获取V1路由
	r := router.V1()
	// 获取集群列表
	r.GET("/cluster", handleGetClusterList)
	// 获取集群详情
	r.GET("/cluster/:name", handleGetClusterDetail)
	// 创建集群
	r.POST("/cluster", handlePostCluster)
	// 更新集群
	r.PUT("/cluster/:name", handlePutCluster)
	// 删除集群
	r.DELETE("/cluster/:name", handleDeleteCluster)
}
