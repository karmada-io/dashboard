# Karmada Dashboard UI/UX 设计规范

## 1. 设计概述

### 1.1 设计理念
Karmada Dashboard 采用**现代科技与企业级稳重**相结合的设计理念，旨在为多云管理提供直观、高效、美观的用户界面。设计强调数据可视化、操作简便性和视觉层次感。

### 1.2 设计目标
- **专业性**: 体现企业级多云管理平台的专业性和可靠性
- **现代感**: 融入科技元素，提升视觉冲击力
- **易用性**: 简化操作流程，降低学习成本
- **一致性**: 保持设计语言的统一性和连贯性

## 2. 视觉设计系统

### 2.1 色彩系统

#### 主色调 (Primary Colors)
```
#1890ff - 主蓝色 (Primary Blue)
用途: 主要操作按钮、重要信息标识、链接文本
RGB: (24, 144, 255)
HSL: (210°, 100%, 55%)
```

#### 功能色 (Functional Colors)
```
#52c41a - 成功绿 (Success Green)
用途: 成功状态、正常运行指示、确认操作
RGB: (82, 196, 26)

#fa8c16 - 警告橙 (Warning Orange)  
用途: 警告信息、需要注意的状态
RGB: (250, 140, 22)

#ff4d4f - 错误红 (Error Red)
用途: 错误状态、危险操作、失败信息
RGB: (255, 77, 79)

#722ed1 - 品牌紫 (Brand Purple)
用途: 特殊标识、品牌元素
RGB: (114, 46, 209)
```

#### 中性色 (Neutral Colors)
```
#000000d9 - 主文本 (87% 透明度)
#00000073 - 次要文本 (45% 透明度)  
#00000040 - 辅助文本 (25% 透明度)
#0000000f - 分割线 (6% 透明度)
#f0f2f5 - 页面背景
#ffffff - 卡片背景
```

#### 科技感配色 (Tech Colors)
```
#00d4ff - 科技蓝 (Cyber Blue)
用途: 科技感元素、特效发光
RGB: (0, 212, 255)

#0a0e27 - 深空蓝 (Deep Space Blue)  
用途: 科技感背景主色
RGB: (10, 14, 39)

#1a1f3a - 星空紫 (Star Purple)
用途: 科技感背景渐变
RGB: (26, 31, 58)

#eb2f96 - 霓虹粉 (Neon Pink)
用途: 强调和高亮显示
RGB: (235, 47, 150)
```

### 2.2 字体系统

#### 字体族 (Font Family)
```css
/* 主字体 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, 'Noto Sans', sans-serif;

/* 代码字体 */
font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, 
             Courier, monospace;

/* 数字字体 */
font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', Roboto, sans-serif;
```

#### 字体大小等级 (Typography Scale)
```css
/* 标题字体 */
.text-4xl { font-size: 36px; line-height: 44px; } /* H1 */
.text-3xl { font-size: 30px; line-height: 38px; } /* H2 */
.text-2xl { font-size: 24px; line-height: 32px; } /* H3 */
.text-xl  { font-size: 20px; line-height: 28px; } /* H4 */
.text-lg  { font-size: 18px; line-height: 26px; } /* H5 */

/* 正文字体 */
.text-base { font-size: 16px; line-height: 24px; } /* 正文 */
.text-sm   { font-size: 14px; line-height: 20px; } /* 小字体 */
.text-xs   { font-size: 12px; line-height: 16px; } /* 辅助文字 */
```

#### 字重 (Font Weight)
```css
.font-light    { font-weight: 300; } /* 细体 */
.font-normal   { font-weight: 400; } /* 常规 */
.font-medium   { font-weight: 500; } /* 中等 */
.font-semibold { font-weight: 600; } /* 半粗体 */
.font-bold     { font-weight: 700; } /* 粗体 */
```

### 2.3 间距系统 (Spacing System)

#### 基础间距 (Base Spacing)
```css
/* 基础单位: 4px */
.space-1  { 4px }   /* 超小间距 */
.space-2  { 8px }   /* 小间距 */
.space-3  { 12px }  /* 小间距+ */
.space-4  { 16px }  /* 中等间距 */
.space-5  { 20px }  /* 中等间距+ */
.space-6  { 24px }  /* 大间距 */
.space-8  { 32px }  /* 超大间距 */
.space-12 { 48px }  /* 特大间距 */
.space-16 { 64px }  /* 巨大间距 */
```

