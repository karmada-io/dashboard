# 数据库设计文档 (Database_Spec.md) - Karmada-Manager 增强

## 1. 文档概述

本文档详细描述了 Karmada-Manager 增强功能的数据存储设计。虽然 Karmada-Manager 主要设计为无状态服务，直接从 Karmada API Server 和成员集群获取数据，但仍需要定义缓存策略、临时数据存储和配置管理的数据模型。

## 2. 数据架构设计原则

### 2.1 设计理念

- **无状态优先**: 核心业务数据不持久化，从上游 API 实时获取
- **智能缓存**: 对不经常变化的数据进行缓存以提升性能
- **配置分离**: 应用配置与业务数据分离管理
- **临时存储**: 支持用户会话、操作历史等临时数据

### 2.2 数据分类

1. **实时数据**: 直接从 Karmada/成员集群 API 获取，不缓存
   - Pod 状态、容器日志
   - 节点实时资源使用率
   - 集群实时状态

2. **缓存数据**: 短期缓存以提升性能
   - 集群列表和基础信息
   - 节点列表和静态属性
   - 策略配置信息

3. **配置数据**: 应用配置和用户偏好
   - 系统配置
   - 用户偏好设置
   - 界面定制配置

4. **审计数据**: 操作记录和审计日志
   - 用户操作历史
   - 资源修改记录
   - 错误日志

## 3. 缓存存储设计 (Redis/内存)

### 3.1 集群信息缓存

```go
// 集群基础信息缓存
type ClusterCache struct {
    Name              string            `json:"name"`
    Status            string            `json:"status"`
    KubernetesVersion string            `json:"kubernetesVersion"`
    Provider          string            `json:"provider"`
    Labels            map[string]string `json:"labels"`
    NodeCount         int               `json:"nodeCount"`
    LastUpdated       time.Time         `json:"lastUpdated"`
    TTL               time.Duration     `json:"ttl"`
}

// Redis Key: cluster:info:{clusterName}
// TTL: 5 分钟
```

### 3.2 节点信息缓存

```go
// 节点基础信息缓存
type NodeCache struct {
    ClusterName       string                 `json:"clusterName"`
    Name              string                 `json:"name"`
    Status            string                 `json:"status"`
    Roles             []string               `json:"roles"`
    KubeletVersion    string                 `json:"kubeletVersion"`
    OSImage           string                 `json:"osImage"`
    InstanceType      string                 `json:"instanceType"`
    Capacity          map[string]string      `json:"capacity"`
    Allocatable       map[string]string      `json:"allocatable"`
    Addresses         []v1.NodeAddress       `json:"addresses"`
    Labels            map[string]string      `json:"labels"`
    Taints            []v1.Taint            `json:"taints"`
    LastUpdated       time.Time             `json:"lastUpdated"`
    TTL               time.Duration         `json:"ttl"`
}

// Redis Key: node:info:{clusterName}:{nodeName}
// TTL: 3 分钟
```

### 3.3 调度策略缓存

```go
// 策略信息缓存
type PolicyCache struct {
    Name              string                 `json:"name"`
    Namespace         string                 `json:"namespace"`
    Kind              string                 `json:"kind"` // PropagationPolicy, OverridePolicy
    ResourceSelectors []map[string]interface{} `json:"resourceSelectors"`
    ClusterAffinity   map[string]interface{} `json:"clusterAffinity"`
    ReplicaScheduling map[string]interface{} `json:"replicaScheduling"`
    LastUpdated       time.Time             `json:"lastUpdated"`
    TTL               time.Duration         `json:"ttl"`
}

// Redis Key: policy:info:{namespace}:{name}
// TTL: 10 分钟
```

### 3.4 资源绑定关系缓存

