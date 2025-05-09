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
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gin-gonic/gin"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"

	apiV1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/dataselect"
)

// GetNodeSummary 获取节点汇总信息
func GetNodeSummary(dataSelect *dataselect.DataSelectQuery) (*apiV1.NodesResponse, error) {
	// 初始化汇总结构
	response := &apiV1.NodesResponse{
		Items: []apiV1.NodeItem{},
		Summary: apiV1.NodeSummary{
			TotalNum: 0,
			ReadyNum: 0,
		},
	}

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

			// 获取该集群的节点
			nodes, err := getNodesForCluster(memberClient, clusterName)
			if err != nil {
				klog.ErrorS(err, "Failed to get nodes", "cluster", clusterName)
				return
			}

			// 加锁更新共享数据
			mu.Lock()
			defer mu.Unlock()

			// 更新全局统计信息
			response.Summary.TotalNum += int32(len(nodes))
			for _, node := range nodes {
				if node.Ready {
					response.Summary.ReadyNum++
				}
			}

			// 追加节点信息
			response.Items = append(response.Items, nodes...)
		}(cluster.Name)
	}

	// 等待所有请求完成
	wg.Wait()

	// 如果使用了数据选择器，则过滤和排序节点
	if dataSelect != nil && len(response.Items) > 0 {
		// 这里可以根据需要实现节点的排序和分页
		// 目前为简单实现，实际使用时可能需要更复杂的逻辑
	}

	return response, nil
}

// getNodesForCluster 获取指定集群的所有节点
func getNodesForCluster(client kubernetes.Interface, clusterName string) ([]apiV1.NodeItem, error) {
	// 获取节点列表
	nodeList, err := client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	nodes := make([]apiV1.NodeItem, 0, len(nodeList.Items))
	for _, node := range nodeList.Items {
		// 获取每个节点上运行的Pod数量
		podUsage, err := getPodUsageForNode(client, node.Name)
		if err != nil {
			klog.Warningf("Failed to get pod usage for node %s in cluster %s: %v", node.Name, clusterName, err)
		}

		// 获取节点的CPU和内存使用情况
		cpuUsage, memoryUsage, err := getNodeResourceUsage(client, node.Name, clusterName)
		if err != nil {
			klog.Warningf("Failed to get resource usage for node %s in cluster %s: %v", node.Name, clusterName, err)
		}

		nodeItem := apiV1.NodeItem{
			ClusterName:       clusterName,
			Name:              node.Name,
			Ready:             isNodeReady(node),
			Role:              getNodeRole(node),
			CPUCapacity:       getNodeCPUCapacity(node),
			CPUUsage:          cpuUsage, // 使用实际获取的CPU使用量
			MemoryCapacity:    getNodeMemoryCapacity(node),
			MemoryUsage:       memoryUsage, // 使用实际获取的内存使用量
			PodCapacity:       getNodePodCapacity(node),
			PodUsage:          podUsage, // 使用实际获取的Pod使用量
			Status:            getNodeStatus(node),
			Labels:            node.Labels,
			CreationTimestamp: node.CreationTimestamp,
		}
		nodes = append(nodes, nodeItem)
	}

	return nodes, nil
}

// getPodUsageForNode 获取节点上运行的Pod数量
func getPodUsageForNode(client kubernetes.Interface, nodeName string) (int64, error) {
	// 获取集群中所有Pod
	pods, err := client.CoreV1().Pods(metav1.NamespaceAll).List(context.TODO(), metav1.ListOptions{
		FieldSelector: fmt.Sprintf("spec.nodeName=%s", nodeName),
	})
	if err != nil {
		return 0, err
	}

	// 计算在该节点上运行的Pod数量
	return int64(len(pods.Items)), nil
}