#### 组件间距规范
```css
/* 页面级间距 */
页面外边距: 24px
区块间距: 32px
模块间距: 24px

/* 组件级间距 */
卡片内边距: 24px
列表项间距: 16px
表单项间距: 16px
按钮间距: 12px

/* 元素级间距 */
图标与文字: 8px
标签间距: 4px
内联元素: 4px
```

### 2.4 圆角系统 (Border Radius)

```css
.rounded-none { border-radius: 0px; }    /* 无圆角 */
.rounded-sm   { border-radius: 4px; }    /* 小圆角 */
.rounded      { border-radius: 6px; }    /* 标准圆角 */
.rounded-md   { border-radius: 8px; }    /* 中等圆角 */
.rounded-lg   { border-radius: 12px; }   /* 大圆角 */
.rounded-xl   { border-radius: 16px; }   /* 超大圆角 */
.rounded-full { border-radius: 50%; }    /* 圆形 */
```

### 2.5 阴影系统 (Shadow System)

```css
/* 基础阴影 */
.shadow-sm { 
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); 
}

.shadow { 
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 
              0 1px 2px 0 rgba(0, 0, 0, 0.06); 
}

.shadow-md { 
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
              0 2px 4px -1px rgba(0, 0, 0, 0.06); 
}

.shadow-lg { 
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
              0 4px 6px -2px rgba(0, 0, 0, 0.05); 
}

/* 科技感阴影 */
.shadow-tech { 
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3),
              0 8px 32px rgba(0, 0, 0, 0.1); 
}

.shadow-glow { 
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.4); 
}
```

## 3. 组件设计规范

### 3.1 按钮设计 (Button Design)

#### 主要按钮 (Primary Button)
```css
背景: #1890ff
文字: #ffffff  
圆角: 6px
高度: 32px (small) | 40px (medium) | 48px (large)
内边距: 16px 24px
悬停状态: 背景变为 #40a9ff
点击状态: 背景变为 #096dd9
```

#### 次要按钮 (Secondary Button)
```css
背景: transparent
边框: 1px solid #d9d9d9
文字: #000000d9
悬停状态: 边框 #40a9ff，文字 #1890ff
```

#### 危险按钮 (Danger Button)
```css
背景: #ff4d4f
文字: #ffffff
悬停状态: 背景变为 #ff7875
```

### 3.2 卡片设计 (Card Design)

#### 标准卡片
```css
背景: #ffffff
圆角: 8px
阴影: 0 1px 3px rgba(0, 0, 0, 0.1)
边框: 1px solid #f0f0f0
内边距: 24px
悬停效果: 阴影增强至 0 4px 12px rgba(0, 0, 0, 0.15)
```

#### 科技感卡片
```css
背景: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)
圆角: 16px
边框: 1px solid rgba(0, 212, 255, 0.3)
阴影: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 212, 255, 0.2)
内边距: 32px
```

### 3.3 表格设计 (Table Design)

#### 表头设计
```css
背景: #fafafa
文字: #000000d9
字重: 600
高度: 48px
边框底部: 1px solid #f0f0f0
```

#### 表格行
```css
高度: 56px
边框底部: 1px solid #f0f0f0
悬停背景: #f5f5f5
选中背景: #e6f7ff
```

### 3.4 表单设计 (Form Design)

#### 输入框
```css
边框: 1px solid #d9d9d9
圆角: 6px
高度: 32px
内边距: 4px 12px
聚焦边框: 2px solid #1890ff
聚焦阴影: 0 0 0 2px rgba(24, 144, 255, 0.2)
```

#### 标签
```css
字体大小: 14px
颜色: #000000d9
字重: 500
底边距: 8px
```

## 4. 布局设计规范

### 4.1 栅格系统 (Grid System)

