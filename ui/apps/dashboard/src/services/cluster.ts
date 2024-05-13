import {karmadaClient} from './base'

export interface ObjectMeta {
    name: string,
    creationTimestamp: string,
    uid: string
}

export interface TypeMeta {
    kind: string,
}

export interface NodeSummary {
    totalNum: number,
    readyNum: number
}

export interface AllocatedResources {
    cpuCapacity: number,
    cpuFraction: number,
    memoryCapacity: number,
    memoryFraction: number,
    allocatedPods: number,
    podCapacity: number,
    podFraction: number,
}

export interface Cluster {
    objectMeta: ObjectMeta,
    typeMeta: TypeMeta,
    ready: boolean,
    kubernetesVersion: string,
    syncMode: 'Pull' | 'Push',
    nodeSummary: NodeSummary,
    allocatedResources: AllocatedResources,
}

export interface ListClusterResp {
    listMeta: {
        totalItems: number
    },
    clusters: Cluster[],
    errors: string[]
}

export async function GetClusters() {
    const resp = await karmadaClient.get<ListClusterResp>(
        "/cluster"
    )
    return resp
}
