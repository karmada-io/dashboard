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

package topology

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/klog/v2"

	clusterv1alpha1 "github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
)

// 支持的资源类型GVR
var supportedResources = map[string]schema.GroupVersionResource{
	"Deployment": {
		Group:    "apps",
		Version:  "v1",
		Resource: "deployments",
	},
	"Pod": {
		Group:    "",
		Version:  "v1",
		Resource: "pods",
	},
	"Service": {
		Group:    "",
		Version:  "v1",
		Resource: "services",
	},
	"Node": {
		Group:    "",
		Version:  "v1",
		Resource: "nodes",
	},
	"StatefulSet": {
		Group:    "apps",
		Version:  "v1",
		Resource: "statefulsets",
	},
	"DaemonSet": {
		Group:    "apps",
		Version:  "v1",
		Resource: "daemonsets",
	},
}

// GetTopologyData 获取整个Karmada拓扑图数据
func GetTopologyData(showResources, showNodes, showPods bool) (*v1.TopologyData, error) {
	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()
	ctx := context.TODO()

	// 初始化拓扑图数据
	topologyData := &v1.TopologyData{
		Nodes: []v1.TopologyNode{},
		Edges: []v1.TopologyEdge{},
		Summary: &v1.TopologySummary{
			ResourceDistribution: make(map[string]int),
		},
	}

	// 添加Karmada控制平面节点
	controlPlaneNode := v1.TopologyNode{
		ID:       "karmada-control-plane",
		Name:     "Karmada控制平面",
		Type:     "control-plane",
		Status:   "ready",
		ParentID: "",
	}
	topologyData.Nodes = append(topologyData.Nodes, controlPlaneNode)

	// 获取所有集群
	clusterList, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster list")
		return nil, err
	}

	// 初始化统计信息
	topologyData.Summary.TotalClusters = len(clusterList.Items)
	topologyData.Summary.TotalNodes = 0
	topologyData.Summary.TotalPods = 0

	// 并发处理每个集群
	var wg sync.WaitGroup
	var mu sync.Mutex
	clusterNodeMap := make(map[string][]v1.TopologyNode)
	clusterEdgeMap := make(map[string][]v1.TopologyEdge)

	for i := range clusterList.Items {
		cluster := &clusterList.Items[i]
		wg.Add(1)

		go func(c *clusterv1alpha1.Cluster) {
			defer wg.Done()

			// 处理单个集群
			clusterNodes, clusterEdges, clusterStats, err := processCluster(c, showResources, showNodes, showPods)
			if err != nil {
				klog.ErrorS(err, "Failed to process cluster", "cluster", c.Name)
				return
			}

			// 安全地更新共享数据
			mu.Lock()
			defer mu.Unlock()

			// 存储集群的节点和边
			clusterNodeMap[c.Name] = clusterNodes
			clusterEdgeMap[c.Name] = clusterEdges

			// 更新统计信息
			topologyData.Summary.TotalNodes += clusterStats.TotalNodes
			topologyData.Summary.TotalPods += clusterStats.TotalPods

			// 更新资源分布
			for resourceType, count := range clusterStats.ResourceDistribution {
				topologyData.Summary.ResourceDistribution[resourceType] += count
			}
		}(cluster)
	}

	// 等待所有集群处理完成
	wg.Wait()

	// 添加集群节点到拓扑图
	for _, cluster := range clusterList.Items {
		// 创建集群节点
		clusterNode := createClusterNode(&cluster)
		topologyData.Nodes = append(topologyData.Nodes, clusterNode)

		// 添加从控制平面到集群的边
		controlToClusterEdge := v1.TopologyEdge{
			ID:     fmt.Sprintf("edge-control-to-%s", cluster.Name),
			Source: controlPlaneNode.ID,
			Target: clusterNode.ID,
			Type:   "control",
			Value:  1,
		}
		topologyData.Edges = append(topologyData.Edges, controlToClusterEdge)

		// 添加集群的节点和边
		if nodes, ok := clusterNodeMap[cluster.Name]; ok {
			topologyData.Nodes = append(topologyData.Nodes, nodes...)
		}
		if edges, ok := clusterEdgeMap[cluster.Name]; ok {
			topologyData.Edges = append(topologyData.Edges, edges...)
		}
	}

	return topologyData, nil
}

