# TechCard 组件文档

## 组件描述

TechCard 是一个具有科技感设计风格的卡片组件，基于"舒适科技感"主题设计，提供现代化的卡片展示效果。

## 文件位置

```
ui/apps/dashboard/src/components/ui/TechCard.tsx
```

## 组件特性

- ✅ 渐变背景和微光边框
- ✅ 悬浮时上浮动效（4px）和光晕效果
- ✅ 加载状态自动管理和遮罩显示
- ✅ 可选的标题和额外操作区域
- ✅ 可点击功能和键盘导航支持
- ✅ 完整的TypeScript类型支持

## 接口定义

```typescript
export interface TechCardProps {
  children: React.ReactNode;  // 卡片内容
  className?: string;         // 自定义CSS类名
  loading?: boolean;          // 加载状态
  hover?: boolean;           // 是否启用悬浮效果
  title?: React.ReactNode;   // 卡片标题
  extra?: React.ReactNode;   // 额外操作区域
  style?: React.CSSProperties; // 内联样式
  onClick?: () => void;      // 点击事件处理
}
```

## 使用示例

### 基础用法

```tsx
import { TechCard } from '@/components/ui';

function BasicExample() {
  return (
    <TechCard>
      <p>这是一个基础的科技感卡片</p>
    </TechCard>
  );
}
```

### 带标题和操作区域

```tsx
import { TechCard } from '@/components/ui';
import { Button } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

function WithHeaderExample() {
  return (
    <TechCard
      title="系统状态"
      extra={
        <Button type="text" icon={<SettingOutlined />}>
          设置
        </Button>
      }
    >
      <p>卡片内容区域</p>
    </TechCard>
  );
}
```

### 加载状态

```tsx
import { TechCard } from '@/components/ui';

function LoadingExample() {
  const [loading, setLoading] = useState(true);

  return (
    <TechCard loading={loading} title="数据加载中">
      <p>这里的内容在加载时会被遮罩</p>
    </TechCard>
  );
}
```

### 可点击卡片

```tsx
import { TechCard } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

function ClickableExample() {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate('/cluster-detail/123');
  };

  return (
    <TechCard onClick={handleCardClick} className="cursor-pointer">
      <h3>集群 cluster-001</h3>
      <p>点击查看详情</p>
    </TechCard>
  );
}
```

### 自定义样式

```tsx
import { TechCard } from '@/components/ui';

function CustomStyleExample() {
  return (
    <TechCard
      style={{ 
        maxWidth: 400, 
        margin: '0 auto',
        background: 'linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%)'
      }}
      className="custom-card"
    >
      <p>自定义样式的卡片</p>
    </TechCard>
  );
}
```

## CSS 类名

该组件使用以下CSS类名，可在 `tech-theme.css` 中自定义：

```css
.tech-card              /* 卡片主容器 */
.tech-card-loading      /* 加载遮罩层 */
.tech-card-header       /* 卡片头部区域 */
.tech-card-title        /* 卡片标题 */
.tech-card-extra        /* 额外操作区域 */
.tech-card-body         /* 卡片内容区域 */
.tech-hover-scale       /* 悬浮缩放效果 */
```

## 样式变量

可通过CSS变量自定义卡片样式：

```css
:root {
  --tech-primary: #409eff;           /* 主色调 */
  --border-radius-lg: 12px;          /* 圆角大小 */
  --spacing-lg: 24px;               /* 内边距 */
  --glow-border: rgba(64, 158, 255, 0.2); /* 边框颜色 */
}
```

## 可访问性

- 支持键盘导航（Tab键切换）
- 可点击卡片具有正确的 `role="button"` 属性
- 支持回车键激活点击事件
- 加载状态下内容不可交互

## 性能考虑

- 使用CSS动画而非JavaScript动画，性能更优
- 加载状态通过CSS opacity控制，避免DOM操作
- 悬浮效果使用transform，触发GPU加速

## 注意事项

1. **加载状态**：`loading={true}` 时，卡片内容会被半透明遮罩覆盖，且不可交互
2. **点击事件**：只有提供 `onClick` 属性时，卡片才会显示为可点击状态
3. **样式覆盖**：自定义 `className` 和 `style` 会与默认样式合并
4. **无障碍访问**：可点击卡片会自动添加适当的ARIA属性

## 相关组件

- `StatusBadge`: 状态徽章组件，常用于卡片内状态展示
- `TechProgress`: 进度条组件，常用于卡片内进度展示
- `TechCircularProgress`: 圆形进度组件，用于卡片内资源使用率展示

## 更新日志

### v1.0.0 (2024-12-20)
- ✅ 初始版本发布
- ✅ 实现基础卡片功能
- ✅ 添加加载状态支持
- ✅ 实现科技感动效
- ✅ 完善TypeScript类型定义 