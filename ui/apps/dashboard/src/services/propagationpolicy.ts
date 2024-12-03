import {
  convertDataSelectQuery,
  DataSelectQuery,
  IResponse,
  karmadaClient,
  ObjectMeta,
  TypeMeta,
} from './base';

export interface PropagationPolicy {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  schedulerName: string;
  clusterAffinity: ClusterAffinity;
  deployments: string[];
}

export interface ClusterAffinity {
  clusterNames: string[];
}

export async function GetPropagationPolicies(params: {
  namespace?: string;
  keyword?: string;
}) {
  const { namespace } = params;
  const url = namespace
    ? `/propagationpolicy/${namespace}`
    : '/propagationpolicy';
  const requestData = {} as DataSelectQuery;
  if (params.keyword) {
    requestData.filterBy = ['name', params.keyword];
  }
  const resp = await karmadaClient.get<
    IResponse<{
      errors: string[];
      listMeta: {
        totalItems: number;
      };
      propagationpolicys: PropagationPolicy[];
    }>
  >(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
}

export async function GetPropagationPolicyDetail(params: {
  namespace: string;
  name: string;
}) {
  const { name, namespace } = params;
  const url = `/propagationpolicy/namespace/${namespace}/${name}`;
  const resp = await karmadaClient.get<IResponse<PropagationPolicy>>(url);
  return resp.data;
}

export async function CreatePropagationPolicy(params: {
  isClusterScope: boolean;
  namespace: string;
  name: string;
  propagationData: string;
}) {
  const resp = await karmadaClient.post<IResponse<string>>(
    '/propagationpolicy',
    params,
  );
  return resp.data;
}

export async function UpdatePropagationPolicy(params: {
  isClusterScope: boolean;
  namespace: string;
  name: string;
  propagationData: string;
}) {
  const resp = await karmadaClient.put<IResponse<string>>(
    '/propagationpolicy',
    params,
  );
  return resp.data;
}

export async function DeletePropagationPolicy(params: {
  isClusterScope: boolean;
  namespace: string;
  name: string;
}) {
  const resp = await karmadaClient.delete<IResponse<string>>(
    '/propagationpolicy',
    {
      data: params,
    },
  );
  return resp.data;
}

export interface ClusterPropagationPolicy {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  schedulerName: string;
  clusterAffinity: ClusterAffinity;
  deployments: string[];
}
export async function GetClusterPropagationPolicies(params: {
  keyword?: string;
}) {
  const requestData = {} as DataSelectQuery;
  if (params.keyword) {
    requestData.filterBy = ['name', params.keyword];
  }
  const resp = await karmadaClient.get<
    IResponse<{
      errors: string[];
      listMeta: {
        totalItems: number;
      };
      clusterPropagationPolicies: ClusterPropagationPolicy[];
    }>
  >('/clusterpropagationpolicy', {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
}
