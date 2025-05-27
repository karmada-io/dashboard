# Karmada-Manager 设计规范说明

## 项目概述

Karmada-Manager 是一个基于 Web 的多集群 Kubernetes 管理平台，为平台运维工程师和开发人员提供直观、高效的多集群管理界面。本文档描述了原型设计的完整规范和实现标准，包含两个主要版本：**Kuboard 风格版本**和**原始功能版本**。

## 版本对比

### 🎨 Kuboard 风格版本 (v2.0)

参考 Kuboard 优秀的 UI 设计理念，采用现代化的界面设计和用户体验。

**设计特色：**
- Element UI 色彩体系 (`#409EFF` 主色调)
- 现代化卡片设计，圆角和阴影效果
- 清晰的视觉层次和信息架构
- 优雅的悬停效果和动画过渡
- 统一的间距规范和布局标准
- 状态徽章和渐变图标设计
- 面包屑导航和搜索过滤功能

**适用场景：**
- 注重视觉体验的现代化应用
- 需要清晰信息架构的管理界面
- 面向最终用户的产品界面

### ⚙️ 原始功能版本 (v1.0)

功能完整的 Karmada 管理界面，专注于业务逻辑和数据展示。

**功能特色：**
- 完整的 Karmada 业务功能实现
- 详细的数据展示和实时监控
- 复杂的多层级导航结构
- 丰富的交互组件和操作功能
- 策略管理和调度追溯功能
- 真实 API 数据结构集成

**适用场景：**
- 功能优先的企业级应用
- 需要完整业务逻辑的管理系统
- 面向专业运维人员的工具

### 🚀 炫酷科技风格版本 (v3.0)

基于最新设计趋势，打造具有未来科技感的多集群管理界面。

**设计特色：**

#### 🌟 主要视觉改进：

**深色科技背景**
- 改为深黑渐变背景（`#0a0a0a` → `#1a1a2e` → `#16213e`）
- 添加径向渐变光晕效果
- 增加边框发光和阴影效果

**中心控制平面升级**
- 圆形发光设计，模仿科技感中心效果
- 添加脉冲动画（缩放+发光强度变化）
- 图标旋转动画增强科技感
- 多层发光效果（内外阴影）

**发光连接线**
- 渐变色连接线（蓝色到各指标颜色）
- SVG滤镜添加发光效果
- 动态流动动画效果

**炫酷指标卡片**
- 半透明玻璃质感背景
- 各自颜色的发光边框和阴影
- 更大的图标和文字，增强视觉冲击
- 错开的动画延迟创造波浪效果

**动态节点展示**
- 真实节点数据显示（Ready=绿色发光，NotReady=紫色发光）
- 节点图标发光效果
- 闪烁动画模拟状态更新
- 半透明背景标签增强可读性

**背景粒子效果**
- 20个随机分布的发光粒子
- 闪烁动画增强空间感
- 模拟星空科技感

#### 🚀 技术实现亮点：
- **CSS3高级特效**：渐变、阴影、滤镜、毛玻璃效果
- **SVG动画**：连接线流动效果和发光滤镜
- **多层动画系统**：脉冲、旋转、闪烁、发光等组合
- **响应式设计**：适配不同屏幕尺寸
- **性能优化**：合理的动画时长和延迟

#### 🎯 最终效果：
现在的成员集群资源概览具有：
- 🌌 深空科技感背景
- ✨ 多层次发光效果
- 🔄 流畅的动态动画
- 📊 清晰的数据展示
- 🎨 现代化的UI设计

**适用场景：**
- 面向未来的科技产品界面
- 需要视觉冲击力的展示场景
- 创新型企业和科技公司应用
- 高端用户群体的管理界面

## 技术栈

### 核心技术
- **HTML5**: 语义化标记，符合现代 Web 标准
- **Tailwind CSS 3.x**: 原子化 CSS 框架，响应式设计
- **FontAwesome 6.4.0**: 图标库，提供丰富的图标资源
- **Chart.js**: 数据可视化图表库
- **JavaScript ES6+**: 现代 JavaScript 特性

