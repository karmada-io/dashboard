# Karmada 拓扑图 Tooltip 显示问题修复指南

## 🐛 问题描述

用户反馈在 Karmada 拓扑图中鼠标悬停在节点上时，tooltip（悬停信息）没有显示。这是由于 G6 的交互模式配置导致的。

## 🔧 修复内容

### 1. **优化 Behaviors 配置**

```typescript
behaviors: [
  'drag-canvas',           // 允许拖拽画布
  'zoom-canvas',           // 允许缩放画布  
  {
    type: 'drag-element',
    enableTransient: false,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    onlyChangeComboSize: false,
    shouldBegin: (evt: any) => {
      // 只有在按住 Ctrl 键时才允许拖拽节点
      return evt.ctrlKey || evt.metaKey;
    },
  },
  'collapse-expand',       // 允许展开/折叠节点
  {
    type: 'hover-activate',
    degree: 1,
    inactiveState: 'inactive',
    activeState: 'active',
    shouldUpdate: (evt: any) => {
      // 在拖拽时不触发hover效果
      return !evt.target?.graph?.isDragging;
    },
  }
]
```

### 2. **改进 Tooltip 配置**

```typescript
plugins: [
  {
    type: 'tooltip',
    trigger: 'pointerenter',     // 鼠标进入时触发
    enterable: true,             // 允许鼠标进入tooltip
    fixToNode: [1, 0.5],        // 固定到节点右侧中央
    offset: 15,                  // 距离节点15px
    className: 'g6-tooltip-custom',
    shouldBegin: (evt: any) => {
      // 只在鼠标悬停且不在拖拽状态时显示tooltip
      const graph = evt.view?.graph;
      if (graph?.isDragging) return false;
      
      // 检查是否点击了有效节点
      const item = evt.target;
      return item && item.getType && item.getType() === 'node';
    },
    itemTypes: ['node'],         // 只对节点显示tooltip
    getContent: (evt: any, items: any) => {
      // ... tooltip 内容生成逻辑
    }
  }
]
```

### 3. **添加自定义样式**

```css
.g6-tooltip-custom {
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
  border: none !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  padding: 0 !important;
  z-index: 9999 !important;
  pointer-events: auto !important;
}

/* 确保tooltip在拖拽时隐藏 */
.g6-element-dragging .g6-tooltip-custom {
  display: none !important;
}
```

## 🎯 现在的交互方式

### ✅ **正常悬停查看信息**
- **操作**: 直接将鼠标悬停在任意节点上
- **效果**: 立即显示该节点的详细信息tooltip
- **适用于**: Karmada控制平面、集群节点、工作节点

### ✅ **拖拽节点重新布局**
- **操作**: 按住 `Ctrl` 键（Mac 上是 `Cmd` 键）+ 鼠标拖拽节点
- **效果**: 可以移动节点到新位置
- **说明**: 避免意外拖拽影响tooltip显示

### ✅ **其他交互**
- **拖拽画布**: 直接拖拽空白区域移动整个拓扑图
- **缩放画布**: 鼠标滚轮缩放查看
- **展开/折叠**: 点击有子节点的节点进行展开或折叠

## 🧪 测试验证

### 测试步骤

1. **基础 Tooltip 测试**
   ```bash
   # 启动前端服务
   cd ui/apps/dashboard
   npm run dev
   
   # 访问拓扑图页面
   # 将鼠标悬停在任意节点上，应该看到tooltip显示
   ```

2. **交互冲突测试**
   ```bash
   # 测试正常悬停
   1. 鼠标悬停在 Karmada 控制平面节点 → 应显示控制平面信息
   2. 鼠标悬停在集群节点 → 应显示集群详细信息  
   3. 鼠标悬停在工作节点 → 应显示节点系统信息
   
   # 测试拖拽功能
   4. 按住Ctrl + 拖拽节点 → 应该可以移动节点
   5. 直接拖拽节点 → 应该不能移动，但tooltip正常显示
   ```

3. **性能测试**
   ```bash
   # 快速移动鼠标测试
   1. 快速在多个节点间移动鼠标
   2. tooltip应该能及时显示和隐藏
   3. 不应该出现延迟或卡顿
   ```

## 🐛 故障排除

### 如果 Tooltip 仍然不显示：

1. **检查浏览器控制台**
   ```javascript
   // 打开浏览器开发者工具，查看是否有JavaScript错误
   console.log('检查G6实例:', window.g6Instance);
   ```

2. **检查图片加载**
   ```javascript
   // 确保节点图标图片正确加载
   // 查看Network面板，确认图片请求状态为200
   ```

3. **检查数据结构**
   ```javascript
   // 确保节点数据包含必要字段
   console.log('节点数据:', nodeData);
   ```

4. **强制刷新缓存**
   ```bash
   # 清除浏览器缓存并硬刷新
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

## 📱 移动端适配

在移动设备上：
- **触摸悬停**: 长按节点显示tooltip
- **拖拽**: 长按 + 拖动进行节点移动
- **缩放**: 双指缩放手势

## 🔄 更新日志

- **v1.1**: 修复tooltip与拖拽模式冲突问题
- **v1.2**: 添加Ctrl键控制拖拽功能
- **v1.3**: 优化tooltip显示性能和样式
- **v1.4**: 增加移动端触摸支持

## 📞 技术支持

如果问题仍然存在，请提供：
1. 浏览器类型和版本
2. 控制台错误信息
3. 网络请求日志
4. 操作步骤录屏 