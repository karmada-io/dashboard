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

package overview

import (
	"context"

	"github.com/gin-gonic/gin"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
)

// GetClusterResourcesSummary 获取所有集群的资源汇总信息
func GetClusterResourcesSummary() (*v1.ResourcesSummary, error) {
	// 初始化汇总结构
	summary := &v1.ResourcesSummary{}

	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()

	// 直接获取集群列表，避免使用dataselect包
	clusterList, err := karmadaClient.ClusterV1alpha1().Clusters().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster list")
		return nil, err
	}

	// 遍历所有集群，累加资源数据
	for _, cluster := range clusterList.Items {
		// 节点状态统计
		if cluster.Status.NodeSummary != nil {
			// 计算节点总数和就绪节点数
			totalNodes := int(cluster.Status.NodeSummary.TotalNum)
			readyNodes := int(cluster.Status.NodeSummary.ReadyNum)

			summary.Node.Total += int64(totalNodes)
			summary.Node.Ready += int64(readyNodes)
		}

		// 资源统计 - 只有当ResourceSummary不为空时才进行统计
		if cluster.Status.ResourceSummary != nil {
			// Pod统计
			if podCapacity := cluster.Status.ResourceSummary.Allocatable.Pods(); podCapacity != nil {
				summary.Pod.Capacity += podCapacity.Value()
			}

			if podAllocated := cluster.Status.ResourceSummary.Allocated.Pods(); podAllocated != nil {
				summary.Pod.Allocated += podAllocated.Value()
			}

			// CPU统计 - 转换为核心数
			if cpuCapacity := cluster.Status.ResourceSummary.Allocatable.Cpu(); cpuCapacity != nil {
				summary.CPU.Capacity += cpuCapacity.MilliValue() / 1000
			}

			if cpuAllocated := cluster.Status.ResourceSummary.Allocated.Cpu(); cpuAllocated != nil {
				summary.CPU.Usage += cpuAllocated.MilliValue() / 1000
			}

			// 内存统计 - 转换为KiB
			if memCapacity := cluster.Status.ResourceSummary.Allocatable.Memory(); memCapacity != nil {
				summary.Memory.Capacity += memCapacity.Value() / 1024
			}

			if memAllocated := cluster.Status.ResourceSummary.Allocated.Memory(); memAllocated != nil {
				summary.Memory.Usage += memAllocated.Value() / 1024
			}
		}
	}

	return summary, nil
}

// HandleGetResourcesSummary 处理获取资源汇总信息的请求
func HandleGetResourcesSummary(c *gin.Context) {
	summary, err := GetClusterResourcesSummary()
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster resources summary")
		common.Fail(c, err)
		return
	}

	common.Success(c, summary)
}