### 架构模式
- **组件化设计**: 可复用的 UI 组件
- **响应式布局**: 适配桌面端和移动端
- **模块化结构**: 清晰的文件组织和功能分离

## 设计系统

### Kuboard 风格色彩规范

#### 主色调 (Element UI 体系)
```css
--primary: #409EFF;           /* 主要品牌色 */
--primary-light: #66B3FF;     /* 浅色主色 */
--primary-dark: #337ECC;      /* 深色主色 */
--success: #67C23A;           /* 成功状态 */
--warning: #E6A23C;           /* 警告状态 */
--danger: #F56C6C;            /* 错误状态 */
--info: #909399;              /* 信息状态 */
--light: #F5F7FA;             /* 浅色背景 */
--dark: #1D1E1F;              /* 深色文本 */
```

#### 原始版本色彩规范

#### 主色调 (自定义 Karmada 体系)
```css
--karmada-blue: #1B4F72;      /* 主要品牌色 */
--karmada-light: #3498DB;     /* 辅助蓝色 */
--karmada-green: #27AE60;     /* 成功/正常状态 */
--karmada-orange: #F39C12;    /* 警告状态 */
--karmada-red: #E74C3C;       /* 错误/危险状态 */
```

#### 炫酷科技风格色彩规范

#### 暗色主题 (深空科技体系)
```css
--tech-bg-primary: #0a0a0a;         /* 主背景色 */
--tech-bg-secondary: #1a1a2e;       /* 次要背景色 */
--tech-bg-tertiary: #16213e;        /* 三级背景色 */
--tech-border: #2a2a3e;             /* 边框色 */

--tech-cyan: #00f5ff;               /* 青色发光 */
--tech-blue: #1e90ff;               /* 蓝色发光 */
--tech-purple: #722ed1;             /* 紫色发光 */
--tech-green: #52c41a;              /* 绿色发光 */
--tech-orange: #faad14;             /* 橙色发光 */

--tech-text-primary: #ffffff;       /* 主要文字 */
--tech-text-secondary: rgba(255, 255, 255, 0.8);  /* 次要文字 */
--tech-text-muted: rgba(255, 255, 255, 0.6);      /* 弱化文字 */
```

#### 亮色主题 (科技感增强体系)
```css
--tech-light-bg-primary: #f8fafc;   /* 主背景色 */
--tech-light-bg-secondary: #f1f5f9; /* 次要背景色 */
--tech-light-bg-tertiary: #e2e8f0;  /* 三级背景色 */
--tech-light-border: #cbd5e1;       /* 边框色 */

--tech-light-cyan: #0891b2;         /* 青色主色 */
--tech-light-blue: #2563eb;         /* 蓝色主色 */
--tech-light-purple: #7c3aed;       /* 紫色主色 */
--tech-light-green: #16a34a;        /* 绿色主色 */
--tech-light-orange: #ea580c;       /* 橙色主色 */

--tech-light-text-primary: #0f172a; /* 主要文字 */
--tech-light-text-secondary: #334155; /* 次要文字 */
--tech-light-text-muted: #64748b;   /* 弱化文字 */
```

### 语义化颜色

#### Kuboard 风格
- **成功状态**: `#67C23A` (Element Green) - Ready、Success、运行正常
- **警告状态**: `#E6A23C` (Element Orange) - Warning、CPU/内存占用高
- **错误状态**: `#F56C6C` (Element Red) - Error、Failed、不可用
- **信息状态**: `#409EFF` (Element Blue) - Info、Processing、待处理
- **中性状态**: `#909399` (Element Gray) - 默认、禁用、占位符

#### 原始版本
- **成功状态**: `#27AE60` (绿色) - Ready、Success、运行正常
- **警告状态**: `#F39C12` (橙色) - Warning、CPU/内存占用高
- **错误状态**: `#E74C3C` (红色) - Error、Failed、不可用
- **信息状态**: `#3498DB` (浅蓝) - Info、Processing、待处理
- **中性状态**: `#6B7280` (灰色) - 默认、禁用、占位符

### 背景颜色

