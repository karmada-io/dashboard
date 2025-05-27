# Karmada-Manager UI/UX 设计规范文档

## 1. 文档信息

### 1.1 版本历史

| 版本号 | 日期 | 作者 | 变更说明 |
|--------|------|------|----------|
| 1.0 | 2025-01-XX | UI/UX设计师 | 初稿创建，UI/UX设计规范 |

### 1.2 文档目的

基于PRD文档和用户故事地图，为Karmada-Manager提供完整的UI/UX设计规范，确保产品界面的一致性、易用性和美观性，提升用户体验。

## 2. 设计理念和原则

### 2.1 设计理念
- **直观易用**: 采用直观的视觉设计，降低用户学习成本
- **信息清晰**: 合理的信息架构，清晰的数据呈现
- **操作高效**: 简化用户操作流程，提升工作效率
- **视觉统一**: 统一的设计语言和视觉风格

### 2.2 设计原则
- **用户优先**: 以用户需求和使用场景为设计出发点
- **内容为王**: 内容和功能决定设计形式
- **保持简洁**: 去除不必要的视觉噪音
- **持续迭代**: 基于用户反馈不断优化设计

## 3. 视觉设计系统

### 3.1 色彩系统

#### 3.1.1 主色调
```scss
// Ant Design 主题色
$primary-color: #1890ff;        // 主品牌色
$primary-1: #e6f7ff;           // 最浅
$primary-2: #bae7ff;           // 浅
$primary-3: #91d5ff;           // 
$primary-4: #69c0ff;           // 
$primary-5: #40a9ff;           // 
$primary-6: #1890ff;           // 标准
$primary-7: #096dd9;           // 深
$primary-8: #0050b3;           // 更深
$primary-9: #003a8c;           // 最深
$primary-10: #002766;          // 极深
```

#### 3.1.2 功能色彩
```scss
// 状态颜色
$success-color: #52c41a;        // 成功/正常状态
$warning-color: #faad14;        // 警告状态
$error-color: #ff4d4f;          // 错误/危险状态
$info-color: #1890ff;           // 信息状态

// 中性色
$text-color: #000000d9;         // 主文本色
$text-color-secondary: #00000073; // 次要文本色
$text-color-disabled: #00000040;  // 禁用文本色
$border-color: #d9d9d9;         // 边框色
$divider-color: #f0f0f0;        // 分割线色
$background-color: #f0f2f5;     // 页面背景色
$component-background: #ffffff;  // 组件背景色
```

#### 3.1.3 语义化颜色应用
| 状态 | 颜色 | 应用场景 |
|------|------|----------|
| 🟢 Ready/Success | `#52c41a` | 集群正常、Pod运行正常、操作成功 |
| 🟡 Warning | `#faad14` | 资源使用率高、配置警告 |
| 🔴 Error/Failed | `#ff4d4f` | 集群异常、Pod失败、操作错误 |
| 🔵 Info/Processing | `#1890ff` | 信息提示、处理中状态 |
| ⚪ Unknown/Disabled | `#d9d9d9` | 未知状态、禁用状态 |

### 3.2 字体系统

#### 3.2.1 字体族
```scss
$font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 
              'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', 
              'Helvetica', 'Arial', sans-serif;
```

#### 3.2.2 字体规格
| 层级 | 字号 | 行高 | 字重 | 应用场景 |
|------|------|------|------|----------|
| H1 | 32px | 1.25 | 600 | 页面主标题 |
| H2 | 24px | 1.35 | 600 | 区域标题 |
| H3 | 20px | 1.4 | 500 | 组件标题 |
| H4 | 16px | 1.4 | 500 | 卡片标题 |
| Body Large | 16px | 1.5 | 400 | 重要正文 |
| Body | 14px | 1.5 | 400 | 正文内容 |
| Body Small | 12px | 1.5 | 400 | 辅助信息 |
| Caption | 10px | 1.5 | 400 | 标签、状态 |

### 3.3 间距系统

#### 3.3.1 基础间距
```scss
$spacing-xs: 4px;    // 极小间距
$spacing-sm: 8px;    // 小间距
$spacing-md: 16px;   // 中等间距
$spacing-lg: 24px;   // 大间距
$spacing-xl: 32px;   // 超大间距
$spacing-xxl: 48px;  // 极大间距
```

