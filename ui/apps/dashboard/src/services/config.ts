import {
  convertDataSelectQuery,
  DataSelectQuery,
  IResponse,
  karmadaClient,
  ObjectMeta,
  TypeMeta,
} from '@/services/base.ts';

export interface Config {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
}

export async function GetConfigMaps(params: {
  namespace?: string;
  keyword?: string;
}) {
  const { namespace, keyword } = params;
  const url = namespace ? `/configmap/${namespace}` : `/configmap`;
  const requestData = {} as DataSelectQuery;
  if (keyword) {
    requestData.filterBy = ['name', keyword];
  }
  const resp = await karmadaClient.get<
    IResponse<{
      errors: string[];
      listMeta: {
        totalItems: number;
      };
      items: Config[];
    }>
  >(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
}