```go
// Workload 与策略绑定关系缓存
type ResourceBindingCache struct {
    WorkloadName      string                 `json:"workloadName"`
    WorkloadNamespace string                 `json:"workloadNamespace"`
    WorkloadKind      string                 `json:"workloadKind"`
    PolicyName        string                 `json:"policyName"`
    PolicyNamespace   string                 `json:"policyNamespace"`
    ClusterPlacements []ClusterPlacement     `json:"clusterPlacements"`
    LastUpdated       time.Time             `json:"lastUpdated"`
    TTL               time.Duration         `json:"ttl"`
}

// Redis Key: binding:workload:{namespace}:{name}
// TTL: 2 分钟
```

## 4. 配置存储设计 (ConfigMap/Secret)

### 4.1 系统配置

```yaml
# ConfigMap: karmada-manager-config
apiVersion: v1
kind: ConfigMap
metadata:
  name: karmada-manager-config
  namespace: karmada-system
data:
  # 缓存配置
  cache.redis.enabled: "true"
  cache.redis.address: "redis:6379"
  cache.redis.password: ""
  cache.redis.db: "0"
  cache.default.ttl: "300s"
  
  # API 配置
  api.rate.limit.enabled: "true"
  api.rate.limit.requests.per.minute: "1000"
  api.timeout.default: "30s"
  api.timeout.logs: "120s"
  
  # 监控配置
  metrics.enabled: "true"
  metrics.port: "9090"
  
  # 日志配置
  log.level: "info"
  log.format: "json"
  
  # 安全配置
  security.rbac.enabled: "true"
  security.audit.enabled: "true"
  
  # 功能开关
  features.pod.terminal.enabled: "false"
  features.resource.edit.enabled: "true"
  features.scheduling.trace.enabled: "true"
```

### 4.2 用户偏好配置

```yaml
# ConfigMap: karmada-manager-user-preferences
apiVersion: v1
kind: ConfigMap
metadata:
  name: karmada-manager-user-preferences
  namespace: karmada-system
data:
  # 默认用户偏好
  default.page.size: "10"
  default.theme: "light"
  default.language: "zh-CN"
  default.timezone: "Asia/Shanghai"
  
  # 界面配置
  ui.cluster.list.columns: '["name","status","nodes","cpu","memory"]'
  ui.node.list.columns: '["name","status","role","cpu","memory","pods"]'
  ui.refresh.interval: "30s"
  
  # 过滤器默认值
  filter.cluster.status: "all"
  filter.node.status: "all"
  filter.pod.phase: "all"
```

## 5. 审计数据设计

### 5.1 操作审计表结构 (可选的持久化存储)

如果需要持久化审计数据，可以考虑使用轻量级数据库如 SQLite：

```sql
-- 用户操作审计表
CREATE TABLE user_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(100) NOT NULL,
    operation VARCHAR(50) NOT NULL,  -- get, create, update, delete
    resource_type VARCHAR(50) NOT NULL,  -- cluster, node, pod, configmap
    resource_name VARCHAR(200),
    cluster_name VARCHAR(100),
    namespace VARCHAR(100),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    request_id VARCHAR(100),
    user_agent VARCHAR(500),
    source_ip VARCHAR(45),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_resource_timestamp (resource_type, timestamp),
    INDEX idx_cluster_timestamp (cluster_name, timestamp)
);

-- 资源变更记录表
CREATE TABLE resource_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,  -- create, update, delete
    resource_type VARCHAR(50) NOT NULL,
    resource_name VARCHAR(200) NOT NULL,
    cluster_name VARCHAR(100) NOT NULL,
    namespace VARCHAR(100),
    old_yaml TEXT,
    new_yaml TEXT,
    change_summary TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource_timestamp (resource_type, resource_name, timestamp),
    INDEX idx_cluster_timestamp (cluster_name, timestamp)
);

-- API 调用统计表
CREATE TABLE api_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    user_id VARCHAR(100),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_endpoint_timestamp (endpoint, timestamp),
    INDEX idx_status_timestamp (status_code, timestamp)
);
```

### 5.2 会话管理 (Redis)