// getNodeResourceUsage 获取节点的CPU和内存使用情况
func getNodeResourceUsage(client kubernetes.Interface, nodeName, clusterName string) (int64, int64, error) {
	var cpuUsage, memoryUsage int64

	// 尝试从 Metrics API 获取节点的使用情况
	// 首先尝试metrics.k8s.io API
	metricsAvailable := false
	gv := metav1.GroupVersion{Group: "metrics.k8s.io", Version: "v1beta1"}
	config := client.CoreV1().RESTClient().Get().AbsPath("apis", gv.Group, gv.Version, "nodes", nodeName)
	result := config.Do(context.TODO())
	if result.Error() == nil {
		// Metrics API 可用
		metricsAvailable = true
		var nodeMetrics map[string]interface{}
		data, err := result.Raw()
		if err != nil {
			return 0, 0, err
		}

		if err := json.Unmarshal(data, &nodeMetrics); err != nil {
			return 0, 0, err
		}

		// 解析CPU和内存使用情况
		if usage, ok := nodeMetrics["usage"].(map[string]interface{}); ok {
			if cpuStr, ok := usage["cpu"].(string); ok {
				cpuValue, err := parseCPUQuantity(cpuStr)
				if err != nil {
					klog.Warningf("Failed to parse CPU usage for node %s: %v", nodeName, err)
				} else {
					cpuUsage = cpuValue
				}
			}

			if memStr, ok := usage["memory"].(string); ok {
				memValue, err := parseMemoryQuantity(memStr)
				if err != nil {
					klog.Warningf("Failed to parse memory usage for node %s: %v", nodeName, err)
				} else {
					memoryUsage = memValue
				}
			}
		}
	}

	if !metricsAvailable {
		// 如果 Metrics API 不可用，尝试从 /metrics 端点获取
		// 注意：这需要 scrape 端点的权限，许多集群可能不允许
		klog.Warningf("Metrics API not available for node %s in cluster %s, trying to estimate usage from containers", nodeName, clusterName)

		// 尝试通过节点上运行的所有容器的请求资源来估算
		pods, err := client.CoreV1().Pods(metav1.NamespaceAll).List(context.TODO(), metav1.ListOptions{
			FieldSelector: fmt.Sprintf("spec.nodeName=%s,status.phase=Running", nodeName),
		})
		if err != nil {
			return 0, 0, err
		}

		// 累加所有pod的CPU和内存请求
		for _, pod := range pods.Items {
			for _, container := range pod.Spec.Containers {
				if cpu := container.Resources.Requests.Cpu(); cpu != nil {
					cpuUsage += cpu.MilliValue() / 1000
				}
				if mem := container.Resources.Requests.Memory(); mem != nil {
					memoryUsage += mem.Value() / 1024
				}
			}
		}
	}

	return cpuUsage, memoryUsage, nil
}

// parseCPUQuantity 解析CPU数量字符串
func parseCPUQuantity(cpuStr string) (int64, error) {
	quantity, err := resource.ParseQuantity(cpuStr)
	if err != nil {
		return 0, err
	}
	return quantity.MilliValue() / 1000, nil // 转换为核心数
}

// parseMemoryQuantity 解析内存数量字符串
func parseMemoryQuantity(memStr string) (int64, error) {
	quantity, err := resource.ParseQuantity(memStr)
	if err != nil {
		return 0, err
	}
	return quantity.Value() / 1024, nil // 转换为KiB
}

// isNodeReady 检查节点是否就绪
func isNodeReady(node v1.Node) bool {
	for _, condition := range node.Status.Conditions {
		if condition.Type == v1.NodeReady && condition.Status == v1.ConditionTrue {
			return true
		}
	}
	return false
}

// getNodeRole 获取节点角色
func getNodeRole(node v1.Node) string {
	if _, isMaster := node.Labels["node-role.kubernetes.io/master"]; isMaster {
		return "master"
	}
	if _, isControl := node.Labels["node-role.kubernetes.io/control-plane"]; isControl {
		return "master"
	}
	return "worker"
}

// getNodeCPUCapacity 获取节点CPU容量(核)
func getNodeCPUCapacity(node v1.Node) int64 {
	if cpu := node.Status.Capacity.Cpu(); cpu != nil {
		return cpu.MilliValue() / 1000
	}
	return 0
}

// getNodeMemoryCapacity 获取节点内存容量(KB)
func getNodeMemoryCapacity(node v1.Node) int64 {
	if mem := node.Status.Capacity.Memory(); mem != nil {
		return mem.Value() / 1024
	}
	return 0
}

// getNodePodCapacity 获取节点Pod容量
func getNodePodCapacity(node v1.Node) int64 {
	if pods := node.Status.Capacity.Pods(); pods != nil {
		return pods.Value()
	}
	return 0
}

// getNodeStatus 获取节点状态
func getNodeStatus(node v1.Node) string {
	for _, condition := range node.Status.Conditions {
		if condition.Type == v1.NodeReady {
			if condition.Status == v1.ConditionTrue {
				return "Ready"
			}
			return string(condition.Reason)
		}
	}
	return "Unknown"
}

// HandleGetNodeSummary 处理获取节点汇总信息的请求
func HandleGetNodeSummary(c *gin.Context) {
	dataSelect := common.ParseDataSelectPathParameter(c)
	summary, err := GetNodeSummary(dataSelect)
	if err != nil {
		klog.ErrorS(err, "Failed to get node summary")
		common.Fail(c, err)
		return
	}

	common.Success(c, summary)
}