#### 3.3.2 组件间距规范
- **页面边距**: 24px
- **卡片内边距**: 24px
- **表格单元格内边距**: 16px
- **按钮内边距**: 水平16px，垂直8px
- **输入框内边距**: 水平12px，垂直8px

### 3.4 圆角和阴影

#### 3.4.1 圆角规范
```scss
$border-radius-sm: 4px;   // 小圆角：按钮、标签
$border-radius-md: 6px;   // 中圆角：输入框、小卡片
$border-radius-lg: 8px;   // 大圆角：大卡片、模态框
```

#### 3.4.2 阴影规范
```scss
$box-shadow-sm: 0 2px 8px 0 rgba(0, 0, 0, 0.12);    // 轻微阴影
$box-shadow-md: 0 4px 12px 0 rgba(0, 0, 0, 0.15);   // 标准阴影
$box-shadow-lg: 0 6px 20px 0 rgba(0, 0, 0, 0.15);   // 深度阴影
```

## 4. 布局系统

### 4.1 网格系统

#### 4.1.1 断点规范
```scss
$screen-xs: 480px;   // 超小屏
$screen-sm: 576px;   // 小屏
$screen-md: 768px;   // 中屏
$screen-lg: 992px;   // 大屏
$screen-xl: 1200px;  // 超大屏
$screen-xxl: 1600px; // 极大屏
```

#### 4.1.2 栅格系统
- 采用24栅格系统
- 响应式断点适配
- 支持灵活的栅格组合

### 4.2 页面布局

#### 4.2.1 整体布局结构
```
┌─────────────────────────────────────────────────┐
│ Header (高度: 64px)                              │
├─────────────────────────────────────────────────┤
│ Sidebar │ Main Content                          │
│ (宽度:  │                                       │
│ 240px)  │                                       │
│         │                                       │
│         │                                       │
│         │                                       │
└─────────────────────────────────────────────────┘
```