#### Kuboard 风格
- **主背景**: `#F5F7FA` - 页面主体背景 (Element Light)
- **卡片背景**: `#FFFFFF` - 内容卡片背景
- **悬停背景**: `#F5F7FA` - 交互元素悬停状态
- **侧边栏**: `linear-gradient(145deg, #2C3E50 0%, #34495E 100%)`

#### 原始版本
- **主背景**: `#F8FAFC` - 页面主体背景
- **卡片背景**: `#FFFFFF` - 内容卡片背景
- **悬停背景**: `#F3F4F6` - 交互元素悬停状态
- **侧边栏**: `linear-gradient(180deg, #1B4F72 0%, #2C3E50 100%)`

### 字体规范

#### 字体族
```css
/* Kuboard 风格 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 
             'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', 
             'Helvetica', 'Arial', sans-serif;

/* 原始版本 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
```

#### 字体大小层级
- **H1 标题**: `2.25rem` (36px) - 页面主标题
- **H2 标题**: `1.875rem` (30px) - 区域标题
- **H3 标题**: `1.5rem` (24px) - 组件标题
- **H4 标题**: `1.25rem` (20px) - 卡片标题
- **H5 标题**: `1.125rem` (18px) - 小节标题
- **正文**: `1rem` (16px) - 主要内容
- **小文本**: `0.875rem` (14px) - 辅助信息
- **超小文本**: `0.75rem` (12px) - 标签、状态

#### 字重
- **Bold**: `font-weight: 700` - 重要标题和数据
- **Medium**: `font-weight: 500` - 次要标题
- **Regular**: `font-weight: 400` - 正文内容

### 间距规范

#### 组件间距
```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */
```

#### 布局间距
- **页面边距**: `1.5rem` (24px)
- **卡片内边距**: `1.5rem` (24px)
- **组件间距**: `1.5rem` (24px)
- **表格行间距**: `1rem` (16px)

### 边框和圆角

#### Kuboard 风格圆角规范
```css
--radius-sm: 0.375rem;   /* 6px - 小按钮、标签 */
--radius-md: 0.5rem;     /* 8px - 输入框、小卡片 */
--radius-lg: 0.75rem;    /* 12px - 大卡片、模态框 */
--radius-xl: 1rem;       /* 16px - 页面容器 */
```

#### 原始版本圆角规范
```css
--radius-sm: 0.375rem;   /* 6px - 小按钮、标签 */
--radius-md: 0.5rem;     /* 8px - 输入框、小卡片 */
--radius-lg: 0.75rem;    /* 12px - 大卡片、模态框 */
--radius-xl: 1rem;       /* 16px - 页面容器 */
```

#### 边框规范
```css
/* Kuboard 风格 */
--border-width: 1px;
--border-color: #EBEEF5;
--border-focus: #409EFF;

/* 原始版本 */
--border-width: 1px;
--border-color: #E5E7EB;
--border-focus: #3498DB;
```

### 阴影系统

#### Kuboard 风格阴影
```css
--shadow-sm: 0 2px 4px 0 rgba(0, 0, 0, 0.1);           /* 轻微阴影 */
--shadow-md: 0 2px 12px 0 rgba(0, 0, 0, 0.1);          /* 标准阴影 */
--shadow-lg: 0 6px 20px 0 rgba(64, 158, 255, 0.15);    /* 卡片阴影 */
--shadow-xl: 0 8px 25px 0 rgba(0, 0, 0, 0.15);         /* 模态框阴影 */
```

#### 原始版本阴影
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);          /* 轻微阴影 */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);        /* 标准阴影 */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);      /* 卡片阴影 */
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);      /* 模态框阴影 */
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);   /* 浮层阴影 */
```

## 组件规范

### Kuboard 风格组件

#### 主要按钮
```css
.btn-primary {
  background: #409EFF;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid #409EFF;
}
.btn-primary:hover {
  background: #337ECC;
  border-color: #337ECC;
  transform: translateY(-1px);
}
```

#### 次要按钮
```css
.btn-secondary {
  background: transparent;
  color: #606266;
  border: 1px solid #DCDFE6;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-secondary:hover {
  color: #409EFF;
  border-color: #409EFF;
}
```

#### 卡片组件
```css
.metric-card {
  background: white;
  border: 1px solid #EBEEF5;
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px 0 rgba(64, 158, 255, 0.15);
  border-color: #409EFF;
}
```

### 原始版本组件

#### 主要按钮
```css
.btn-primary {
  background: var(--karmada-blue);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-lg);
  transition: all 0.3s ease;
}
.btn-primary:hover {
  background: #2E86AB;
  transform: translateY(-1px);
}
```

#### 卡片组件
```css
.card {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xl);
  transition: all 0.3s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}
