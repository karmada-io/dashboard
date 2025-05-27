# Karmada-Manager 炫酷科技风 UI/UX 设计规范文档

## 1. 文档信息

### 1.1 版本历史

| 版本号 | 日期 | 作者 | 变更说明 |
|--------|------|------|----------|
| 1.0 | 2025-01-XX | UI/UX设计师 | 初稿创建，基础UI/UX设计规范 |
| 2.0 | 2025-01-XX | UI/UX设计师 | 炫酷科技风亮色主题设计，强视觉冲击 |

### 1.2 文档目的

基于PRD文档和用户故事地图，为Karmada-Manager提供炫酷科技风的UI/UX设计规范，在亮色主题基础上实现强烈的视觉冲击感和未来科技感，确保产品界面的现代性、吸引力和用户体验。

## 2. 设计理念和原则

### 2.1 炫酷科技设计理念
- **未来科技感**: 采用科技蓝、霓虹色彩和发光效果，营造未来感
- **视觉冲击力**: 强烈的色彩对比、动态效果和渐变设计
- **亮色科技风**: 在亮色背景下实现科技感，避免传统暗色局限
- **交互丰富性**: 丰富的悬停、点击和过渡动画效果
- **数据可视化**: 将枯燥的数据转化为炫酷的视觉展示

### 2.2 核心设计原则
- **科技优先**: 以科技感和未来感为设计出发点
- **视觉震撼**: 通过色彩、光效、动画创造强烈视觉冲击
- **亮色创新**: 突破传统科技风格的暗色限制
- **用户沉浸**: 让用户沉浸在炫酷的科技界面体验中
- **功能美观**: 在保证功能性的同时最大化视觉美感

## 3. 视觉设计系统

### 3.1 色彩系统 - 亮色科技风格

#### 3.1.1 主色调 - 科技蓝渐变系列
```scss
// 科技感主题色 - 明亮渐变
$tech-primary: #00d4ff;         // 科技主蓝色 (亮青蓝)
$tech-primary-1: #e6fdff;       // 最浅 (冰雪蓝)
$tech-primary-2: #b3f7ff;       // 浅 (天空蓝)
$tech-primary-3: #80f1ff;       // 明亮蓝
$tech-primary-4: #4debff;       // 发光蓝
$tech-primary-5: #1ae5ff;       // 标准科技蓝
$tech-primary-6: #00d4ff;       // 主色调
$tech-primary-7: #00bfeb;       // 深一点
$tech-primary-8: #0099cc;       // 更深
$tech-primary-9: #0073a3;       // 深科技蓝
$tech-primary-10: #004d7a;      // 最深

// 辅助科技色彩
$tech-secondary: #7c3aed;       // 科技紫色
$tech-accent: #06ffa5;          // 科技绿色 (霓虹绿)
$tech-highlight: #ffd700;       // 科技金色 (霓虹黄)
```

#### 3.1.2 炫酷功能色彩
```scss
// 状态颜色 - 高饱和度科技感
$success-color: #00ff88;        // 霓虹绿 (成功/正常)
$warning-color: #ff8c00;        // 科技橙 (警告状态)
$error-color: #ff0080;          // 霓虹粉 (错误/危险)
$info-color: #00d4ff;           // 科技蓝 (信息状态)

// 特殊科技色
$pulse-color: #00ffff;          // 脉冲青色
$glow-color: #ffffff;           // 发光白色
$energy-color: #7c3aed;         // 能量紫色

// 亮色主题文本色
$text-color: #1a1a1a;           // 主文本色 (深灰)
$text-color-secondary: #4a4a4a; // 次要文本色
$text-color-disabled: #9a9a9a;  // 禁用文本色
$text-color-accent: #0073a3;    // 强调文本色

// 亮色背景系统
$background-color: #f8feff;     // 页面背景色 (极浅蓝白)
$component-background: #ffffff; // 组件背景色
$card-background: rgba(255, 255, 255, 0.9); // 卡片背景 (半透明)
$overlay-background: rgba(255, 255, 255, 0.95); // 覆盖层背景

// 边框和分割线
$border-color: #e0f4ff;         // 边框色 (浅科技蓝)
$divider-color: #f0f9ff;        // 分割线色
$glow-border: rgba(0, 212, 255, 0.3); // 发光边框
```

#### 3.1.3 渐变色系统
```scss
// 科技感渐变背景
$gradient-primary: linear-gradient(135deg, #f8feff 0%, #e6fdff 50%, #f0f9ff 100%);
$gradient-card: linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,254,255,0.8) 100%);
$gradient-button: linear-gradient(45deg, #00d4ff 0%, #1ae5ff 50%, #4debff 100%);
$gradient-accent: linear-gradient(90deg, #7c3aed 0%, #00d4ff 50%, #06ffa5 100%);

// 发光效果渐变
$glow-gradient: radial-gradient(circle, rgba(0,212,255,0.3) 0%, transparent 70%);
$pulse-gradient: radial-gradient(circle, rgba(0,255,255,0.2) 0%, transparent 60%);
```