// GetClusterTopologyData 获取特定集群的拓扑图数据
func GetClusterTopologyData(clusterName string, showResources, showNodes, showPods bool) (*v1.TopologyData, error) {
	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()
	ctx := context.TODO()

	// 获取指定的集群
	cluster, err := karmadaClient.ClusterV1alpha1().Clusters().Get(ctx, clusterName, metav1.GetOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster", "cluster", clusterName)
		return nil, err
	}

	// 初始化拓扑图数据
	topologyData := &v1.TopologyData{
		Nodes: []v1.TopologyNode{},
		Edges: []v1.TopologyEdge{},
		Summary: &v1.TopologySummary{
			TotalClusters:        1,
			ResourceDistribution: make(map[string]int),
		},
	}

	// 添加Karmada控制平面节点
	controlPlaneNode := v1.TopologyNode{
		ID:       "karmada-control-plane",
		Name:     "Karmada控制平面",
		Type:     "control-plane",
		Status:   "ready",
		ParentID: "",
	}
	topologyData.Nodes = append(topologyData.Nodes, controlPlaneNode)

	// 创建集群节点
	clusterNode := createClusterNode(cluster)
	topologyData.Nodes = append(topologyData.Nodes, clusterNode)

	// 添加从控制平面到集群的边
	controlToClusterEdge := v1.TopologyEdge{
		ID:     fmt.Sprintf("edge-control-to-%s", cluster.Name),
		Source: controlPlaneNode.ID,
		Target: clusterNode.ID,
		Type:   "control",
		Value:  1,
	}
	topologyData.Edges = append(topologyData.Edges, controlToClusterEdge)

	// 处理集群内部的节点、Pod和资源
	clusterNodes, clusterEdges, clusterStats, err := processCluster(cluster, showResources, showNodes, showPods)
	if err != nil {
		klog.ErrorS(err, "Failed to process cluster", "cluster", cluster.Name)
		return nil, err
	}

	// 添加集群内部的节点和边
	topologyData.Nodes = append(topologyData.Nodes, clusterNodes...)
	topologyData.Edges = append(topologyData.Edges, clusterEdges...)

	// 更新统计信息
	topologyData.Summary.TotalNodes = clusterStats.TotalNodes
	topologyData.Summary.TotalPods = clusterStats.TotalPods
	topologyData.Summary.ResourceDistribution = clusterStats.ResourceDistribution

	return topologyData, nil
}