```

### 炫酷科技风格组件

#### 暗色主题组件

##### 科技卡片 (暗色)
```css
.tech-card-dark {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(26, 26, 46, 0.8) 100%);
  border: 2px solid var(--tech-border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(30, 144, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: glow 4s infinite ease-in-out;
}

.tech-card-dark:hover {
  transform: translateY(-4px);
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.4),
    0 0 35px rgba(30, 144, 255, 0.6),
    0 0 50px rgba(30, 144, 255, 0.3);
}
```

##### 中心控制面板 (暗色)
```css
.tech-control-center-dark {
  background: linear-gradient(135deg, rgba(30, 144, 255, 0.2) 0%, rgba(0, 245, 255, 0.1) 100%);
  border-radius: 50%;
  padding: 30px;
  box-shadow: 
    0 0 30px rgba(30, 144, 255, 0.4),
    0 0 60px rgba(30, 144, 255, 0.2),
    inset 0 0 30px rgba(0, 245, 255, 0.1);
  border: 2px solid rgba(30, 144, 255, 0.6);
  backdrop-filter: blur(10px);
  animation: pulse 3s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 
      0 0 30px rgba(30, 144, 255, 0.4),
      0 0 60px rgba(30, 144, 255, 0.2);
  }
  50% { 
    transform: scale(1.08);
    box-shadow: 
      0 0 50px rgba(30, 144, 255, 0.7),
      0 0 100px rgba(30, 144, 255, 0.4);
  }
}
```

##### 发光连接线 (暗色)
```css
.tech-connection-line-dark {
  stroke: url(#tech-gradient);
  stroke-width: 3;
  filter: url(#glow-filter);
  opacity: 0.8;
}

.tech-connection-line-dark animate {
  animation-name: flow;
  animation-duration: 3s;
  animation-iteration-count: infinite;
}

@keyframes flow {
  0% { stroke-dasharray: 0,200; }
  50% { stroke-dasharray: 100,200; }
  100% { stroke-dasharray: 0,200; }
}
```

#### 亮色主题组件

##### 科技卡片 (亮色)
```css
.tech-card-light {
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%);
  border: 2px solid var(--tech-light-border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.1),
    0 0 15px rgba(37, 99, 235, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
}

.tech-card-light:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 30px rgba(0, 0, 0, 0.15),
    0 0 25px rgba(37, 99, 235, 0.3);
  border-color: var(--tech-light-blue);
}
```

##### 中心控制面板 (亮色)
```css
.tech-control-center-light {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%);
  border-radius: 50%;
  padding: 30px;
  box-shadow: 
    0 4px 20px rgba(37, 99, 235, 0.2),
    0 0 30px rgba(37, 99, 235, 0.1);
  border: 2px solid rgba(37, 99, 235, 0.3);
  backdrop-filter: blur(5px);
  animation: pulse-light 3s infinite ease-in-out;
}

@keyframes pulse-light {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 
      0 4px 20px rgba(37, 99, 235, 0.2),
      0 0 30px rgba(37, 99, 235, 0.1);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 
      0 8px 30px rgba(37, 99, 235, 0.3),
      0 0 50px rgba(37, 99, 235, 0.2);
  }
}
```

#### 粒子效果组件
```css
.tech-particle {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  pointer-events: none;
}

.tech-particle-dark {
  background: var(--tech-cyan);
  box-shadow: 0 0 6px var(--tech-cyan);
  animation: twinkle 3s infinite ease-in-out;
}

