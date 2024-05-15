import {IResponse, karmadaClient, ObjectMeta, TypeMeta} from './base';

export interface PropagationPolicy {
    objectMeta: ObjectMeta
    typeMeta: TypeMeta
    schedulerName: string
    clusterAffinity: ClusterAffinity
    deployments: string[]
}

export interface ClusterAffinity {
    clusterNames: string[]
}

export async function GetPropagationPolicies() {
    const resp = await karmadaClient.get<IResponse<{
        errors: string[]
        listMeta: {
            totalItems: number
        }
        propagationpolicys: PropagationPolicy[]
    }>>(
        "/propagationpolicy"
    )
    return resp.data
}

export async function GetPropagationPolicyDetail(params: {
    namespace: string,
    name: string
}) {
    const {name, namespace} = params
    const url = `/propagationpolicy/namespace/${namespace}/${name}`
    const resp = await karmadaClient.get<IResponse<PropagationPolicy>>(
        url
    )
    return resp.data
}

export async function CreatePropagationPolicy(params: {
    isClusterScope: boolean,
    namespace: string,
    name: string,
    propagationData: string,
}) {
    const resp = await karmadaClient.post<IResponse<string>>(
        '/propagationpolicy', params
    )
    return resp.data
}

export async function UpdatePropagationPolicy(params: {
    isClusterScope: boolean,
    namespace: string,
    name: string,
    propagationData: string,
}) {
    const resp = await karmadaClient.put<IResponse<string>>(
        '/propagationpolicy', params
    )
    return resp.data
}

export async function DeletePropagationPolicy(params: {
    isClusterScope: boolean,
    namespace: string,
    name: string,
}) {
    const resp = await karmadaClient.delete<IResponse<string>>(
        '/propagationpolicy',
        {
            data: params
        }
    )
    return resp.data
}
