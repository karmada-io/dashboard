# Overview 概览页面文档

## 页面描述

Overview 是 Karmada Manager 的核心概览页面，提供多云管理平台的整体状态展示，包括控制面状态、资源使用情况、集群管理和策略统计等关键信息。

## 文件位置

```
ui/apps/dashboard/src/pages/overview/index.tsx
ui/apps/dashboard/src/pages/overview/components/
├── ControlPlaneCenter.tsx    # 控制面中心展示
├── ResourceStats.tsx         # 资源统计四象限
└── ClusterGrid.tsx          # 集群网格和策略统计
```

## 页面结构

```
┌─────────────────────────────────────────────┐
│              顶部导航栏                        │
│    Logo + 标题 + 更新时间 + 集群数量              │
├─────────────────────────────────────────────┤
│                                             │
│          Karmada 控制面中心展示                │
│        (版本信息、状态、运行时间)                │
│                                             │
├─────────────────┬─────────────────────────────┤
│     节点统计     │       CPU 统计               │
├─────────────────┼─────────────────────────────┤
│     Pod统计     │       内存统计               │
├─────────────────────────────────────────────┤
│               集群状态概览                     │
│    ┌─────────────┐    ┌─────────────────────┐│
│    │ 集群列表     │    │   策略统计           ││
│    │ 状态统计     │    │ • 传播策略          ││
│    │ 健康度展示   │    │ • 覆盖策略          ││
│    └─────────────┘    │ • 资源总览          ││
│                      └─────────────────────┘│
└─────────────────────────────────────────────┘
```

## 主要功能

### 1. 实时数据监控

```typescript
// 概览数据自动刷新（30秒）
const { data, isLoading } = useQuery({
  queryKey: ['GetOverview'],
  queryFn: async () => {
    const ret = await GetOverview();
    return ret.data;
  },
  refetchInterval: 30000, // 30秒自动刷新
});

// 集群列表自动刷新（60秒）
const { data: clusterListData } = useQuery({
  queryKey: ['GetClusters'],
  queryFn: async () => {
    const ret = await GetClusters();
    return ret.data;
  },
  refetchInterval: 60000, // 60秒自动刷新
});
```

### 2. 响应式布局

- **桌面端**: 四象限资源统计 + 双列集群/策略展示
- **平板端**: 两列布局，部分组件调整
- **移动端**: 单列布局，侧边栏变抽屉

### 3. 交互导航

```typescript
// 页面导航功能
const handleViewAllClusters = () => {
  navigate('/cluster-manage');
};

const handleViewAllPolicies = () => {
  navigate('/multicloud-policy-manage');
};
```

## 组件详解

### ControlPlaneCenter 控制面中心

**功能**: 展示 Karmada 控制面的核心状态信息

**特性**:
- 控制面健康状态指示（健康/异常/未知）
- 版本信息展示（Git版本、构建时间、提交ID）
- 运行时间计算和格式化显示
- 脉冲动效和状态徽章

```typescript
<ControlPlaneCenter 
  data={overviewData} 
  isLoading={loading} 
/>
```

### ResourceStats 资源统计四象限

**功能**: 以四象限布局展示集群资源使用情况

**特性**:
- 四个圆形进度图：节点、CPU、内存、Pod使用率
- Canvas 绘制连接线动画（从中心向四角）
- 自动颜色映射（绿色正常、黄色警告、红色异常）
- 数值格式化（CPU核数、内存字节、百分比）

```typescript
<ResourceStats 
  data={overviewData} 
  isLoading={loading} 
/>
```

**布局结构**:
```
┌─────────────┬─────────────┐
│   节点统计   │   CPU统计   │
│  (左上象限)  │  (右上象限)  │
├─────────────┼─────────────┤
│   Pod统计   │   内存统计   │
│  (左下象限)  │  (右下象限)  │
└─────────────┴─────────────┘
```

### ClusterGrid 集群网格

**功能**: 展示集群状态概览和策略统计

**特性**:
- 集群状态统计卡片（总计、健康、异常、未知）
- 集群列表表格（显示前5个，支持查看全部）
- 策略统计（传播策略、覆盖策略）
- 资源总览（命名空间、工作负载、服务、配置）

```typescript
<ClusterGrid 
  data={overviewData}
  clustersData={clusterList}
  isLoading={isLoading || clusterListLoading}
  onViewAllClusters={handleViewAllClusters}
  onViewAllPolicies={handleViewAllPolicies}
/>
```

## 数据结构

### 概览数据类型

```typescript
interface OverviewInfo {
  karmadaInfo: {
    version: {
      gitVersion: string;
      gitCommit: string;
      buildDate: string;
    };
    status: string;
    createTime: string;
  };
  memberClusterStatus: {
    nodeSummary: { totalNum: number; readyNum: number; };
    cpuSummary: { totalCPU: number; allocatedCPU: number; };
    memorySummary: { totalMemory: number; allocatedMemory: number; };
    podSummary: { totalPod: number; allocatedPod: number; };
  };
  clusterResourceStatus: {
    propagationPolicyNum: number;
    overridePolicyNum: number;
    namespaceNum: number;
    workloadNum: number;
    serviceNum: number;
    configNum: number;
  };
}
```

