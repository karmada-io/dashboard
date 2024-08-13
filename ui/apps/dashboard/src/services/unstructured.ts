import { IResponse, karmadaClient } from './base';

export async function DeleteResource(params: UnstructuredParams) {
  const url = generateUrlForUnstructuredParams(params);
  const resp = await karmadaClient.delete<IResponse<any>>(url);
  return resp.data;
}

export async function GetResource(params: UnstructuredParams) {
  const url = generateUrlForUnstructuredParams(params);
  const resp = await karmadaClient.get<IResponse<any>>(url);
  return resp.data;
}

export async function PutResource(
  params: UnstructuredParams & {
    content: Record<string, any>;
  },
) {
  const url = generateUrlForUnstructuredParams(params);
  const resp = await karmadaClient.put<IResponse<any>>(url, params.content);
  return resp.data;
}

interface UnstructuredParams {
  kind: string;
  name: string;
  namespace?: string;
}

function generateUrlForUnstructuredParams(params: UnstructuredParams) {
  const { kind, name, namespace } = params;
  if (namespace) {
    return `/_raw/${kind}/namespace/${namespace}/name/${name}`;
  } else {
    return `/_raw/${kind}/name/${name}`;
  }
}

export async function CreateResource(
  params: UnstructuredParams & {
    content: Record<string, any>;
  },
) {
  const url = generateUrlForUnstructuredParams(params);
  const resp = await karmadaClient.post<IResponse<any>>(url, params.content);
  return resp.data;
}
