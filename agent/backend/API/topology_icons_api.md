# Karmada 拓扑图节点图标与悬停信息展示 API 文档

## 📋 概述

本文档描述了 Karmada 集群拓扑图中节点图标更换和悬停信息展示功能的实现。该功能将原有的emoji图标替换为PNG图片，并提供详细的节点信息悬停展示。

## ✨ 最新更新

### v2.0 新功能
- **节点标签增强**: 所有节点现在直接显示版本和系统信息
  - Karmada控制平面: 显示名称 + Karmada版本
  - 集群节点: 显示名称 + Kubernetes版本
  - 工作节点: 显示名称 + Kubernetes版本 + 操作系统类型
- **简化Tooltip**: 优化tooltip内容，确保可靠显示
- **调试支持**: 添加控制台日志便于问题诊断

### v1.0 基础功能
- **图标系统**: PNG图标替换emoji
- **悬停信息**: 详细的节点信息展示
- **交互优化**: Ctrl+拖拽模式，避免操作冲突

## 🎨 节点标签显示

### 1. **Karmada 控制平面**
```
节点名称: Karmada 控制平面
版本显示: Karmada v1.13.2
图标: Karmada.png (60x60px)
```

### 2. **集群节点**
```
节点名称: branch / master
版本显示: v1.30.1
图标: cluster.png (42x42px)
```

### 3. **工作节点**
```
节点名称: k-dte2-master01.example.com
K8s版本: v1.30.1
操作系统: Anolis OS / Ubuntu / CentOS / RHEL / Linux
图标: node.png (30x30px)
```

## 🖱️ 悬停信息功能

### 1. **Karmada 控制平面 Tooltip**
悬停显示内容：
- 管理集群数量
- 健康集群数量
- 节点总数统计
- 就绪节点统计
- 运行Pod统计

### 2. **集群节点 Tooltip**
悬停显示内容：
- 集群基本状态 (Ready/NotReady)
- Kubernetes版本
- 同步模式 (Push/Pull)
- 节点数量统计
- CPU/内存使用率

### 3. **工作节点 Tooltip**
悬停显示内容：
- 节点基本信息 (状态、集群、角色、IP、主机名)
- Kubernetes版本
- 系统信息 (操作系统、内核版本、容器运行时)
- 资源容量 (CPU、内存、Pod容量)

## 🔧 技术实现

### 节点标签配置
```typescript
labelText: (d: any) => {
  const data = d.data;
  switch (data.type) {
    case 'control-plane':
      return `${data.name}\nKarmada v1.13.2`;
    case 'cluster':
      return `${data.name}\n${data.version || 'Unknown'}`;
    case 'worker-node':
      const osInfo = data.nodeDetail?.status?.nodeInfo?.osImage || 'Unknown OS';
      const shortOS = osInfo.includes('Anolis') ? 'Anolis OS' : 
                     osInfo.includes('Ubuntu') ? 'Ubuntu' : 
                     osInfo.includes('CentOS') ? 'CentOS' :
                     osInfo.includes('RHEL') ? 'RHEL' : 'Linux';
      return `${data.name}\n${data.version}\n${shortOS}`;
  }
}
```

### Tooltip 配置
```typescript
plugins: [
  {
    type: 'tooltip',
    trigger: 'pointerenter',
    enterable: true,
    fixToNode: [1, 0.5],
    offset: 15,
    className: 'g6-tooltip-custom',
    shouldBegin: (evt: any) => {
      const graph = evt.view?.graph;
      if (graph?.isDragging) return false;
      const target = evt.target;
      return target && target.getType && target.getType() === 'node';
    },
    itemTypes: ['node'],
    getContent: (evt: any, items: any) => {
      // 简化的tooltip内容，确保可靠显示
    }
  }
]
```

## 🛠️ 故障排除

### Tooltip 不显示问题
如果tooltip没有显示，请检查：

1. **浏览器控制台**
   ```javascript
   // 查看调试日志
   console.log('Tooltip shouldBegin triggered:', evt);
   console.log('Event target:', target, target?.getType?.());
   console.log('Node data for tooltip:', data);
   ```

2. **交互方式**
   - 确保鼠标正确悬停在节点图标上
   - 不要在按住Ctrl键的同时悬停（会被识别为拖拽模式）
   - 等待节点数据加载完成

3. **数据检查**
   ```bash
   # 检查集群API
   curl -X GET "http://localhost:8080/api/v1/cluster"
   
   # 检查节点API
   curl -X GET "http://localhost:8080/api/v1/member/{clusterName}/nodes"
   ```

### 版本信息不显示问题
如果节点上的版本信息没有显示：