```go
// 用户会话信息
type UserSession struct {
    SessionID     string                 `json:"sessionId"`
    UserID        string                 `json:"userId"`
    UserName      string                 `json:"userName"`
    Roles         []string               `json:"roles"`
    Permissions   []string               `json:"permissions"`
    LoginTime     time.Time             `json:"loginTime"`
    LastActivity  time.Time             `json:"lastActivity"`
    IPAddress     string                 `json:"ipAddress"`
    UserAgent     string                 `json:"userAgent"`
    Preferences   map[string]interface{} `json:"preferences"`
    TTL           time.Duration         `json:"ttl"`
}

// Redis Key: session:{sessionId}
// TTL: 24 小时
```

## 6. 缓存策略设计

### 6.1 缓存层次

```go
// 多级缓存架构
type CacheManager struct {
    // L1: 进程内存缓存 (最快，容量小)
    L1Cache *cache.Cache
    
    // L2: Redis 分布式缓存 (较快，容量大)  
    L2Cache redis.Cmdable
    
    // L3: 数据源 (Karmada/Member Cluster API)
    DataSource DataSourceInterface
}

// 缓存策略配置
type CachePolicy struct {
    L1TTL         time.Duration  // L1 缓存存活时间
    L2TTL         time.Duration  // L2 缓存存活时间
    MaxL1Size     int           // L1 缓存最大条目数
    RefreshPolicy string        // 刷新策略: lazy, proactive, scheduled
    EvictionPolicy string       // 淘汰策略: lru, lfu, ttl
}
```

### 6.2 缓存键命名规范

```
# 集群相关
cluster:list                            # 集群列表
cluster:info:{clusterName}             # 集群详情
cluster:nodes:{clusterName}            # 集群节点列表
cluster:summary:{clusterName}          # 集群资源汇总

# 节点相关  
node:info:{clusterName}:{nodeName}     # 节点详情
node:pods:{clusterName}:{nodeName}     # 节点上的 Pod 列表
node:summary:{clusterName}:{nodeName}  # 节点资源汇总

# 策略相关
policy:list                            # 策略列表
policy:info:{namespace}:{name}         # 策略详情
policy:bindings:{namespace}:{name}     # 策略绑定关系

# 调度相关
scheduling:workload:{namespace}:{name} # Workload 调度信息
scheduling:trace:{namespace}:{podName} # Pod 调度追溯

# 用户相关
session:{sessionId}                    # 用户会话
user:preferences:{userId}              # 用户偏好
```

### 6.3 缓存更新策略

1. **写穿策略** (Write-Through): 更新操作同时更新缓存和数据源
2. **写回策略** (Write-Back): 仅更新缓存，定期批量写回数据源  
3. **写绕策略** (Write-Around): 仅更新数据源，失效相关缓存

## 7. 数据一致性保证

### 7.1 缓存失效策略

```go
// 缓存失效触发器
type CacheInvalidator struct {
    // 基于时间的失效
    TTLInvalidator *TTLInvalidator
    
    // 基于事件的失效  
    EventInvalidator *EventInvalidator
    
    // 基于依赖的失效
    DependencyInvalidator *DependencyInvalidator
}

// 依赖关系定义
var CacheDependencies = map[string][]string{
    "cluster:info:*":     {"cluster:list", "cluster:nodes:*"},
    "node:info:*":        {"cluster:summary:*", "node:summary:*"},
    "policy:info:*":      {"policy:list", "policy:bindings:*"},
}
```

### 7.2 数据同步机制

