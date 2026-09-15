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

package overview

import (
	"testing"

	clusterv1alpha1 "github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	karmadafake "github.com/karmada-io/karmada/pkg/generated/clientset/versioned/fake"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/karmada-io/dashboard/pkg/dataselect"
)

func memberCluster(name string, allocatable, allocated corev1.ResourceList) *clusterv1alpha1.Cluster {
	return &clusterv1alpha1.Cluster{
		ObjectMeta: metav1.ObjectMeta{Name: name},
		Status: clusterv1alpha1.ClusterStatus{
			NodeSummary: &clusterv1alpha1.NodeSummary{TotalNum: 1, ReadyNum: 1},
			ResourceSummary: &clusterv1alpha1.ResourceSummary{
				Allocatable: allocatable,
				Allocated:   allocated,
			},
		},
	}
}

func TestGetMemberClusterInfoAggregatesGPUs(t *testing.T) {
	client := karmadafake.NewSimpleClientset(
		memberCluster("member-a",
			corev1.ResourceList{"nvidia.com/gpu": resource.MustParse("8")},
			corev1.ResourceList{"nvidia.com/gpu": resource.MustParse("6")}),
		memberCluster("member-b",
			corev1.ResourceList{"nvidia.com/gpu": resource.MustParse("4")},
			corev1.ResourceList{"nvidia.com/gpu": resource.MustParse("1")}),
		// A CPU-only member contributes nothing to the GPU totals.
		memberCluster("cpu-only",
			corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("4")},
			corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("1")}),
	)

	got, err := GetMemberClusterInfo(client, dataselect.NoDataSelect)
	if err != nil {
		t.Fatalf("GetMemberClusterInfo() error = %v", err)
	}

	if got.GPUSummary == nil {
		t.Fatal("GPUSummary is nil")
	}
	if got.GPUSummary.TotalGPU != 12 {
		t.Fatalf("TotalGPU = %d, want 12", got.GPUSummary.TotalGPU)
	}
	if got.GPUSummary.AllocatedGPU != 7 {
		t.Fatalf("AllocatedGPU = %d, want 7", got.GPUSummary.AllocatedGPU)
	}
}

func TestGetMemberClusterInfoWithoutGPUs(t *testing.T) {
	client := karmadafake.NewSimpleClientset(
		memberCluster("cpu-only",
			corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("4")},
			corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("1")}),
	)

	got, err := GetMemberClusterInfo(client, dataselect.NoDataSelect)
	if err != nil {
		t.Fatalf("GetMemberClusterInfo() error = %v", err)
	}

	// The summary is always present so the UI can decide to hide GPU on a
	// zero total, rather than treating a missing field as an old API.
	if got.GPUSummary == nil {
		t.Fatal("GPUSummary is nil, want zero totals")
	}
	if got.GPUSummary.TotalGPU != 0 || got.GPUSummary.AllocatedGPU != 0 {
		t.Fatalf("GPUSummary = %+v, want zero totals", *got.GPUSummary)
	}
}
