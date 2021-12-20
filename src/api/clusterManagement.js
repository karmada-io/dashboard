import request from '@/utils/request'

// 调度策略管理--分发策略1
export function getPropagationPolicies(query) {
  return request({
    url: '/apis/policy.karmada.io/v1alpha1/propagationpolicies',
    method: 'get',
    params: query
  })
}

// 调度策略管理--分发策略2
export function getPropagationPolicies2(query) {
  return request({
    url: '/apis/policy.karmada.io/v1alpha1/clusterpropagationpolicies',
    method: 'get',
    params: query
  })
}

// 调度策略管理--Override策略
export function getOverridePolicies(query) {
  return request({
    url: '/apis/policy.karmada.io/v1alpha1/overridepolicies',
    method: 'get',
    params: query
  })
}

// 集群管理
export function getClusters(query) {
  return request({
    url: '/apis/cluster.karmada.io/v1alpha1/clusters',
    method: 'get',
    params: query
  })
}
