import {
  convertDataSelectQuery,
  DataSelectQuery,
  IResponse,
  karmadaClient,
  ObjectMeta,
  Selector,
  TypeMeta,
} from '@/services/base.ts';

export enum Protocol {
  TCP = 'TCP',
  UDP = 'UDP',
  SCTP = 'SCTP',
}

export enum ServiceType {
  ClusterIP = 'ClusterIP',
  NodePort = 'NodePort',
  LoadBalancer = 'LoadBalancer',
  ExternalName = 'ExternalName',
}

export interface ServicePort {
  port: number;
  protocol: Protocol;
  nodePort: number;
}

export interface Endpoint {
  host: string;
  ports: ServicePort[];
}

export interface Service {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  internalEndpoint: Endpoint;
  externalEndpoints: Endpoint[];
  selector: Selector;
  type: ServiceType;
  clusterIP: string;
}

export async function GetServices(params: {
  namespace?: string;
  keyword?: string;
}) {
  const { namespace, keyword } = params;
  const url = namespace ? `/service/${namespace}` : `/service`;
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
      services: Service[];
    }>
  >(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
}

export interface Ingress {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  selector: Selector;
}
export async function GetIngress(params: {
  namespace?: string;
  keyword?: string;
}) {
  const { namespace, keyword } = params;
  const url = namespace ? `/ingress/${namespace}` : `/ingress`;
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
      services: Ingress[];
    }>
  >(url, {
    params: convertDataSelectQuery(requestData),
  });
  return resp.data;
}

export const propagationpolicyKey = 'propagationpolicy.karmada.io/name';
// safely extract propagationpolicy
export const extractPropagationPolicy = (r: { objectMeta: ObjectMeta }) => {
  if (!r?.objectMeta?.annotations?.[propagationpolicyKey]) {
    return '';
  }
  return r?.objectMeta?.annotations?.[propagationpolicyKey];
};
