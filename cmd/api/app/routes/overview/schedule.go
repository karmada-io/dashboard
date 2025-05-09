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
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/klog/v2"

	clusterv1alpha1 "github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	policyv1alpha1 "github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
)

// 资源类型分组映射
var resourceGroupMap = map[string]string{
	// 工作负载
	"Deployment":            "Workloads",
	"StatefulSet":           "Workloads",
	"DaemonSet":             "Workloads",
	"Job":                   "Workloads",
	"CronJob":               "Workloads",
	"Pod":                   "Workloads",
	"ReplicaSet":            "Workloads",
	"ReplicationController": "Workloads",

	// 网络
	"Service":       "Network",
	"Ingress":       "Network",
	"NetworkPolicy": "Network",

	// 存储
	"PersistentVolume":      "Storage",
	"PersistentVolumeClaim": "Storage",
	"StorageClass":          "Storage",

	// 配置
	"ConfigMap": "Configuration",
	"Secret":    "Configuration",

	// 其他类型
	"CustomResourceDefinition": "CustomResources",
}

// 添加常用资源类型的GVR映射表
var supportedResources = map[string]schema.GroupVersionResource{
	"Deployment": {
		Group:    "apps",
		Version:  "v1",
		Resource: "deployments",
	},
	"Service": {
		Group:    "",
		Version:  "v1",
		Resource: "services",
	},
	"Pod": {
		Group:    "",
		Version:  "v1",
		Resource: "pods",
	},
	"ConfigMap": {
		Group:    "",
		Version:  "v1",
		Resource: "configmaps",
	},
	"Secret": {
		Group:    "",
		Version:  "v1",
		Resource: "secrets",
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
	"Ingress": {
		Group:    "networking.k8s.io",
		Version:  "v1",
		Resource: "ingresses",
	},
	"Job": {
		Group:    "batch",
		Version:  "v1",
		Resource: "jobs",
	},
	"CronJob": {
		Group:    "batch",
		Version:  "v1",
		Resource: "cronjobs",
	},
	"PersistentVolumeClaim": {
		Group:    "",
		Version:  "v1",
		Resource: "persistentvolumeclaims",
	},
}

// 获取资源类型的分组
func getResourceGroup(kind string) string {
	if group, ok := resourceGroupMap[kind]; ok {
		return group
	}
	return "Others"
}

// findPropagationPolicyForResource 查找与资源匹配的传播策略
func findPropagationPolicyForResource(ctx context.Context, karmadaClient karmadaclientset.Interface, namespace, name, kind string) (string, map[string]int32, error) {
	// 获取所有PropagationPolicy
	policyList, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(metav1.NamespaceAll).List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get propagation policies")
		return "", nil, err
	}

	// 初始化集群权重映射
	clusterWeights := make(map[string]int32)

	// 检查每个策略是否匹配该资源
	for _, policy := range policyList.Items {
		if policy.Namespace != namespace && namespace != "" {
			continue
		}

		for _, rs := range policy.Spec.ResourceSelectors {
			if rs.Kind == kind && (rs.Name == name || rs.Name == "") {
				// 找到匹配的策略，获取集群权重
				if policy.Spec.Placement.ReplicaScheduling != nil && policy.Spec.Placement.ReplicaScheduling.ReplicaDivisionPreference == policyv1alpha1.ReplicaDivisionPreferenceWeighted {
					// 如果使用加权调度，则获取每个集群的权重
					if len(policy.Spec.Placement.ReplicaScheduling.WeightPreference.StaticWeightList) > 0 {
						for _, staticWeight := range policy.Spec.Placement.ReplicaScheduling.WeightPreference.StaticWeightList {
							// ClusterAffinity是一个结构体，需要进一步处理来获取集群名称
							if staticWeight.TargetCluster.ClusterNames != nil && len(staticWeight.TargetCluster.ClusterNames) > 0 {
								for _, clusterName := range staticWeight.TargetCluster.ClusterNames {
									clusterWeights[clusterName] = int32(staticWeight.Weight)
								}
							}
						}
					}
				}
				return policy.Name, clusterWeights, nil
			}
		}
	}

	// 查找ClusterPropagationPolicy
	clusterPolicyList, err := karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster propagation policies")
		return "", nil, err
	}

	for _, policy := range clusterPolicyList.Items {
		for _, rs := range policy.Spec.ResourceSelectors {
			if rs.Kind == kind && (rs.Name == name || rs.Name == "") {
				// 找到匹配的策略，获取集群权重
				if policy.Spec.Placement.ReplicaScheduling != nil && policy.Spec.Placement.ReplicaScheduling.ReplicaDivisionPreference == policyv1alpha1.ReplicaDivisionPreferenceWeighted {
					// 如果使用加权调度，则获取每个集群的权重
					if len(policy.Spec.Placement.ReplicaScheduling.WeightPreference.StaticWeightList) > 0 {
						for _, staticWeight := range policy.Spec.Placement.ReplicaScheduling.WeightPreference.StaticWeightList {
							// ClusterAffinity是一个结构体，需要进一步处理来获取集群名称
							if staticWeight.TargetCluster.ClusterNames != nil && len(staticWeight.TargetCluster.ClusterNames) > 0 {
								for _, clusterName := range staticWeight.TargetCluster.ClusterNames {
									clusterWeights[clusterName] = int32(staticWeight.Weight)
								}
							}
						}
					}
				}
				return policy.Name, clusterWeights, nil
			}
		}
	}

	return "", clusterWeights, nil
}

// 在ActualResourceTypeDistribution结构中添加调度策略信息
type ResourceSchedulingInfo struct {
	// 资源名称
	ResourceName string `json:"resourceName"`
	// 命名空间
	Namespace string `json:"namespace"`
	// 调度策略名称
	PropagationPolicy string `json:"propagationPolicy"`
	// 集群权重映射 (集群名称 -> 权重值)
	ClusterWeights map[string]int32 `json:"clusterWeights"`
	// 集群分布情况
	ClusterDist []v1.ActualClusterDistribution `json:"clusterDist"`
	// 实际部署总数
	ActualCount int `json:"actualCount"`
	// 调度计划总数
	ScheduledCount int `json:"scheduledCount"`
}

