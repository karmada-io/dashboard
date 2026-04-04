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
	if ppName := annotations["propagationpolicy.karmada.io/name"]; ppName != "" {
		return &PropagationPolicyRef{
			Name:      ppName,
			Namespace: annotations["propagationpolicy.karmada.io/namespace"],
		}
	}
	if cppName := annotations["clusterpropagationpolicy.karmada.io/name"]; cppName != "" {
		return &PropagationPolicyRef{
			Name:           cppName,
			IsClusterScope: true,
		}
	}
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

// parseOverridePolicies extracts applied override policy refs from Work annotations.
func parseOverridePolicies(annotations map[string]string) []OverridePolicyRef {
	var refs []OverridePolicyRef
	var entries []struct {
		PolicyName string `json:"policyName"`
	}
	if raw := annotations["policy.karmada.io/applied-overrides"]; raw != "" {
		if json.Unmarshal([]byte(raw), &entries) == nil {
			for _, e := range entries {
				refs = append(refs, OverridePolicyRef{Name: e.PolicyName})
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
		if ppRef != nil {
			prefix := "PP"
			if ppRef.IsClusterScope {
				prefix = "CPP"
			}
			ppLabel = fmt.Sprintf("%s: %s", prefix, ppRef.Name)
		}
		resp.Edges = append(resp.Edges, TopologyEdge{Source: rtNodeID, Target: rbNodeID, Label: ppLabel})

		// Step 3: Get Works via indexer
		works, err := getWorksByRBName(rb.Name)
		if err != nil {
			klog.V(4).InfoS("Failed to get works", "rb", rb.Name, "err", err)
			continue
		}
		for _, w := range works {
			clusterName := clusterNameFromWorkNamespace(w.Namespace)
			workNodeID := fmt.Sprintf("work-%s", w.UID)
			overrides := parseOverridePolicies(w.Annotations)
			resp.Nodes = append(resp.Nodes, TopologyNode{
				ID:      workNodeID,
				Type:    NodeTypeWork,
				Name:    w.Name,
				Cluster: clusterName,
				Status:  NodeStatusHealthy,
			})
			resp.Edges = append(resp.Edges, TopologyEdge{Source: rbNodeID, Target: workNodeID})

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
			opLabel := ""
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
			}
			resp.Edges = append(resp.Edges, TopologyEdge{Source: workNodeID, Target: memberNodeID, Label: opLabel})
		}
	}

	return resp, nil
}