.tech-particle-light {
  background: var(--tech-light-cyan);
  box-shadow: 0 0 4px var(--tech-light-cyan);
  animation: twinkle-light 3s infinite ease-in-out;
}

@keyframes twinkle {
  0%, 100% { 
    opacity: 0.3; 
    transform: scale(1); 
    filter: brightness(1);
  }
  50% { 
    opacity: 1; 
    transform: scale(1.3); 
    filter: brightness(1.5);
  }
}

@keyframes twinkle-light {
  0%, 100% { 
    opacity: 0.4; 
    transform: scale(1); 
  }
  50% { 
    opacity: 0.8; 
    transform: scale(1.2); 
  }
}
```

#### 节点指示器
```css
.tech-node-indicator-ready {
  background: radial-gradient(circle, rgba(82, 196, 26, 0.3) 0%, rgba(82, 196, 26, 0.1) 100%);
  border: 2px solid rgba(82, 196, 26, 0.8);
  box-shadow: 0 0 20px rgba(82, 196, 26, 0.6);
  animation: glow-green 2s infinite ease-in-out;
}

.tech-node-indicator-not-ready {
  background: radial-gradient(circle, rgba(114, 46, 209, 0.3) 0%, rgba(114, 46, 209, 0.1) 100%);
  border: 2px solid rgba(114, 46, 209, 0.8);
  box-shadow: 0 0 20px rgba(114, 46, 209, 0.6);
  animation: pulse 3s infinite ease-in-out;
}

@keyframes glow-green {
  0%, 100% { box-shadow: 0 0 20px rgba(82, 196, 26, 0.6); }
  50% { box-shadow: 0 0 30px rgba(82, 196, 26, 0.8), 0 0 40px rgba(82, 196, 26, 0.4); }
}
```

### 状态指示器

#### Kuboard 风格状态徽章
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.status-success { 
  background: #F0F9FF; 
  color: #1E40AF; 
  border: 1px solid #DBEAFE; 
}
.status-warning { 
  background: #FFFBEB; 
  color: #D97706; 
  border: 1px solid #FED7AA; 
}
.status-danger { 
  background: #FEF2F2; 
  color: #DC2626; 
  border: 1px solid #FECACA; 
}
```

#### 原始版本状态徽章
```css
.badge-success { background: #D1FAE5; color: #065F46; }
.badge-warning { background: #FEF3C7; color: #92400E; }
.badge-error { background: #FEE2E2; color: #991B1B; }
.badge-info { background: #DBEAFE; color: #1E40AF; }
```

### 导航组件

#### Kuboard 风格侧边栏
```css
.sidebar {
  width: 260px;
  background: linear-gradient(145deg, #2C3E50 0%, #34495E 100%);
  border-right: 1px solid #E4E7ED;
}
.nav-item {
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 2px 8px;
}
.nav-item:hover {
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}
.nav-item.active {
  background: #409EFF;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}
```

#### 原始版本侧边栏
```css
.sidebar {
  width: 280px;
  background: linear-gradient(180deg, #1B4F72 0%, #2C3E50 100%);
  color: white;
}
.nav-item {
  padding: 0.75rem 1.5rem;
  transition: all 0.3s ease;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
}
.nav-item.active {
  background: rgba(52, 152, 219, 0.3);
  border-right: 4px solid #3498DB;
}
```

### 表格组件

#### Kuboard 风格表格
```css
.table-container {
  background: white;
  border-radius: 12px;
  border: 1px solid #EBEEF5;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.resource-table th {
  background: #F8F9FA;
  padding: 12px 20px;
  text-align: left;
  font-weight: 500;
  color: #303133;
  font-size: 14px;
  border-bottom: 1px solid #EBEEF5;
}

.resource-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #F2F6FC;
  color: #606266;
  font-size: 14px;
}

.resource-table tr:hover {
  background: #F5F7FA;
}
```

#### 原始版本表格
```css
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th {
  background: #F9FAFB;
  padding: 0.75rem;
  text-align: left;
  font-weight: 500;
  color: #374151;
}
.table td {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid #E5E7EB;
}
.table tr:hover {
  background: #F9FAFB;
}
```