### 集群数据转换

```typescript
// 后端数据转换为前端所需格式
const transformClusterData = () => {
  if (!clusterListData?.clusters) return [];
  
  return clusterListData.clusters.map((cluster: any) => ({
    name: cluster.objectMeta?.name || cluster.name || 'Unknown',
    status: cluster.ready ? 'Ready' : 'NotReady',
    kubernetesVersion: cluster.kubernetesVersion || 'Unknown',
    nodeCount: cluster.nodeSummary?.totalNum || 0,
    provider: cluster.provider || 'Unknown',
    region: cluster.region || 'Unknown',
    zones: cluster.zones || [],
    syncMode: cluster.syncMode || 'Push',
    creationTimestamp: cluster.objectMeta?.creationTimestamp || new Date().toISOString(),
  }));
};
```

## 样式主题

### 顶部导航栏

```css
/* 渐变背景 + 毛玻璃效果 */
background: linear-gradient(135deg, var(--tech-primary) 0%, var(--tech-primary-7) 100%);
backdrop-filter: blur(10px);
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
```

### 科技感背景

```css
/* 多层渐变 + 动画网格 */
.tech-background {
  background: linear-gradient(135deg, #fafafa 0%, #f0f8ff 50%, #ffffff 100%);
}

.tech-background::before {
  /* 径向渐变粒子效果 */
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(64, 158, 255, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(114, 46, 209, 0.05) 0%, transparent 50%);
  animation: techBackgroundFlow 20s ease-in-out infinite;
}

.tech-background::after {
  /* 网格流动效果 */
  background-image: 
    linear-gradient(45deg, transparent 40%, rgba(0, 212, 255, 0.02) 50%, transparent 60%);
  animation: techGrid 30s linear infinite;
}
```

## 性能优化

### 1. 数据缓存策略

```typescript
// React Query 缓存配置
staleTime: 30000,      // 30秒内数据保持新鲜
refetchInterval: 30000, // 30秒自动刷新
cacheTime: 5 * 60 * 1000, // 5分钟缓存时间
```

### 2. 组件懒加载

```typescript
// 页面级代码分割
const Overview = lazy(() => import('@/pages/overview'));

// 组件级优化
const ResourceStats = React.memo(ResourceStatsComponent);
const ClusterGrid = React.memo(ClusterGridComponent);
```

### 3. Canvas 动画优化

```typescript
// 仅在数据加载完成后绘制
if (canvas && !isLoading) {
  const ctx = canvas.getContext('2d');
  // 绘制连接线动画
}
```

## 响应式适配

### 断点配置

```css
/* 移动端适配 */
@media (max-width: 768px) {
  .tech-background {
    padding: 0 !important;
  }
  
  .resource-stats-container {
    padding: 0 16px;
  }
  
  /* 顶部导航栏调整 */
  .overview-header {
    flex-direction: column;
    gap: 12px;
  }
}
```

### 布局调整

- **Desktop (>1024px)**: 四象限 + 双列布局
- **Tablet (768-1024px)**: 两列布局
- **Mobile (<768px)**: 单列布局，导航栏折叠

## 可访问性

### 键盘导航

- Tab 键按逻辑顺序切换焦点
- 回车键激活按钮和链接
- ESC 键关闭模态框

### 屏幕阅读器

- 所有图表提供文字描述
- 状态信息使用语义化标签
- 动态内容变化会被播报

## 错误处理

### API 错误处理

```typescript
onError: (error) => {
  message.error('获取概览数据失败');
  console.error('Overview data fetch error:', error);
}
```

### 数据容错

```typescript
// 安全的数据访问
const nodeStats = {
  used: data?.memberClusterStatus?.nodeSummary?.readyNum || 0,
  total: data?.memberClusterStatus?.nodeSummary?.totalNum || 0,
};
```

## 使用示例

### 基础使用

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview';
import Overview from '@/pages/overview';

function App() {
  return (
    <div className="app">
      <Overview />
    </div>
  );
}
```

### 自定义刷新间隔

```tsx
// 修改 refetchInterval 以调整数据刷新频率
const { data } = useQuery({
  queryKey: ['GetOverview'],
  queryFn: GetOverview,
  refetchInterval: 15000, // 15秒刷新
});
```

## 相关页面

- `/cluster-manage`: 集群管理页面
- `/multicloud-policy-manage`: 多云策略管理页面
- `/multicloud-resource-manage`: 多云资源管理页面

## 更新日志

### v1.0.0 (2024-12-20)
- ✅ 初始版本发布
- ✅ 实现控制面状态展示
- ✅ 完成资源统计四象限布局
- ✅ 添加集群状态概览
- ✅ 实现策略统计展示
- ✅ 完善响应式设计
- ✅ 添加科技感动效和主题 