// GetClusterSchedulePreview 获取集群调度预览信息
func GetClusterSchedulePreview() (*v1.SchedulePreviewResponse, error) {
	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()
	ctx := context.TODO()

	// 初始化响应结构
	response := &v1.SchedulePreviewResponse{
		Nodes: []v1.ScheduleNode{
			{
				ID:   "karmada-control-plane",
				Name: "Karmada控制平面",
				Type: "control-plane",
			},
		},
		Links:        []v1.ScheduleLink{},
		ResourceDist: []v1.ResourceTypeDistribution{},
	}

	// 获取所有集群
	clusterList, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster list")
		return nil, err
	}

	// 为每个集群创建节点
	for _, cluster := range clusterList.Items {
		// 收集集群的调度参数
		schedulingParams := &v1.SchedulingParams{
			Labels: make(map[string]string),
		}

		// 从注解中获取集群权重（默认为1）
		schedulingParams.Weight = 1
		if weightStr, exists := cluster.Annotations["scheduling.karmada.io/weight"]; exists {
			if weight, err := strconv.ParseInt(weightStr, 10, 32); err == nil {
				schedulingParams.Weight = int32(weight)
			}
		}

		// 从集群注解获取污点信息
		// 注：实际实现中可能需要从其他地方获取污点信息
		taints := []v1.Taint{}
		for k, v := range cluster.Annotations {
			if strings.HasPrefix(k, "taint.karmada.io/") {
				// 简单解析，实际环境中可能需要更复杂的逻辑
				key := strings.TrimPrefix(k, "taint.karmada.io/")
				parts := strings.Split(v, ":")
				effect := "NoSchedule" // 默认
				value := ""

				if len(parts) > 0 {
					value = parts[0]
				}
				if len(parts) > 1 {
					effect = parts[1]
				}

				taints = append(taints, v1.Taint{
					Key:    key,
					Value:  value,
					Effect: effect,
				})
			}
		}
		schedulingParams.Taints = taints

		// 获取集群标签
		if len(cluster.Labels) > 0 {
			for k, v := range cluster.Labels {
				schedulingParams.Labels[k] = v
			}
		}

		response.Nodes = append(response.Nodes, v1.ScheduleNode{
			ID:               cluster.Name,
			Name:             cluster.Name,
			Type:             "member-cluster",
			SchedulingParams: schedulingParams,
		})
	}

	// 获取资源绑定信息
	resourceBindings, err := karmadaClient.WorkV1alpha2().ResourceBindings(metav1.NamespaceAll).List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get resource bindings")
		return nil, err
	}

	clusterResourceBindings, err := karmadaClient.WorkV1alpha2().ClusterResourceBindings().List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster resource bindings")
		return nil, err
	}

	// 资源类型统计 - 从绑定中获取的调度信息
	scheduledResourceMap := make(map[string]map[string]int)
	// 存储资源类型对应的资源名称
	resourceTypeToNameMap := make(map[string][]string)
	// 实际部署的资源统计
	actualResourceMap := make(map[string]map[string]int)

	// 存储资源详细调度信息
	resourceSchedulingMap := make(map[string]map[string]*ResourceSchedulingInfo)

	// 收集各资源类型对应的资源名称
	for _, binding := range resourceBindings.Items {
		resourceType := binding.Spec.Resource.Kind
		resourceName := binding.Spec.Resource.Name
		if resourceName != "" {
			// 如果该类型还没有初始化映射，则先初始化
			if _, exists := resourceTypeToNameMap[resourceType]; !exists {
				resourceTypeToNameMap[resourceType] = []string{}
			}
			// 检查资源名称是否已存在，避免重复
			nameExists := false
			for _, existingName := range resourceTypeToNameMap[resourceType] {
				if existingName == resourceName {
					nameExists = true
					break
				}
			}
			if !nameExists {
				resourceTypeToNameMap[resourceType] = append(resourceTypeToNameMap[resourceType], resourceName)
			}
		}
	}

	// 处理集群级资源
	for _, binding := range clusterResourceBindings.Items {
		resourceType := binding.Spec.Resource.Kind
		resourceName := binding.Spec.Resource.Name
		if resourceName != "" {
			// 如果该类型还没有初始化映射，则先初始化
			if _, exists := resourceTypeToNameMap[resourceType]; !exists {
				resourceTypeToNameMap[resourceType] = []string{}
			}
			// 检查资源名称是否已存在，避免重复
			nameExists := false
			for _, existingName := range resourceTypeToNameMap[resourceType] {
				if existingName == resourceName {
					nameExists = true
					break
				}
			}
			if !nameExists {
				resourceTypeToNameMap[resourceType] = append(resourceTypeToNameMap[resourceType], resourceName)
			}
		}
	}

	// 处理资源绑定 - 获取调度信息
	for _, binding := range resourceBindings.Items {
		resourceKind := binding.Spec.Resource.Kind
		resourceName := binding.Spec.Resource.Name
		resourceNamespace := binding.Spec.Resource.Namespace

		if resourceName == "" {
			continue
		}

		// 将资源添加到类型统计
		if _, ok := scheduledResourceMap[resourceKind]; !ok {
			scheduledResourceMap[resourceKind] = make(map[string]int)
		}

		// 查找匹配的传播策略
		policyName, clusterWeights, _ := findPropagationPolicyForResource(ctx, karmadaClient, resourceNamespace, resourceName, resourceKind)

		// 资源唯一标识符
		resourceKey := fmt.Sprintf("%s/%s/%s", resourceNamespace, resourceKind, resourceName)

		// 初始化资源类型映射
		if _, ok := resourceSchedulingMap[resourceKind]; !ok {
			resourceSchedulingMap[resourceKind] = make(map[string]*ResourceSchedulingInfo)
		}

		// 初始化资源信息
		if _, ok := resourceSchedulingMap[resourceKind][resourceKey]; !ok {
			resourceSchedulingMap[resourceKind][resourceKey] = &ResourceSchedulingInfo{
				ResourceName:      resourceName,
				Namespace:         resourceNamespace,
				PropagationPolicy: policyName,
				ClusterWeights:    clusterWeights,
				ClusterDist:       []v1.ActualClusterDistribution{},
				ActualCount:       0,
				ScheduledCount:    0,
			}
		}

		// 为每个集群绑定记录调度信息
		for _, cluster := range binding.Spec.Clusters {
			clusterName := cluster.Name
			replicaCount := cluster.Replicas

			// 增加资源类型统计
			scheduledResourceMap[resourceKind][clusterName] += int(replicaCount)

			// 增加调度计数
			found := false
			for i, dist := range resourceSchedulingMap[resourceKind][resourceKey].ClusterDist {
				if dist.ClusterName == clusterName {
					dist.ScheduledCount += int(replicaCount)
					resourceSchedulingMap[resourceKind][resourceKey].ClusterDist[i] = dist
					found = true
					break
				}
			}

			if !found {
				// 添加新的集群分布记录
				resourceSchedulingMap[resourceKind][resourceKey].ClusterDist = append(
					resourceSchedulingMap[resourceKind][resourceKey].ClusterDist,
					v1.ActualClusterDistribution{
						ClusterName:    clusterName,
						ScheduledCount: int(replicaCount),
						ActualCount:    0,
						Status: v1.ResourceDeploymentStatus{
							Scheduled:      true,
							Actual:         false,
							ScheduledCount: int(replicaCount),
							ActualCount:    0,
						},
					},
				)
			}

			// 增加总调度计数
			resourceSchedulingMap[resourceKind][resourceKey].ScheduledCount += int(replicaCount)
		}
	}

	// 处理集群资源绑定
	for _, binding := range clusterResourceBindings.Items {
		resourceKind := binding.Spec.Resource.Kind
		resourceName := binding.Spec.Resource.Name

		if resourceName == "" {
			continue
		}

		// 将资源添加到类型统计
		if _, ok := scheduledResourceMap[resourceKind]; !ok {
			scheduledResourceMap[resourceKind] = make(map[string]int)
		}

		// 查找匹配的传播策略
		policyName, clusterWeights, _ := findPropagationPolicyForResource(ctx, karmadaClient, "", resourceName, resourceKind)

		// 资源唯一标识符 (集群级资源无命名空间)
		resourceKey := fmt.Sprintf("/%s/%s", resourceKind, resourceName)

		// 初始化资源类型映射
		if _, ok := resourceSchedulingMap[resourceKind]; !ok {
			resourceSchedulingMap[resourceKind] = make(map[string]*ResourceSchedulingInfo)
		}

		// 初始化资源信息
		if _, ok := resourceSchedulingMap[resourceKind][resourceKey]; !ok {
			resourceSchedulingMap[resourceKind][resourceKey] = &ResourceSchedulingInfo{
				ResourceName:      resourceName,
				Namespace:         "",
				PropagationPolicy: policyName,
				ClusterWeights:    clusterWeights,
				ClusterDist:       []v1.ActualClusterDistribution{},
				ActualCount:       0,
				ScheduledCount:    0,
			}
		}

		// 为每个集群绑定记录调度信息
		for _, cluster := range binding.Spec.Clusters {
			clusterName := cluster.Name
			replicaCount := cluster.Replicas

			// 增加资源类型统计
			scheduledResourceMap[resourceKind][clusterName] += int(replicaCount)

			// 增加调度计数
			found := false
			for i, dist := range resourceSchedulingMap[resourceKind][resourceKey].ClusterDist {
				if dist.ClusterName == clusterName {
					dist.ScheduledCount += int(replicaCount)
					resourceSchedulingMap[resourceKind][resourceKey].ClusterDist[i] = dist
					found = true
					break
				}
			}

			if !found {
				// 添加新的集群分布记录
				resourceSchedulingMap[resourceKind][resourceKey].ClusterDist = append(
					resourceSchedulingMap[resourceKind][resourceKey].ClusterDist,
					v1.ActualClusterDistribution{
						ClusterName:    clusterName,
						ScheduledCount: int(replicaCount),
						ActualCount:    0,
						Status: v1.ResourceDeploymentStatus{
							Scheduled:      true,
							Actual:         false,
							ScheduledCount: int(replicaCount),
							ActualCount:    0,
						},
					},
				)
			}

			// 增加总调度计数
			resourceSchedulingMap[resourceKind][resourceKey].ScheduledCount += int(replicaCount)
		}
	}

	// 收集实际部署的资源信息
	// 并发获取各集群资源
	var wg sync.WaitGroup
	var mu sync.Mutex // 保护map的并发访问

	for i := range clusterList.Items {
		cluster := &clusterList.Items[i]
		wg.Add(1)

		go func(c *clusterv1alpha1.Cluster) {
			defer wg.Done()

			// 使用现有的客户端函数获取成员集群客户端
			kubeClient := client.InClusterClientForMemberCluster(c.Name)
			if kubeClient == nil {
				klog.ErrorS(fmt.Errorf("failed to get client"), "Could not get client for cluster", "cluster", c.Name)
				return
			}

			// 创建动态客户端 - 通过设置相同的配置
			config, err := client.GetMemberConfig()
			if err != nil {
				klog.ErrorS(err, "Failed to get member config", "cluster", c.Name)
				return
			}

			// 修改配置以指向特定集群
			restConfig := rest.CopyConfig(config)
			// 获取karmada配置
			karmadaConfig, _, err := client.GetKarmadaConfig()
			if err != nil {
				klog.ErrorS(err, "Failed to get karmada config", "cluster", c.Name)
				return
			}
			// 使用固定的代理URL格式 - client包中定义的proxyURL常量为非导出
			proxyURL := "/apis/cluster.karmada.io/v1alpha1/clusters/%s/proxy/"
			restConfig.Host = karmadaConfig.Host + fmt.Sprintf(proxyURL, c.Name)

			dynamicClient, err := dynamic.NewForConfig(restConfig)
			if err != nil {
				klog.ErrorS(err, "Failed to create dynamic client", "cluster", c.Name)
				return
			}

			// 初始化该集群的资源统计
			clusterResources := make(map[string]int)

			// 查询所有支持的资源类型
			for resourceKind, gvr := range supportedResources {
				// 查询资源列表
				list, err := dynamicClient.Resource(gvr).Namespace(metav1.NamespaceAll).List(ctx, metav1.ListOptions{})
				if err != nil {
					klog.ErrorS(err, "Failed to list resources", "cluster", c.Name, "resource", resourceKind)
					continue
				}

				// 记录资源数量
				count := len(list.Items)

				// 对于Deployment类型，需要获取实际的Pod数量而不是Deployment对象数量
				if resourceKind == "Deployment" && count > 0 {
					// Pod计数总和
					totalPodCount := 0

					// 遍历每个Deployment
					for _, deployment := range list.Items {
						// 提取Deployment名称和命名空间
						deployName, _, _ := unstructured.NestedString(deployment.Object, "metadata", "name")
						deployNamespace, _, _ := unstructured.NestedString(deployment.Object, "metadata", "namespace")

						if deployName == "" {
							continue
						}

						// 检查该Deployment是否由Karmada调度 - 通过检查特定标签或注释
						// Karmada调度的资源通常会有特定标签
						deployLabels, _, _ := unstructured.NestedMap(deployment.Object, "metadata", "labels")
						deployAnnotations, _, _ := unstructured.NestedMap(deployment.Object, "metadata", "annotations")

						// 检查是否有Karmada调度相关的标签或注释
						isKarmadaManaged := false

						// 检查特定的Karmada标签
						if deployLabels != nil {
							// 检查常见的Karmada标签
							if _, ok := deployLabels["karmada.io/managed"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployLabels["propagationpolicy.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployLabels["clusterpropagationpolicy.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
						}

						// 检查特定的Karmada注释
						if deployAnnotations != nil && !isKarmadaManaged {
							if _, ok := deployAnnotations["karmada.io/managed"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployAnnotations["propagation.karmada.io/status"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployAnnotations["resourcebinding.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployAnnotations["clusterresourcebinding.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
						}

						// 如果不是由Karmada管理的资源，则跳过
						if !isKarmadaManaged {
							// 额外验证：检查该资源是否在ResourceBinding或ClusterResourceBinding中存在
							// 检查ResourceBinding
							foundInResourceBindings := false
							for _, binding := range resourceBindings.Items {
								if binding.Spec.Resource.Kind == "Deployment" &&
									binding.Spec.Resource.Name == deployName &&
									(binding.Namespace == deployNamespace || binding.Spec.Resource.Namespace == deployNamespace) {
									foundInResourceBindings = true
									break
								}
							}

							// 检查ClusterResourceBinding
							if !foundInResourceBindings {
								for _, binding := range clusterResourceBindings.Items {
									if binding.Spec.Resource.Kind == "Deployment" &&
										binding.Spec.Resource.Name == deployName {
										foundInResourceBindings = true
										break
									}
								}
							}

							// 如果在绑定中也未找到，则确认跳过该资源
							if !foundInResourceBindings {
								klog.V(4).Infof("Skipping non-Karmada managed deployment %s/%s in cluster %s",
									deployNamespace, deployName, c.Name)
								continue
							}
						}

						// 获取Deployment的Pod selector
						var podSelector map[string]string
						selectorObj, found, _ := unstructured.NestedMap(deployment.Object, "spec", "selector", "matchLabels")
						if found && selectorObj != nil {
							podSelector = make(map[string]string)
							for k, v := range selectorObj {
								if strVal, ok := v.(string); ok {
									podSelector[k] = strVal
								}
							}
						} else {
							// 如果没有找到matchLabels，使用默认的app标签
							podSelector = map[string]string{"app": deployName}
						}

						// 记录原始Deployment的UniqKey，用于后面关联Pod数量
						deploymentUID := fmt.Sprintf("%s/%s/%s", deployNamespace, resourceKind, deployName)
						deployPodCount := 0

						// 构建实际的标签选择器字符串
						labelSelector := ""
						for key, value := range podSelector {
							if labelSelector != "" {
								labelSelector += ","
							}
							labelSelector += fmt.Sprintf("%s=%s", key, value)
						}

						// 只计算匹配标签的Pod
						if labelSelector != "" {
							podListOptions := metav1.ListOptions{
								LabelSelector: labelSelector,
							}

							// 在Deployment所在的命名空间中查找Pod
							namespacePodList, err := dynamicClient.Resource(supportedResources["Pod"]).Namespace(deployNamespace).List(ctx, podListOptions)
							if err == nil && namespacePodList != nil {
								// 获取运行中的Pod数量
								for _, pod := range namespacePodList.Items {
									podStatus, found, err := unstructured.NestedString(pod.Object, "status", "phase")
									if found && err == nil && podStatus == "Running" {
										deployPodCount++
									}
								}
								klog.V(3).Infof("集群[%s] Deployment[%s/%s] 匹配选择器[%s]的Pod数量: %d",
									c.Name, deployNamespace, deployName, labelSelector, deployPodCount)
							} else if err != nil {
								klog.Warningf("获取集群[%s]命名空间[%s]中Pod失败: %v", c.Name, deployNamespace, err)
							}
						}

						// 如果通过标签选择器没找到Pod，尝试使用常见标签模式
						if deployPodCount == 0 {
							// 记录找到Pod的选择器，便于调试
							foundSelector := ""
							// 尝试其他常见的标签格式
							commonLabelSelectors := []string{
								fmt.Sprintf("app=%s", deployName),
								fmt.Sprintf("app.kubernetes.io/name=%s", deployName),
								fmt.Sprintf("k8s-app=%s", deployName),
							}

							for _, commonSelector := range commonLabelSelectors {
								podListOptions := metav1.ListOptions{
									LabelSelector: commonSelector,
								}

								namespacePodList, err := dynamicClient.Resource(supportedResources["Pod"]).Namespace(deployNamespace).List(ctx, podListOptions)
								if err != nil {
									continue
								}

								// 统计运行中的Pod
								commonPodCount := 0
								for _, pod := range namespacePodList.Items {
									podStatus, found, err := unstructured.NestedString(pod.Object, "status", "phase")
									if found && err == nil && podStatus == "Running" {
										commonPodCount++
									}
								}

								// 如果找到了Pod，使用这个计数并退出循环
								if commonPodCount > 0 {
									deployPodCount = commonPodCount
									foundSelector = commonSelector
									break
								}
							}

							if deployPodCount > 0 {
								klog.V(3).Infof("集群[%s] Deployment[%s/%s] 使用二次尝试选择器[%s]找到Pod数量: %d",
									c.Name, deployNamespace, deployName, foundSelector, deployPodCount)
							}
						}

						// 如果计数仍然为0，可能需要获取Deployment的replicas值作为参考
						if deployPodCount == 0 {
							replicas, found, _ := unstructured.NestedInt64(deployment.Object, "spec", "replicas")
							if found && replicas > 0 {
								deployPodCount = int(replicas)
								klog.V(3).Infof("集群[%s] Deployment[%s/%s] 未找到Pod，使用replicas值: %d",
									c.Name, deployNamespace, deployName, deployPodCount)
							}
						}

						// 记录该Deployment的Pod数量
						klog.V(3).Infof("最终统计: 集群[%s], Deployment[%s/%s]的运行Pod数: %d",
							c.Name, deployNamespace, deployName, deployPodCount)

						// 保存精确的Pod计数
						mu.Lock()
						if _, ok := actualResourceMap[resourceKind]; !ok {
							actualResourceMap[resourceKind] = make(map[string]int)
						}
						// 存储每个具体Deployment的Pod计数，使用包含命名空间和名称的唯一标识符
						actualResourceMap[resourceKind][fmt.Sprintf("%s:%s", c.Name, deploymentUID)] = deployPodCount
						mu.Unlock()

						// 累加Pod数量到总数
						totalPodCount += deployPodCount
					}

				} else if resourceKind != "Deployment" {
					// 对于非Deployment资源，检查是否为Karmada管理的资源
					validatedCount := 0

					for _, resource := range list.Items {
						resourceName, _, _ := unstructured.NestedString(resource.Object, "metadata", "name")
						resourceNamespace, _, _ := unstructured.NestedString(resource.Object, "metadata", "namespace")

						if resourceName == "" {
							continue
						}

						// 检查资源标签和注释是否包含Karmada管理标记
						resourceLabels, _, _ := unstructured.NestedMap(resource.Object, "metadata", "labels")
						resourceAnnotations, _, _ := unstructured.NestedMap(resource.Object, "metadata", "annotations")

						isKarmadaManaged := false

						// 检查标签
						if resourceLabels != nil {
							if _, ok := resourceLabels["karmada.io/managed"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceLabels["propagationpolicy.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceLabels["clusterpropagationpolicy.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
						}

						// 检查注释
						if resourceAnnotations != nil && !isKarmadaManaged {
							if _, ok := resourceAnnotations["karmada.io/managed"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceAnnotations["propagation.karmada.io/status"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceAnnotations["resourcebinding.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceAnnotations["clusterresourcebinding.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
						}

						// 如果不是Karmada管理的资源，检查其是否在绑定中存在
						if !isKarmadaManaged {
							foundInResourceBindings := false

							// 检查ResourceBinding
							for _, binding := range resourceBindings.Items {
								if binding.Spec.Resource.Kind == resourceKind &&
									binding.Spec.Resource.Name == resourceName &&
									(binding.Namespace == resourceNamespace || binding.Spec.Resource.Namespace == resourceNamespace) {
									foundInResourceBindings = true
									break
								}
							}

							// 检查ClusterResourceBinding
							if !foundInResourceBindings {
								for _, binding := range clusterResourceBindings.Items {
									if binding.Spec.Resource.Kind == resourceKind &&
										binding.Spec.Resource.Name == resourceName {
										foundInResourceBindings = true
										break
									}
								}
							}

							// 如果在绑定中也未找到，则跳过
							if !foundInResourceBindings {
								continue
							}
						}

						// 到这里，说明资源是由Karmada管理的，或者在绑定中已找到
						validatedCount++
					}

					// 更新为验证后的资源数量
					count = validatedCount
				}

				if count > 0 {
					clusterResources[resourceKind] = count

					mu.Lock()
					// 更新实际资源统计
					if _, ok := actualResourceMap[resourceKind]; !ok {
						actualResourceMap[resourceKind] = make(map[string]int)
					}
					actualResourceMap[resourceKind][c.Name] = count
					mu.Unlock()
				}
			}

			klog.Infof("Cluster %s has resources: %v", c.Name, clusterResources)
		}(cluster)
	}

	// 等待所有集群资源收集完成
	wg.Wait()

	// 使用wg.Wait()之后，添加实际部署资源到调度信息中
	// 处理actualResourceMap数据，更新到resourceSchedulingMap中
	for resourceKind, clusterMap := range actualResourceMap {
		if _, ok := resourceSchedulingMap[resourceKind]; !ok {
			continue
		}

		// 遍历所有集群上报的实际Pod计数
		for clusterResourceKey, count := range clusterMap {
			// 解析clusterResourceKey，判断是否是具体资源的计数(格式为"集群名:命名空间/类型/名称")
			parts := strings.Split(clusterResourceKey, ":")
			if len(parts) == 2 {
				clusterName := parts[0]
				resourceKey := parts[1]

				// 从resourceKey中提取资源信息(namespace/kind/name)
				keyParts := strings.SplitN(resourceKey, "/", 3)
				if len(keyParts) >= 3 {
					namespace := keyParts[0]
					name := keyParts[2]

					// 查找对应的资源信息
					resourceFound := false

					// 构建查找键
					lookupKey := fmt.Sprintf("%s/%s/%s", namespace, resourceKind, name)
					if namespace == "" {
						lookupKey = fmt.Sprintf("/%s/%s", resourceKind, name)
					}

					if resourceInfo, exists := resourceSchedulingMap[resourceKind][lookupKey]; exists {
						// 找到对应资源
						resourceFound = true

						// 更新集群分布中的实际部署计数
						clusterFound := false
						for i, dist := range resourceInfo.ClusterDist {
							if dist.ClusterName == clusterName {
								clusterFound = true
								// 更新实际部署数量
								dist.ActualCount = count
								dist.Status.Actual = true
								dist.Status.ActualCount = count
								resourceInfo.ClusterDist[i] = dist

								// 记录日志以便调试
								klog.V(3).Infof("更新资源[%s]在集群[%s]的实际部署数: %d (计划数: %d)",
									lookupKey, clusterName, count, dist.ScheduledCount)
								break
							}
						}

						if !clusterFound {
							klog.V(3).Infof("资源[%s]没有集群[%s]的分布记录，跳过更新", lookupKey, clusterName)
						}

						// 重新计算资源总实际部署数
						resourceInfo.ActualCount = 0
						for _, dist := range resourceInfo.ClusterDist {
							resourceInfo.ActualCount += dist.ActualCount
						}
					}

					if !resourceFound {
						klog.V(3).Infof("未找到资源记录[%s]，无法更新实际部署数", lookupKey)
					}
				} else {
					klog.V(3).Infof("资源键[%s]格式错误，无法解析", resourceKey)
				}
			} else {
				// 这是集群级别的计数(旧版格式)，不再使用这种简化处理
				klog.V(3).Infof("跳过旧格式的集群级计数: %s = %d", clusterResourceKey, count)
			}
		}
	}

	// 添加详细的调度资源信息到响应中
	detailedResources := make([]v1.ResourceDetailInfo, 0)

	for resourceKind, resourcesMap := range resourceSchedulingMap {
		for _, info := range resourcesMap {
			// 创建集群权重映射
			clusterWeights := make(map[string]int32)

			// 如果有策略设置的集群权重，优先使用策略的权重
			if len(info.ClusterWeights) > 0 {
				clusterWeights = info.ClusterWeights
			} else {
				// 否则，使用集群注解中的权重
				for _, node := range response.Nodes {
					if node.Type == "member-cluster" && node.SchedulingParams != nil {
						clusterWeights[node.ID] = node.SchedulingParams.Weight
					}
				}
			}

			// 创建详细资源信息
			detailedResource := v1.ResourceDetailInfo{
				ResourceName:        info.ResourceName,
				ResourceKind:        resourceKind,
				ResourceGroup:       getResourceGroup(resourceKind),
				Namespace:           info.Namespace,
				PropagationPolicy:   info.PropagationPolicy,
				ClusterWeights:      clusterWeights, // 添加集群权重映射
				ClusterDist:         info.ClusterDist,
				TotalScheduledCount: info.ScheduledCount,
				TotalActualCount:    info.ActualCount,
			}
			detailedResources = append(detailedResources, detailedResource)
		}
	}

	// 按资源类型和名称排序
	sort.Slice(detailedResources, func(i, j int) bool {
		if detailedResources[i].ResourceKind != detailedResources[j].ResourceKind {
			return detailedResources[i].ResourceKind < detailedResources[j].ResourceKind
		}
		return detailedResources[i].ResourceName < detailedResources[j].ResourceName
	})

	response.DetailedResources = detailedResources

	// 转换资源类型统计为响应格式，并按资源类型排序 - 使用合并后的信息
	var resourceTypes []string
	for resourceType := range scheduledResourceMap {
		resourceTypes = append(resourceTypes, resourceType)
	}
	sort.Strings(resourceTypes)

	for _, resourceType := range resourceTypes {
		clusterMap := scheduledResourceMap[resourceType]
		typeDist := v1.ResourceTypeDistribution{
			ResourceType: resourceType,
			ClusterDist:  []v1.ClusterDistribution{},
		}

		// 对集群名称进行排序，保证展示顺序一致
		var clusterNames []string
		for clusterName := range clusterMap {
			clusterNames = append(clusterNames, clusterName)
		}
		sort.Strings(clusterNames)

		for _, clusterName := range clusterNames {
			count := clusterMap[clusterName]
			typeDist.ClusterDist = append(typeDist.ClusterDist, v1.ClusterDistribution{
				ClusterName: clusterName,
				Count:       count,
			})
		}

		response.ResourceDist = append(response.ResourceDist, typeDist)
	}

	// 修改链接信息以体现资源流向 - 每个具体资源单独显示
	// 清空之前的链接
	response.Links = []v1.ScheduleLink{}

	// 每个资源节点列表 - 使用单独节点而不是资源类型分组
	resourceNodes := []v1.ScheduleNode{}

	// 为每个具体资源创建单独的节点和链接
	for _, resource := range detailedResources {
		// 创建资源唯一ID
		resourceID := fmt.Sprintf("resource-%s-%s", resource.ResourceKind, resource.ResourceName)
		if resource.Namespace != "" {
			resourceID = fmt.Sprintf("resource-%s-%s-%s", resource.Namespace, resource.ResourceKind, resource.ResourceName)
		}

		// 创建资源节点
		resourceNode := v1.ScheduleNode{
			ID:   resourceID,
			Name: resource.ResourceName,
			Type: "resource",
			ResourceInfo: &v1.ResourceNodeInfo{
				ResourceKind:      resource.ResourceKind,
				ResourceGroup:     resource.ResourceGroup,
				Namespace:         resource.Namespace,
				PropagationPolicy: resource.PropagationPolicy,
			},
		}

		resourceNodes = append(resourceNodes, resourceNode)

		// 从控制平面到资源的链接
		response.Links = append(response.Links, v1.ScheduleLink{
			Source: "karmada-control-plane",
			Target: resourceID,
			Value:  1, // 控制平面到资源的值为1
			Type:   resource.ResourceKind,
		})

		// 从资源到各集群的链接
		for _, dist := range resource.ClusterDist {
			if dist.ScheduledCount > 0 {
				response.Links = append(response.Links, v1.ScheduleLink{
					Source: resourceID,
					Target: dist.ClusterName,
					Value:  dist.ScheduledCount,
					Type:   resource.ResourceKind,
				})
			}
		}
	}

	// 将资源节点添加到响应中
	response.Nodes = append(response.Nodes, resourceNodes...)

	// 获取传播策略
	propagationPolicies, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(metav1.NamespaceAll).List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get propagation policies")
		return nil, err
	}

	clusterPropagationPolicies, err := karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster propagation policies")
		return nil, err
	}

	// 将策略信息添加到响应中
	response.Summary = v1.ScheduleSummary{
		TotalClusters:          len(clusterList.Items),
		TotalPropagationPolicy: len(propagationPolicies.Items) + len(clusterPropagationPolicies.Items),
		TotalResourceBinding:   len(resourceBindings.Items) + len(clusterResourceBindings.Items),
	}

	return response, nil
}

// HandleGetSchedulePreview 处理获取集群调度预览的请求
func HandleGetSchedulePreview(c *gin.Context) {
	preview, err := GetClusterSchedulePreview()
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster schedule preview")
		common.Fail(c, err)
		return
	}

	common.Success(c, preview)
}

// GetAllClusterResourcesPreview 获取所有集群资源预览信息，不局限于Karmada调度的资源
func GetAllClusterResourcesPreview() (*v1.SchedulePreviewResponse, error) {
	// 获取Karmada客户端
	karmadaClient := client.InClusterKarmadaClient()
	ctx := context.TODO()

	// 初始化响应结构
	response := &v1.SchedulePreviewResponse{
		Nodes: []v1.ScheduleNode{
			{
				ID:   "karmada-control-plane",
				Name: "Karmada控制平面",
				Type: "control-plane",
			},
		},
		Links:        []v1.ScheduleLink{},
		ResourceDist: []v1.ResourceTypeDistribution{},
	}

	// 获取所有集群
	clusterList, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster list")
		return nil, err
	}

	// 为每个集群创建节点
	for _, cluster := range clusterList.Items {
		// 收集集群的调度参数
		schedulingParams := &v1.SchedulingParams{
			Labels: make(map[string]string),
		}

		// 从注解中获取集群权重（默认为1）
		schedulingParams.Weight = 1
		if weightStr, exists := cluster.Annotations["scheduling.karmada.io/weight"]; exists {
			if weight, err := strconv.ParseInt(weightStr, 10, 32); err == nil {
				schedulingParams.Weight = int32(weight)
			}
		}

		// 从集群注解获取污点信息
		// 注：实际实现中可能需要从其他地方获取污点信息
		taints := []v1.Taint{}
		for k, v := range cluster.Annotations {
			if strings.HasPrefix(k, "taint.karmada.io/") {
				// 简单解析，实际环境中可能需要更复杂的逻辑
				key := strings.TrimPrefix(k, "taint.karmada.io/")
				parts := strings.Split(v, ":")
				effect := "NoSchedule" // 默认
				value := ""

				if len(parts) > 0 {
					value = parts[0]
				}
				if len(parts) > 1 {
					effect = parts[1]
				}

				taints = append(taints, v1.Taint{
					Key:    key,
					Value:  value,
					Effect: effect,
				})
			}
		}
		schedulingParams.Taints = taints

		// 获取集群标签
		if len(cluster.Labels) > 0 {
			for k, v := range cluster.Labels {
				schedulingParams.Labels[k] = v
			}
		}

		response.Nodes = append(response.Nodes, v1.ScheduleNode{
			ID:               cluster.Name,
			Name:             cluster.Name,
			Type:             "member-cluster",
			SchedulingParams: schedulingParams,
		})
	}

	// 获取资源绑定信息
	resourceBindings, err := karmadaClient.WorkV1alpha2().ResourceBindings(metav1.NamespaceAll).List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get resource bindings")
		return nil, err
	}

	clusterResourceBindings, err := karmadaClient.WorkV1alpha2().ClusterResourceBindings().List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster resource bindings")
		return nil, err
	}

	// 资源类型统计 - 从绑定中获取的调度信息
	scheduledResourceMap := make(map[string]map[string]int)
	// 资源类型和集群间的链接统计 - 从绑定中获取的调度信息
	scheduledResourceLinks := make(map[string]map[string]int)

	// 实际部署的资源统计
	actualResourceMap := make(map[string]map[string]int)

	// 存储资源类型对应的资源名称
	resourceTypeToNameMap := make(map[string][]string)

	// 收集各资源类型对应的资源名称
	for _, binding := range resourceBindings.Items {
		resourceType := binding.Spec.Resource.Kind
		resourceName := binding.Spec.Resource.Name
		if resourceName != "" {
			// 如果该类型还没有初始化映射，则先初始化
			if _, exists := resourceTypeToNameMap[resourceType]; !exists {
				resourceTypeToNameMap[resourceType] = []string{}
			}
			// 检查资源名称是否已存在，避免重复
			nameExists := false
			for _, existingName := range resourceTypeToNameMap[resourceType] {
				if existingName == resourceName {
					nameExists = true
					break
				}
			}
			if !nameExists {
				resourceTypeToNameMap[resourceType] = append(resourceTypeToNameMap[resourceType], resourceName)
			}
		}
	}

	// 处理集群级资源
	for _, binding := range clusterResourceBindings.Items {
		resourceType := binding.Spec.Resource.Kind
		resourceName := binding.Spec.Resource.Name
		if resourceName != "" {
			// 如果该类型还没有初始化映射，则先初始化
			if _, exists := resourceTypeToNameMap[resourceType]; !exists {
				resourceTypeToNameMap[resourceType] = []string{}
			}
			// 检查资源名称是否已存在，避免重复
			nameExists := false
			for _, existingName := range resourceTypeToNameMap[resourceType] {
				if existingName == resourceName {
					nameExists = true
					break
				}
			}
			if !nameExists {
				resourceTypeToNameMap[resourceType] = append(resourceTypeToNameMap[resourceType], resourceName)
			}
		}
	}

	// 处理资源绑定 - 获取调度信息
	for _, binding := range resourceBindings.Items {
		resourceKind := binding.Spec.Resource.Kind

		// 将资源添加到类型统计
		if _, ok := scheduledResourceMap[resourceKind]; !ok {
			scheduledResourceMap[resourceKind] = make(map[string]int)
		}

		// 如果链接映射不存在此资源类型，则初始化
		if _, ok := scheduledResourceLinks[resourceKind]; !ok {
			scheduledResourceLinks[resourceKind] = make(map[string]int)
		}

		// 为每个集群绑定创建链接
		for _, cluster := range binding.Spec.Clusters {
			clusterName := cluster.Name

			// 增加资源类型到特定集群的链接计数
			scheduledResourceLinks[resourceKind][clusterName]++

			// 增加资源类型统计
			scheduledResourceMap[resourceKind][clusterName]++
		}
	}

	// 处理集群资源绑定 - 获取调度信息
	for _, binding := range clusterResourceBindings.Items {
		resourceKind := binding.Spec.Resource.Kind

		// 将资源添加到类型统计
		if _, ok := scheduledResourceMap[resourceKind]; !ok {
			scheduledResourceMap[resourceKind] = make(map[string]int)
		}

		// 如果链接映射不存在此资源类型，则初始化
		if _, ok := scheduledResourceLinks[resourceKind]; !ok {
			scheduledResourceLinks[resourceKind] = make(map[string]int)
		}

		// 为每个集群绑定创建链接
		for _, cluster := range binding.Spec.Clusters {
			clusterName := cluster.Name

			// 增加资源类型到特定集群的链接计数
			scheduledResourceLinks[resourceKind][clusterName]++

			// 增加资源类型统计
			scheduledResourceMap[resourceKind][clusterName]++
		}
	}

	// 收集实际部署的资源信息
	// 并发获取各集群资源
	var wg sync.WaitGroup
	var mu sync.Mutex // 保护map的并发访问

	for i := range clusterList.Items {
		cluster := &clusterList.Items[i]
		wg.Add(1)

		go func(c *clusterv1alpha1.Cluster) {
			defer wg.Done()

			// 使用现有的客户端函数获取成员集群客户端
			kubeClient := client.InClusterClientForMemberCluster(c.Name)
			if kubeClient == nil {
				klog.ErrorS(fmt.Errorf("failed to get client"), "Could not get client for cluster", "cluster", c.Name)
				return
			}

			// 创建动态客户端 - 通过设置相同的配置
			config, err := client.GetMemberConfig()
			if err != nil {
				klog.ErrorS(err, "Failed to get member config", "cluster", c.Name)
				return
			}

			// 修改配置以指向特定集群
			restConfig := rest.CopyConfig(config)
			// 获取karmada配置
			karmadaConfig, _, err := client.GetKarmadaConfig()
			if err != nil {
				klog.ErrorS(err, "Failed to get karmada config", "cluster", c.Name)
				return
			}
			// 使用固定的代理URL格式 - client包中定义的proxyURL常量为非导出
			proxyURL := "/apis/cluster.karmada.io/v1alpha1/clusters/%s/proxy/"
			restConfig.Host = karmadaConfig.Host + fmt.Sprintf(proxyURL, c.Name)

			dynamicClient, err := dynamic.NewForConfig(restConfig)
			if err != nil {
				klog.ErrorS(err, "Failed to create dynamic client", "cluster", c.Name)
				return
			}

			// 初始化该集群的资源统计
			clusterResources := make(map[string]int)

			// 查询所有支持的资源类型
			for resourceKind, gvr := range supportedResources {
				// 查询资源列表
				list, err := dynamicClient.Resource(gvr).Namespace(metav1.NamespaceAll).List(ctx, metav1.ListOptions{})
				if err != nil {
					klog.ErrorS(err, "Failed to list resources", "cluster", c.Name, "resource", resourceKind)
					continue
				}

				// 记录资源数量
				count := len(list.Items)

				// 对于Deployment类型，需要获取实际的Pod数量而不是Deployment对象数量
				if resourceKind == "Deployment" && count > 0 {
					// Pod计数总和
					totalPodCount := 0

					// 遍历每个Deployment
					for _, deployment := range list.Items {
						// 提取Deployment名称和命名空间
						deployName, _, _ := unstructured.NestedString(deployment.Object, "metadata", "name")
						deployNamespace, _, _ := unstructured.NestedString(deployment.Object, "metadata", "namespace")

						if deployName == "" {
							continue
						}

						// 检查该Deployment是否由Karmada调度 - 通过检查特定标签或注释
						// Karmada调度的资源通常会有特定标签
						deployLabels, _, _ := unstructured.NestedMap(deployment.Object, "metadata", "labels")
						deployAnnotations, _, _ := unstructured.NestedMap(deployment.Object, "metadata", "annotations")

						// 检查是否有Karmada调度相关的标签或注释
						isKarmadaManaged := false

						// 检查特定的Karmada标签
						if deployLabels != nil {
							// 检查常见的Karmada标签
							if _, ok := deployLabels["karmada.io/managed"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployLabels["propagationpolicy.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployLabels["clusterpropagationpolicy.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
						}

						// 检查特定的Karmada注释
						if deployAnnotations != nil && !isKarmadaManaged {
							if _, ok := deployAnnotations["karmada.io/managed"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployAnnotations["propagation.karmada.io/status"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployAnnotations["resourcebinding.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := deployAnnotations["clusterresourcebinding.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
						}

						// 如果不是由Karmada管理的资源，则跳过
						if !isKarmadaManaged {
							// 额外验证：检查该资源是否在ResourceBinding或ClusterResourceBinding中存在
							// 检查ResourceBinding
							foundInResourceBindings := false
							for _, binding := range resourceBindings.Items {
								if binding.Spec.Resource.Kind == "Deployment" &&
									binding.Spec.Resource.Name == deployName &&
									(binding.Namespace == deployNamespace || binding.Spec.Resource.Namespace == deployNamespace) {
									foundInResourceBindings = true
									break
								}
							}

							// 检查ClusterResourceBinding
							if !foundInResourceBindings {
								for _, binding := range clusterResourceBindings.Items {
									if binding.Spec.Resource.Kind == "Deployment" &&
										binding.Spec.Resource.Name == deployName {
										foundInResourceBindings = true
										break
									}
								}
							}

							// 如果在绑定中也未找到，则确认跳过该资源
							if !foundInResourceBindings {
								klog.V(4).Infof("Skipping non-Karmada managed deployment %s/%s in cluster %s",
									deployNamespace, deployName, c.Name)
								continue
							}
						}

						// 获取Deployment的Pod selector
						var podSelector map[string]string
						selectorObj, found, _ := unstructured.NestedMap(deployment.Object, "spec", "selector", "matchLabels")
						if found && selectorObj != nil {
							podSelector = make(map[string]string)
							for k, v := range selectorObj {
								if strVal, ok := v.(string); ok {
									podSelector[k] = strVal
								}
							}
						} else {
							// 如果没有找到matchLabels，使用默认的app标签
							podSelector = map[string]string{"app": deployName}
						}

						// 记录原始Deployment的UniqKey，用于后面关联Pod数量
						deploymentUID := fmt.Sprintf("%s/%s/%s", deployNamespace, resourceKind, deployName)
						deployPodCount := 0

						// 构建实际的标签选择器字符串
						labelSelector := ""
						for key, value := range podSelector {
							if labelSelector != "" {
								labelSelector += ","
							}
							labelSelector += fmt.Sprintf("%s=%s", key, value)
						}

						// 只计算匹配标签的Pod
						if labelSelector != "" {
							podListOptions := metav1.ListOptions{
								LabelSelector: labelSelector,
							}

							// 在Deployment所在的命名空间中查找Pod
							namespacePodList, err := dynamicClient.Resource(supportedResources["Pod"]).Namespace(deployNamespace).List(ctx, podListOptions)
							if err == nil && namespacePodList != nil {
								// 获取运行中的Pod数量
								for _, pod := range namespacePodList.Items {
									podStatus, found, err := unstructured.NestedString(pod.Object, "status", "phase")
									if found && err == nil && podStatus == "Running" {
										deployPodCount++
									}
								}
								klog.V(3).Infof("集群[%s] Deployment[%s/%s] 匹配选择器[%s]的Pod数量: %d",
									c.Name, deployNamespace, deployName, labelSelector, deployPodCount)
							} else if err != nil {
								klog.Warningf("获取集群[%s]命名空间[%s]中Pod失败: %v", c.Name, deployNamespace, err)
							}
						}

						// 如果通过标签选择器没找到Pod，尝试使用常见标签模式
						if deployPodCount == 0 {
							// 记录找到Pod的选择器，便于调试
							foundSelector := ""
							// 尝试其他常见的标签格式
							commonLabelSelectors := []string{
								fmt.Sprintf("app=%s", deployName),
								fmt.Sprintf("app.kubernetes.io/name=%s", deployName),
								fmt.Sprintf("k8s-app=%s", deployName),
							}

							for _, commonSelector := range commonLabelSelectors {
								podListOptions := metav1.ListOptions{
									LabelSelector: commonSelector,
								}

								namespacePodList, err := dynamicClient.Resource(supportedResources["Pod"]).Namespace(deployNamespace).List(ctx, podListOptions)
								if err != nil {
									continue
								}

								// 统计运行中的Pod
								commonPodCount := 0
								for _, pod := range namespacePodList.Items {
									podStatus, found, err := unstructured.NestedString(pod.Object, "status", "phase")
									if found && err == nil && podStatus == "Running" {
										commonPodCount++
									}
								}

								// 如果找到了Pod，使用这个计数并退出循环
								if commonPodCount > 0 {
									deployPodCount = commonPodCount
									foundSelector = commonSelector
									break
								}
							}

							if deployPodCount > 0 {
								klog.V(3).Infof("集群[%s] Deployment[%s/%s] 使用二次尝试选择器[%s]找到Pod数量: %d",
									c.Name, deployNamespace, deployName, foundSelector, deployPodCount)
							}
						}

						// 如果计数仍然为0，可能需要获取Deployment的replicas值作为参考
						if deployPodCount == 0 {
							replicas, found, _ := unstructured.NestedInt64(deployment.Object, "spec", "replicas")
							if found && replicas > 0 {
								deployPodCount = int(replicas)
								klog.V(3).Infof("集群[%s] Deployment[%s/%s] 未找到Pod，使用replicas值: %d",
									c.Name, deployNamespace, deployName, deployPodCount)
							}
						}

						// 记录该Deployment的Pod数量
						klog.V(3).Infof("最终统计: 集群[%s], Deployment[%s/%s]的运行Pod数: %d",
							c.Name, deployNamespace, deployName, deployPodCount)

						// 保存精确的Pod计数
						mu.Lock()
						if _, ok := actualResourceMap[resourceKind]; !ok {
							actualResourceMap[resourceKind] = make(map[string]int)
						}
						// 存储每个具体Deployment的Pod计数，使用包含命名空间和名称的唯一标识符
						actualResourceMap[resourceKind][fmt.Sprintf("%s:%s", c.Name, deploymentUID)] = deployPodCount
						mu.Unlock()

						// 累加Pod数量到总数
						totalPodCount += deployPodCount
					}

				} else if resourceKind != "Deployment" {
					// 对于非Deployment资源，检查是否为Karmada管理的资源
					validatedCount := 0

					for _, resource := range list.Items {
						resourceName, _, _ := unstructured.NestedString(resource.Object, "metadata", "name")
						resourceNamespace, _, _ := unstructured.NestedString(resource.Object, "metadata", "namespace")

						if resourceName == "" {
							continue
						}

						// 检查资源标签和注释是否包含Karmada管理标记
						resourceLabels, _, _ := unstructured.NestedMap(resource.Object, "metadata", "labels")
						resourceAnnotations, _, _ := unstructured.NestedMap(resource.Object, "metadata", "annotations")

						isKarmadaManaged := false

						// 检查标签
						if resourceLabels != nil {
							if _, ok := resourceLabels["karmada.io/managed"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceLabels["propagationpolicy.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceLabels["clusterpropagationpolicy.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
						}

						// 检查注释
						if resourceAnnotations != nil && !isKarmadaManaged {
							if _, ok := resourceAnnotations["karmada.io/managed"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceAnnotations["propagation.karmada.io/status"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceAnnotations["resourcebinding.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
							if _, ok := resourceAnnotations["clusterresourcebinding.karmada.io/name"]; ok {
								isKarmadaManaged = true
							}
						}

						// 如果不是Karmada管理的资源，检查其是否在绑定中存在
						if !isKarmadaManaged {
							foundInResourceBindings := false

							// 检查ResourceBinding
							for _, binding := range resourceBindings.Items {
								if binding.Spec.Resource.Kind == resourceKind &&
									binding.Spec.Resource.Name == resourceName &&
									(binding.Namespace == resourceNamespace || binding.Spec.Resource.Namespace == resourceNamespace) {
									foundInResourceBindings = true
									break
								}
							}

							// 检查ClusterResourceBinding
							if !foundInResourceBindings {
								for _, binding := range clusterResourceBindings.Items {
									if binding.Spec.Resource.Kind == resourceKind &&
										binding.Spec.Resource.Name == resourceName {
										foundInResourceBindings = true
										break
									}
								}
							}

							// 如果在绑定中也未找到，则跳过
							if !foundInResourceBindings {
								continue
							}
						}

						// 到这里，说明资源是由Karmada管理的，或者在绑定中已找到
						validatedCount++
					}

					// 更新为验证后的资源数量
					count = validatedCount
				}

				if count > 0 {
					clusterResources[resourceKind] = count

					mu.Lock()
					// 更新实际资源统计
					if _, ok := actualResourceMap[resourceKind]; !ok {
						actualResourceMap[resourceKind] = make(map[string]int)
					}
					actualResourceMap[resourceKind][c.Name] = count
					mu.Unlock()
				}
			}

			klog.Infof("Cluster %s has resources: %v", c.Name, clusterResources)
		}(cluster)
	}

	// 等待所有集群资源收集完成
	wg.Wait()

	// 合并调度信息和实际部署信息
	// 对于实际资源部署，使用实际发现的数量
	// 如果实际未发现资源，但存在调度记录，则保留调度记录
	mergedResourceMap := make(map[string]map[string]int)
	mergedResourceLinks := make(map[string]map[string]int)

	// 先处理所有调度信息
	for resourceKind, clusterMap := range scheduledResourceMap {
		if _, ok := mergedResourceMap[resourceKind]; !ok {
			mergedResourceMap[resourceKind] = make(map[string]int)
		}

		if _, ok := mergedResourceLinks[resourceKind]; !ok {
			mergedResourceLinks[resourceKind] = make(map[string]int)
		}

		for clusterName, count := range clusterMap {
			mergedResourceMap[resourceKind][clusterName] = count
			mergedResourceLinks[resourceKind][clusterName] = count
		}
	}

	// 再处理所有实际部署信息
	for resourceKind, clusterMap := range actualResourceMap {
		if _, ok := mergedResourceMap[resourceKind]; !ok {
			mergedResourceMap[resourceKind] = make(map[string]int)
		}

		if _, ok := mergedResourceLinks[resourceKind]; !ok {
			mergedResourceLinks[resourceKind] = make(map[string]int)
		}

		for clusterName, count := range clusterMap {
			mergedResourceMap[resourceKind][clusterName] = count
			mergedResourceLinks[resourceKind][clusterName] = count
		}
	}

	// 创建链接 - 使用合并后的信息
	for resourceKind, clusterMap := range mergedResourceLinks {
		for clusterName, count := range clusterMap {
			response.Links = append(response.Links, v1.ScheduleLink{
				Source: "karmada-control-plane",
				Target: clusterName,
				Value:  count,
				Type:   resourceKind,
			})
		}
	}

	// 转换资源类型统计为响应格式，并按资源类型排序 - 使用合并后的信息
	var resourceTypes []string
	for resourceType := range mergedResourceMap {
		resourceTypes = append(resourceTypes, resourceType)
	}
	sort.Strings(resourceTypes)

	for _, resourceType := range resourceTypes {
		clusterMap := mergedResourceMap[resourceType]
		typeDist := v1.ResourceTypeDistribution{
			ResourceType: resourceType,
			ClusterDist:  []v1.ClusterDistribution{},
		}

		// 对集群名称进行排序，保证展示顺序一致
		var clusterNames []string
		for clusterName := range clusterMap {
			clusterNames = append(clusterNames, clusterName)
		}
		sort.Strings(clusterNames)

		for _, clusterName := range clusterNames {
			count := clusterMap[clusterName]
			typeDist.ClusterDist = append(typeDist.ClusterDist, v1.ClusterDistribution{
				ClusterName: clusterName,
				Count:       count,
			})
		}

		response.ResourceDist = append(response.ResourceDist, typeDist)
	}

	// 添加实际资源分布信息
	// 这一部分将同时显示调度计划和实际部署情况
	actualResourceDist := make([]v1.ActualResourceTypeDistribution, 0)

	// 使用与前面相同的资源类型列表，保持一致性
	for _, resourceType := range resourceTypes {
		// 只有当该资源类型有调度信息时才进行处理
		if _, exists := scheduledResourceMap[resourceType]; !exists {
			continue
		}

		dist := v1.ActualResourceTypeDistribution{
			ResourceType:        resourceType,
			ResourceGroup:       getResourceGroup(resourceType),
			ClusterDist:         []v1.ActualClusterDistribution{},
			TotalScheduledCount: 0,
			TotalActualCount:    0,
			ResourceNames:       resourceTypeToNameMap[resourceType],
		}

		// 排序资源名称列表，使显示更加有序
		sort.Strings(dist.ResourceNames)

		// 合并调度和实际部署信息
		scheduledMap := scheduledResourceMap[resourceType]
		actualMap := actualResourceMap[resourceType]

		// 收集所有相关集群
		clustersSet := make(map[string]bool)
		for cluster := range scheduledMap {
			clustersSet[cluster] = true
		}
		// 只收集在scheduledMap中有记录的集群
		for cluster := range actualMap {
			if _, hasSchedule := scheduledMap[cluster]; hasSchedule {
				clustersSet[cluster] = true
			}
		}

		// 对集群名称进行排序
		var clusters []string
		for cluster := range clustersSet {
			clusters = append(clusters, cluster)
		}
		sort.Strings(clusters)

		// 为每个集群创建分布记录
		for _, clusterName := range clusters {
			scheduledCount := scheduledMap[clusterName]
			actualCount := actualMap[clusterName]

			dist.TotalScheduledCount += scheduledCount
			dist.TotalActualCount += actualCount

			clusterDist := v1.ActualClusterDistribution{
				ClusterName:    clusterName,
				ScheduledCount: scheduledCount,
				ActualCount:    actualCount,
				Status: v1.ResourceDeploymentStatus{
					Scheduled:      scheduledCount > 0,
					Actual:         actualCount > 0,
					ScheduledCount: scheduledCount,
					ActualCount:    actualCount,
				},
			}
			dist.ClusterDist = append(dist.ClusterDist, clusterDist)
		}

		// 只有当至少有一个调度记录或实际部署记录时，才添加到结果中
		if dist.TotalScheduledCount > 0 || dist.TotalActualCount > 0 {
			actualResourceDist = append(actualResourceDist, dist)
		}
	}

	// 将实际资源分布添加到响应中
	response.ActualResourceDist = actualResourceDist

	// 获取传播策略
	propagationPolicies, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(metav1.NamespaceAll).List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get propagation policies")
		return nil, err
	}

	clusterPropagationPolicies, err := karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().List(ctx, metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster propagation policies")
		return nil, err
	}

	// 将策略信息添加到响应中
	response.Summary = v1.ScheduleSummary{
		TotalClusters:          len(clusterList.Items),
		TotalPropagationPolicy: len(propagationPolicies.Items) + len(clusterPropagationPolicies.Items),
		TotalResourceBinding:   len(resourceBindings.Items) + len(clusterResourceBindings.Items),
	}

	return response, nil
}

// HandleGetAllClusterResourcesPreview 处理获取所有集群资源预览的请求
func HandleGetAllClusterResourcesPreview(c *gin.Context) {
	preview, err := GetAllClusterResourcesPreview()
	if err != nil {
		klog.ErrorS(err, "Failed to get all cluster resources preview")
		common.Fail(c, err)
		return
	}

	common.Success(c, preview)
}

// 在init中已注册，此处不需要额外添加路由
