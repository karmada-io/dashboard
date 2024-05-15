package cluster

import (
	"context"
	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"log"
)

type ClusterAllocatedResources struct {
	// CPUCapacity is specified node CPU capacity in milicores.
	CPUCapacity int64   `json:"cpuCapacity"`
	CPUFraction float64 `json:"cpuFraction"`

	// MemoryCapacity is specified node memory capacity in bytes.
	MemoryCapacity int64   `json:"memoryCapacity"`
	MemoryFraction float64 `json:"memoryFraction"`

	// AllocatedPods in number of currently allocated pods on the node.
	AllocatedPods int64 `json:"allocatedPods"`

	// PodCapacity is maximum number of pods, that can be allocated on the node.
	PodCapacity int64 `json:"podCapacity"`

	// PodFraction is a fraction of pods, that can be allocated on given node.
	PodFraction float64 `json:"podFraction"`
}

func getclusterAllocatedResources(cluster *v1alpha1.Cluster) (ClusterAllocatedResources, error) {
	if cluster.Status.ResourceSummary == nil {
		return ClusterAllocatedResources{}, nil
	}
	allocatableCPU := cluster.Status.ResourceSummary.Allocatable.Cpu()
	allocatedCPU := cluster.Status.ResourceSummary.Allocated.Cpu()
	var cpuCapacity int64 = allocatableCPU.Value()
	var cpuFraction float64 = 0
	if cpuCapacity > 0 {
		cpuFraction = float64(allocatedCPU.Value()) / float64(cpuCapacity) * 100
	}

	allocatableMemory := cluster.Status.ResourceSummary.Allocatable.Memory()
	allocatedMemory := cluster.Status.ResourceSummary.Allocated.Memory()
	var memoryCapacity int64 = allocatableMemory.Value()
	var memoryFraction float64 = 0
	if memoryCapacity > 0 {
		memoryFraction = float64(allocatedMemory.Value()) / float64(memoryCapacity) * 100
	}

	allocatablePod := cluster.Status.ResourceSummary.Allocatable.Pods()
	allocatedPod := cluster.Status.ResourceSummary.Allocated.Pods()

	var podCapacity int64 = allocatablePod.Value()
	var podFraction float64 = 0
	if podCapacity > 0 {
		podFraction = float64(allocatedPod.Value()) / float64(podCapacity) * 100
	}
	return ClusterAllocatedResources{
		CPUCapacity:    allocatableCPU.MilliValue(),
		CPUFraction:    cpuFraction,
		MemoryCapacity: allocatedMemory.MilliValue(),
		MemoryFraction: memoryFraction,
		AllocatedPods:  allocatedPod.Value(),
		PodCapacity:    podCapacity,
		PodFraction:    podFraction,
	}, nil
}

type ClusterDetail struct {
	Cluster `json:",inline"`
	Taints  []corev1.Taint `json:"taints,omitempty"`
}

// GetNodeDetail gets node details.
func GetClusterDetail(client karmadaclientset.Interface, clusterName string) (*ClusterDetail, error) {
	log.Printf("Getting details of %s cluster", clusterName)
	cluster, err := client.ClusterV1alpha1().Clusters().Get(context.TODO(), clusterName, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	return &ClusterDetail{
		Cluster: toCluster(cluster),
		Taints:  cluster.Spec.Taints,
	}, nil
}
