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

package cluster

import (
	"testing"

	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

func TestGetClusterAllocatedResourcesUsesAllocatableMemoryCapacity(t *testing.T) {
	cluster := &v1alpha1.Cluster{
		Status: v1alpha1.ClusterStatus{
			ResourceSummary: &v1alpha1.ResourceSummary{
				Allocatable: corev1.ResourceList{
					corev1.ResourceMemory: resource.MustParse("8Gi"),
				},
				Allocated: corev1.ResourceList{
					corev1.ResourceMemory: resource.MustParse("2Gi"),
				},
			},
		},
	}

	got, err := getclusterAllocatedResources(cluster)
	if err != nil {
		t.Fatalf("getclusterAllocatedResources() error = %v", err)
	}

	wantCapacityQuantity := resource.MustParse("8Gi")
	wantCapacity := wantCapacityQuantity.Value()
	if got.MemoryCapacity != wantCapacity {
		t.Fatalf("MemoryCapacity = %d, want %d", got.MemoryCapacity, wantCapacity)
	}
	if got.MemoryFraction != 25 {
		t.Fatalf("MemoryFraction = %v, want 25", got.MemoryFraction)
	}
}

// With no accelerator_resources configured, nvidia.com/gpu is counted.
func TestGetClusterAllocatedResourcesReportsGPUs(t *testing.T) {
	cluster := &v1alpha1.Cluster{
		Status: v1alpha1.ClusterStatus{
			ResourceSummary: &v1alpha1.ResourceSummary{
				Allocatable: corev1.ResourceList{
					"nvidia.com/gpu": resource.MustParse("8"),
				},
				Allocated: corev1.ResourceList{
					"nvidia.com/gpu": resource.MustParse("6"),
				},
			},
		},
	}

	got, err := getclusterAllocatedResources(cluster)
	if err != nil {
		t.Fatalf("getclusterAllocatedResources() error = %v", err)
	}

	if got.GPUCapacity != 8 {
		t.Fatalf("GPUCapacity = %d, want 8", got.GPUCapacity)
	}
	if got.AllocatedGPUs != 6 {
		t.Fatalf("AllocatedGPUs = %d, want 6", got.AllocatedGPUs)
	}
	if got.GPUFraction != 75 {
		t.Fatalf("GPUFraction = %v, want 75", got.GPUFraction)
	}
}

func TestGetClusterAllocatedResourcesWithoutGPUs(t *testing.T) {
	cluster := &v1alpha1.Cluster{
		Status: v1alpha1.ClusterStatus{
			ResourceSummary: &v1alpha1.ResourceSummary{
				Allocatable: corev1.ResourceList{
					corev1.ResourceCPU: resource.MustParse("4"),
				},
				Allocated: corev1.ResourceList{
					corev1.ResourceCPU: resource.MustParse("1"),
				},
			},
		},
	}

	got, err := getclusterAllocatedResources(cluster)
	if err != nil {
		t.Fatalf("getclusterAllocatedResources() error = %v", err)
	}

	if got.GPUCapacity != 0 || got.AllocatedGPUs != 0 {
		t.Fatalf("GPUCapacity/AllocatedGPUs = %d/%d, want 0/0", got.GPUCapacity, got.AllocatedGPUs)
	}
	// No GPUs must not divide by zero nor report usage.
	if got.GPUFraction != 0 {
		t.Fatalf("GPUFraction = %v, want 0", got.GPUFraction)
	}
}

func TestGetClusterAllocatedResourcesSumsConfiguredAccelerators(t *testing.T) {
	cluster := &v1alpha1.Cluster{
		Status: v1alpha1.ClusterStatus{
			ResourceSummary: &v1alpha1.ResourceSummary{
				Allocatable: corev1.ResourceList{
					"nvidia.com/gpu": resource.MustParse("4"),
					"amd.com/gpu":    resource.MustParse("4"),
					// Not a configured accelerator: must be ignored.
					"example.com/fpga": resource.MustParse("16"),
				},
				Allocated: corev1.ResourceList{
					"nvidia.com/gpu":   resource.MustParse("3"),
					"amd.com/gpu":      resource.MustParse("1"),
					"example.com/fpga": resource.MustParse("16"),
				},
			},
		},
	}

	got, err := getclusterAllocatedResourcesFor(cluster, []corev1.ResourceName{"nvidia.com/gpu", "amd.com/gpu"})
	if err != nil {
		t.Fatalf("getclusterAllocatedResourcesFor() error = %v", err)
	}

	if got.GPUCapacity != 8 {
		t.Fatalf("GPUCapacity = %d, want 8", got.GPUCapacity)
	}
	if got.AllocatedGPUs != 4 {
		t.Fatalf("AllocatedGPUs = %d, want 4", got.AllocatedGPUs)
	}
	if got.GPUFraction != 50 {
		t.Fatalf("GPUFraction = %v, want 50", got.GPUFraction)
	}
}
