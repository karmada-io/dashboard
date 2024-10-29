package node

type NodeAllocatedResources struct {
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
