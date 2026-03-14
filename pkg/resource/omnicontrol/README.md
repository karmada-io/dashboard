# OmniControl

Backend package for unified resource topology visualization in Karmada Dashboard.

## Purpose

Aggregates the propagation path of a resource:
```
ResourceTemplate → PropagationPolicy → ResourceBinding → Work → Member Cluster
```

This enables users to trace exactly where a resource is distributed and identify propagation failures.

## Usage

```go
topology, err := omnicontrol.GetDeploymentTopology(ctx, k8sClient, karmadaClient, "default", "nginx")
if err != nil {
    // handle error
}

if topology.Policy != nil {
    fmt.Println("Policy:", topology.Policy.Name)
}
if topology.Binding != nil {
    fmt.Println("Binding:", topology.Binding.Name)
}
fmt.Println("Clusters:", len(topology.ClusterStatuses))
```

## Status

**PoC** - Initial implementation for Deployments. Future work includes support for all resource types and API endpoint integration.