#### 3.1.4 炫酷状态色应用
| 状态 | 颜色 | 发光效果 | 应用场景 |
|------|------|----------|----------|
| 🟢 Ready/Success | `#00ff88` | `box-shadow: 0 0 20px rgba(0,255,136,0.4)` | 集群正常、Pod运行正常、操作成功 |
| 🟡 Warning | `#ff8c00` | `box-shadow: 0 0 15px rgba(255,140,0,0.3)` | 资源使用率高、配置警告 |
| 🔴 Error/Failed | `#ff0080` | `box-shadow: 0 0 20px rgba(255,0,128,0.4)` | 集群异常、Pod失败、操作错误 |
| 🔵 Info/Processing | `#00d4ff` | `box-shadow: 0 0 25px rgba(0,212,255,0.5)` | 信息提示、处理中状态 |
| ⚪ Unknown/Disabled | `#9a9a9a` | 无发光 | 未知状态、禁用状态 |
| ⚡ Energy/Active | `#7c3aed` | `box-shadow: 0 0 30px rgba(124,58,237,0.6)` | 活跃状态、高能耗 |

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

### 3.4 圆角和科技感阴影

#### 3.4.1 圆角规范
```scss
$border-radius-sm: 6px;   // 小圆角：按钮、标签
$border-radius-md: 8px;   // 中圆角：输入框、小卡片
$border-radius-lg: 12px;  // 大圆角：大卡片、模态框
$border-radius-xl: 16px;  // 超大圆角：主要容器
```

#### 3.4.2 科技感阴影系统
```scss
// 基础阴影
$box-shadow-sm: 0 4px 12px 0 rgba(0, 212, 255, 0.1), 
                0 2px 6px 0 rgba(0, 0, 0, 0.05);      // 轻微科技阴影
$box-shadow-md: 0 8px 24px 0 rgba(0, 212, 255, 0.15), 
                0 4px 12px 0 rgba(0, 0, 0, 0.08);     // 标准科技阴影
$box-shadow-lg: 0 12px 40px 0 rgba(0, 212, 255, 0.2), 
                0 8px 20px 0 rgba(0, 0, 0, 0.1);      // 深度科技阴影

// 发光阴影
$glow-shadow-sm: 0 0 15px rgba(0, 212, 255, 0.3);     // 小发光
$glow-shadow-md: 0 0 25px rgba(0, 212, 255, 0.4);     // 中发光
$glow-shadow-lg: 0 0 35px rgba(0, 212, 255, 0.5);     // 大发光

// 状态发光
$success-glow: 0 0 20px rgba(0, 255, 136, 0.4);       // 成功发光
$error-glow: 0 0 20px rgba(255, 0, 128, 0.4);         // 错误发光
$warning-glow: 0 0 15px rgba(255, 140, 0, 0.3);       // 警告发光
$energy-glow: 0 0 30px rgba(124, 58, 237, 0.6);       // 能量发光

// 多层阴影组合
$tech-card-shadow: 
  0 0 20px rgba(0, 212, 255, 0.1),      // 外发光
  0 8px 32px rgba(0, 0, 0, 0.06),       // 深度
  inset 0 1px 0 rgba(255, 255, 255, 0.9); // 内亮边

$tech-button-shadow: 
  0 0 15px rgba(0, 212, 255, 0.3),      // 发光
  0 4px 15px rgba(0, 0, 0, 0.1),        // 深度
  inset 0 1px 0 rgba(255, 255, 255, 0.8); // 内亮边
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

#### 5.1.1 炫酷按钮 (Button)
```scss
// 科技感主要按钮
.btn-primary {
  background: $gradient-button;
  border: 2px solid transparent;
  color: #ffffff;
  border-radius: $border-radius-md;
  padding: 12px 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: $tech-button-shadow;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: left 0.5s;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: $glow-shadow-md, 0 8px 25px rgba(0, 0, 0, 0.15);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
  }
}

// 科技感次要按钮
.btn-secondary {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid $tech-primary;
  color: $tech-primary;
  border-radius: $border-radius-md;
  padding: 10px 20px;
  position: relative;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  font-weight: 500;
  
  &:hover {
    background: $tech-primary;
    color: #ffffff;
    box-shadow: $glow-shadow-sm;
    transform: translateY(-1px);
  }
}

// 发光轮廓按钮
.btn-glow {
  background: transparent;
  border: 2px solid $tech-primary;
  color: $tech-primary;
  border-radius: $border-radius-md;
  padding: 10px 20px;
  position: relative;
  transition: all 0.3s ease;
  
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: $gradient-accent;
    border-radius: $border-radius-md;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
  }
  
  &:hover {
    color: #ffffff;
    box-shadow: $glow-shadow-md;
    
    &::before {
      opacity: 1;
    }
  }
}

