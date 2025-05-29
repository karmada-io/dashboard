# Karmada 服务图形化向导功能

## 功能概述

为 Karmada Dashboard 实现了完整的服务（Service/Ingress）图形化向导功能，支持通过用户友好的界面创建网络服务资源，而无需手写 YAML 文件。向导会根据用户输入自动生成标准的 Kubernetes YAML 配置，然后通过现有的后端 API 提交创建。

## 支持的服务类型

### 1. Service
- **特性**: 为Pod提供稳定的网络端点和负载均衡
- **专有配置**:
  - 服务类型 (ClusterIP/NodePort/LoadBalancer/ExternalName)
  - 端口配置 (支持多端口)
  - 协议选择 (TCP/UDP/SCTP)
  - 选择器配置 (Pod标签匹配)
  - 会话亲和性 (None/ClientIP)
  - 外部流量策略 (Cluster/Local)

### 2. Ingress
- **特性**: 提供HTTP/HTTPS路由规则，管理外部访问
- **专有配置**:
  - Ingress 类名配置
  - 路由规则 (支持多规则)
  - 主机名和路径配置
  - 路径类型 (Prefix/Exact/ImplementationSpecific)
  - 后端服务映射

## 向导界面设计

### 4步式向导流程

1. **基本配置** - 设置服务基本信息
   - 服务名称 (含验证规则)
   - 命名空间选择
   - 服务类型特定配置

2. **端口/路由配置** - 配置网络访问规则
   - **Service**: 端口、目标端口、协议、NodePort
   - **Ingress**: 主机名、路径、路径类型、后端服务

3. **高级配置** - 选择器、标签和注解
   - **Service**: Pod选择器配置
   - 自定义标签和注解
   - 网络策略配置

4. **配置预览** - 检查并确认配置
   - 生成的 YAML 预览
   - 配置摘要信息
   - 一键复制 YAML

### 界面特色

- **类型自适应**: 根据Service/Ingress类型显示不同配置项
- **智能表单**: 动态显示相关配置选项
- **多端口/规则**: 支持添加/删除多个端口或路由规则
- **实时验证**: 表单字段实时验证和错误提示
- **智能默认值**: 根据服务类型提供合理默认配置
- **响应式设计**: 支持不同屏幕尺寸

## 技术实现

### 核心组件
- `ServiceWizardModal`: 主向导组件
- 支持的服务类型枚举: `ServiceKind`
- YAML 生成器: 根据配置动态生成标准 Kubernetes YAML

### Service配置生成
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: 80
    protocol: TCP
  selector:
    app: my-service
```

### Ingress配置生成
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

### 数据流
1. 用户通过向导界面填写配置
2. 实时更新内部状态 `serviceConfig`
3. 最后一步生成完整的 YAML 配置
4. 调用现有的 `CreateResource` API 提交
5. 成功后刷新服务列表

## 功能亮点

### 1. Service 端口配置
- 支持多端口配置
- 自动 NodePort 范围验证 (30000-32767)
- 协议选择 (TCP/UDP/SCTP)
- 端口名称和目标端口映射

### 2. Ingress 路由规则
- 多主机名和路径规则
- 路径类型精确控制
- 后端服务自动映射
- TLS 配置支持 (可扩展)

### 3. 选择器智能配置
- Pod 标签选择器配置
- 自动关联应用标签
- 键值对动态管理

### 4. 服务类型自适应
- **ClusterIP**: 集群内部访问
- **NodePort**: 节点端口暴露，支持外部流量策略
- **LoadBalancer**: 负载均衡器，支持云提供商集成
- **ExternalName**: 外部服务映射

### 5. 用户体验优化
- 下拉菜单选择创建方式 (图形化向导/YAML编辑器)
- 步骤式导航，清晰的进度指示
- 表单验证和错误提示
- YAML 预览和复制功能
- 命名空间下拉选择

## 使用指南

1. 在服务管理页面点击"新增服务"下拉按钮
2. 选择"图形化向导"选项
3. 根据当前选择的服务类型逐步配置
4. 在预览页面确认配置无误后点击"创建"

## 与现有系统集成

- **无需修改后端**: 完全使用现有的 unstructured API
- **保持一致性**: 生成的 YAML 符合 Kubernetes 标准
- **统一入口**: 通过下拉菜单选择创建方式
- **样式统一**: 使用相同的科技感主题样式

## 扩展性

该向导采用模块化设计，便于未来扩展：
- 新增服务类型只需扩展 `renderServiceSpecificConfig` 方法
- TLS 配置可扩展到 Ingress 高级配置中
- 负载均衡器配置可针对不同云提供商扩展
- YAML 生成器支持灵活的配置映射

## 技术栈

- **React**: 组件化开发
- **Ant Design**: UI 组件库
- **TypeScript**: 类型安全
- **YAML**: 配置序列化
- **现有 API**: 无缝集成后端服务

## 配置示例

### Service 示例
- **类型**: NodePort
- **端口**: 80 → 8080 (目标端口)
- **NodePort**: 30080
- **选择器**: app=my-app

### Ingress 示例
- **主机**: api.example.com
- **路径**: /api/v1/*
- **后端**: api-service:8080
- **类**: nginx

这些配置会自动生成符合 Kubernetes 规范的 YAML 文件，确保部署的正确性和一致性。 