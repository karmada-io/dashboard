# Karmada Manager 前端代码实现文档

## 项目概述

基于React 18 + TypeScript + Ant Design 5.0实现的Karmada多云管理仪表盘前端，采用"舒适科技感"设计主题，提供现代化的用户界面和优雅的交互体验。

## 技术栈

- **框架**: React 18+ 函数式组件 + Hooks
- **语言**: TypeScript 5.0+
- **UI库**: Ant Design 5.0+
- **状态管理**: TanStack Query + Zustand
- **构建工具**: Vite 4.0+
- **样式方案**: CSS + tech-theme.css主题

## 已实现组件

### 1. 基础UI组件 (`src/components/ui/`)

#### TechCard - 科技感卡片组件
```typescript
// 基础用法
<TechCard title="标题" loading={false}>
  <p>卡片内容</p>
</TechCard>

// 功能特性
- 渐变背景和微光边框
- 悬浮动效（上浮4px + 光晕）
- 加载状态自动管理
- 可点击和键盘导航支持
```

#### StatusBadge - 状态徽章组件
```typescript
// 基础用法
<StatusBadge status="success" text="健康" pulse={true} />

// 辅助函数
const statusInfo = getClusterStatus('Ready'); // 集群状态映射
const resourceInfo = getResourceStatus(80, 100); // 资源状态映射

// 状态类型
- success: 绿色，表示健康/正常
- warning: 黄色，表示警告/注意
- error: 红色，表示异常/错误
- info: 蓝色，表示信息/处理中
- default: 灰色，表示未知/默认
```

#### TechProgress - 线性进度条组件
```typescript
// 基础用法
<TechProgress 
  percentage={75} 
  showInfo={true}
  size="default"
  status="success"
/>

// 自定义格式化
<TechProgress 
  percentage={85}
  format={(percent) => `${percent}% 已使用`}
/>
```

### 2. 图表组件 (`src/components/charts/`)

#### TechCircularProgress - 圆形进度组件
```typescript
// 基础用法
<TechCircularProgress
  percentage={75}
  size={120}
  title="CPU使用率"
/>

// 自定义中心内容
<TechCircularProgress
  percentage={nodeUtilization}
  formatCenter={(percent) => (
    <div>
      <div>{used}/{total}</div>
      <Text>节点就绪率</Text>
    </div>
  )}
/>

// 功能特性
- SVG绘制，性能优秀
- 自动状态色彩（成功/警告/错误）
- 流畅动画过渡
- 科技感光效
```

### 3. 概览页面组件 (`src/pages/overview/components/`)

#### ResourceStats - 资源统计四象限
```typescript
// 展示集群资源使用情况
<ResourceStats data={overviewData} isLoading={loading} />

// 功能实现
- 四象限布局：节点、CPU、内存、Pod
- Canvas绘制连接线动画
- 圆形进度图表展示利用率
- 响应式设计适配移动端
```

#### ControlPlaneCenter - 控制面中心展示
```typescript
// 展示Karmada控制面信息
<ControlPlaneCenter data={overviewData} isLoading={loading} />

// 功能实现
- 控制面状态指示（健康/异常）
- 版本信息展示
- 运行时间计算
- 脉冲动效和状态徽章
```

#### ClusterGrid - 集群网格展示
```typescript
// 集群状态和策略统计
<ClusterGrid 
  data={overviewData}
  clustersData={clusterList}
  isLoading={loading}
  onViewAllClusters={() => navigate('/cluster-manage')}
  onViewAllPolicies={() => navigate('/policy-manage')}
/>

// 功能实现
- 集群状态统计卡片
- 集群列表表格（前5个）
- 策略统计（传播策略、覆盖策略）
- 资源总览（命名空间、工作负载等）
```

## 样式系统 (`src/styles/tech-theme.css`)

### 色彩规范
```css
/* 主色系 - 舒适科技蓝 */
--tech-primary: #409eff;     /* 主要操作按钮、链接 */
--tech-primary-4: #73b3ff;   /* 悬浮状态 */
--tech-primary-7: #096dd9;   /* 深色变体 */

/* 状态色系 */
--success-color: #67c23a;    /* 健康状态 */
--warning-color: #e6a23c;    /* 警告状态 */
--error-color: #f56c6c;      /* 错误状态 */
--info-color: #409eff;       /* 信息状态 */

/* 文本色系 */
--text-color: #262626;           /* 主文本 */
--text-color-secondary: #595959; /* 次要文本 */
--text-color-disabled: #bfbfbf;  /* 禁用文本 */
```

### 核心样式类
```css
.tech-card              /* 科技感卡片 */
.tech-status-badge      /* 状态徽章 */
.tech-progress          /* 进度条 */
.tech-circular-progress /* 圆形进度 */
.tech-btn-primary       /* 主要按钮 */
.tech-table            /* 科技感表格 */
.tech-hover-scale      /* 悬浮缩放效果 */
.tech-pulse            /* 脉冲动画 */
```

## API服务层 (`src/services/`)

