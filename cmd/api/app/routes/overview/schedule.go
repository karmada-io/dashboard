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
	"sort"

	"github.com/gin-gonic/gin"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
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
	"Service":               "Network",
	"Ingress":               "Network",
	"NetworkPolicy":         "Network",
	
	// 存储
	"PersistentVolume":      "Storage",
	"PersistentVolumeClaim": "Storage",
	"StorageClass":          "Storage",
	
	// 配置
	"ConfigMap":             "Configuration",
	"Secret":                "Configuration",
	
	// 其他类型
	"CustomResourceDefinition": "CustomResources",
}

// 获取资源类型的分组
func getResourceGroup(kind string) string {
	if group, ok := resourceGroupMap[kind]; ok {
		return group
	}
	return "Others"
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
		response.Nodes = append(response.Nodes, v1.ScheduleNode{
			ID:   cluster.Name,
			Name: cluster.Name,
			Type: "member-cluster",
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

	// 资源类型统计
	resourceTypeMap := make(map[string]map[string]int)
	// 资源类型和集群间的链接统计
	resourceClusterLinks := make(map[string]map[string]int)
	
	// 处理资源绑定
	for _, binding := range resourceBindings.Items {
		resourceKind := binding.Spec.Resource.Kind

		// 将资源添加到类型统计
		if _, ok := resourceTypeMap[resourceKind]; !ok {
			resourceTypeMap[resourceKind] = make(map[string]int)
		}

		// 如果链接映射不存在此资源类型，则初始化
		if _, ok := resourceClusterLinks[resourceKind]; !ok {
			resourceClusterLinks[resourceKind] = make(map[string]int)
		}

		// 为每个集群绑定创建链接
		for _, cluster := range binding.Spec.Clusters {
			clusterName := cluster.Name
			
			// 增加资源类型到特定集群的链接计数
			resourceClusterLinks[resourceKind][clusterName]++
			
			// 增加资源类型统计
			resourceTypeMap[resourceKind][clusterName]++
		}
	}

	// 处理集群资源绑定
	for _, binding := range clusterResourceBindings.Items {
		resourceKind := binding.Spec.Resource.Kind

		// 将资源添加到类型统计
		if _, ok := resourceTypeMap[resourceKind]; !ok {
			resourceTypeMap[resourceKind] = make(map[string]int)
		}

		// 如果链接映射不存在此资源类型，则初始化
		if _, ok := resourceClusterLinks[resourceKind]; !ok {
			resourceClusterLinks[resourceKind] = make(map[string]int)
		}

		// 为每个集群绑定创建链接
		for _, cluster := range binding.Spec.Clusters {
			clusterName := cluster.Name
			
			// 增加资源类型到特定集群的链接计数
			resourceClusterLinks[resourceKind][clusterName]++
			
			// 增加资源类型统计
			resourceTypeMap[resourceKind][clusterName]++
		}
	}

	// 创建链接
	for resourceKind, clusterMap := range resourceClusterLinks {
		for clusterName, count := range clusterMap {
			response.Links = append(response.Links, v1.ScheduleLink{
				Source: "karmada-control-plane",
				Target: clusterName,
				Value:  count,
				Type:   resourceKind,
			})
		}
	}

	// 转换资源类型统计为响应格式，并按资源类型排序
	var resourceTypes []string
	for resourceType := range resourceTypeMap {
		resourceTypes = append(resourceTypes, resourceType)
	}
	sort.Strings(resourceTypes)

	for _, resourceType := range resourceTypes {
		clusterMap := resourceTypeMap[resourceType]
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

// 在init中已注册，此处不需要额外添加路由

