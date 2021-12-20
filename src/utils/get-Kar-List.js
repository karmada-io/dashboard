import {
  getPropagationPolicies,
  getPropagationPolicies2,
  getOverridePolicies,
  getClusters
} from '@/api/clusterManagement'

const getDistributionList = () => {
  const listResult = []
  let total = 0
  return new Promise(function(resolve) {
    getPropagationPolicies().then(res => {
      const { items } = res
      items.forEach((n) => {
        listResult.push({
          name: n.metadata.name,
          status: '',
          namespace: n.metadata.namespace,
          kind: n.kind === 'PropagationPolicy' ? 'no' : 'yes',
          clusterNames: n.spec.placement.clusterAffinity.clusterNames.join('/'),
          replicaDivisionPreference: n.spec.placement.replicaScheduling.replicaDivisionPreference,
          replicaSchedulingType: n.spec.placement.replicaScheduling.replicaSchedulingType
        })
      })
      total += items.length
      getPropagationPolicies2().then(res => {
        const { items } = res
        items.forEach((n) => {
          listResult.push({
            name: n.metadata.name,
            status: '',
            namespace: n.metadata.namespace,
            kind: n.kind === 'PropagationPolicy' ? 'no' : 'yes',
            clusterNames: n.spec.placement.clusterAffinity.clusterNames.join('/'),
            replicaDivisionPreference: n.spec.placement.replicaScheduling.replicaDivisionPreference,
            replicaSchedulingType: n.spec.placement.replicaScheduling.replicaSchedulingType
          })
        })
        total += items.length
        resolve({ total, rows: listResult })
      })
    })
  })
}

const getOverrideList = () => {
  const listResult = []
  let total = 0
  return new Promise(function(resolve) {
    getOverridePolicies().then(res => {
      const { items } = res
      items.forEach((n) => {
        listResult.push({
          name: n.metadata.name,
          status: '',
          namespace: n.metadata.namespace,
          resourceSelectors: n.spec.resourceSelectors.map(r => r.kind + '/' + r.name).join('、'),
          targetCluster: 'region:' + n.spec.targetCluster.labelSelector.matchLabels['failuredomain.kubernetes.io/region'] + '/' + n.spec.targetCluster.clusterNames.join('、'),
          content: n.spec.overriders
        })
      })
      total = items.length
      resolve({ total, rows: listResult })
    })
  })
}

const getClustersList = () => {
  const listResult = []
  let total = 0
  return new Promise(function(resolve) {
    getClusters().then(res => {
      const { items } = res
      items.forEach((n) => {
        listResult.push({
          name: n.metadata.name,
          tag: '',
          desc: '',
          node: n.status.nodeSummary?.readyNum + '/' + n.status.nodeSummary?.totalNum,
          method: n.spec.syncMode,
          tactics: '',
          status: n.status.conditions.map(r => r.type).join('、'),
          version: n.status.kubernetesVersion,
          time: n.metadata.creationTimestamp
        })
      })
      total = items.length
    })
    resolve({ total, rows: listResult })
  })
}

export default { getDistributionList, getOverrideList, getClustersList }