### 表单组件

#### Kuboard 风格输入框
```css
.search-input {
  background: white;
  border: 1px solid #DCDFE6;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}
.search-input:focus {
  outline: none;
  border-color: #409EFF;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}
```

#### 原始版本输入框
```css
.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #D1D5DB;
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
}
.input:focus {
  outline: none;
  border-color: var(--karmada-blue);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

## 布局规范

### 网格系统

#### 响应式断点
```css
/* 移动端 */
@media (max-width: 640px) { }

/* 平板端 */
@media (min-width: 641px) and (max-width: 1024px) { }

/* 桌面端 */
@media (min-width: 1025px) { }
```

#### 栅格布局

##### Kuboard 风格
- **12列栅格系统**: 使用 CSS Grid 或 Flexbox
- **最大宽度**: `1280px` (桌面端容器)
- **侧边栏宽度**: `260px` (固定)
- **主内容区**: `calc(100% - 260px)`

##### 原始版本
- **12列栅格系统**: 使用 CSS Grid 或 Flexbox
- **最大宽度**: `1280px` (桌面端容器)
- **侧边栏宽度**: `280px` (固定)
- **主内容区**: `calc(100% - 280px)`

### 页面结构

#### 标准页面布局
```html
<div class="app-layout">
  <aside class="sidebar"><!-- 侧边栏 --></aside>
  <div class="main-content">
    <header class="page-header"><!-- 页面头部 --></header>
    <main class="page-main"><!-- 主要内容 --></main>
  </div>
</div>
```

#### 内容区域划分
1. **统计概览区**: 关键指标卡片网格
2. **搜索过滤区**: 搜索框和筛选器
3. **数据展示区**: 表格、列表或卡片展示
4. **操作区域**: 分页、批量操作按钮

## 交互规范

### 动画效果

#### Kuboard 风格过渡
```css
.transition-all { transition: all 0.2s ease; }
.transition-transform { transition: transform 0.2s ease; }
.transition-colors { transition: background-color 0.2s ease, color 0.2s ease; }
```

#### 原始版本过渡
```css
.transition-all { transition: all 0.3s ease; }
.transition-transform { transition: transform 0.3s ease; }
.transition-opacity { transition: opacity 0.3s ease; }
```

#### 悬停效果
- **Kuboard 卡片悬停**: `transform: translateY(-2px)` + 阴影加深 + 边框变色
- **原始卡片悬停**: `transform: translateY(-2px)` + 阴影加深
- **按钮悬停**: 背景色加深 + 轻微向上移动
- **链接悬停**: 颜色变化

#### 加载动画
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse { animation: pulse 2s infinite; }
```

### 反馈机制

#### 状态反馈
- **成功操作**: 绿色提示 + 成功图标
- **错误操作**: 红色提示 + 错误图标
- **警告信息**: 橙色提示 + 警告图标
- **信息提示**: 蓝色提示 + 信息图标

#### 加载状态
- **骨架屏**: 数据加载时显示内容占位符
- **进度条**: 长时间操作的进度指示
- **旋转图标**: 简单操作的加载指示

## 图标使用规范

### 图标分类

#### 功能图标
- **系统概览**: `fas fa-tachometer-alt`
- **集群管理**: `fas fa-cubes`
- **调度可视化**: `fas fa-project-diagram`
- **策略管理**: `fas fa-shield-alt`
- **节点**: `fas fa-server`
- **Pod**: `fas fa-cube`

#### 状态图标
- **成功/就绪**: `fas fa-check-circle` (绿色)
- **警告**: `fas fa-exclamation-triangle` (橙色)
- **错误**: `fas fa-times-circle` (红色)
- **信息**: `fas fa-info-circle` (蓝色)
- **加载**: `fas fa-spinner fa-spin` (动画)

#### 操作图标
- **编辑**: `fas fa-edit`
- **删除**: `fas fa-trash`
- **查看**: `fas fa-eye`
- **刷新**: `fas fa-sync-alt`
- **搜索**: `fas fa-search`
- **下载**: `fas fa-download`

