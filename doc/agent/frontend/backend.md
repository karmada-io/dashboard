# Karmada-Manager 前端所需后端API接口规范

## 1. 文档信息

### 1.1 版本历史

| 版本号 | 日期 | 作者 | 变更说明 |
|--------|------|------|----------|
| 1.0 | 2025-01-XX | 前端开发工程师 | 前端需求驱动的API接口设计 |

### 1.2 文档目的

基于前端页面设计和用户操作流程，定义Karmada-Manager前端所需的后端API接口规范，为后端开发提供明确的接口设计指导。

## 2. 接口设计原则

### 2.1 RESTful API设计
- 使用标准HTTP方法 (GET, POST, PUT, DELETE)
- 语义化的URL路径设计
- 统一的响应格式
- 适当的HTTP状态码

### 2.2 响应格式统一
```typescript
interface APIResponse<T> {
  code: number;           // 业务状态码
  message: string;        // 响应消息
  data: T;               // 具体数据
  timestamp?: number;     // 时间戳
  requestId?: string;     // 请求ID
}
```

### 2.3 分页格式统一
```typescript
interface PaginatedResponse<T> {
  listMeta: {
    totalItems: number;
    currentPage?: number;
    pageSize?: number;
  };
  items: T[];
  errors?: string[];
}
```

## 3. 用户认证和权限

### 3.1 用户登录
```
POST /api/v1/auth/login
```

**请求体:**
```typescript
interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}
```

**响应:**
```typescript
interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
    lastLoginTime: string;
  };
  expiresIn: number;
}
```

### 3.2 用户登出
```
POST /api/v1/auth/logout
```

### 3.3 刷新Token
```
POST /api/v1/auth/refresh
```

### 3.4 获取用户信息
```
GET /api/v1/auth/me
```

## 4. 系统概览接口

### 4.1 获取系统概览 (已存在 - 需要增强)
```
GET /api/v1/overview
```

**需要增强的响应数据:**
```typescript
interface OverviewResponse {
  karmadaInfo: {
    version: VersionInfo;
    status: 'running' | 'stopped' | 'error';
    createTime: string;
    uptime: number;           // 运行时长(秒)
    components: {             // 组件状态
      apiServer: ComponentStatus;
      scheduler: ComponentStatus;
      controllerManager: ComponentStatus;
      webhook: ComponentStatus;
    };
  };
  memberClusterStatus: {
    totalClusters: number;
    readyClusters: number;
    nodeSummary: NodeSummary;
    cpuSummary: ResourceSummary;
    memorySummary: ResourceSummary;
    podSummary: PodSummary;
  };
  recentEvents: Event[];      // 最近事件
  alerts: Alert[];           // 告警信息
}

interface ComponentStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  lastHeartbeat?: string;
}

interface Alert {
  level: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  source: string;
}
```

### 4.2 获取系统指标趋势
```
GET /api/v1/overview/metrics?timeRange=1h&step=5m
```

**响应:**
```typescript
interface MetricsTrendResponse {
  timeRange: {
    start: string;
    end: string;
    step: string;
  };
  metrics: {
    cpuUsage: MetricPoint[];
    memoryUsage: MetricPoint[];
    podCount: MetricPoint[];
    clusterHealth: MetricPoint[];
  };
}

interface MetricPoint {
  timestamp: number;
  value: number;
}
```

## 5. 集群管理接口

### 5.1 获取集群列表 (已存在 - 需要增强)
```
GET /api/v1/clusters?search=&status=&page=1&size=20
```

**需要增强的响应数据:**
```typescript
interface ClusterListResponse {
  listMeta: {
    totalItems: number;
    currentPage: number;
    pageSize: number;
  };
  clusters: EnhancedCluster[];
  errors: string[];
}

interface EnhancedCluster extends Cluster {
  healthScore: number;        // 健康评分 0-100
  lastHeartbeat: string;      // 最后心跳时间
  networkLatency: number;     // 网络延迟(ms)
  alerts: {                  // 告警统计
    critical: number;
    warning: number;
  };
  resourceTrend: {           // 资源趋势(最近24小时)
    cpuTrend: 'up' | 'down' | 'stable';
    memoryTrend: 'up' | 'down' | 'stable';
  };
}
```

### 5.2 获取集群详情 (已存在 - 需要增强)
```
GET /api/v1/clusters/{clusterName}
```

**需要增强的响应数据:**
```typescript
interface ClusterDetailResponse extends EnhancedCluster {
  resourceQuota: {           // 资源配额
    cpuQuota: ResourceQuota;
    memoryQuota: ResourceQuota;
    storageQuota: ResourceQuota;
  };
  events: Event[];           // 最近事件
  conditions: Condition[];   // 集群状态条件
  metrics: {                // 实时指标
    cpuUsageHistory: MetricPoint[];
    memoryUsageHistory: MetricPoint[];
    networkIO: NetworkMetrics;
    diskIO: DiskMetrics;
  };
}

interface ResourceQuota {
  hard: number;
  used: number;
  available: number;
}

interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
}
```

