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

package omnicontrol

import (
	"context"
	"fmt"

	karmadaworkv1alpha1 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	client "k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"
)

// GetDeploymentTopology returns the propagation topology for a Deployment.
func GetDeploymentTopology(k8sClient client.Interface, karmadaClient karmadaclientset.Interface, namespace, name string) (*ResourceTopology, error) {
	klog.V(4).InfoS("Building topology", "namespace", namespace, "name", name)

	deployment, err := k8sClient.AppsV1().Deployments(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment %s/%s: %w", namespace, name, err)
	}

	unstructuredMap, err := runtime.DefaultUnstructuredConverter.ToUnstructured(deployment)
	if err != nil {
		return nil, fmt.Errorf("failed to convert deployment: %w", err)
	}

	topology := &ResourceTopology{
		Resource: &unstructured.Unstructured{Object: unstructuredMap},
	}

	// Karmada binding naming: "<name>-<kind>"
	bindingName := name + "-deployment"
	rb, err := karmadaClient.WorkV1alpha2().ResourceBindings(namespace).Get(context.TODO(), bindingName, metav1.GetOptions{})
	if err != nil {
		klog.V(4).InfoS("ResourceBinding not found", "name", bindingName)
		return topology, nil
	}
	topology.Bindings = append(topology.Bindings, *rb)

	// Get policy from binding labels
	policyName := rb.Labels["propagationpolicy.karmada.io/name"]
	policyNS := rb.Labels["propagationpolicy.karmada.io/namespace"]
	if policyNS == "" {
		policyNS = namespace
	}
	if policyName != "" {
		policy, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(policyNS).Get(context.TODO(), policyName, metav1.GetOptions{})
		if err == nil {
			topology.Policy = policy
		}
	}

	// Get Work objects from execution namespaces
	for _, status := range rb.Status.AggregatedStatus {
		execNS := "karmada-es-" + status.ClusterName
		works, err := karmadaClient.WorkV1alpha1().Works(execNS).List(context.TODO(), metav1.ListOptions{
			LabelSelector: fmt.Sprintf("resourcebinding.karmada.io/uid=%s", rb.UID),
		})
		if err != nil {
			continue
		}

		for i := range works.Items {
			topology.ClusterStatuses = append(topology.ClusterStatuses, ClusterStatus{
				ClusterName: status.ClusterName,
				SyncStatus:  deriveSyncStatus(&works.Items[i]),
				Work:        &works.Items[i],
			})
		}
	}

	return topology, nil
}

func deriveSyncStatus(work *karmadaworkv1alpha1.Work) string {
	for _, cond := range work.Status.Conditions {
		if cond.Type == "Applied" {
			return string(cond.Status)
		}
	}
	return "Unknown"
}