// 处理单个集群的拓扑信息
func processCluster(cluster *clusterv1alpha1.Cluster, showResources, showNodes, showPods bool) ([]v1.TopologyNode, []v1.TopologyEdge, *v1.TopologySummary, error) {
	var nodes []v1.TopologyNode
	var edges []v1.TopologyEdge
	summary := &v1.TopologySummary{
		TotalNodes:           0,
		TotalPods:            0,
		ResourceDistribution: make(map[string]int),
	}

	// 获取集群客户端
	kubeClient := client.InClusterClientForMemberCluster(cluster.Name)
	if kubeClient == nil {
		return nil, nil, nil, fmt.Errorf("failed to get client for cluster %s", cluster.Name)
	}

	// 创建动态客户端
	config, err := client.GetMemberConfig()
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to get member config for cluster %s: %v", cluster.Name, err)
	}

	// 修改配置以指向特定集群
	restConfig := rest.CopyConfig(config)
	karmadaConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to get karmada config for cluster %s: %v", cluster.Name, err)
	}
	proxyURL := "/apis/cluster.karmada.io/v1alpha1/clusters/%s/proxy/"
	restConfig.Host = karmadaConfig.Host + fmt.Sprintf(proxyURL, cluster.Name)

	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to create dynamic client for cluster %s: %v", cluster.Name, err)
	}

	// 获取节点信息
	if showNodes {
		nodeList, err := dynamicClient.Resource(supportedResources["Node"]).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			klog.ErrorS(err, "Failed to get nodes", "cluster", cluster.Name)
		} else {
			summary.TotalNodes = len(nodeList.Items)

			// 处理每个节点
			for _, nodeObj := range nodeList.Items {
				nodeName, _, _ := unstructured.NestedString(nodeObj.Object, "metadata", "name")
				if nodeName == "" {
					continue
				}

				// 获取节点状态
				nodeStatus := "notready"
				conditions, _, _ := unstructured.NestedSlice(nodeObj.Object, "status", "conditions")
				for _, condObj := range conditions {
					cond, ok := condObj.(map[string]interface{})
					if !ok {
						continue
					}
					condType, _, _ := unstructured.NestedString(cond, "type")
					condStatus, _, _ := unstructured.NestedString(cond, "status")
					if condType == "Ready" && condStatus == "True" {
						nodeStatus = "ready"
						break
					}
				}

				// 创建节点资源使用情况
				nodeResources := &v1.NodeResources{}

				// 获取CPU资源
				allocatableCPU, _, _ := unstructured.NestedString(nodeObj.Object, "status", "allocatable", "cpu")
				capacityCPU, _, _ := unstructured.NestedString(nodeObj.Object, "status", "capacity", "cpu")
				if allocatableCPU != "" && capacityCPU != "" {
					nodeResources.CPU = &v1.ResourceUsage{
						Used:      allocatableCPU,
						Total:     capacityCPU,
						UsageRate: 0, // 需要计算实际使用率
					}
				}

				// 获取内存资源
				allocatableMemory, _, _ := unstructured.NestedString(nodeObj.Object, "status", "allocatable", "memory")
				capacityMemory, _, _ := unstructured.NestedString(nodeObj.Object, "status", "capacity", "memory")
				if allocatableMemory != "" && capacityMemory != "" {
					nodeResources.Memory = &v1.ResourceUsage{
						Used:      allocatableMemory,
						Total:     capacityMemory,
						UsageRate: 0, // 需要计算实际使用率
					}
				}

				// 获取Pod资源
				allocatablePods, _, _ := unstructured.NestedString(nodeObj.Object, "status", "allocatable", "pods")
				capacityPods, _, _ := unstructured.NestedString(nodeObj.Object, "status", "capacity", "pods")
				if allocatablePods != "" && capacityPods != "" {
					nodeResources.Pods = &v1.ResourceUsage{
						Used:      allocatablePods,
						Total:     capacityPods,
						UsageRate: 0, // 需要计算实际使用率
					}
				}

				// 获取节点标签
				nodeLabels := make(map[string]string)
				labels, _, _ := unstructured.NestedMap(nodeObj.Object, "metadata", "labels")
				for k, v := range labels {
					if strVal, ok := v.(string); ok {
						nodeLabels[k] = strVal
					}
				}

				// 创建节点
				nodeID := fmt.Sprintf("node-%s-%s", cluster.Name, nodeName)
				node := v1.TopologyNode{
					ID:        nodeID,
					Name:      nodeName,
					Type:      "node",
					Status:    nodeStatus,
					ParentID:  cluster.Name,
					Resources: nodeResources,
					Labels:    nodeLabels,
				}
				nodes = append(nodes, node)

				// 添加从集群到节点的边
				clusterToNodeEdge := v1.TopologyEdge{
					ID:     fmt.Sprintf("edge-%s-to-%s", cluster.Name, nodeID),
					Source: cluster.Name,
					Target: nodeID,
					Type:   "control",
					Value:  1,
				}
				edges = append(edges, clusterToNodeEdge)

				// 如果需要显示Pod，则获取该节点上的Pod
				if showPods {
					fieldSelector := fmt.Sprintf("spec.nodeName=%s", nodeName)
					podList, err := dynamicClient.Resource(supportedResources["Pod"]).Namespace(metav1.NamespaceAll).List(context.TODO(), metav1.ListOptions{
						FieldSelector: fieldSelector,
					})
					if err != nil {
						klog.ErrorS(err, "Failed to get pods for node", "cluster", cluster.Name, "node", nodeName)
						continue
					}

					// 处理每个Pod
					for _, podObj := range podList.Items {
						podName, _, _ := unstructured.NestedString(podObj.Object, "metadata", "name")
						podNamespace, _, _ := unstructured.NestedString(podObj.Object, "metadata", "namespace")
						if podName == "" {
							continue
						}

						// 获取Pod状态
						podStatus := "notready"
						phase, _, _ := unstructured.NestedString(podObj.Object, "status", "phase")
						if phase == "Running" {
							podStatus = "ready"
						}

						// 创建Pod节点
						podID := fmt.Sprintf("pod-%s-%s-%s", cluster.Name, podNamespace, podName)
						pod := v1.TopologyNode{
							ID:       podID,
							Name:     podName,
							Type:     "pod",
							Status:   podStatus,
							ParentID: nodeID,
							Metadata: map[string]interface{}{
								"namespace": podNamespace,
								"phase":     phase,
							},
						}
						nodes = append(nodes, pod)

						// 添加从节点到Pod的边
						nodeToPodEdge := v1.TopologyEdge{
							ID:     fmt.Sprintf("edge-%s-to-%s", nodeID, podID),
							Source: nodeID,
							Target: podID,
							Type:   "schedule",
							Value:  1,
						}
						edges = append(edges, nodeToPodEdge)

						// 更新Pod计数
						summary.TotalPods++
					}
				}
			}
		}
	}

	// 获取资源信息
	if showResources {
		// 获取Deployment资源
		deployList, err := dynamicClient.Resource(supportedResources["Deployment"]).Namespace(metav1.NamespaceAll).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			klog.ErrorS(err, "Failed to get deployments", "cluster", cluster.Name)
		} else {
			summary.ResourceDistribution["Deployment"] = len(deployList.Items)
		}

		// 获取Service资源
		serviceList, err := dynamicClient.Resource(supportedResources["Service"]).Namespace(metav1.NamespaceAll).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			klog.ErrorS(err, "Failed to get services", "cluster", cluster.Name)
		} else {
			summary.ResourceDistribution["Service"] = len(serviceList.Items)
		}

		// 获取StatefulSet资源
		statefulSetList, err := dynamicClient.Resource(supportedResources["StatefulSet"]).Namespace(metav1.NamespaceAll).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			klog.ErrorS(err, "Failed to get statefulsets", "cluster", cluster.Name)
		} else {
			summary.ResourceDistribution["StatefulSet"] = len(statefulSetList.Items)
		}

		// 获取DaemonSet资源
		daemonSetList, err := dynamicClient.Resource(supportedResources["DaemonSet"]).Namespace(metav1.NamespaceAll).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			klog.ErrorS(err, "Failed to get daemonsets", "cluster", cluster.Name)
		} else {
			summary.ResourceDistribution["DaemonSet"] = len(daemonSetList.Items)
		}

		// 如果不显示Pod，则单独获取Pod数量
		if !showPods {
			podList, err := dynamicClient.Resource(supportedResources["Pod"]).Namespace(metav1.NamespaceAll).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				klog.ErrorS(err, "Failed to get pods", "cluster", cluster.Name)
			} else {
				summary.TotalPods = len(podList.Items)
				summary.ResourceDistribution["Pod"] = len(podList.Items)
			}
		}
	}

	return nodes, edges, summary, nil
}

