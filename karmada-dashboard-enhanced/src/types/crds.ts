import { ObjectMeta } from './storage';

export interface CustomResourceDefinitionNames {
  plural: string;
  singular: string;
  kind: string;
  listKind: string;
}

export interface CustomResourceDefinitionVersion {
  name: string;
  served: boolean;
  storage: boolean;
}

export interface CustomResourceDefinition {
  objectMeta: ObjectMeta;
  group: string;
  scope: string;
  names: CustomResourceDefinitionNames;
  versions: CustomResourceDefinitionVersion[];
}

export interface TypeMeta {
  kind: string;
  apiVersion: string;
}

export interface CustomResourceObject {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
}

export interface CrdList {
  items: CustomResourceDefinition[];
}

export interface CrdObjectList {
  items: CustomResourceObject[];
}
