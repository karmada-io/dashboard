/*
Copyright 2026 The Karmada Authors.

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
	"encoding/json"
	"fmt"
	"strings"

	workv1alpha1 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha1"
	workv1alpha2 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha2"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	kubeclient "k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/informer"
)

// getWorkload fetches the workload from the control plane, returns its UID and annotations.
func getWorkload(ctx context.Context, k8sClient kubeclient.Interface, namespace, name, kind string) (types.UID, map[string]string, error) {
	switch kind {
	case "Deployment":
		obj, err := k8sClient.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", nil, err
		}
		return obj.UID, obj.Annotations, nil
	case "StatefulSet":
		obj, err := k8sClient.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", nil, err
		}
		return obj.UID, obj.Annotations, nil
	case "DaemonSet":
		obj, err := k8sClient.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", nil, err
		}
		return obj.UID, obj.Annotations, nil
	case "Job":
		obj, err := k8sClient.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", nil, err
		}
		return obj.UID, obj.Annotations, nil
	case "CronJob":
		obj, err := k8sClient.BatchV1().CronJobs(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", nil, err
		}
		return obj.UID, obj.Annotations, nil
	default:
		return "", nil, fmt.Errorf("unsupported workload kind: %s", kind)
	}
}

// getPropagationPolicy reads PP/CPP annotations from the workload and returns a ref.
func getPropagationPolicy(annotations map[string]string) *PropagationPolicyRef {
	klog.Infof("[topology] getPropagationPolicy annotations=%v", annotations)
	if ppName := annotations["propagationpolicy.karmada.io/name"]; ppName != "" {
		ref := &PropagationPolicyRef{
			Name:      ppName,
			Namespace: annotations["propagationpolicy.karmada.io/namespace"],
		}
		klog.Infof("[topology] found PP ref: %+v", ref)
		return ref
	}
	if cppName := annotations["clusterpropagationpolicy.karmada.io/name"]; cppName != "" {
		ref := &PropagationPolicyRef{
			Name:           cppName,
			IsClusterScope: true,
		}
		klog.Infof("[topology] found CPP ref: %+v", ref)
		return ref
	}
	klog.Infof("[topology] no PP/CPP annotation found")
	return nil
}

// getResourceBindings looks up ResourceBindings by workload UID via informer indexer.
func getResourceBindings(uid types.UID) ([]*workv1alpha2.ResourceBinding, error) {
	items, err := informer.ResourceBindingIndexer().ByIndex(informer.ResourceBindingByOwnerUID, string(uid))
	if err != nil {
		return nil, fmt.Errorf("indexer query resourcebindings: %w", err)
	}
	var rbs []*workv1alpha2.ResourceBinding
	for _, item := range items {
		rbs = append(rbs, item.(*workv1alpha2.ResourceBinding))
	}
	return rbs, nil
}

// getWorksByRBName looks up Works by ResourceBinding name via informer indexer.
func getWorksByRBName(rbName string) ([]*workv1alpha1.Work, error) {
	items, err := informer.WorkIndexer().ByIndex(informer.WorkByRBName, rbName)
	if err != nil {
		return nil, fmt.Errorf("indexer query works: %w", err)
	}
	var works []*workv1alpha1.Work
	for _, item := range items {
		works = append(works, item.(*workv1alpha1.Work))
	}
	return works, nil
}

// getMemberWorkloadUID returns the UID of a workload in a member cluster.
func getMemberWorkloadUID(ctx context.Context, memberClient kubeclient.Interface, namespace, name, kind string) (types.UID, error) {
	switch kind {
	case "Deployment":
		obj, err := memberClient.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", fmt.Errorf("get deployment in member cluster: %w", err)
		}
		return obj.UID, nil
	case "StatefulSet":
		obj, err := memberClient.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", fmt.Errorf("get statefulset in member cluster: %w", err)
		}
		return obj.UID, nil
	case "DaemonSet":
		obj, err := memberClient.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", fmt.Errorf("get daemonset in member cluster: %w", err)
		}
		return obj.UID, nil
	case "Job":
		obj, err := memberClient.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", fmt.Errorf("get job in member cluster: %w", err)
		}
		return obj.UID, nil
	case "CronJob":
		obj, err := memberClient.BatchV1().CronJobs(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return "", fmt.Errorf("get cronjob in member cluster: %w", err)
		}
		return obj.UID, nil
	default:
		return "", fmt.Errorf("unsupported workload kind for pod lookup: %s", kind)
	}
}

// getPodDirectOwnerUIDs returns UIDs of objects that directly own pods for the given workload.
// For Deployment, it returns ReplicaSet UIDs. For CronJob, it returns Job UIDs.
// For other types, pods are directly owned by the workload itself.
func getPodDirectOwnerUIDs(ctx context.Context, memberClient kubeclient.Interface, namespace, kind string, workloadUID types.UID) []types.UID {
	switch kind {
	case "Deployment":
		rsList, err := memberClient.AppsV1().ReplicaSets(namespace).List(ctx, metav1.ListOptions{})
		if err != nil {
			return []types.UID{workloadUID}
		}
		var uids []types.UID
		for i := range rsList.Items {
			rs := &rsList.Items[i]
			for _, ownerRef := range rs.OwnerReferences {
				if ownerRef.UID == workloadUID {
					uids = append(uids, rs.UID)
					break
				}
			}
		}
		return uids
	case "CronJob":
		jobList, err := memberClient.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{})
		if err != nil {
			return []types.UID{workloadUID}
		}
		var uids []types.UID
		for i := range jobList.Items {
			job := &jobList.Items[i]
			for _, ownerRef := range job.OwnerReferences {
				if ownerRef.UID == workloadUID {
					uids = append(uids, job.UID)
					break
				}
			}
		}
		return uids
	default:
		return []types.UID{workloadUID}
	}
}

// filterPodsByOwners returns pods whose ownerReference matches any of the given UIDs.
func filterPodsByOwners(pods []corev1.Pod, ownerUIDs []types.UID) []*corev1.Pod {
	uidSet := make(map[types.UID]bool, len(ownerUIDs))
	for _, uid := range ownerUIDs {
		uidSet[uid] = true
	}
	var result []*corev1.Pod
	for i := range pods {
		pod := &pods[i]
		for _, ownerRef := range pod.OwnerReferences {
			if uidSet[ownerRef.UID] {
				result = append(result, pod)
				break
			}
		}
	}
	return result
}

// getPodsByWorkUID fetches Pods from member cluster that belong to the workload.
// It traces the ownerReference chain to find pods.
func getPodsByWorkUID(ctx context.Context, clusterName, namespace, name, kind string) ([]*corev1.Pod, error) {
	memberClient := client.InClusterClientForMemberCluster(clusterName)
	if memberClient == nil {
		return nil, fmt.Errorf("unable to get client for member cluster %s", clusterName)
	}
	workloadUID, err := getMemberWorkloadUID(ctx, memberClient, namespace, name, kind)
	if err != nil {
		return nil, err
	}
	ownerUIDs := getPodDirectOwnerUIDs(ctx, memberClient, namespace, kind, workloadUID)
	podList, err := memberClient.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list pods in member cluster: %w", err)
	}
	return filterPodsByOwners(podList.Items, ownerUIDs), nil
}

// getPodStatus evaluates the health status of a Pod.
func getPodStatus(pod *corev1.Pod) NodeStatus {
	// Check pod phase
	switch pod.Status.Phase {
	case corev1.PodRunning:
		// Pod is running, check if all containers are ready
		if pod.Status.Conditions != nil {
			for _, condition := range pod.Status.Conditions {
				if condition.Type == corev1.PodReady {
					if condition.Status == corev1.ConditionTrue {
						return NodeStatusHealthy
					}
					break
				}
			}
		}
		// Pod is running but not all containers are ready
		return NodeStatusProgressing

	case corev1.PodSucceeded:
		// Pod completed successfully (e.g., Job pods)
		return NodeStatusHealthy

	case corev1.PodPending:
		// Pod is waiting to be scheduled or containers are starting
		return NodeStatusProgressing

	case corev1.PodFailed:
		// Pod has failed
		return NodeStatusAbnormal

	case corev1.PodUnknown:
		fallthrough
	default:
		// Unknown state
		return NodeStatusAbnormal
	}
}

// parseOverridePolicies extracts applied override policy refs from Work annotations.
// workloadNamespace is used as the namespace for namespace-scoped OverridePolicies.
func parseOverridePolicies(annotations map[string]string, workloadNamespace string) []OverridePolicyRef {
	var refs []OverridePolicyRef
	var entries []struct {
		PolicyName string `json:"policyName"`
	}
	if raw := annotations["policy.karmada.io/applied-overrides"]; raw != "" {
		if json.Unmarshal([]byte(raw), &entries) == nil {
			for _, e := range entries {
				refs = append(refs, OverridePolicyRef{Name: e.PolicyName, Namespace: workloadNamespace})
			}
		}
	}
	entries = nil
	if raw := annotations["policy.karmada.io/applied-cluster-overrides"]; raw != "" {
		if json.Unmarshal([]byte(raw), &entries) == nil {
			for _, e := range entries {
				refs = append(refs, OverridePolicyRef{Name: e.PolicyName, IsClusterScope: true})
			}
		}
	}
	return refs
}

// clusterNameFromWorkNamespace extracts cluster name from "karmada-es-{cluster}" namespace.
func clusterNameFromWorkNamespace(ns string) string {
	const prefix = "karmada-es-"
	if len(ns) > len(prefix) {
		return ns[len(prefix):]
	}
	return ""
}

// getMemberWorkloadStatus fetches the member cluster workload and returns its health status.
func getMemberWorkloadStatus(ctx context.Context, clusterName, namespace, name, kind string) NodeStatus {
	memberClient := client.InClusterClientForMemberCluster(clusterName)
	if memberClient == nil {
		return NodeStatusAbnormal
	}
	switch kind {
	case "Deployment":
		deploy, err := memberClient.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			klog.V(4).InfoS("Failed to get member deployment", "cluster", clusterName, "err", err)
			return NodeStatusAbnormal
		}
		if deploy.Spec.Replicas != nil && deploy.Status.ReadyReplicas == *deploy.Spec.Replicas {
			return NodeStatusHealthy
		}
		return NodeStatusProgressing
	default:
		return NodeStatusHealthy
	}
}

// traceChain traces the full propagation chain from a control-plane workload.
func traceChain(
	ctx context.Context,
	k8sClient kubeclient.Interface,
	namespace, name, kind string,
) (*TopologyResponse, error) {
	resp := &TopologyResponse{}

	// Step 1: Get workload
	uid, annotations, err := getWorkload(ctx, k8sClient, namespace, name, kind)
	if err != nil {
		return nil, fmt.Errorf("get workload: %w", err)
	}
	rtNodeID := fmt.Sprintf("rt-%s", uid)
	ppRef := getPropagationPolicy(annotations)
	resp.Nodes = append(resp.Nodes, TopologyNode{
		ID:        rtNodeID,
		Type:      NodeTypeResourceTemplate,
		Name:      name,
		Namespace: namespace,
		Kind:      kind,
		Status:    NodeStatusHealthy,
	})

	// Step 2: Get ResourceBindings via indexer
	rbs, err := getResourceBindings(uid)
	if err != nil {
		klog.V(4).InfoS("Failed to get resource bindings", "uid", uid, "err", err)
		return resp, nil
	}
	for _, rb := range rbs {
		rbNodeID := fmt.Sprintf("rb-%s", rb.UID)
		resp.Nodes = append(resp.Nodes, TopologyNode{
			ID:        rbNodeID,
			Type:      NodeTypeResourceBinding,
			Name:      rb.Name,
			Namespace: rb.Namespace,
			Status:    NodeStatusHealthy,
		})
		ppLabel := ""
		var ppEdgeData *TopologyEdgeData
		if ppRef != nil {
			prefix := "PP"
			if ppRef.IsClusterScope {
				prefix = "CPP"
			}
			ppLabel = fmt.Sprintf("%s: %s", prefix, ppRef.Name)
			ppEdgeData = &TopologyEdgeData{PropagationPolicy: ppRef}
			klog.Infof("[topology] ppRef=%+v ppEdgeData=%+v", ppRef, ppEdgeData)
		}
		resp.Edges = append(resp.Edges, TopologyEdge{Source: rtNodeID, Target: rbNodeID, Label: ppLabel, Data: ppEdgeData})

		// Step 3: Get Works via indexer
		works, err := getWorksByRBName(rb.Name)
		if err != nil {
			klog.V(4).InfoS("Failed to get works", "rb", rb.Name, "err", err)
			continue
		}
		for _, w := range works {
			clusterName := clusterNameFromWorkNamespace(w.Namespace)
			workNodeID := fmt.Sprintf("work-%s", w.UID)
			overrides := parseOverridePolicies(w.Annotations, namespace)
			resp.Nodes = append(resp.Nodes, TopologyNode{
				ID:        workNodeID,
				Type:      NodeTypeWork,
				Name:      w.Name,
				Namespace: w.Namespace,
				Cluster:   clusterName,
				Status:    NodeStatusHealthy,
			})
			opLabel := ""
			var opEdgeData *TopologyEdgeData
			if len(overrides) > 0 {
				names := make([]string, 0, len(overrides))
				for _, o := range overrides {
					prefix := "OP"
					if o.IsClusterScope {
						prefix = "COP"
					}
					names = append(names, fmt.Sprintf("%s: %s", prefix, o.Name))
				}
				opLabel = strings.Join(names, ", ")
				opEdgeData = &TopologyEdgeData{OverridePolicies: overrides}
			}
			resp.Edges = append(resp.Edges, TopologyEdge{Source: rbNodeID, Target: workNodeID, Label: opLabel, Data: opEdgeData})

			// Step 4: Get member cluster workload status
			memberStatus := getMemberWorkloadStatus(ctx, clusterName, namespace, name, kind)
			memberNodeID := fmt.Sprintf("member-%s-%s", clusterName, name)
			resp.Nodes = append(resp.Nodes, TopologyNode{
				ID:        memberNodeID,
				Type:      NodeTypeMemberClusterWorkload,
				Name:      name,
				Namespace: namespace,
				Kind:      kind,
				Cluster:   clusterName,
				Status:    memberStatus,
			})
			resp.Edges = append(resp.Edges, TopologyEdge{Source: workNodeID, Target: memberNodeID})

			// Step 5: Get Pods in member cluster
			pods, err := getPodsByWorkUID(ctx, clusterName, namespace, name, kind)
			if err != nil {
				klog.V(4).InfoS("Failed to get pods", "work", w.Name, "cluster", clusterName, "err", err)
				continue
			}
			for _, pod := range pods {
				podNodeID := fmt.Sprintf("pod-%s-%s", clusterName, pod.UID)
				resp.Nodes = append(resp.Nodes, TopologyNode{
					ID:        podNodeID,
					Type:      NodeTypePod,
					Name:      pod.Name,
					Namespace: pod.Namespace,
					Cluster:   clusterName,
					Status:    getPodStatus(pod),
				})
				resp.Edges = append(resp.Edges, TopologyEdge{
					Source: memberNodeID,
					Target: podNodeID,
				})
			}
		}
	}
	return resp, nil
}