### 5.3 获取集群事件
```
GET /api/v1/clusters/{clusterName}/events?type=&level=&since=1h
```

### 5.4 获取集群指标历史
```
GET /api/v1/clusters/{clusterName}/metrics?metric=cpu,memory&timeRange=24h&step=1h
```

## 6. 节点管理接口

### 6.1 获取节点列表 (已存在 - 需要增强)
```
GET /api/v1/member/{clusterName}/nodes?search=&status=&role=
```

**需要增强的响应数据:**
```typescript
interface NodeListResponse {
  listMeta: {
    totalItems: number;
  };
  nodes: EnhancedNode[];
  errors: string[];
}

interface EnhancedNode extends Node {
  healthScore: number;
  uptime: number;           // 运行时长
  lastHeartbeat: string;
  metrics: {
    cpuUsagePercent: number;
    memoryUsagePercent: number;
    diskUsagePercent: number;
    networkLoad: number;
  };
  taints: Taint[];
  conditions: Condition[];
  podDistribution: {        // Pod分布
    running: number;
    pending: number;
    failed: number;
    succeeded: number;
  };
}
```

### 6.2 获取节点详情
```
GET /api/v1/member/{clusterName}/nodes/{nodeName}
```

**响应:**
```typescript
interface NodeDetailResponse extends EnhancedNode {
  systemInfo: {
    kernelVersion: string;
    osImage: string;
    containerRuntimeVersion: string;
    kubeletVersion: string;
    kubeProxyVersion: string;
  };
  allocatedResources: {
    requests: ResourceRequests;
    limits: ResourceLimits;
  };
  events: Event[];
  pods: PodSummary[];       // 在该节点上的Pod
  metrics: {
    cpuHistory: MetricPoint[];
    memoryHistory: MetricPoint[];
    diskHistory: MetricPoint[];
    networkHistory: NetworkMetrics[];
  };
}
```

### 6.3 获取节点上的Pod列表
```
GET /api/v1/member/{clusterName}/nodes/{nodeName}/pods
```

### 6.4 获取节点指标
```
GET /api/v1/member/{clusterName}/nodes/{nodeName}/metrics?metric=&timeRange=1h
```

## 7. Pod管理接口

### 7.1 获取Pod列表
```
GET /api/v1/member/{clusterName}/pods?namespace=&search=&status=&node=
```

**响应:**
```typescript
interface PodListResponse {
  listMeta: {
    totalItems: number;
  };
  pods: EnhancedPod[];
  errors: string[];
}

interface EnhancedPod {
  objectMeta: ObjectMeta;
  status: PodStatus;
  spec: PodSpec;
  node: string;
  clusterName: string;
  
  // 增强信息
  age: string;
  restartCount: number;
  cpuUsage: number;
  memoryUsage: number;
  
  // 调度信息
  schedulingInfo: {
    workloadName?: string;
    workloadKind?: string;
    propagationPolicy?: string;
    overridePolicy?: string;
    schedulingDecision: SchedulingDecision;
  };
}

interface SchedulingDecision {
  reason: string;
  message: string;
  scheduledBy: 'karmada' | 'kubernetes';
  schedulingTime: string;
}
```

### 7.2 获取Pod详情
```
GET /api/v1/member/{clusterName}/pods/{namespace}/{podName}
```

### 7.3 获取Pod日志
```
GET /api/v1/member/{clusterName}/pods/{namespace}/{podName}/logs?container=&since=1h&tail=1000&follow=false
```

### 7.4 获取Pod事件
```
GET /api/v1/member/{clusterName}/pods/{namespace}/{podName}/events
```

### 7.5 获取Pod调度追溯
```
GET /api/v1/member/{clusterName}/pods/{namespace}/{podName}/scheduling-trace
```

**响应:**
```typescript
interface SchedulingTraceResponse {
  pod: PodSummary;
  workload: {
    name: string;
    kind: string;
    namespace: string;
    cluster: string;        // 原始集群
  };
  propagationPolicy: {
    name: string;
    targetClusters: string[];
    replicaScheduling: ReplicaScheduling;
    clusterSelection: ClusterSelection;
  };
  overridePolicy?: {
    name: string;
    overrides: Override[];
  };
  schedulingPath: SchedulingStep[];
  finalPlacement: {
    cluster: string;
    node: string;
    reason: string;
    timestamp: string;
  };
}

interface SchedulingStep {
  step: number;
  action: string;
  description: string;
  result: string;
  timestamp: string;
}
```