```go
// 数据同步器
type DataSynchronizer struct {
    // Kubernetes Watch 机制
    ClusterWatcher  cache.SharedIndexInformer
    NodeWatcher     cache.SharedIndexInformer  
    PolicyWatcher   cache.SharedIndexInformer
    
    // 缓存管理器
    CacheManager *CacheManager
    
    // 同步间隔
    SyncInterval time.Duration
}

// 监听 Kubernetes 事件并更新缓存
func (ds *DataSynchronizer) OnClusterEvent(eventType watch.EventType, cluster *v1alpha1.Cluster) {
    switch eventType {
    case watch.Added, watch.Modified:
        ds.CacheManager.UpdateClusterCache(cluster)
    case watch.Deleted:
        ds.CacheManager.DeleteClusterCache(cluster.Name)
    }
}
```

## 8. 性能优化策略

### 8.1 查询优化

```go
// 批量查询优化
type BatchQuery struct {
    ClusterNames []string `json:"clusterNames"`
    NodeNames    []string `json:"nodeNames"`
    Namespaces   []string `json:"namespaces"`
}

// 数据预加载
type DataPreloader struct {
    // 预加载常用数据
    PreloadClusters  bool
    PreloadNodes     bool
    PreloadPolicies  bool
    
    // 预加载策略
    PreloadStrategy  string  // eager, lazy, scheduled
    PreloadInterval  time.Duration
}
```

### 8.2 内存管理

```go
// 内存使用监控
type MemoryMonitor struct {
    MaxMemoryUsage   int64         // 最大内存使用量 (bytes)
    CurrentUsage     int64         // 当前内存使用量
    GCThreshold      float64       // GC 触发阈值 (0.8 = 80%)
    CacheEvictRatio  float64       // 缓存淘汰比例
}

// 自动内存清理
func (mm *MemoryMonitor) AutoCleanup() {
    if mm.GetUsageRatio() > mm.GCThreshold {
        // 触发缓存清理
        mm.EvictLRUCache(mm.CacheEvictRatio)
        
        // 强制 GC
        runtime.GC()
    }
}
```

## 9. 数据备份与恢复

### 9.1 配置备份

```bash
# 备份 ConfigMap 配置
kubectl get configmap karmada-manager-config -n karmada-system -o yaml > config-backup.yaml

# 备份用户偏好配置  
kubectl get configmap karmada-manager-user-preferences -n karmada-system -o yaml > preferences-backup.yaml
```

### 9.2 缓存重建

```go
// 缓存重建器
type CacheRebuilder struct {
    DataSources []DataSourceInterface
    CacheManager *CacheManager
    RebuildStrategy string  // full, incremental, selective
}

// 全量重建缓存
func (cr *CacheRebuilder) FullRebuild() error {
    // 1. 清空所有缓存
    cr.CacheManager.FlushAll()
    
    // 2. 重新加载核心数据
    if err := cr.preloadClusters(); err != nil {
        return err
    }
    
    if err := cr.preloadNodes(); err != nil {
        return err
    }
    
    if err := cr.preloadPolicies(); err != nil {
        return err
    }
    
    return nil
}
```

## 10. 监控与维护

### 10.1 缓存监控指标

```go
// 缓存性能指标
type CacheMetrics struct {
    HitRate          float64   `json:"hitRate"`          // 命中率
    MissRate         float64   `json:"missRate"`         // 未命中率  
    EvictionRate     float64   `json:"evictionRate"`     // 淘汰率
    MemoryUsage      int64     `json:"memoryUsage"`      // 内存使用量
    ItemCount        int64     `json:"itemCount"`        // 缓存项数量
    AvgLoadTime      time.Duration `json:"avgLoadTime"`  // 平均加载时间
}
```

### 10.2 自动维护任务

```go
// 定期维护任务
type MaintenanceScheduler struct {
    // 缓存清理任务
    CacheCleanupInterval    time.Duration
    
    // 过期数据清理
    ExpiredDataCleanupInterval time.Duration
    
    // 统计数据归档
    StatisticsArchiveInterval   time.Duration
    
    // 内存优化
    MemoryOptimizationInterval  time.Duration
}
```

这个数据库设计文档为 Karmada-Manager 的数据存储提供了完整的指导，涵盖了缓存策略、配置管理、审计数据和性能优化等各个方面。 