// 创建集群节点
func createClusterNode(cluster *clusterv1alpha1.Cluster) v1.TopologyNode {
	// 确定集群状态
	clusterStatus := "notready"
	for _, condition := range cluster.Status.Conditions {
		if condition.Type == clusterv1alpha1.ClusterConditionReady && condition.Status == metav1.ConditionTrue {
			clusterStatus = "ready"
			break
		}
	}

	// 获取集群标签
	clusterLabels := make(map[string]string)
	for k, v := range cluster.Labels {
		clusterLabels[k] = v
	}

	// 创建资源使用情况
	clusterResources := &v1.NodeResources{}

	// 如果有资源信息，则填充
	if cluster.Status.ResourceSummary != nil {
		// CPU资源
		if cluster.Status.ResourceSummary.Allocatable != nil && cluster.Status.ResourceSummary.Allocatable.Cpu() != nil {
			allocatableCPU := cluster.Status.ResourceSummary.Allocatable.Cpu().String()
			// 使用Allocated作为已分配资源
			cpuUsage := "0"
			if cluster.Status.ResourceSummary.Allocated != nil && cluster.Status.ResourceSummary.Allocated.Cpu() != nil {
				cpuUsage = cluster.Status.ResourceSummary.Allocated.Cpu().String()
			}
			clusterResources.CPU = &v1.ResourceUsage{
				Used:      cpuUsage,
				Total:     allocatableCPU,
				UsageRate: calculateResourceUsageRate(cpuUsage, allocatableCPU),
			}
		}

		// 内存资源
		if cluster.Status.ResourceSummary.Allocatable != nil && cluster.Status.ResourceSummary.Allocatable.Memory() != nil {
			allocatableMemory := cluster.Status.ResourceSummary.Allocatable.Memory().String()
			memoryUsage := "0"
			if cluster.Status.ResourceSummary.Allocated != nil && cluster.Status.ResourceSummary.Allocated.Memory() != nil {
				memoryUsage = cluster.Status.ResourceSummary.Allocated.Memory().String()
			}
			clusterResources.Memory = &v1.ResourceUsage{
				Used:      memoryUsage,
				Total:     allocatableMemory,
				UsageRate: calculateResourceUsageRate(memoryUsage, allocatableMemory),
			}
		}

		// Pod资源
		if cluster.Status.ResourceSummary.Allocatable != nil && cluster.Status.ResourceSummary.Allocatable.Pods() != nil {
			allocatablePods := cluster.Status.ResourceSummary.Allocatable.Pods().String()
			podsUsage := "0"
			if cluster.Status.ResourceSummary.Allocated != nil && cluster.Status.ResourceSummary.Allocated.Pods() != nil {
				podsUsage = cluster.Status.ResourceSummary.Allocated.Pods().String()
			}
			clusterResources.Pods = &v1.ResourceUsage{
				Used:      podsUsage,
				Total:     allocatablePods,
				UsageRate: calculateResourceUsageRate(podsUsage, allocatablePods),
			}
		}
	}

	return v1.TopologyNode{
		ID:        cluster.Name,
		Name:      cluster.Name,
		Type:      "cluster",
		Status:    clusterStatus,
		ParentID:  "karmada-control-plane",
		Resources: clusterResources,
		Labels:    clusterLabels,
		Metadata: map[string]interface{}{
			"apiEndpoint": cluster.Spec.APIEndpoint,
			"syncMode":    cluster.Spec.SyncMode,
		},
	}
}

