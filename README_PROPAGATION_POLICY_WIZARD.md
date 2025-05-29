# 传播策略图形化向导

## 概述

传播策略图形化向导为 Karmada Dashboard 提供了一个用户友好的界面来创建传播策略（PropagationPolicy）和集群传播策略（ClusterPropagationPolicy）。这个4步骤的向导简化了传播策略的创建过程，无需用户手动编写复杂的 YAML 配置。

## 功能特性

### 支持的策略类型
- **命名空间传播策略 (PropagationPolicy)**: 管理特定命名空间内资源的跨集群分发
- **集群传播策略 (ClusterPropagationPolicy)**: 管理集群级别资源的跨集群分发

### 核心功能
- **4步骤配置流程**: 基本配置 → 资源选择 → 调度配置 → 配置预览
- **多资源选择器支持**: 支持 Deployment、Service、ConfigMap、Secret、Ingress 等多种 Kubernetes 资源
- **高级调度选项**: 集群选择、副本调度、故障转移配置
- **实时预览**: 生成标准 Kubernetes YAML 配置并支持复制
- **表单验证**: 实时验证输入内容，确保配置正确性

## 向导步骤详解

### 步骤1: 基本配置
配置传播策略的基本信息和核心策略设置。

#### 基本信息
- **策略名称**: 传播策略的唯一标识符（必填）
  - 格式要求：只能包含小写字母、数字和连字符
  - 示例：`nginx-deployment-policy`
- **命名空间**: 仅命名空间级别策略需要（必填）
  - 从现有命名空间中选择
  - 支持搜索功能

#### 策略配置
- **抢占策略**: 
  - `Never`: 从不抢占现有资源
  - `Always`: 总是抢占现有资源
- **冲突解决**:
  - `Abort`: 遇到冲突时中止部署
  - `Overwrite`: 覆盖冲突资源
- **优先级**: 0-1000 数值，决定策略执行优先级
- **调度器名称**: 指定使用的调度器（默认：default-scheduler）
- **暂停分发**: 开关控制是否暂停资源分发

### 步骤2: 资源选择
配置要进行跨集群分发的资源选择器。

#### 资源选择器配置
- **API版本**: 选择资源的 API 版本
  - `v1`: 核心资源（Service、ConfigMap、Secret等）
  - `apps/v1`: 应用资源（Deployment、DaemonSet等）
  - `networking.k8s.io/v1`: 网络资源（Ingress等）
  - `batch/v1`: 批处理资源（Job、CronJob等）

- **资源类型**: 支持的 Kubernetes 资源类型
  - Deployment、Service、ConfigMap、Secret
  - Ingress、Job、CronJob

- **资源名称**: 特定资源名称（可选）
  - 留空则选择所有该类型资源

- **命名空间**: 资源所在命名空间（可选）
  - 留空则选择所有命名空间

#### 标签选择器
- 支持基于标签的资源过滤
- 键值对形式配置
- 支持多个标签条件

#### 多选择器支持
- 可添加多个资源选择器
- 每个选择器独立配置
- 支持不同类型资源的组合选择

### 步骤3: 调度配置
配置集群调度规则和高级特性。

#### 目标集群
- **集群列表**: 手动指定目标集群名称
- **动态添加**: 支持添加多个目标集群
- **集群管理**: 可删除不需要的集群配置

#### 副本调度
- **分发偏好**:
  - `聚合 (Aggregated)`: 优先在少数集群中部署
  - `加权 (Weighted)`: 按权重分配到多个集群

- **调度类型**:
  - `复制 (Duplicated)`: 在每个目标集群创建完整副本
  - `分割 (Divided)`: 将副本分割到多个集群

#### 故障转移
- **容忍时间**: 故障检测的容忍时间（秒）
- **优雅期限**: 故障转移的优雅期限（秒）

### 步骤4: 配置预览
最终检查和确认配置。

