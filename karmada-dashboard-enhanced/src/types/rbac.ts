import { ObjectMeta } from './storage';

export interface PolicyRule {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
}

export interface Role {
  objectMeta: ObjectMeta;
  rules: PolicyRule[];
}

export interface ClusterRole extends Role {}

export interface Subject {
  kind: string;
  name: string;
  namespace?: string;
}

export interface RoleRef {
  kind: string;
  name: string;
  apiGroup: string;
}

export interface RoleBinding {
  objectMeta: ObjectMeta;
  subjects: Subject[];
  roleRef: RoleRef;
}

export interface ClusterRoleBinding extends RoleBinding {}

export interface ServiceAccount {
  objectMeta: ObjectMeta;
}

export interface RoleList {
  items: Role[];
}

export interface ClusterRoleList {
  items: ClusterRole[];
}

export interface RoleBindingList {
  items: RoleBinding[];
}

export interface ClusterRoleBindingList {
  items: ClusterRoleBinding[];
}

export interface ServiceAccountList {
  items: ServiceAccount[];
}
