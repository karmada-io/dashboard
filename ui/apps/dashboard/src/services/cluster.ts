import {IResponse, karmadaClient} from './base'

export interface ObjectMeta {
    name: string,
    creationTimestamp: string,
    uid: string
    labels?: Record<string, string>
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

export interface ClusterDetail extends Cluster {
    taints: TaintParam[]
}

export async function GetClusters() {
    const resp = await karmadaClient.get<IResponse<ListClusterResp>>(
        "/cluster"
    )
    return resp.data
}

export async function GetClusterDetail(clusterName: string) {
    const resp = await karmadaClient.get<IResponse<ClusterDetail>>(
        `/cluster/${clusterName}`
    )
    return resp.data
}

export async function CreateCluster(params: {
    kubeconfig: string,
    clusterName: string,
    mode: 'Push' | 'Pull'
}) {
    // /api/v1/cluster
    const resp = await karmadaClient.post<IResponse<string>>(
        `/cluster`, {
            memberClusterKubeconfig: params.kubeconfig,
            memberClusterName: params.clusterName,
            syncMode: params.mode
        }
    )
    return resp.data
}

export interface LabelParam {
    key: string;
    value: string;
}

export interface TaintParam {
    key: string;
    value: string;
    effect: string;
}

export async function UpdateCluster(params: {
    clusterName: string;
    labels: LabelParam[],
    taints: TaintParam[]
}) {
    const {clusterName, ...restParams} = params
    const resp = await karmadaClient.put<IResponse<ClusterDetail>>(
        `/cluster/${clusterName}`,
        restParams
    )
    return resp.data
}

export async function DeleteCluster(clusterName: string) {
    const resp = await karmadaClient.delete<IResponse<ClusterDetail>>(
        `/cluster/${clusterName}`,
    )
    return resp.data
}