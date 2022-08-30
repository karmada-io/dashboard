export function getOverrideListSummary(data) {
  return data && data.items
    ? data.items.map((item, index) => ({
        name: item.metadata.name,
        uid: item.metadata.uid,
        id: index,
        namespace: item.metadata.namespace,
        resourceSelectors: item.spec.resourceSelectors
          .map((r) => r.kind + "/" + r.name)
          .join("、"),
        targetCluster: item.spec.targetCluster.clusterNames
      }))
    : [];
}

export function getWorkSummary(data) {
  return data && data.items
    ? data.items.map((item, index) => ({
        name: item.metadata.name,
        uid: item.metadata.uid,
        id: index,
        namespace: item.metadata.namespace,
        conditions: item.status.conditions.length,
        manifests: item.spec.workload.manifests.join(" | ")
      }))
    : [];
}

export function getResourceBindingSummary(data) {
  return data && data.items
    ? data.items.map((item, index) => ({
        name: item.metadata.name,
        uid: item.metadata.uid,
        id: index,
        namespace: item.metadata.namespace,
        clusters: item.spec.clusters.map(({ name }) => name).join(" | "),
        status: item.status.conditions.map(({ status }) => status).join(" | ")
      }))
    : [];
}