## 8. 工作负载管理接口

### 8.1 获取工作负载列表
```
GET /api/v1/workloads?type=&namespace=&cluster=&search=&status=
```

**响应:**
```typescript
interface WorkloadListResponse {
  listMeta: {
    totalItems: number;
  };
  workloads: WorkloadSummary[];
  errors: string[];
}

interface WorkloadSummary {
  objectMeta: ObjectMeta;
  kind: string;
  namespace: string;
  
  // 多集群信息
  clusters: string[];
  totalReplicas: number;
  readyReplicas: number;
  
  // 调度策略
  propagationPolicy?: string;
  overridePolicy?: string;
  
  // 分布情况
  distribution: ClusterDistribution[];
  
  // 状态
  status: 'running' | 'pending' | 'error' | 'scaling';
  age: string;
}

interface ClusterDistribution {
  cluster: string;
  replicas: number;
  readyReplicas: number;
  status: string;
}
```

### 8.2 获取工作负载详情
```
GET /api/v1/workloads/{kind}/{namespace}/{name}
```

### 8.3 获取工作负载的Pod列表
```
GET /api/v1/workloads/{kind}/{namespace}/{name}/pods
```

### 8.4 获取工作负载调度分析
```
GET /api/v1/workloads/{kind}/{namespace}/{name}/scheduling-analysis
```

**响应:**
```typescript
interface SchedulingAnalysisResponse {
  workload: WorkloadSummary;
  propagationPolicy: PropagationPolicyDetail;
  schedulingResult: {
    plannedDistribution: PlannedDistribution[];
    actualDistribution: ClusterDistribution[];
    variance: DistributionVariance[];
  };
  clusterAnalysis: ClusterAnalysis[];
  recommendations: Recommendation[];
}

interface PlannedDistribution {
  cluster: string;
  plannedReplicas: number;
  weight?: number;
  reason: string;
}

interface ClusterAnalysis {
  cluster: string;
  suitability: number;      // 适合度评分 0-100
  reasons: string[];
  resourceAvailability: ResourceAvailability;
  constraints: Constraint[];
}
```

## 9. 策略管理接口

### 9.1 获取传播策略列表
```
GET /api/v1/propagation-policies?namespace=&search=
```

**响应:**
```typescript
interface PropagationPolicyListResponse {
  listMeta: {
    totalItems: number;
  };
  policies: PropagationPolicySummary[];
  errors: string[];
}

interface PropagationPolicySummary {
  objectMeta: ObjectMeta;
  spec: PropagationPolicySpec;
  
  // 状态信息
  affectedWorkloads: number;
  targetClusters: string[];
  status: 'active' | 'inactive' | 'error';
  lastApplied: string;
}
```

### 9.2 获取传播策略详情
```
GET /api/v1/propagation-policies/{namespace}/{name}
```

### 9.3 创建传播策略
```
POST /api/v1/propagation-policies
```

### 9.4 更新传播策略
```
PUT /api/v1/propagation-policies/{namespace}/{name}
```

### 9.5 删除传播策略
```
DELETE /api/v1/propagation-policies/{namespace}/{name}
```

### 9.6 预览策略效果
```
POST /api/v1/propagation-policies/preview
```

**请求体:**
```typescript
interface PolicyPreviewRequest {
  policy: PropagationPolicySpec;
  dryRun: boolean;
}
```

**响应:**
```typescript
interface PolicyPreviewResponse {
  affectedWorkloads: WorkloadImpact[];
  schedulingPlan: SchedulingPlan[];
  warnings: string[];
  errors: string[];
}

interface WorkloadImpact {
  workload: WorkloadReference;
  currentDistribution: ClusterDistribution[];
  plannedDistribution: PlannedDistribution[];
  impact: 'none' | 'minor' | 'major';
}
```

### 9.7 覆盖策略相关接口
覆盖策略的接口设计类似传播策略，将 `propagation-policies` 替换为 `override-policies`。

## 10. 调度信息接口

### 10.1 获取调度概览
```
GET /api/v1/scheduling/overview
```

**响应:**
```typescript
interface SchedulingOverviewResponse {
  totalWorkloads: number;
  scheduledWorkloads: number;
  pendingWorkloads: number;
  failedWorkloads: number;
  
  clusterUtilization: ClusterUtilization[];
  schedulingMetrics: {
    averageSchedulingLatency: number;
    schedulingSuccessRate: number;
    rebalancingEvents: number;
  };
  
  recentSchedulingEvents: SchedulingEvent[];
}

interface ClusterUtilization {
  cluster: string;
  cpuUtilization: number;
  memoryUtilization: number;
  podCount: number;
  score: number;           // 集群评分
}

interface SchedulingEvent {
  timestamp: string;
  type: 'scheduled' | 'rescheduled' | 'failed';
  workload: WorkloadReference;
  fromCluster?: string;
  toCluster: string;
  reason: string;
}
```