1. **检查数据结构**
   - 确保集群数据包含 `kubernetesVersion` 字段
   - 确保节点数据包含 `status.nodeInfo.osImage` 字段

2. **刷新页面**
   - 硬刷新: `Ctrl+Shift+R` (Windows/Linux) 或 `Cmd+Shift+R` (Mac)

## 📱 用户体验

### 交互模式
- **普通悬停**: 直接鼠标悬停查看信息
- **节点拖拽**: `Ctrl + 鼠标拖拽` 移动节点
- **画布操作**: 直接拖拽空白区域移动画布
- **缩放功能**: 鼠标滚轮缩放

### 视觉设计
- **多行标签**: 支持节点名称、版本、系统信息分行显示
- **颜色编码**: 不同节点类型使用不同颜色主题
- **响应式**: 根据节点类型自动调整字体大小和图标尺寸

## 🔄 版本历史

- **v2.0.0**: 增加节点标签版本显示，简化tooltip确保可靠性
- **v1.4.0**: 增加移动端触摸支持
- **v1.3.0**: 优化tooltip显示性能和样式  
- **v1.2.0**: 添加Ctrl键控制拖拽功能
- **v1.1.0**: 修复tooltip与拖拽模式冲突问题
- **v1.0.0**: 初始版本，PNG图标替换和基础tooltip功能

## 🖼️ 节点图标配置

### 图标文件列表

| 节点类型 | 图标文件 | 尺寸 | 说明 |
|---------|---------|------|------|
| Karmada 控制平面 | `/Karmada.png` | 60x60px | Karmada 标志图标 |
| 集群节点 | `/cluster.png` | 42x42px | 集群图标 |
| 工作节点 | `/node.png` | 30x30px | 节点图标 |

### 图标加载机制

```typescript
// 图片缓存对象
const imageCache: { [key: string]: HTMLImageElement } = {};

// 预加载图片函数
const preloadImages = async () => {
  const imageConfigs = [
    { key: 'karmada', src: '/Karmada.png' },
    { key: 'cluster', src: '/cluster.png' },
    { key: 'node', src: '/node.png' }
  ];
  
  // 并行加载所有图片
  await Promise.all(imageConfigs.map(config => loadImage(config)));
};
```

### 图标渲染配置

```typescript
// G6 节点图标配置
iconSrc: (d: any) => {
  const iconConfig = getNodeIcon(d.data?.type);
  return iconConfig.type === 'image' ? iconConfig.src : undefined;
},
iconWidth: (d: any) => {
  const iconConfig = getNodeIcon(d.data?.type);
  return iconConfig.type === 'image' ? iconConfig.width : undefined;
},
iconHeight: (d: any) => {
  const iconConfig = getNodeIcon(d.data?.type);
  return iconConfig.type === 'image' ? iconConfig.height : undefined;
}
```

## 🔗 相关 API 接口

### 1. 获取集群列表

**接口**: `GET /api/v1/cluster`