#### 预览功能
- **YAML 预览**: 显示生成的完整 YAML 配置
- **配置摘要**: 关键信息汇总显示
- **复制功能**: 一键复制 YAML 到剪贴板
- **字体优化**: 使用微软雅黑字体优化中文显示

## 技术实现

### 组件架构
```
PropagationPolicyWizardModal
├── 基本配置 (BasicConfig)
├── 资源选择 (ResourceConfig)  
├── 调度配置 (PlacementConfig)
└── 配置预览 (Preview)
```

### 数据结构
```typescript
interface PropagationPolicyConfig {
  metadata: {
    name: string;
    namespace?: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
  };
  spec: {
    resourceSelectors: ResourceSelector[];
    placement: PlacementRule;
    preemption?: 'Always' | 'Never';
    conflictResolution?: 'Abort' | 'Overwrite';
    priority?: number;
    schedulerName?: string;
    suspendDispatching?: boolean;
    failover?: FailoverConfig;
  };
}
```

### YAML 生成
生成标准的 Karmada 传播策略 YAML 配置：

#### 命名空间传播策略示例
```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: nginx-policy
  namespace: default
  labels:
    app: nginx-policy
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    labelSelector:
      matchLabels:
        app: nginx
  placement:
    clusterAffinity:
      clusterNames:
      - cluster1
      - cluster2
    replicaScheduling:
      replicaDivisionPreference: Aggregated
      replicaSchedulingType: Duplicated
  preemption: Never
  conflictResolution: Abort
```

#### 集群传播策略示例
```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: ClusterPropagationPolicy
metadata:
  name: global-nginx-policy
  labels:
    app: global-nginx-policy
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment
  placement:
    clusterAffinity:
      clusterNames:
      - prod-cluster
      - staging-cluster
  priority: 100
  schedulerName: karmada-scheduler
```

## 集成方式

### 页面集成
向导已集成到传播策略管理页面中，通过下拉菜单方式提供：

1. **图形化向导**: 新用户友好的步骤式配置
2. **YAML 编辑器**: 高级用户的直接 YAML 编辑

### API 调用
使用现有的传播策略 API：
- `CreatePropagationPolicy`: 创建新的传播策略
- 支持命名空间级别和集群级别策略
- 无需后端修改，完全基于现有接口

## 使用指南

### 创建命名空间传播策略
1. 选择"命名空间级别"范围
2. 点击"新增调度策略"下拉菜单
3. 选择"图形化向导"
4. 按步骤填写配置信息
5. 预览并创建策略

### 创建集群传播策略
1. 选择"集群级别"范围
2. 点击"新增集群调度策略"下拉菜单
3. 选择"图形化向导"
4. 配置集群级别策略参数
5. 确认并创建策略

### 最佳实践
1. **策略命名**: 使用描述性名称，便于管理
2. **资源选择**: 精确配置选择器，避免意外资源分发
3. **集群规划**: 合理选择目标集群，考虑网络和资源限制
4. **故障转移**: 根据业务需求配置合适的容忍时间
5. **优先级设置**: 为关键业务设置更高优先级

## 扩展性

### 添加新资源类型
在 `renderResourceConfig` 方法中的资源类型 Select 组件添加新选项：

```typescript
<Option value="CustomResource">CustomResource</Option>
```

### 新增调度策略
在 `renderPlacementConfig` 方法中添加新的调度配置选项。

### 自定义验证规则
在表单验证规则中添加业务特定的验证逻辑。

## 维护说明

### 代码位置
- **主组件**: `ui/apps/dashboard/src/pages/multicloud-policy-manage/propagation-policy/components/propagation-policy-wizard-modal.tsx`
- **集成页面**: `ui/apps/dashboard/src/pages/multicloud-policy-manage/propagation-policy/index.tsx`

### 依赖关系
- Ant Design 组件库
- React Hook Form (通过 Ant Design Form)
- YAML 库用于配置生成
- 现有的传播策略服务 API

### 更新维护
定期检查 Karmada API 变更，确保生成的 YAML 配置与最新 API 版本兼容。 