### 10.2 获取调度决策日志
```
GET /api/v1/scheduling/decisions?workload=&cluster=&since=1h&type=
```

### 10.3 获取集群调度能力
```
GET /api/v1/scheduling/cluster-capacity
```

## 11. 命名空间管理接口

### 11.1 获取命名空间列表
```
GET /api/v1/namespaces?cluster=&search=
```

### 11.2 获取命名空间详情
```
GET /api/v1/namespaces/{cluster}/{namespace}
```

### 11.3 获取命名空间资源统计
```
GET /api/v1/namespaces/{cluster}/{namespace}/resources
```

## 12. 配置管理接口

### 12.1 获取ConfigMap列表
```
GET /api/v1/member/{clusterName}/configmaps?namespace=&search=
```

### 12.2 获取Secret列表
```
GET /api/v1/member/{clusterName}/secrets?namespace=&search=
```

### 12.3 获取配置详情
```
GET /api/v1/member/{clusterName}/configmaps/{namespace}/{name}
GET /api/v1/member/{clusterName}/secrets/{namespace}/{name}
```

### 12.4 更新配置
```
PUT /api/v1/member/{clusterName}/configmaps/{namespace}/{name}
PUT /api/v1/member/{clusterName}/secrets/{namespace}/{name}
```

## 13. 服务管理接口

### 13.1 获取服务列表
```
GET /api/v1/member/{clusterName}/services?namespace=&search=&type=
```

### 13.2 获取Ingress列表
```
GET /api/v1/member/{clusterName}/ingresses?namespace=&search=
```

### 13.3 获取端点信息
```
GET /api/v1/member/{clusterName}/services/{namespace}/{name}/endpoints
```

## 14. 事件和日志接口

### 14.1 获取全局事件
```
GET /api/v1/events?level=&type=&source=&since=1h&search=
```

### 14.2 获取集群事件
```
GET /api/v1/clusters/{clusterName}/events?level=&since=1h
```

### 14.3 获取组件日志
```
GET /api/v1/logs/{component}?level=&since=1h&tail=1000
```

## 15. 搜索接口

### 15.1 全局搜索
```
GET /api/v1/search?q=&type=&cluster=&namespace=&limit=50
```

**响应:**
```typescript
interface SearchResponse {
  query: string;
  totalResults: number;
  results: SearchResult[];
  suggestions: string[];
}

interface SearchResult {
  type: 'cluster' | 'node' | 'pod' | 'workload' | 'policy';
  name: string;
  namespace?: string;
  cluster?: string;
  description: string;
  url: string;
  score: number;
}
```

## 16. 实时数据接口

### 16.1 WebSocket连接
```
WS /api/v1/ws?token={token}&subscribe=clusters,pods,events
```

**消息格式:**
```typescript
interface WSMessage {
  type: 'data' | 'error' | 'ping' | 'pong';
  topic: string;
  data: any;
  timestamp: number;
}
```

### 16.2 订阅主题
- `clusters`: 集群状态变化
- `pods`: Pod状态变化
- `events`: 系统事件
- `metrics`: 指标数据更新

## 17. 系统配置接口

### 17.1 获取系统配置
```
GET /api/v1/config/system
```

### 17.2 更新系统配置
```
PUT /api/v1/config/system
```

### 17.3 获取主题配置
```
GET /api/v1/config/theme
```

### 17.4 保存用户偏好
```
POST /api/v1/config/user-preferences
```

## 18. 健康检查接口

### 18.1 API健康检查
```
GET /api/v1/health
```

### 18.2 就绪状态检查
```
GET /api/v1/ready
```

### 18.3 存活状态检查
```
GET /api/v1/alive
```

## 19. 错误处理规范

### 19.1 标准错误响应
```typescript
interface ErrorResponse {
  code: number;
  message: string;
  details?: {
    field?: string;
    reason?: string;
    suggestions?: string[];
  };
  timestamp: number;
  requestId: string;
}
```

### 19.2 常用错误码
- `400`: 请求参数错误
- `401`: 未认证
- `403`: 权限不足
- `404`: 资源不存在
- `409`: 资源冲突
- `422`: 数据验证失败
- `500`: 服务器内部错误
- `503`: 服务不可用

## 20. 接口版本管理

### 20.1 版本策略
- 使用URL路径版本控制 (`/api/v1/`, `/api/v2/`)
- 向后兼容原则
- 废弃接口提前通知

### 20.2 接口变更流程
1. 提出变更需求
2. 评估影响范围
3. 设计新接口
4. 实现和测试
5. 文档更新
6. 发布和通知

---

*此API规范将随着前端需求的变化持续更新和完善* 