#### 断点设置
```css
xs: 0-575px    (超小屏幕)
sm: 576-767px  (小屏幕)  
md: 768-991px  (中等屏幕)
lg: 992-1199px (大屏幕)
xl: 1200px+    (超大屏幕)
```

#### 栅格规则
```css
总列数: 24列
间隙: 16px (xs-md) | 24px (lg-xl)
最大宽度: 1200px
页面边距: 24px
```

### 4.2 页面布局 (Page Layout)

#### 顶部导航 (Header)
```css
高度: 64px
背景: #ffffff
阴影: 0 2px 8px rgba(0, 0, 0, 0.15)
内边距: 0 24px
层级: z-index: 1000
```

#### 侧边导航 (Sidebar)
```css
宽度: 256px (展开) | 80px (收起)
背景: #001529
文字: rgba(255, 255, 255, 0.9)
层级: z-index: 999
```

#### 主内容区 (Content)
```css
最小高度: calc(100vh - 64px)
背景: #f0f2f5
内边距: 24px
```

### 4.3 组件布局原则

#### 垂直间距
```css
页面标题下方: 32px
区块之间: 32px
卡片之间: 24px
表单项之间: 16px
```

#### 水平间距  
```css
按钮组间距: 12px
表格列间距: 16px
图标与文字: 8px
内联元素: 4px
```

## 5. 交互设计规范

### 5.1 动画效果 (Animation)

#### 过渡时间
```css
快速过渡: 0.15s
标准过渡: 0.3s  
慢速过渡: 0.5s
```

#### 缓动函数
```css
标准缓动: cubic-bezier(0.4, 0, 0.2, 1)
加速缓动: cubic-bezier(0.4, 0, 1, 1)
减速缓动: cubic-bezier(0, 0, 0.2, 1)
```

#### 动画类型
```css
悬停效果: transform: scale(1.05); transition: 0.3s ease;
淡入效果: opacity: 0 → 1; transition: 0.3s ease;
滑入效果: transform: translateY(20px) → translateY(0);
```

### 5.2 状态反馈 (State Feedback)

#### 加载状态
```css
骨架屏: 灰色占位块 + 微光动画
加载图标: 旋转动画，颜色 #1890ff
进度条: 蓝色进度 + 百分比显示
```

#### 成功状态
```css
颜色: #52c41a
图标: CheckCircleOutlined
持续时间: 3秒自动消失
```

#### 错误状态
```css
颜色: #ff4d4f  
图标: CloseCircleOutlined
持续时间: 手动关闭
```

#### 警告状态
```css
颜色: #fa8c16
图标: ExclamationCircleOutlined  
持续时间: 5秒自动消失
```

### 5.3 响应式设计 (Responsive Design)

#### 移动端适配 (xs: <576px)
```css
导航: 隐藏侧边栏，使用抽屉式菜单
表格: 使用卡片式布局替代
表单: 单列布局
按钮: 最小点击区域 44px
```

#### 平板适配 (md: 768-991px)  
```css
导航: 收起侧边栏
表格: 保持表格布局，减少列数
卡片: 2列布局
图表: 简化显示
```

#### 桌面端优化 (lg: >992px)
```css
导航: 完整侧边栏
表格: 完整功能显示
卡片: 3-4列布局  
图表: 完整交互功能
```

## 6. 数据可视化设计

### 6.1 图表色彩
```css
主色系: #1890ff, #52c41a, #fa8c16, #eb2f96, #722ed1
渐变色: 
  蓝色渐变: linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)
  绿色渐变: linear-gradient(135deg, #52c41a 0%, #73d13d 100%)
  橙色渐变: linear-gradient(135deg, #fa8c16 0%, #ffc53d 100%)
```

### 6.2 图表类型规范

#### 饼图 (Pie Chart)
```css
用途: 比例分布展示
大小: 最小 200px，最大 400px
标签: 数值+百分比
配色: 使用主色系，避免相近颜色
```

#### 柱状图 (Bar Chart)
```css
用途: 对比数据展示
柱宽: 24px-48px
间距: 柱宽的 25%
渐变: 垂直渐变效果
```

#### 折线图 (Line Chart)
```css
用途: 趋势变化展示
线宽: 2px-3px
点大小: 4px-6px
区域填充: 20% 透明度
```

