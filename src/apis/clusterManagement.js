import request from "utils/request";

export function getOverridePolicies(query) {
  return request({
    url: "/apis/policy.karmada.io/v1alpha1/overridepolicies",
    method: "get",
    params: query
  });
}

export function getClusterOverridePolicies(query) {
  return request({
    url: "/apis/policy.karmada.io/v1alpha1/clusteroverridepolicies",
    method: "get",
    params: query
  });
}

export function getResourceBinding(query) {
  return request({
    url: "/apis/work.karmada.io/v1alpha2/resourcebindings",
    method: "get",
    params: query
  });
}

export function getClusterResourceBinding(query) {
  return request({
    url: "/apis/work.karmada.io/v1alpha2/clusterresourcebindings",
    method: "get",
    params: query
  });
}

export function getWorks(query) {
  return request({
    url: "/apis/cluster.karmada.io/v1alpha1/works",
    method: "get",
    params: query
  });
}