### 图标大小规范
- **大图标**: `2xl` (32px) - 主要功能入口
- **标准图标**: `lg` (20px) - 按钮、导航
- **小图标**: `md` (16px) - 表格、列表
- **迷你图标**: `sm` (14px) - 状态指示

## 数据可视化规范

### 图表类型

#### 趋势图表
```javascript
// 资源使用趋势线图
Chart.js line chart with:
- 时间轴: X轴
- 百分比: Y轴 (0-100%)
- 多条数据线: CPU、内存、存储
- Kuboard风格颜色: #409EFF (CPU), #67C23A (内存), #E6A23C (存储)
- 原始版本颜色: #F39C12 (CPU), #E74C3C (内存), #3498DB (存储)
```

#### 分布图表
```javascript
// 副本分布饼图
Chart.js doughnut chart with:
- 集群名称: 标签
- 副本数量: 数值
- Kuboard风格颜色: #67C23A (master), #409EFF (branch)
- 原始版本颜色: #27AE60 (master), #3498DB (branch)
```

#### 进度条
```css
/* Kuboard 风格 */
.progress-bar {
  background: #F5F7FA;
  border-radius: 100px;
  overflow: hidden;
  height: 8px;
}
.progress-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 0.3s ease;
}

/* 原始版本 */
.progress-bar {
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}
```

### 数据展示

#### 关键指标
- **大数字**: 使用大字体突出显示
- **单位**: 小字体在数字旁边或下方
- **趋势**: 箭头图标表示上升/下降
- **对比**: 百分比或分数形式

#### 状态展示
- **圆点指示**: 实时状态
- **徽章标签**: 分类状态
- **进度条**: 资源使用率
- **图表**: 历史趋势

## 响应式设计

### 断点策略
```css
/* 移动端优先 */
.container {
  width: 100%;
  padding: 1rem;
}

/* 平板端 */
@media (min-width: 768px) {
  .container {
    max-width: 768px;
    padding: 1.5rem;
  }
}

/* 桌面端 */
@media (min-width: 1024px) {
  .container {
    max-width: 1280px;
    padding: 2rem;
  }
  .sidebar {
    display: block;
  }
}
```

### 适配策略

#### 移动端适配
- **隐藏侧边栏**: 使用汉堡菜单
- **垂直布局**: 卡片和表格垂直排列
- **触摸优化**: 增大点击区域
- **字体调整**: 保持可读性

#### 平板端适配
- **折叠侧边栏**: 可收起的导航
- **网格布局**: 2-3列网格
- **手势支持**: 滑动和缩放

## 性能优化规范

### 加载优化
- **图片优化**: WebP 格式，适当压缩
- **懒加载**: 非关键内容延迟加载
- **代码分割**: 按页面分割 JavaScript

### 渲染优化
- **CSS动画**: 使用 transform 和 opacity
- **避免重排**: 使用 translate 替代 top/left
- **节流防抖**: 搜索和滚动事件优化

## 可访问性规范

### 语义化标记
```html
<!-- 使用语义化 HTML 标签 -->
<main role="main">
<nav role="navigation">
<section aria-label="系统概览">
<button aria-label="刷新数据" title="刷新数据">
```

### 键盘导航
- **Tab 顺序**: 逻辑的焦点顺序
- **Enter/Space**: 按钮激活
- **ESC**: 模态框关闭
- **方向键**: 列表导航

### 颜色对比
- **正文文本**: 对比度 ≥ 4.5:1
- **大文本**: 对比度 ≥ 3:1
- **图标**: 对比度 ≥ 3:1
- **状态色**: 不仅依赖颜色，配合图标

### 屏幕阅读器
```html
<!-- ARIA 标签 -->
<div aria-live="polite" aria-label="系统状态">
<table aria-label="集群列表" role="table">
<button aria-expanded="false" aria-controls="menu">
```

## 浏览器兼容性

### 支持范围
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### 降级策略
- **CSS Grid**: Flexbox 降级
- **CSS 变量**: 固定值降级
- **ES6+**: Babel 转译

## 维护和扩展