// 危险按钮
.btn-danger {
  background: linear-gradient(45deg, #ff0080, #ff4d8f);
  border: 2px solid transparent;
  color: #ffffff;
  border-radius: $border-radius-md;
  padding: 10px 20px;
  transition: all 0.3s ease;
  box-shadow: $error-glow;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 25px rgba(255, 0, 128, 0.5);
  }
}
```

#### 5.1.2 科技感卡片 (Card)
```scss
.card {
  background: $gradient-card;
  border-radius: $border-radius-lg;
  border: 1px solid $glow-border;
  box-shadow: $tech-card-shadow;
  padding: $spacing-lg;
  margin-bottom: $spacing-lg;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: $gradient-accent;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: $glow-gradient;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 0;
  }
  
  > * {
    position: relative;
    z-index: 1;
  }
  
  &:hover {
    box-shadow: $tech-card-shadow, $glow-shadow-md;
    transform: translateY(-4px);
    border-color: $tech-primary;
    
    &::before {
      opacity: 1;
    }
    
    &::after {
      opacity: 0.3;
    }
  }
}

// 状态卡片变体
.card-success {
  border-color: rgba(0, 255, 136, 0.3);
  
  &:hover {
    box-shadow: $tech-card-shadow, $success-glow;
  }
}

.card-warning {
  border-color: rgba(255, 140, 0, 0.3);
  
  &:hover {
    box-shadow: $tech-card-shadow, $warning-glow;
  }
}

.card-error {
  border-color: rgba(255, 0, 128, 0.3);
  
  &:hover {
    box-shadow: $tech-card-shadow, $error-glow;
  }
}

// 能量卡片
.card-energy {
  border-color: rgba(124, 58, 237, 0.3);
  
  &::before {
    background: linear-gradient(90deg, #7c3aed, #a855f7, #c084fc);
  }
  
  &:hover {
    box-shadow: $tech-card-shadow, $energy-glow;
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

## 9. 炫酷动画和过渡系统

### 9.1 页面过渡动画
```scss
.page-transition {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

// 淡入放大效果
.fade-scale-enter {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

.fade-scale-enter-active {
  opacity: 1;
  transform: scale(1) translateY(0);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-scale-exit {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.fade-scale-exit-active {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}

// 滑动进入效果
.slide-up-enter {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 9.2 科技感数据动画
```scss
// 数据更新脉冲
.data-update {
  animation: techPulse 0.8s ease-in-out;
}

@keyframes techPulse {
  0% { 
    background-color: rgba(0, 212, 255, 0.1);
    box-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
  }
  50% { 
    background-color: rgba(0, 212, 255, 0.3);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
  }
  100% { 
    background-color: rgba(0, 212, 255, 0.1);
    box-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
  }
}

// 能量流动动画
.energy-flow {
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(0, 212, 255, 0.4) 50%, 
      transparent 100%);
    animation: energyFlow 2s infinite;
  }
}

@keyframes energyFlow {
  0% { left: -100%; }
  100% { left: 100%; }
}

// 呼吸发光效果
.breathing-glow {
  animation: breathingGlow 3s ease-in-out infinite;
}

@keyframes breathingGlow {
  0%, 100% { 
    box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 212, 255, 0.6);
  }
}
```

### 9.3 状态指示动画
```scss
// 加载旋转动画
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(0, 212, 255, 0.2);
  border-top: 3px solid $tech-primary;
  border-radius: 50%;
  animation: techSpin 1s linear infinite;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border: 1px solid transparent;
    border-top-color: rgba(0, 212, 255, 0.5);
    border-radius: 50%;
    animation: techSpin 2s linear infinite reverse;
  }
}

@keyframes techSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 成功状态动画
.success-indicator {
  animation: successGlow 0.6s ease-out;
}

@keyframes successGlow {
  0% { 
    box-shadow: 0 0 0 rgba(0, 255, 136, 0.5);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.8);
    transform: scale(1.05);
  }
  100% { 
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
    transform: scale(1);
  }
}