### 概览API (`overview.ts`)
```typescript
// 获取系统概览数据
const { data, isLoading } = useQuery({
  queryKey: ['GetOverview'],
  queryFn: async () => {
    const ret = await GetOverview();
    return ret.data;
  },
  refetchInterval: 30000, // 30秒自动刷新
});

// 数据结构
interface OverviewInfo {
  karmadaInfo: KarmadaInfo;           // 控制面信息
  memberClusterStatus: MemberClusterStatus; // 成员集群状态
  clusterResourceStatus: ClusterResourceStatus; // 集群资源状态
}
```

### 集群API (`cluster.ts`)
```typescript
// 获取集群列表
const { data: clusterList } = useQuery({
  queryKey: ['GetClusters'],
  queryFn: async () => {
    const ret = await GetClusters();
    return ret.data;
  },
  refetchInterval: 60000, // 60秒自动刷新
});

// 集群操作
await CreateCluster({ kubeconfig, clusterName, mode });
await UpdateCluster({ clusterName, labels, taints });
await DeleteCluster(clusterName);
```

## 响应式设计

### 断点设置
- **Mobile**: < 768px - 单列布局
- **Tablet**: 768px - 1024px - 两列布局  
- **Desktop**: > 1024px - 多列布局

### 适配策略
```css
@media (max-width: 768px) {
  .tech-card {
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }
  
  .resource-stats-container {
    padding: 0 16px;
  }
}
```

## 动画效果

### 科技感动效
```css
/* 脉冲效果 */
.tech-pulse {
  animation: techPulse 0.8s ease-in-out;
}

/* 悬浮缩放 */
.tech-hover-scale:hover {
  transform: scale(1.05);
}

/* 进度条闪烁 */
.tech-progress-bar::before {
  animation: progressShine 2s infinite;
}

/* 背景粒子流动 */
.tech-background::after {
  animation: techGrid 30s linear infinite;
}
```

### Canvas动画
- ResourceStats组件中的连接线动画
- 从中心向四角的渐变连线
- 实时绘制，性能优化

## 性能优化

### React优化
```typescript
// 组件记忆化
const ClusterCard = React.memo<ClusterCardProps>(({ cluster }) => {
  return <div>{cluster.name}</div>;
});

// 计算缓存
const processedData = useMemo(() => {
  return clusters.map(cluster => ({
    ...cluster,
    utilization: calculateUtilization(cluster),
  }));
}, [clusters]);

// 函数缓存
const handleClusterClick = useCallback((clusterId: string) => {
  navigate(`/cluster/${clusterId}`);
}, [navigate]);
```

### 数据获取优化
```typescript
// React Query缓存策略
staleTime: 30000,      // 30秒内数据保持新鲜
refetchInterval: 60000, // 60秒自动刷新
```

## 国际化支持

### 配置结构
```json
// locales/zh-CN/common.json
{
  "button": {
    "confirm": "确认",
    "cancel": "取消"
  },
  "status": {
    "healthy": "健康",
    "warning": "警告"
  }
}
```

### 使用方式
```typescript
const { t } = useTranslation('common');
<Button>{t('button.confirm')}</Button>
```

## 开发规范

### 文件命名
- 组件文件：`PascalCase.tsx`
- 样式文件：`kebab-case.css`
- 工具文件：`camelCase.ts`

### 导入顺序
```typescript
import React from 'react';                    // React相关
import { Card, Button } from 'antd';          // 第三方库
import { useQuery } from '@tanstack/react-query'; // Hooks
import { TechCard } from '@/components/ui';   // 内部组件
import { formatBytes } from '@/utils/format'; // 工具函数
import type { ClusterInfo } from '@/services/types'; // 类型定义
import styles from './component.module.css'; // 样式文件
```

### TypeScript类型
```typescript
// Props接口定义
interface ComponentProps {
  data: DataType;
  isLoading: boolean;
  onAction: (id: string) => void;
}

// 组件定义
const Component: React.FC<ComponentProps> = ({ data, isLoading, onAction }) => {
  // 组件逻辑
};
```

## 部署说明

### 构建命令
```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

### 环境变量
```env
# .env.development
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_TITLE=Karmada Dashboard (Dev)

# .env.production  
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Karmada Dashboard
```

## 常见问题

### 1. 样式不生效
- 确认导入了 `tech-theme.css`
- 检查CSS变量定义
- 验证类名是否正确

### 2. API调用失败
- 检查baseURL配置
- 验证请求拦截器
- 确认后端接口可用

### 3. 组件性能问题
- 使用React.memo缓存组件
- 避免在render中创建新对象
- 合理使用useMemo和useCallback

## 后续开发计划

### 待实现功能
- [ ] 集群详情页面
- [ ] 工作负载管理页面
- [ ] 策略管理页面
- [ ] 高级图表组件
- [ ] 主题切换功能

### 技术改进
- [ ] 微前端架构探索
- [ ] PWA支持
- [ ] WebSocket实时通信
- [ ] 性能监控集成

---

**文档版本**: v1.0.0  
**最后更新**: 2024-12-20  
**维护者**: Karmada Frontend Team 