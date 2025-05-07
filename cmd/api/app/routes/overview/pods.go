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
	"sync"

	"github.com/gin-gonic/gin"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"

	apiV1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/dataselect"
)

// GetPodSummary 获取Pod汇总信息
func GetPodSummary(dataSelect *dataselect.DataSelectQuery) (*apiV1.PodsResponse, error) {
	// 初始化汇总结构
	response := &apiV1.PodsResponse{
		Items:          []apiV1.PodItem{},
		StatusStats:    apiV1.PodSummaryStats{},
		NamespaceStats: []apiV1.NamespacePodsStats{},
		ClusterStats:   []apiV1.ClusterPodsStats{},
	}

	// 用于统计命名空间和集群数据的映射
	namespaceMap := make(map[string]int)
	clusterMap := make(map[string]int)

	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()

	// 获取集群列表
	clusterList, err := karmadaClient.ClusterV1alpha1().Clusters().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster list")
		return nil, err
	}

	// 使用WaitGroup来管理并发请求
	var wg sync.WaitGroup
	// 使用互斥锁保护共享数据
	var mu sync.Mutex

	// 遍历所有集群
	for _, cluster := range clusterList.Items {
		wg.Add(1)
		go func(clusterName string) {
			defer wg.Done()

			// 获取成员集群的客户端
			memberClient := client.InClusterClientForMemberCluster(clusterName)
			if memberClient == nil {
				klog.Warningf("Failed to get client for cluster %s", clusterName)
				return
			}

			// 获取该集群的Pod
			pods, err := getPodsForCluster(memberClient, clusterName)
			if err != nil {
				klog.ErrorS(err, "Failed to get pods", "cluster", clusterName)
				return
			}

			// 加锁更新共享数据
			mu.Lock()
			defer mu.Unlock()

			// 更新状态统计
			for _, pod := range pods {
				switch pod.Phase {
				case v1.PodRunning:
					response.StatusStats.Running++
				case v1.PodPending:
					response.StatusStats.Pending++
				case v1.PodSucceeded:
					response.StatusStats.Succeeded++
				case v1.PodFailed:
					response.StatusStats.Failed++
				case v1.PodUnknown:
					response.StatusStats.Unknown++
				}
				response.StatusStats.Total++

				// 更新命名空间统计
				namespaceMap[pod.Namespace]++
				// 更新集群统计
				clusterMap[clusterName]++
			}

			// 追加Pod信息
			response.Items = append(response.Items, pods...)
		}(cluster.Name)
	}

	// 等待所有请求完成
	wg.Wait()

	// 转换命名空间统计数据
	for ns, count := range namespaceMap {
		response.NamespaceStats = append(response.NamespaceStats, apiV1.NamespacePodsStats{
			Namespace: ns,
			PodCount:  count,
		})
	}

	// 转换集群统计数据
	for cluster, count := range clusterMap {
		response.ClusterStats = append(response.ClusterStats, apiV1.ClusterPodsStats{
			ClusterName: cluster,
			PodCount:    count,
		})
	}

	// 如果使用了数据选择器，则过滤和排序Pod
	if dataSelect != nil && len(response.Items) > 0 {
		// 这里可以根据需要实现Pod的排序和分页
		// 目前为简单实现，实际使用时可能需要更复杂的逻辑
	}

	return response, nil
}

// getPodsForCluster 获取指定集群的所有Pod
func getPodsForCluster(client kubernetes.Interface, clusterName string) ([]apiV1.PodItem, error) {
	// 获取Pod列表
	podList, err := client.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	pods := make([]apiV1.PodItem, 0, len(podList.Items))
	for _, pod := range podList.Items {
		podItem := apiV1.PodItem{
			ClusterName:       clusterName,
			Namespace:         pod.Namespace,
			Name:              pod.Name,
			Phase:             pod.Status.Phase,
			Status:            getPodStatus(pod),
			ReadyContainers:   getReadyContainers(pod),
			TotalContainers:   len(pod.Spec.Containers),
			CPURequest:        getPodCPURequest(pod),
			MemoryRequest:     getPodMemoryRequest(pod),
			CPULimit:          getPodCPULimit(pod),
			MemoryLimit:       getPodMemoryLimit(pod),
			RestartCount:      getPodRestartCount(pod),
			PodIP:             pod.Status.PodIP,
			NodeName:          pod.Spec.NodeName,
			CreationTimestamp: pod.CreationTimestamp,
		}
		pods = append(pods, podItem)
	}

	return pods, nil
}

// getPodStatus 获取Pod状态描述
func getPodStatus(pod v1.Pod) string {
	// 如果Pod处于Pending状态且正在拉取镜像，返回特殊状态
	if pod.Status.Phase == v1.PodPending {
		for _, containerStatus := range pod.Status.ContainerStatuses {
			if containerStatus.State.Waiting != nil && containerStatus.State.Waiting.Reason == "ImagePullBackOff" {
				return "ImagePullBackOff"
			}
		}
	}
	return string(pod.Status.Phase)
}

// getReadyContainers 计算Pod中就绪的容器数量
func getReadyContainers(pod v1.Pod) int {
	readyCount := 0
	for _, containerStatus := range pod.Status.ContainerStatuses {
		if containerStatus.Ready {
			readyCount++
		}
	}
	return readyCount
}

// getPodCPURequest 计算Pod CPU请求量(核)
func getPodCPURequest(pod v1.Pod) int64 {
	var total int64
	for _, container := range pod.Spec.Containers {
		if request := container.Resources.Requests.Cpu(); request != nil {
			total += request.MilliValue() / 1000
		}
	}
	return total
}

// getPodMemoryRequest 计算Pod内存请求量(KB)
func getPodMemoryRequest(pod v1.Pod) int64 {
	var total int64
	for _, container := range pod.Spec.Containers {
		if request := container.Resources.Requests.Memory(); request != nil {
			total += request.Value() / 1024
		}
	}
	return total
}

// getPodCPULimit 计算Pod CPU限制(核)
func getPodCPULimit(pod v1.Pod) int64 {
	var total int64
	for _, container := range pod.Spec.Containers {
		if limit := container.Resources.Limits.Cpu(); limit != nil {
			total += limit.MilliValue() / 1000
		}
	}
	return total
}

// getPodMemoryLimit 计算Pod内存限制(KB)
func getPodMemoryLimit(pod v1.Pod) int64 {
	var total int64
	for _, container := range pod.Spec.Containers {
		if limit := container.Resources.Limits.Memory(); limit != nil {
			total += limit.Value() / 1024
		}
	}
	return total
}

// getPodRestartCount 计算Pod重启次数
func getPodRestartCount(pod v1.Pod) int32 {
	var total int32
	for _, containerStatus := range pod.Status.ContainerStatuses {
		total += containerStatus.RestartCount
	}
	return total
}

// HandleGetPodSummary 处理获取Pod汇总信息的请求
func HandleGetPodSummary(c *gin.Context) {
	dataSelect := common.ParseDataSelectPathParameter(c)
	summary, err := GetPodSummary(dataSelect)
	if err != nil {
		klog.ErrorS(err, "Failed to get pod summary")
		common.Fail(c, err)
		return
	}

	common.Success(c, summary)
}