// 计算资源使用率
func calculateResourceUsageRate(used, total string) float64 {
	// 解析资源字符串
	usedValue, err := parseResourceValue(used)
	if err != nil {
		return 0
	}

	totalValue, err := parseResourceValue(total)
	if err != nil || totalValue == 0 {
		return 0
	}

	return usedValue / totalValue * 100
}

// 解析资源值
func parseResourceValue(resource string) (float64, error) {
	// 移除单位
	resource = strings.TrimRight(resource, "mKMGTPEi")
	return strconv.ParseFloat(resource, 64)
}

// 获取集群的资源使用情况
func getClusterResourceUsage(cluster *clusterv1alpha1.Cluster) (*v1.NodeResources, error) {
	// 创建资源使用情况
	resources := &v1.NodeResources{}

	// 获取集群客户端
	config, err := client.GetMemberConfig()
	if err != nil {
		return nil, err
	}

	// 修改配置以指向特定集群
	restConfig := rest.CopyConfig(config)
	karmadaConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get karmada config: %v", err)
	}
	proxyURL := "/apis/cluster.karmada.io/v1alpha1/clusters/%s/proxy/"
	restConfig.Host = karmadaConfig.Host + fmt.Sprintf(proxyURL, cluster.Name)

	kubeClient, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, err
	}

	// 获取节点列表
	nodeList, err := kubeClient.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// 计算总资源和已使用资源
	var totalCPU, usedCPU int64
	var totalMemory, usedMemory int64
	var totalPods, usedPods int64

	// 遍历所有节点
	for _, node := range nodeList.Items {
		// 获取节点容量
		nodeTotalCPU := node.Status.Capacity.Cpu().MilliValue()
		nodeTotalMemory := node.Status.Capacity.Memory().Value()
		nodeTotalPods := node.Status.Capacity.Pods().Value()

		// 累加总资源
		totalCPU += nodeTotalCPU
		totalMemory += nodeTotalMemory
		totalPods += nodeTotalPods

		// 获取Pod列表
		fieldSelector := fmt.Sprintf("spec.nodeName=%s", node.Name)
		podList, err := kubeClient.CoreV1().Pods(metav1.NamespaceAll).List(context.TODO(), metav1.ListOptions{
			FieldSelector: fieldSelector,
		})
		if err != nil {
			continue
		}

		// 计算已使用资源
		for _, pod := range podList.Items {
			if pod.Status.Phase != corev1.PodRunning && pod.Status.Phase != corev1.PodPending {
				continue
			}

			// 累加Pod数量
			usedPods++

			// 累加CPU和内存使用量
			for _, container := range pod.Spec.Containers {
				usedCPU += container.Resources.Requests.Cpu().MilliValue()
				usedMemory += container.Resources.Requests.Memory().Value()
			}
		}
	}

	// 设置CPU使用情况
	resources.CPU = &v1.ResourceUsage{
		Used:      fmt.Sprintf("%dm", usedCPU),
		Total:     fmt.Sprintf("%dm", totalCPU),
		UsageRate: float64(usedCPU) / float64(totalCPU) * 100,
	}

	// 设置内存使用情况
	resources.Memory = &v1.ResourceUsage{
		Used:      fmt.Sprintf("%dMi", usedMemory/(1024*1024)),
		Total:     fmt.Sprintf("%dMi", totalMemory/(1024*1024)),
		UsageRate: float64(usedMemory) / float64(totalMemory) * 100,
	}

	// 设置Pod使用情况
	resources.Pods = &v1.ResourceUsage{
		Used:      fmt.Sprintf("%d", usedPods),
		Total:     fmt.Sprintf("%d", totalPods),
		UsageRate: float64(usedPods) / float64(totalPods) * 100,
	}

	return resources, nil
}