**响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "listMeta": {
      "totalItems": 2
    },
    "clusters": [
      {
        "objectMeta": {
          "name": "master",
          "creationTimestamp": "2025-06-01T14:11:05Z",
          "uid": "38c1dbf9-b9e1-4b75-b020-90931797ad42"
        },
        "ready": "True",
        "kubernetesVersion": "v1.30.11+rke2r1",
        "syncMode": "Push",
        "nodeSummary": {
          "totalNum": 5,
          "readyNum": 5
        },
        "allocatedResources": {
          "cpuCapacity": 20,
          "cpuFraction": 55.625,
          "memoryCapacity": 17207132160,
          "memoryFraction": 53.74273551465332,
          "allocatedPods": 39,
          "podCapacity": 550,
          "podFraction": 7.090909090909091
        }
      }
    ]
  }
}
```

### 2. 获取成员集群节点列表

**接口**: `GET /api/v1/member/{clusterName}/nodes`

**响应数据**:
```json
{
  "code": 200,
  "message": "success", 
  "data": {
    "listMeta": {
      "totalItems": 5
    },
    "nodes": [
      {
        "objectMeta": {
          "name": "m-rke2-master01.example.com",
          "labels": {
            "node-role.kubernetes.io/control-plane": "true",
            "node-role.kubernetes.io/etcd": "true",
            "node-role.kubernetes.io/master": "true"
          },
          "creationTimestamp": "2025-05-18T11:21:50Z"
        },
        "status": {
          "capacity": {
            "cpu": "4",
            "memory": "7902512Ki",
            "pods": "110"
          },
          "allocatable": {
            "cpu": "4", 
            "memory": "7902512Ki",
            "pods": "110"
          },
          "conditions": [
            {
              "type": "Ready",
              "status": "True",
              "lastTransitionTime": "2025-05-23T03:11:27Z",
              "reason": "KubeletReady",
              "message": "kubelet is posting ready status"
            }
          ],
          "addresses": [
            {
              "type": "InternalIP",
              "address": "10.10.10.11"
            },
            {
              "type": "Hostname", 
              "address": "M-RKE2-Master01.example.com"
            }
          ],
          "nodeInfo": {
            "osImage": "Anolis OS 8.10",
            "kernelVersion": "5.10.134-18.an8.x86_64",
            "containerRuntimeVersion": "containerd://1.7.26-k3s1",
            "kubeletVersion": "v1.30.11+rke2r1",
            "architecture": "amd64"
          }
        }
      }
    ]
  }
}
```

## 💡 悬停信息展示

### 1. Karmada 控制平面信息

```typescript
// 控制平面悬停信息包含:
- 系统概览 (版本、API版本、运行时间)
- 集群管理 (总数、健康数、异常数)  
- 资源统计 (节点总数、就绪节点、运行Pod数)
```

### 2. 集群节点信息

```typescript
// 集群悬停信息包含:
- 基本信息 (状态、版本、同步模式、创建时间)
- 节点状态 (总数、就绪数、健康率、进度条)
- 资源使用率 (CPU、内存、Pod使用率，带彩色进度条)
```

### 3. 工作节点信息

```typescript
// 工作节点悬停信息包含:
- 基本信息 (状态、集群、角色、IP、主机名、版本)
- 系统信息 (操作系统、内核、容器运行时、架构)
- 资源容量 (CPU、内存、Pod容量及使用率)
- 健康状态 (Ready、内存压力、磁盘压力、PID压力)
```

## 🚀 实现特性

### 懒加载机制

```typescript
// 节点数据懒加载
const fetchClusterNodes = async (clusterName: string) => {
  if (clusterNodes[clusterName] || loadingNodes.has(clusterName)) {
    return; // 避免重复请求
  }
  
  setLoadingNodes(prev => new Set(prev).add(clusterName));
  
  try {
    const response = await GetMemberClusterNodes({ clusterName });
    setClusterNodes(prev => ({
      ...prev,
      [clusterName]: response.data.nodes
    }));
  } finally {
    setLoadingNodes(prev => {
      const newSet = new Set(prev);
      newSet.delete(clusterName);
      return newSet;
    });
  }
};
```

### 状态管理

```typescript
// 组件状态
const [imagesLoaded, setImagesLoaded] = useState(false);
const [clusterNodes, setClusterNodes] = useState<Record<string, ClusterNode[]>>({});
const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
```

### 错误处理

```typescript
// 图标加载失败回退方案
iconText: (d: any) => {
  const iconConfig = getNodeIcon(d.data?.type);
  return iconConfig.type === 'text' ? iconConfig.text : undefined;
}

// 图片加载错误处理
<img src="/node.png" onerror="this.style.display='none';" />
```

## 🎨 UI 设计特点

### 1. 视觉层次
- **分区展示**: 使用不同背景色区分信息类别
- **图标配色**: 状态相关的颜色编码 (绿色=正常，红色=异常，黄色=警告)
- **进度条**: 资源使用率的直观展示

### 2. 交互体验
- **加载动画**: 节点数据加载时的旋转动画
- **渐变效果**: 进度条使用渐变色增强视觉效果
- **响应式**: 支持不同屏幕尺寸的适配

### 3. 信息密度
- **分层展示**: 重要信息置顶，详细信息分区
- **数据格式化**: 自动单位转换 (bytes→GB, millicores→cores)
- **时间本地化**: 时间戳转换为本地时间格式

## 🧪 测试建议

### 功能测试
- [ ] 图标加载成功/失败场景
- [ ] 节点数据懒加载机制
- [ ] 悬停信息的准确性
- [ ] 不同节点类型的信息展示

### 性能测试  
- [ ] 大量集群场景下的加载性能
- [ ] 图片缓存机制的有效性
- [ ] 内存使用优化

### 兼容性测试
- [ ] 不同浏览器的图标显示
- [ ] 网络较慢时的加载体验
- [ ] 移动端的触摸交互

## 📝 维护说明

### 图标更新
1. 替换 `/public` 目录下的图标文件
2. 保持文件名不变或更新配置
3. 注意图标尺寸比例

### 数据结构变更
1. 更新 TypeScript 接口定义
2. 调整数据解析逻辑
3. 更新悬停信息模板

### 样式调整
1. 修改 tooltip 的 CSS 样式
2. 调整颜色配色方案
3. 优化布局和间距 