#### 4.2.2 侧边栏设计
- **宽度**: 240px (展开) / 64px (收起)
- **背景**: 深色渐变 (#001529 到 #002140)
- **菜单项高度**: 40px
- **支持折叠**: 小屏设备自动折叠

#### 4.2.3 主内容区域
- **最小宽度**: 320px
- **最大宽度**: 无限制 (适应屏幕)
- **边距**: 24px
- **背景**: #f0f2f5

## 5. 组件设计规范

### 5.1 基础组件

#### 5.1.1 按钮 (Button)
```scss
// 主要按钮
.btn-primary {
  background: $primary-color;
  border-color: $primary-color;
  color: #ffffff;
  border-radius: $border-radius-md;
  padding: 8px 16px;
  
  &:hover {
    background: $primary-5;
    border-color: $primary-5;
  }
}

// 次要按钮
.btn-default {
  background: #ffffff;
  border-color: $border-color;
  color: $text-color;
  
  &:hover {
    border-color: $primary-color;
    color: $primary-color;
  }
}
```

#### 5.1.2 卡片 (Card)
```scss
.card {
  background: $component-background;
  border-radius: $border-radius-lg;
  box-shadow: $box-shadow-sm;
  padding: $spacing-lg;
  margin-bottom: $spacing-lg;
  
  &:hover {
    box-shadow: $box-shadow-md;
  }
}
```

#### 5.1.3 表格 (Table)
```scss
.table {
  background: $component-background;
  border-radius: $border-radius-lg;
  
  .table-header {
    background: #fafafa;
    font-weight: 500;
    color: $text-color;
  }
  
  .table-row {
    border-bottom: 1px solid $divider-color;
    
    &:hover {
      background: #f5f5f5;
    }
  }
}
```

### 5.2 业务组件

#### 5.2.1 状态徽章 (StatusBadge)
```scss
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  
  &.status-ready {
    background: rgba(82, 196, 26, 0.1);
    color: $success-color;
    border: 1px solid rgba(82, 196, 26, 0.3);
  }
  
  &.status-error {
    background: rgba(255, 77, 79, 0.1);
    color: $error-color;
    border: 1px solid rgba(255, 77, 79, 0.3);
  }
  
  &.status-warning {
    background: rgba(250, 173, 20, 0.1);
    color: $warning-color;
    border: 1px solid rgba(250, 173, 20, 0.3);
  }
}
```

#### 5.2.2 资源使用率 (ResourceUsage)
```scss
.resource-usage {
  .usage-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    
    .usage-label {
      font-size: 14px;
      color: $text-color;
    }
    
    .usage-value {
      font-size: 14px;
      font-weight: 500;
      color: $text-color;
    }
  }
  
  .usage-progress {
    height: 8px;
    background: #f5f5f5;
    border-radius: 4px;
    overflow: hidden;
    
    .usage-bar {
      height: 100%;
      background: linear-gradient(90deg, $primary-color, $primary-5);
      transition: width 0.3s ease;
    }
  }
}
```

## 6. 页面设计规范

### 6.1 概览页面设计

#### 6.1.1 布局结构
```
┌─────────────────────────────────────────────────┐
│ 页面标题区域 (高度: 60px)                        │
├─────────────────────────────────────────────────┤
│ Karmada状态卡片区域 (高度: 120px)                │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│ │ 版本信息 │ │ 运行状态 │ │ 运行时长 │              │
│ └─────────┘ └─────────┘ └─────────┘              │
├─────────────────────────────────────────────────┤
│ 资源概览卡片区域 (高度: 120px)                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│ │ 节点统计 │ │ CPU使用 │ │ 内存使用 │              │
│ └─────────┘ └─────────┘ └─────────┘              │
├─────────────────────────────────────────────────┤
│ 集群状态表格区域 (自适应高度)                    │
└─────────────────────────────────────────────────┘
```

#### 6.1.2 卡片设计规范
- **卡片尺寸**: 最小宽度280px，高度100px
- **内边距**: 24px
- **圆角**: 8px
- **阴影**: 轻微阴影
- **标题字号**: 14px，字重500
- **数值字号**: 24px，字重600
- **单位字号**: 12px，字重400

### 6.2 集群管理页面设计

#### 6.2.1 集群列表卡片
```scss
.cluster-card {
  background: $component-background;
  border-radius: $border-radius-lg;
  box-shadow: $box-shadow-sm;
  padding: $spacing-lg;
  margin-bottom: $spacing-md;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: $box-shadow-md;
    transform: translateY(-2px);
  }
  
  .cluster-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-md;
    
    .cluster-name {
      font-size: 18px;
      font-weight: 600;
      color: $text-color;
    }
    
    .cluster-status {
      display: flex;
      align-items: center;
      
      .status-icon {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
        
        &.ready { background: $success-color; }
        &.not-ready { background: $error-color; }
      }
    }
  }
  
  .cluster-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-md;
    margin-bottom: $spacing-md;
    
    .info-item {
      .label {
        font-size: 12px;
        color: $text-color-secondary;
        margin-bottom: 4px;
      }
      
      .value {
        font-size: 14px;
        font-weight: 500;
        color: $text-color;
      }
    }
  }
  
  .cluster-resources {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: $spacing-md;
    margin-bottom: $spacing-md;
  }
  
  .cluster-actions {
    display: flex;
    gap: $spacing-sm;
    justify-content: flex-end;
  }
}
```

#### 6.2.2 节点表格设计
```scss
.node-table {
  .node-row {
    &:hover {
      background: rgba(24, 144, 255, 0.05);
    }
  }
  
  .node-name {
    font-weight: 500;
    color: $primary-color;
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  .node-ip {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    color: $text-color-secondary;
  }
  
  .resource-cell {
    .resource-value {
      font-weight: 500;
    }
    
    .resource-total {
      color: $text-color-secondary;
      font-size: 12px;
    }
  }
}
```

### 6.3 资源管理页面设计

#### 6.3.1 工作负载卡片
```scss
.workload-card {
  background: $component-background;
  border-radius: $border-radius-lg;
  box-shadow: $box-shadow-sm;
  padding: $spacing-lg;
  margin-bottom: $spacing-md;
  
  .workload-header {
    display: flex;
    align-items: center;
    margin-bottom: $spacing-md;
    
    .workload-icon {
      width: 24px;
      height: 24px;
      margin-right: $spacing-sm;
      color: $primary-color;
    }
    
    .workload-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-color;
    }
  }
  
  .workload-meta {
    display: flex;
    gap: $spacing-lg;
    margin-bottom: $spacing-md;
    
    .meta-item {
      font-size: 12px;
      color: $text-color-secondary;
      
      .meta-value {
        color: $text-color;
        font-weight: 500;
      }
    }
  }
  
  .workload-distribution {
    background: #fafafa;
    padding: $spacing-md;
    border-radius: $border-radius-md;
    margin-bottom: $spacing-md;
    
    .distribution-title {
      font-size: 12px;
      color: $text-color-secondary;
      margin-bottom: $spacing-sm;
    }
    
    .cluster-chips {
      display: flex;
      gap: $spacing-sm;
      
      .cluster-chip {
        background: $primary-color;
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
      }
    }
  }
}
```

### 6.4 调度可视化设计

#### 6.4.1 调度流程图
```scss
.scheduling-flow {
  background: $component-background;
  padding: $spacing-xl;
  border-radius: $border-radius-lg;
  
  .flow-step {
    display: flex;
    align-items: center;
    margin-bottom: $spacing-lg;
    
    .step-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: $primary-color;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      margin-right: $spacing-md;
    }
    
    .step-content {
      flex: 1;
      
      .step-title {
        font-size: 14px;
        font-weight: 500;
        color: $text-color;
        margin-bottom: 4px;
      }
      
      .step-description {
        font-size: 12px;
        color: $text-color-secondary;
      }
    }
    
    .step-result {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      padding: 8px 12px;
      border-radius: $border-radius-md;
      font-size: 12px;
      color: $success-color;
      font-weight: 500;
    }
  }
  
  .flow-connector {
    width: 2px;
    height: 24px;
    background: $border-color;
    margin: 0 15px $spacing-sm 15px;
  }
}
```

## 7. 交互设计规范

### 7.1 基础交互

#### 7.1.1 悬停效果
```scss
// 卡片悬停
.card:hover {
  box-shadow: $box-shadow-md;
  transform: translateY(-2px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// 按钮悬停
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

// 表格行悬停
.table-row:hover {
  background: rgba(24, 144, 255, 0.05);
}
```

#### 7.1.2 点击反馈
```scss
// 按钮点击
.btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

// 卡片点击
.card:active {
  transform: translateY(0);
}
```

#### 7.1.3 加载状态
```scss
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid $primary-color;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### 7.2 导航交互

#### 7.2.1 面包屑导航
```scss
.breadcrumb {
  display: flex;
  align-items: center;
  margin-bottom: $spacing-lg;
  
  .breadcrumb-item {
    color: $text-color-secondary;
    font-size: 14px;
    
    &.active {
      color: $text-color;
      font-weight: 500;
    }
    
    &:not(:last-child)::after {
      content: '/';
      margin: 0 8px;
      color: $text-color-disabled;
    }
  }
  
  .breadcrumb-link {
    color: $primary-color;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
}
```

#### 7.2.2 标签页切换
```scss
.tabs {
  border-bottom: 1px solid $border-color;
  margin-bottom: $spacing-lg;
  
  .tab-item {
    padding: 12px 16px;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    color: $text-color-secondary;
    
    &.active {
      color: $primary-color;
      border-bottom-color: $primary-color;
    }
    
    &:hover {
      color: $primary-color;
    }
  }
}
```

### 7.3 反馈机制

#### 7.3.1 消息提示
```scss
.message {
  padding: 12px 16px;
  border-radius: $border-radius-md;
  margin-bottom: $spacing-md;
  display: flex;
  align-items: center;
  
  &.success {
    background: #f6ffed;
    border: 1px solid #b7eb8f;
    color: $success-color;
  }
  
  &.error {
    background: #fff2f0;
    border: 1px solid #ffccc7;
    color: $error-color;
  }
  
  &.warning {
    background: #fffbe6;
    border: 1px solid #ffe58f;
    color: $warning-color;
  }
  
  &.info {
    background: #e6f7ff;
    border: 1px solid #91d5ff;
    color: $info-color;
  }
}
```

#### 7.3.2 加载骨架屏
```scss
.skeleton {
  .skeleton-line {
    height: 16px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 8px;
    
    &.short { width: 60%; }
    &.medium { width: 80%; }
    &.long { width: 100%; }
  }
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## 8. 响应式设计

### 8.1 桌面端设计 (≥1200px)

#### 8.1.1 布局特点
- 侧边栏固定展开 (240px)
- 主内容区域充分利用空间
- 卡片网格布局 (3-4列)
- 表格显示完整信息

#### 8.1.2 关键组件尺寸
```scss
@media (min-width: 1200px) {
  .cluster-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-lg;
  }
  
  .overview-cards {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .workload-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

### 8.2 平板端设计 (768px-1199px)

#### 8.2.1 布局调整
- 侧边栏可收起
- 卡片网格调整为2列
- 表格支持横向滚动
- 适当缩小间距

#### 8.2.2 关键组件调整
```scss
@media (max-width: 1199px) and (min-width: 768px) {
  .cluster-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-md;
  }
  
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .sidebar {
    width: 200px;
  }
}
```

### 8.3 移动端设计 (<768px)

#### 8.3.1 布局特点
- 侧边栏改为抽屉式
- 卡片单列布局
- 表格改为卡片式展示
- 优化触摸操作

#### 8.3.2 移动端适配
```scss
@media (max-width: 767px) {
  .cluster-grid,
  .overview-cards,
  .workload-grid {
    grid-template-columns: 1fr;
    gap: $spacing-md;
  }
  
  .sidebar {
    position: fixed;
    left: -240px;
    top: 64px;
    height: calc(100vh - 64px);
    z-index: 1000;
    transition: left 0.3s ease;
    
    &.open {
      left: 0;
    }
  }
  
  .main-content {
    padding: $spacing-md;
  }
  
  .table-responsive {
    overflow-x: auto;
  }
}
```

## 9. 动画和过渡

### 9.1 页面过渡
```scss
.page-transition {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter {
  opacity: 0;
}

.fade-enter-active {
  opacity: 1;
  transition: opacity 0.3s ease;
}

.fade-exit {
  opacity: 1;
}

.fade-exit-active {
  opacity: 0;
  transition: opacity 0.3s ease;
}
```

### 9.2 数据更新动画
```scss
.data-update {
  animation: pulse 0.6s ease-in-out;
}

@keyframes pulse {
  0% { background-color: rgba(24, 144, 255, 0.1); }
  50% { background-color: rgba(24, 144, 255, 0.2); }
  100% { background-color: rgba(24, 144, 255, 0.1); }
}
```

## 10. 暗色主题设计

### 10.1 暗色主题色彩
```scss
// 暗色主题色彩变量
$dark-bg-1: #141414;           // 页面背景
$dark-bg-2: #1f1f1f;           // 组件背景
$dark-bg-3: #262626;           // 悬停背景
$dark-border: #303030;         // 边框色
$dark-text-1: #ffffffd9;       // 主文本
$dark-text-2: #ffffffa6;       // 次要文本
$dark-text-3: #ffffff73;       // 辅助文本
```

### 10.2 暗色主题适配
```scss
[data-theme='dark'] {
  .card {
    background: $dark-bg-2;
    border-color: $dark-border;
  }
  
  .table {
    background: $dark-bg-2;
    
    .table-header {
      background: $dark-bg-3;
    }
    
    .table-row {
      border-color: $dark-border;
      
      &:hover {
        background: $dark-bg-3;
      }
    }
  }
  
  .text-primary {
    color: $dark-text-1;
  }
  
  .text-secondary {
    color: $dark-text-2;
  }
}
```

## 11. 可访问性设计

### 11.1 色彩对比
- 确保所有文本与背景的对比度至少达到 4.5:1
- 重要信息的对比度达到 7:1
- 不仅依赖颜色传达信息

### 11.2 键盘导航
- 所有交互元素支持Tab键导航
- 明确的焦点指示器
- 逻辑清晰的Tab顺序

### 11.3 语义化标记
```html
<!-- 状态信息 -->
<div role="status" aria-live="polite">
  集群状态已更新
</div>

<!-- 按钮 -->
<button aria-label="查看集群详情">
  查看详情
</button>

<!-- 表格 -->
<table role="table" aria-label="集群列表">
  <thead>
    <tr role="row">
      <th role="columnheader">集群名称</th>
    </tr>
  </thead>
</table>
```

## 12. 设计资源

### 12.1 图标库
- 主要使用 Ant Design Icons
- 自定义图标遵循24x24px网格
- 支持多种状态和尺寸

### 12.2 插画和图片
- 空状态插画风格统一
- 图片压缩优化
- 支持高清显示

### 12.3 设计文件
- Figma设计文件
- 组件库文档
- 设计标注规范

---

*此文档将随着设计系统的完善持续更新* 