// 错误状态动画
.error-shake {
  animation: errorShake 0.5s ease-in-out;
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

### 9.4 进度条动画
```scss
// 科技感进度条
.tech-progress {
  height: 8px;
  background: rgba(0, 212, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, 
      $tech-primary 0%, 
      $tech-primary-4 50%, 
      $tech-primary 100%);
    border-radius: 4px;
    position: relative;
    transition: width 0.5s ease;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(255, 255, 255, 0.3) 50%, 
        transparent 100%);
      animation: progressShine 2s infinite;
    }
  }
}

@keyframes progressShine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

// 圆形进度动画
.circular-progress {
  position: relative;
  width: 60px;
  height: 60px;
  
  svg {
    transform: rotate(-90deg);
  }
  
  .progress-circle {
    fill: none;
    stroke: rgba(0, 212, 255, 0.1);
    stroke-width: 4;
  }
  
  .progress-value {
    fill: none;
    stroke: url(#techGradient);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 188.4;
    stroke-dashoffset: 188.4;
    transition: stroke-dashoffset 1s ease-in-out;
    filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.6));
  }
}
```

### 9.5 微交互动画
```scss
// 按钮点击波纹效果
.ripple-effect {
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    transform: translate(-50%, -50%);
    transition: width 0.3s, height 0.3s;
  }
  
  &:active::after {
    width: 300px;
    height: 300px;
  }
}

// 悬停放大效果
.hover-scale {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: scale(1.05);
  }
}

// 浮动效果
.floating {
  animation: floating 3s ease-in-out infinite;
}

@keyframes floating {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

## 10. 科技感视觉特效

### 10.1 全局科技背景
```scss
// 主页面科技背景
.tech-background {
  background: $gradient-primary;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(6, 255, 165, 0.05) 0%, transparent 70%);
    animation: techBackgroundFlow 20s ease-in-out infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(45deg, transparent 40%, rgba(0, 212, 255, 0.02) 50%, transparent 60%);
    animation: techGrid 30s linear infinite;
  }
}

@keyframes techBackgroundFlow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes techGrid {
  0% { transform: translateX(-100px) translateY(-100px); }
  100% { transform: translateX(100px) translateY(100px); }
}
```

### 10.2 粒子效果系统
```scss
// 浮动粒子背景
.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(0, 212, 255, 0.6);
  border-radius: 50%;
  animation: particleFloat 10s linear infinite;
  
  &:nth-child(2n) {
    background: rgba(124, 58, 237, 0.4);
    animation-duration: 15s;
  }
  
  &:nth-child(3n) {
    background: rgba(6, 255, 165, 0.3);
    animation-duration: 20s;
  }
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) translateX(0) scale(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
    transform: translateY(90vh) translateX(10px) scale(1);
  }
  90% {
    opacity: 1;
    transform: translateY(10vh) translateX(-10px) scale(1);
  }
  100% {
    transform: translateY(0) translateX(0) scale(0);
    opacity: 0;
  }
}
```

### 10.3 数据流可视化
```scss
// 数据流动线条
.data-stream {
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      $tech-primary 20%, 
      $tech-primary-4 50%, 
      $tech-primary 80%, 
      transparent 100%);
    animation: dataStreamFlow 3s ease-in-out infinite;
  }
}

@keyframes dataStreamFlow {
  0% { transform: translateX(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}

// 脉冲信号
.pulse-signal {
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    background: $tech-primary;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: pulseSignal 2s ease-in-out infinite;
  }
}

@keyframes pulseSignal {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.7);
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.5);
    box-shadow: 0 0 0 20px rgba(0, 212, 255, 0);
  }
}
```

### 10.4 全息界面效果
```scss
// 全息边框
.hologram-border {
  position: relative;
  border: 1px solid transparent;
  
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    background: linear-gradient(45deg, 
      $tech-primary 0%, 
      transparent 25%, 
      $tech-secondary 50%, 
      transparent 75%, 
      $tech-accent 100%);
    border-radius: inherit;
    z-index: -1;
    animation: hologramRotate 4s linear infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: $component-background;
    border-radius: inherit;
    z-index: -1;
  }
}

@keyframes hologramRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 全息文字效果
.hologram-text {
  color: $tech-primary;
  text-shadow: 
    0 0 5px rgba(0, 212, 255, 0.5),
    0 0 10px rgba(0, 212, 255, 0.3),
    0 0 15px rgba(0, 212, 255, 0.2);
  animation: hologramFlicker 3s ease-in-out infinite;
}

@keyframes hologramFlicker {
  0%, 100% { opacity: 1; }
  95% { opacity: 1; }
  96% { opacity: 0.8; }
  97% { opacity: 1; }
  98% { opacity: 0.9; }
  99% { opacity: 1; }
}
```

### 10.5 能量场效果
```scss
// 能量场光环
.energy-field {
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background: radial-gradient(circle, 
      rgba(0, 212, 255, 0.2) 0%, 
      rgba(0, 212, 255, 0.1) 40%, 
      transparent 70%);
    border-radius: 50%;
    animation: energyFieldPulse 4s ease-in-out infinite;
    z-index: -1;
  }
}

@keyframes energyFieldPulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.6; }
}

// 电流效果
.electric-current {
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(0, 255, 255, 0.8) 50%, 
      transparent 100%);
    animation: electricFlow 1.5s ease-in-out infinite;
  }
}

@keyframes electricFlow {
  0% { left: -100%; }
  100% { left: 100%; }
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