#### 仪表盘 (Gauge)
```css
用途: 实时指标展示
大小: 120px-200px
色彩: 根据阈值变化
动画: 2秒缓动到目标值
```

### 6.3 进度指示器

#### 环形进度条
```css
宽度: 8px-12px
背景: rgba(0, 0, 0, 0.06)
进度色: 根据状态变化
动画: 从0%到目标值，2秒缓动
```

#### 线性进度条
```css
高度: 6px-10px
圆角: 与高度一致
背景: #f5f5f5
进度色: #1890ff
```

## 7. 图标设计规范

### 7.1 图标尺寸
```css
小图标: 12px × 12px
标准图标: 16px × 16px  
中等图标: 20px × 20px
大图标: 24px × 24px
特大图标: 32px × 32px
```

### 7.2 图标使用规则

#### 功能图标
```css
导航图标: 20px，颜色跟随主题
操作图标: 16px，悬停时高亮
状态图标: 16px，使用状态色彩
```

#### 装饰图标
```css
空状态图标: 64px-128px，灰色
加载图标: 24px-32px，主色调
品牌图标: 按实际需求，保持比例
```

### 7.3 图标与文字组合
```css
水平组合: 图标在左，间距 8px
垂直组合: 图标在上，间距 4px
按钮图标: 根据按钮大小调整，间距 6px
```

## 8. 科技感设计元素

### 8.1 粒子背景
```css
粒子数量: 30-50个
粒子大小: 1px-3px
连线距离: 100px
透明度: 0.1-0.5
运动速度: 0.5px/frame
```

### 8.2 发光效果
```css
外发光: box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
内发光: box-shadow: inset 0 0 20px rgba(0, 212, 255, 0.3);
文字发光: text-shadow: 0 0 10px rgba(0, 212, 255, 0.8);
边框发光: border: 1px solid rgba(0, 212, 255, 0.6);
```

### 8.3 渐变背景
```css
科技渐变: 
  linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)
  
光效渐变:
  radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%)
  
能量流:
  linear-gradient(90deg, transparent 0%, rgba(0, 212, 255, 0.4) 50%, transparent 100%)
```

### 8.4 全息效果
```css
文字全息: 
  background: linear-gradient(45deg, #00d4ff, #7c3aed, #00d4ff);
  background-clip: text;
  -webkit-text-fill-color: transparent;
  
边框全息:
  border: 1px solid;
  border-image: linear-gradient(45deg, #00d4ff, #7c3aed) 1;
```

## 9. 无障碍设计 (Accessibility)

### 9.1 颜色对比度
```css
正文文字: 对比度 ≥ 4.5:1
大文字(≥18px): 对比度 ≥ 3:1  
重要信息: 对比度 ≥ 7:1
装饰元素: 可适当降低
```

### 9.2 键盘导航
```css
焦点指示器: 2px solid #1890ff
跳转顺序: 逻辑性强，符合阅读习惯
快捷键: 提供常用操作快捷键
陷阱避免: 避免键盘焦点困住
```

### 9.3 屏幕阅读器支持
```html
语义化标签: 使用正确的HTML标签
ARIA标签: 为复杂组件添加ARIA标签
图片描述: 为有意义的图片添加alt属性
表单标签: 为所有表单控件添加关联标签
```

## 10. 品牌元素

### 10.1 Logo使用规范
```css
最小尺寸: 24px (高度)
安全边距: Logo高度的1/2
单色版本: 在复杂背景上使用
色彩版本: 在简洁背景上使用
```

### 10.2 品牌色彩
```css
主品牌色: #1890ff (Karmada Blue)
辅助色: #722ed1 (Karmada Purple)  
中性色: #8c8c8c (Neutral Gray)
```

### 10.3 品牌应用
```css
页面标题: 使用品牌字体和色彩
按钮样式: 体现品牌特色
图标设计: 统一的设计风格
插画元素: 符合品牌调性
```

---

本设计规范为 Karmada Dashboard 的 UI/UX 设计提供了全面的指导，确保产品在视觉表现和用户体验方面达到高水准，体现出专业的多云管理平台特质。 