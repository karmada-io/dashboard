import { ObjectMeta } from './storage';

export interface Endpoint {
  host: string;
  ports: {
    port: number;
    protocol: string;
  }[];
}

export interface Service {
  objectMeta: ObjectMeta;
  type: string;
  clusterIP: string;
  internalEndpoint: Endpoint;
  externalEndpoints: Endpoint[];
}

export interface Ingress {
  objectMeta: ObjectMeta;
  hosts: string[];
  endpoints: Endpoint[];
}

export interface LabelSelector {
  matchLabels?: { [key: string]: string };
}

export interface NetworkPolicy {
  objectMeta: ObjectMeta;
  podSelector: LabelSelector;
}

export interface ServiceList {
  items: Service[];
}

export interface IngressList {
  items: Ingress[];
}

export interface NetworkPolicyList {
  items: NetworkPolicy[];
}
