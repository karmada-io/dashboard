// Base API types
export interface APIResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface ListMeta {
  totalItems: number;
}

export interface DataSelectQuery {
  filterBy?: string[];
  sortBy?: string[];
  itemsPerPage?: number;
  page?: number;
}

// Kubernetes base types
export interface ObjectMeta {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  creationTimestamp: string;
  uid: string;
}

export interface TypeMeta {
  kind: string;
  scalable?: boolean;
  restartable?: boolean;
}

// Cluster types
export interface Cluster {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  ready: boolean;
  kubernetesVersion: string;
  syncMode: 'Pull' | 'Push';
  nodeSummary: NodeSummary;
  allocatedResources: AllocatedResources;
  taints?: TaintParam[];
}

export interface NodeSummary {
  totalNum: number;
  readyNum: number;
}

export interface AllocatedResources {
  cpuCapacity: number;
  cpuFraction: number;
  memoryCapacity: number;
  memoryFraction: number;
  allocatedPods: number;
  podCapacity: number;
  podFraction: number;
}

export interface TaintParam {
  key: string;
  value: string;
  effect: string;
}

export interface LabelParam {
  key: string;
  value: string;
}

// Workload types
export enum WorkloadKind {
  Deployment = 'deployment',
  StatefulSet = 'statefulset',
  DaemonSet = 'daemonset',
  Job = 'job',
  CronJob = 'cronjob',
}

export interface Workload {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  pods: PodSummary;
  containerImages: string[];
  initContainerImages: string[];
}

export interface PodSummary {
  current: number;
  desired: number;
  running: number;
  pending: number;
  failed: number;
  succeeded: number;
  warnings: any[];
}

// Policy types
export interface PropagationPolicy {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  schedulerName: string;
  clusterAffinity: ClusterAffinity;
  relatedResources: string[];
}

export interface ClusterAffinity {
  clusterNames: string[];
}

export interface OverridePolicy {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  resourceSelectors: ResourceSelector[];
  overrideRules: OverrideRule[];
}

export interface ResourceSelector {
  apiVersion: string;
  kind: string;
  namespace: string;
  name: string;
  labelSelector: Record<string, string>;
}

export interface OverrideRule {
  targetCluster: ClusterAffinity;
  overriders: Overriders;
}

export interface Overriders {
  imageOverrider: ImageOverrider[];
  commandOverrider: CommandOverrider[];
  argsOverrider: ArgsOverrider[];
  labelsOverrider: LabelsOverrider[];
  annotationsOverrider: AnnotationsOverrider[];
  plaintextOverrider: PlaintextOverrider[];
}

export interface ImageOverrider {
  operator: 'add' | 'remove' | 'replace';
  component: 'Registry' | 'Repository' | 'Tag';
  value: string;
}

export interface CommandOverrider {
  containerName: string;
  operator: 'add' | 'remove';
  value: string[];
}

export interface ArgsOverrider {
  containerName: string;
  operator: 'add' | 'remove';
  value: string[];
}

export interface LabelsOverrider {
  operator: 'add' | 'remove' | 'replace';
  value: Record<string, string>;
}

export interface AnnotationsOverrider {
  operator: 'add' | 'remove' | 'replace';
  value: Record<string, string>;
}

export interface PlaintextOverrider {
  operator: 'add' | 'remove' | 'replace';
  path: string;
  value: string;
}

// Service types
export interface Service {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  internalEndpoint: Endpoint;
  externalEndpoints: Endpoint[];
  selector: Record<string, string>;
  type: ServiceType;
  clusterIP: string;
}

export enum ServiceType {
  ClusterIP = 'ClusterIP',
  NodePort = 'NodePort',
  LoadBalancer = 'LoadBalancer',
  ExternalName = 'ExternalName',
}

export interface Endpoint {
  host: string;
  ports: ServicePort[];
}

export interface ServicePort {
  port: number;
  protocol: Protocol;
  nodePort: number;
}

export enum Protocol {
  TCP = 'TCP',
  UDP = 'UDP',
  SCTP = 'SCTP',
}

// Namespace types
export interface Namespace {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  phase: string;
  skipAutoPropagation: boolean;
}

// Config types
export interface ConfigMap {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  data: Record<string, string>;
}

export interface Secret {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  type: string;
  data: Record<string, string>;
}

// Overview types
export interface OverviewInfo {
  karmadaInfo: KarmadaInfo;
  memberClusterStatus: MemberClusterStatus;
  clusterResourceStatus: ClusterResourceStatus;
}

export interface KarmadaInfo {
  version: Version;
  status: string;
  createTime: string;
}

export interface Version {
  gitVersion: string;
  gitCommit: string;
  gitTreeState: string;
  buildDate: string;
  goVersion: string;
  compiler: string;
  platform: string;
}

export interface MemberClusterStatus {
  nodeSummary: NodeSummary;
  cpuSummary: CpuSummary;
  memorySummary: MemorySummary;
  podSummary: {
    totalPod: number;
    allocatedPod: number;
  };
}

export interface CpuSummary {
  totalCPU: number;
  allocatedCPU: number;
}

export interface MemorySummary {
  totalMemory: number;
  allocatedMemory: number;
}

export interface ClusterResourceStatus {
  propagationPolicyNum: number;
  overridePolicyNum: number;
  namespaceNum: number;
  workloadNum: number;
  serviceNum: number;
  configNum: number;
}

// Auth types
export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  authenticated: boolean;
}

export interface LoginCredentials {
  token: string;
}

// Dashboard Config types
export interface DashboardConfig {
  docker_registries: DockerRegistry[];
  chart_registries: ChartRegistry[];
  menu_configs: MenuConfig[];
}

export interface DockerRegistry {
  name: string;
  url: string;
  user: string;
  password: string;
  add_time: number;
}

export interface ChartRegistry {
  name: string;
  url: string;
  user: string;
  password: string;
  add_time: number;
}

export interface MenuConfig {
  path: string;
  enable: boolean;
  sidebar_key: string;
  children: MenuConfig[];
}

// Terminal types
export interface TerminalSession {
  namespace: string;
  podName: string;
  container: string;
}

// Enhanced types for enterprise features
export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  namespace?: string;
  details: Record<string, any>;
  result: 'success' | 'failure';
}

export interface CostMetrics {
  cluster: string;
  namespace?: string;
  resource: string;
  cost: number;
  currency: string;
  period: string;
  timestamp: string;
}

export interface ResourceQuota {
  namespace: string;
  hard: Record<string, string>;
  used: Record<string, string>;
}

export interface NetworkPolicy {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  spec: {
    podSelector: Record<string, string>;
    policyTypes: string[];
    ingress: any[];
    egress: any[];
  };
}

// Chart/Monitoring types
export interface MetricData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

// Enhanced features types
export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  acknowledged: boolean;
  source: string;
}

export interface BackupPolicy {
  objectMeta: ObjectMeta;
  schedule: string;
  retention: string;
  targets: string[];
  lastBackup?: string;
  status: 'active' | 'paused' | 'failed';
}