### 代码组织
```
prototypes/
├── index.html                    # 主入口页面
├── kuboard-style-overview.html   # Kuboard风格系统概览
├── kuboard-style-namespaces.html # Kuboard风格命名空间管理
├── overview.html                 # 原始版本系统概览
├── clusters.html                 # 原始版本集群管理
├── cluster-detail.html           # 原始版本集群详情
├── node-detail.html              # 原始版本节点详情
├── workload-scheduling.html      # 原始版本调度可视化
├── policy-management.html        # 原始版本策略管理
├── pod-trace.html                # 原始版本Pod追溯
├── assets/
│   ├── css/                      # 自定义样式
│   ├── js/                       # 自定义脚本
│   └── images/                   # 图片资源
└── README.md                     # 使用说明
```

### 命名规范
- **文件名**: kebab-case (cluster-detail.html, kuboard-style-overview.html)
- **CSS类**: kebab-case (.cluster-card, .metric-card)
- **JavaScript**: camelCase (showClusterDetail)
- **ID**: camelCase (clusterDetailModal)

### 组件复用
- **公共样式**: 提取到通用 CSS 文件
- **公共脚本**: 提取到通用 JS 文件
- **模板片段**: 可复用的 HTML 组件

### 更新机制
- **版本控制**: 语义化版本号
- **变更日志**: 记录每次更新内容
- **向后兼容**: 保持 API 和结构稳定性

## 设计决策对比

### 何时选择 Kuboard 风格版本
- **用户体验优先**: 需要现代化、直观的用户界面
- **视觉一致性**: 要求统一的设计语言和视觉规范
- **快速开发**: 基于成熟的设计系统快速构建界面
- **用户友好**: 面向非专业用户的产品界面

### 何时选择原始功能版本
- **功能完整性**: 需要完整的业务逻辑和数据展示
- **专业工具**: 面向专业运维人员的管理工具
- **定制需求**: 需要高度定制化的功能和交互
- **企业应用**: 企业内部使用的专业管理系统

### 何时选择炫酷科技风格版本
- **品牌差异化**: 需要独特的视觉识别和品牌形象
- **高端定位**: 面向科技型企业和创新型用户群体
- **展示场景**: 产品演示、展会展示、营销推广
- **视觉冲击**: 需要强烈视觉效果的应用场景
- **未来感产品**: 云原生、AI、大数据等前沿技术产品
- **年轻用户群**: 吸引年轻开发者和技术爱好者
- **沉浸式体验**: 需要用户高度专注的管理界面

## 总结

本设计规范为 Karmada-Manager 原型提供了三种不同风格的设计指导和实现标准：

1. **Kuboard 风格版本 (v2.0)** - 注重现代化用户体验和视觉设计
2. **原始功能版本 (v1.0)** - 专注完整业务功能和专业工具属性
3. **炫酷科技风格版本 (v3.0)** - 追求未来科技感和视觉冲击力

### 版本特色对比

| 特性 | Kuboard风格 | 原始功能 | 炫酷科技 |
|------|-------------|----------|----------|
| **主色调** | Element UI 蓝色系 | Karmada 自定义蓝色 | 深空渐变 + 发光色 |
| **背景** | 浅色简洁 | 中性简约 | 深色科技感 |
| **动画** | 轻微过渡效果 | 标准过渡 | 复杂多层动画 |
| **交互** | 友好直观 | 功能导向 | 沉浸式体验 |
| **适用场景** | 通用管理界面 | 专业工具 | 展示&高端产品 |

### 主题切换支持

炫酷科技风格版本同时支持**暗色主题**和**亮色主题**，满足不同使用环境和用户偏好：

- **暗色主题**: 深空科技感，适合专注操作和低光环境
- **亮色主题**: 科技感增强版，保持专业性的同时提供更好的可读性

通过统一的设计语言、技术规范和最佳实践，确保了产品的一致性、可用性和可维护性。开发团队可以根据具体需求、目标用户群体和使用场景选择合适的设计风格，或者将不同风格的优秀元素结合使用。

所有团队成员应严格遵循本规范，以保证最终产品的高质量交付和用户体验的一致性。 