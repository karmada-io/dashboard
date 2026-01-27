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
	"testing"

	karmadapolicyv1alpha1 "github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaworkv1alpha2 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha2"
	karmadafake "github.com/karmada-io/karmada/pkg/generated/clientset/versioned/fake"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestGetDeploymentTopology_NotFound(t *testing.T) {
	k8sClient := fake.NewSimpleClientset()
	karmadaClient := karmadafake.NewSimpleClientset()

	_, err := GetDeploymentTopology(context.Background(), k8sClient, karmadaClient, "default", "nonexistent")
	if err == nil {
		t.Error("expected error when deployment does not exist, got nil")
	}
}

func TestGetDeploymentTopology_NoBinding(t *testing.T) {
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "nginx", Namespace: "default"},
	}
	k8sClient := fake.NewSimpleClientset(deployment)
	karmadaClient := karmadafake.NewSimpleClientset()

	topology, err := GetDeploymentTopology(context.Background(), k8sClient, karmadaClient, "default", "nginx")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if topology.Binding != nil {
		t.Error("expected no binding, got one")
	}
	if topology.Resource == nil {
		t.Error("expected resource to be populated")
	}
}

func TestGetDeploymentTopology_FullTopology(t *testing.T) {
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "nginx", Namespace: "default"},
	}
	policy := &karmadapolicyv1alpha1.PropagationPolicy{
		ObjectMeta: metav1.ObjectMeta{Name: "nginx-policy", Namespace: "default"},
	}
	binding := &karmadaworkv1alpha2.ResourceBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "nginx-deployment",
			Namespace: "default",
			Labels: map[string]string{
				"propagationpolicy.karmada.io/name":      "nginx-policy",
				"propagationpolicy.karmada.io/namespace": "default",
			},
		},
	}
	k8sClient := fake.NewSimpleClientset(deployment)
	karmadaClient := karmadafake.NewSimpleClientset(binding, policy)

	topology, err := GetDeploymentTopology(context.Background(), k8sClient, karmadaClient, "default", "nginx")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if topology.Resource == nil {
		t.Error("expected resource")
	}
	if topology.Binding == nil {
		t.Error("expected binding")
	}
	if topology.Policy == nil {
		t.Error("expected policy")
	}
}
