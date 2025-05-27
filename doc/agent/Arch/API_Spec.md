# API 设计文档 (API_Spec.md) - Karmada-Manager 增强

## 1. 文档概述

本文档详细定义了 Karmada-Manager 增强功能的所有后端 RESTful API 接口，包括请求方法、参数、返回值和示例。本文档作为前后端开发的接口规范，确保前后端能够正确对接。

## 2. API 规范说明

### 2.1 基础信息

- **Base URL**: `http://localhost:8080/api/v1`
- **Content-Type**: `application/json`
- **字符编码**: `UTF-8`

### 2.2 通用响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2024-12-19T10:30:00Z"
}
```

### 2.3 错误响应格式

```json
{
  "code": 400,
  "message": "Bad Request",
  "error": "详细错误信息",
  "timestamp": "2024-12-19T10:30:00Z"
}
```

### 2.4 分页响应格式

```json
{
  "code": 200,
  "message": "success", 
  "data": {
    "items": [],
    "listMeta": {
      "totalItems": 100,
      "itemsPerPage": 10,
      "currentPage": 1
    }
  }
}
```

## 3. 成员集群管理 API

### 3.1 获取成员集群列表

**接口地址**: `GET /api/v1/clusters`

**功能说明**: 获取所有成员集群的列表和状态概览

**请求参数**:
- `page` (int, optional): 页码，默认 1
- `limit` (int, optional): 每页数量，默认 10
- `sortBy` (string, optional): 排序字段，可选值: name, status, nodeCount
- `sortDirection` (string, optional): 排序方向，可选值: asc, desc

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "objectMeta": {
          "name": "member-cluster-1",
          "namespace": "",
          "creationTimestamp": "2024-01-01T00:00:00Z",
          "labels": {
            "cluster.karmada.io/provider": "aws"
          }
        },
        "status": "Ready",
        "nodeSummary": {
          "totalCount": 5,
          "readyCount": 5
        },
        "resourceSummary": {
          "cpu": {
            "capacity": "20",
            "allocatable": "19.5",
            "allocated": "8.2",
            "utilization": "42%"
          },
          "memory": {
            "capacity": "80Gi",
            "allocatable": "76Gi", 
            "allocated": "32Gi",
            "utilization": "42%"
          },
          "pods": {
            "capacity": "220",
            "allocatable": "220",
            "allocated": "45",
            "utilization": "20%"
          }
        },
        "conditions": [
          {
            "type": "Ready",
            "status": "True",
            "lastTransitionTime": "2024-01-01T00:05:00Z",
            "reason": "ClusterReady"
          }
        ]
      }
    ],
    "listMeta": {
      "totalItems": 3,
      "itemsPerPage": 10,
      "currentPage": 1
    }
  }
}
```

### 3.2 获取集群详情

**接口地址**: `GET /api/v1/clusters/{clusterName}`

**功能说明**: 获取指定成员集群的详细信息

**路径参数**:
- `clusterName` (string, required): 集群名称

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "objectMeta": {
      "name": "member-cluster-1",
      "creationTimestamp": "2024-01-01T00:00:00Z",
      "labels": {
        "cluster.karmada.io/provider": "aws",
        "cluster.karmada.io/region": "us-west-2"
      }
    },
    "status": "Ready",
    "nodeSummary": {
      "totalCount": 5,
      "readyCount": 5
    },
    "resourceSummary": {
      "cpu": {
        "capacity": "20",
        "allocatable": "19.5",
        "allocated": "8.2",
        "utilization": "42%"
      },
      "memory": {
        "capacity": "80Gi", 
        "allocatable": "76Gi",
        "allocated": "32Gi",
        "utilization": "42%"
      },
      "pods": {
        "capacity": "220",
        "allocatable": "220",
        "allocated": "45",
        "utilization": "20%"
      }
    },
    "kubernetesVersion": "v1.28.0",
    "provider": "aws"
  }
}
```

## 4. 节点管理 API

### 4.1 获取集群节点列表

**接口地址**: `GET /api/v1/clusters/{clusterName}/nodes`

**功能说明**: 获取指定集群的所有节点列表

**路径参数**:
- `clusterName` (string, required): 集群名称

**请求参数**:
- `page` (int, optional): 页码，默认 1
- `limit` (int, optional): 每页数量，默认 10
- `sortBy` (string, optional): 排序字段，可选值: name, status, cpuUtilization
- `filterBy` (string, optional): 过滤条件，如 status=Ready

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "objectMeta": {
          "name": "node-1",
          "creationTimestamp": "2024-01-01T00:00:00Z",
          "labels": {
            "kubernetes.io/hostname": "node-1",
            "node.kubernetes.io/instance-type": "t3.medium"
          }
        },
        "status": {
          "capacity": {
            "cpu": "2",
            "memory": "4Gi",
            "pods": "17"
          },
          "allocatable": {
            "cpu": "1950m",
            "memory": "3.5Gi",
            "pods": "17"
          },
          "conditions": [
            {
              "type": "Ready",
              "status": "True",
              "lastTransitionTime": "2024-01-01T00:05:00Z"
            }
          ],
          "addresses": [
            {
              "type": "InternalIP",
              "address": "10.0.1.10"
            }
          ],
          "nodeInfo": {
            "kubeletVersion": "v1.28.0",
            "osImage": "Amazon Linux 2"
          }
        },
        "podSummary": {
          "totalCount": 8,
          "runningCount": 7,
          "pendingCount": 1,
          "failedCount": 0
        },
        "resourceSummary": {
          "cpu": {
            "capacity": "2",
            "allocatable": "1.95",
            "allocated": "0.8",
            "utilization": "41%"
          },
          "memory": {
            "capacity": "4Gi",
            "allocatable": "3.5Gi",
            "allocated": "1.2Gi",
            "utilization": "34%"
          },
          "pods": {
            "capacity": "17",
            "allocatable": "17", 
            "allocated": "8",
            "utilization": "47%"
          }
        },
        "clusterName": "member-cluster-1"
      }
    ],
    "listMeta": {
      "totalItems": 5,
      "itemsPerPage": 10,
      "currentPage": 1
    }
  }
}
```

### 4.2 获取节点详情

**接口地址**: `GET /api/v1/clusters/{clusterName}/nodes/{nodeName}`

**功能说明**: 获取指定节点的详细信息

**路径参数**:
- `clusterName` (string, required): 集群名称
- `nodeName` (string, required): 节点名称

**响应示例**: 
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "objectMeta": {
      "name": "node-1",
      "creationTimestamp": "2024-01-01T00:00:00Z",
      "labels": {
        "kubernetes.io/hostname": "node-1",
        "node.kubernetes.io/instance-type": "t3.medium"
      },
      "annotations": {
        "node.alpha.kubernetes.io/ttl": "0"
      }
    },
    "status": {
      "capacity": {
        "cpu": "2",
        "memory": "4Gi",
        "pods": "17"
      },
      "allocatable": {
        "cpu": "1950m",
        "memory": "3.5Gi", 
        "pods": "17"
      },
      "conditions": [
        {
          "type": "Ready",
          "status": "True",
          "lastTransitionTime": "2024-01-01T00:05:00Z",
          "reason": "KubeletReady"
        }
      ],
      "addresses": [
        {
          "type": "InternalIP",
          "address": "10.0.1.10"
        },
        {
          "type": "Hostname", 
          "address": "ip-10-0-1-10.us-west-2.compute.internal"
        }
      ],
      "nodeInfo": {
        "kubeletVersion": "v1.28.0",
        "kubeProxyVersion": "v1.28.0",
        "operatingSystem": "linux",
        "architecture": "amd64",
        "osImage": "Amazon Linux 2"
      }
    },
    "podSummary": {
      "totalCount": 8,
      "runningCount": 7,
      "pendingCount": 1,
      "failedCount": 0
    },
    "resourceSummary": {
      "cpu": {
        "capacity": "2",
        "allocatable": "1.95",
        "allocated": "0.8",
        "utilization": "41%"
      },
      "memory": {
        "capacity": "4Gi",
        "allocatable": "3.5Gi",
        "allocated": "1.2Gi",
        "utilization": "34%"
      },
      "pods": {
        "capacity": "17",
        "allocatable": "17",
        "allocated": "8", 
        "utilization": "47%"
      }
    },
    "clusterName": "member-cluster-1"
  }
}
```

### 4.3 获取节点上的 Pod 列表

**接口地址**: `GET /api/v1/clusters/{clusterName}/nodes/{nodeName}/pods`

**功能说明**: 获取指定节点上运行的所有 Pod

**路径参数**:
- `clusterName` (string, required): 集群名称
- `nodeName` (string, required): 节点名称

**请求参数**:
- `page` (int, optional): 页码，默认 1
- `limit` (int, optional): 每页数量，默认 10

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "objectMeta": {
          "name": "nginx-deployment-7d6bc8b5f9-abc123",
          "namespace": "default",
          "creationTimestamp": "2024-01-01T00:10:00Z",
          "labels": {
            "app": "nginx",
            "pod-template-hash": "7d6bc8b5f9"
          }
        },
        "status": {
          "phase": "Running",
          "conditions": [
            {
              "type": "Ready",
              "status": "True"
            }
          ],
          "podIP": "10.244.1.5",
          "startTime": "2024-01-01T00:10:00Z"
        },
        "restartCount": 0,
        "nodeName": "node-1",
        "clusterName": "member-cluster-1"
      }
    ],
    "listMeta": {
      "totalItems": 8,
      "itemsPerPage": 10,
      "currentPage": 1
    }
  }
}
```

## 5. Pod 管理 API

### 5.1 获取集群 Pod 列表

**接口地址**: `GET /api/v1/clusters/{clusterName}/pods`

**功能说明**: 获取指定集群的所有 Pod 列表

**路径参数**:
- `clusterName` (string, required): 集群名称

**请求参数**:
- `namespace` (string, optional): 命名空间过滤
- `page` (int, optional): 页码，默认 1
- `limit` (int, optional): 每页数量，默认 10
- `sortBy` (string, optional): 排序字段

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "objectMeta": {
          "name": "nginx-deployment-7d6bc8b5f9-abc123",
          "namespace": "default",
          "creationTimestamp": "2024-01-01T00:10:00Z"
        },
        "status": {
          "phase": "Running",
          "podIP": "10.244.1.5"
        },
        "restartCount": 0,
        "nodeName": "node-1",
        "clusterName": "member-cluster-1"
      }
    ],
    "listMeta": {
      "totalItems": 45,
      "itemsPerPage": 10,
      "currentPage": 1
    }
  }
}
```

### 5.2 获取 Pod 详情

**接口地址**: `GET /api/v1/clusters/{clusterName}/pods/{namespace}/{podName}`

**功能说明**: 获取指定 Pod 的详细信息

**路径参数**:
- `clusterName` (string, required): 集群名称
- `namespace` (string, required): 命名空间
- `podName` (string, required): Pod 名称

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "objectMeta": {
      "name": "nginx-deployment-7d6bc8b5f9-abc123",
      "namespace": "default",
      "creationTimestamp": "2024-01-01T00:10:00Z",
      "labels": {
        "app": "nginx",
        "pod-template-hash": "7d6bc8b5f9"
      },
      "ownerReferences": [
        {
          "apiVersion": "apps/v1",
          "kind": "ReplicaSet",
          "name": "nginx-deployment-7d6bc8b5f9"
        }
      ]
    },
    "spec": {
      "containers": [
        {
          "name": "nginx",
          "image": "nginx:1.21",
          "resources": {
            "requests": {
              "cpu": "100m",
              "memory": "128Mi"
            },
            "limits": {
              "cpu": "200m",
              "memory": "256Mi"
            }
          }
        }
      ],
      "nodeName": "node-1"
    },
    "status": {
      "phase": "Running",
      "conditions": [
        {
          "type": "Ready",
          "status": "True",
          "lastTransitionTime": "2024-01-01T00:10:30Z"
        }
      ],
      "podIP": "10.244.1.5",
      "startTime": "2024-01-01T00:10:00Z",
      "containerStatuses": [
        {
          "name": "nginx",
          "ready": true,
          "restartCount": 0,
          "state": {
            "running": {
              "startedAt": "2024-01-01T00:10:15Z"
            }
          }
        }
      ]
    },
    "restartCount": 0,
    "nodeName": "node-1",
    "clusterName": "member-cluster-1"
  }
}
```

### 5.3 获取 Pod 日志

**接口地址**: `GET /api/v1/clusters/{clusterName}/pods/{namespace}/{podName}/logs`

**功能说明**: 获取指定 Pod 的日志

**路径参数**:
- `clusterName` (string, required): 集群名称
- `namespace` (string, required): 命名空间
- `podName` (string, required): Pod 名称

**请求参数**:
- `container` (string, optional): 容器名称，多容器时需要指定
- `tailLines` (int, optional): 显示最后多少行，默认 100
- `sinceTime` (string, optional): 开始时间 (RFC3339 格式)
- `follow` (boolean, optional): 是否跟踪实时日志，默认 false

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "logs": "2024/01/01 10:30:00 [notice] 1#1: nginx/1.21.0\n2024/01/01 10:30:00 [notice] 1#1: built by gcc 9.4.0\n2024/01/01 10:30:00 [notice] 1#1: OS: Linux 5.4.0-84-generic\n",
    "podName": "nginx-deployment-7d6bc8b5f9-abc123",
    "containerName": "nginx",
    "clusterName": "member-cluster-1"
  }
}
```

## 6. 调度信息 API

### 6.1 获取 Workload 调度信息

**接口地址**: `GET /api/v1/workloads/{namespace}/{workloadName}/scheduling`

**功能说明**: 获取指定 Workload 的调度策略和结果信息

**路径参数**:
- `namespace` (string, required): 命名空间
- `workloadName` (string, required): Workload 名称

**请求参数**:
- `kind` (string, optional): Workload 类型，默认 Deployment

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "workloadInfo": {
      "name": "nginx-deployment",
      "namespace": "default",
      "kind": "Deployment",
      "replicas": 5,
      "readyReplicas": 5
    },
    "propagationPolicy": {
      "name": "nginx-propagation",
      "namespace": "default",
      "clusterAffinity": {
        "clusterNames": ["member-cluster-1", "member-cluster-2"]
      },
      "replicaScheduling": {
        "replicaDivisionPreference": "Weighted",
        "replicaSchedulingType": "Divided",
        "weightPreference": {
          "staticWeightList": [
            {
              "targetCluster": {
                "clusterNames": ["member-cluster-1"]
              },
              "weight": 60
            },
            {
              "targetCluster": {
                "clusterNames": ["member-cluster-2"]
              },
              "weight": 40
            }
          ]
        }
      }
    },
    "clusterPlacements": [
      {
        "clusterName": "member-cluster-1",
        "plannedReplicas": 3,
        "actualReplicas": 3,
        "weight": 60,
        "reason": "根据静态权重分配"
      },
      {
        "clusterName": "member-cluster-2",
        "plannedReplicas": 2,
        "actualReplicas": 2,
        "weight": 40,
        "reason": "根据静态权重分配"
      }
    ],
    "schedulingStatus": {
      "phase": "Scheduled",
      "message": "所有副本都已成功调度"
    }
  }
}
```

### 6.2 获取 Pod 调度追溯信息

**接口地址**: `GET /api/v1/pods/{namespace}/{podName}/trace`

**功能说明**: 获取指定 Pod 的调度追溯路径信息

**路径参数**:
- `namespace` (string, required): 命名空间
- `podName` (string, required): Pod 名称

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "podInfo": {
      "name": "nginx-deployment-7d6bc8b5f9-abc123",
      "namespace": "default",
      "phase": "Running",
      "podIP": "10.244.1.5",
      "startTime": "2024-01-01T00:10:00Z"
    },
    "workloadInfo": {
      "name": "nginx-deployment",
      "namespace": "default",
      "kind": "Deployment"
    },
    "schedulingPath": [
      {
        "stepType": "policy_match",
        "description": "通过 PropagationPolicy 匹配到调度策略",
        "details": {
          "policyName": "nginx-propagation",
          "matchedBy": "resourceSelector"
        }
      },
      {
        "stepType": "cluster_select",
        "description": "根据集群亲和性选择目标集群",
        "details": {
          "selectedClusters": ["member-cluster-1", "member-cluster-2"],
          "reason": "clusterNames匹配"
        }
      },
      {
        "stepType": "replica_assign",
        "description": "根据权重分配副本到集群",
        "details": {
          "assignments": [
            {
              "cluster": "member-cluster-1",
              "replicas": 3,
              "weight": 60
            },
            {
              "cluster": "member-cluster-2", 
              "replicas": 2,
              "weight": 40
            }
          ]
        }
      },
      {
        "stepType": "node_schedule",
        "description": "Kubernetes 调度器将 Pod 分配到节点",
        "details": {
          "selectedCluster": "member-cluster-1",
          "selectedNode": "node-1",
          "reason": "资源充足且满足亲和性要求"
        }
      }
    ],
    "finalPlacement": {
      "clusterName": "member-cluster-1",
      "nodeName": "node-1",
      "podIP": "10.244.1.5",
      "scheduledAt": "2024-01-01T00:10:15Z"
    }
  }
}
```

## 7. 资源管理 API

### 7.1 获取集群资源列表

**接口地址**: `GET /api/v1/clusters/{clusterName}/resources/{resourceType}`

**功能说明**: 获取指定集群中某类资源的列表

**路径参数**:
- `clusterName` (string, required): 集群名称
- `resourceType` (string, required): 资源类型，如: deployments, configmaps, secrets

**请求参数**:
- `namespace` (string, optional): 命名空间
- `page` (int, optional): 页码
- `limit` (int, optional): 每页数量

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "objectMeta": {
          "name": "app-config",
          "namespace": "default",
          "creationTimestamp": "2024-01-01T00:00:00Z"
        },
        "typeMeta": {
          "kind": "ConfigMap",
          "apiVersion": "v1"
        }
      }
    ],
    "listMeta": {
      "totalItems": 5,
      "itemsPerPage": 10,
      "currentPage": 1
    }
  }
}
```

### 7.2 获取资源详情

**接口地址**: `GET /api/v1/clusters/{clusterName}/resources/{resourceType}/{namespace}/{resourceName}`

**功能说明**: 获取指定资源的详细信息和 YAML

**路径参数**:
- `clusterName` (string, required): 集群名称
- `resourceType` (string, required): 资源类型
- `namespace` (string, required): 命名空间
- `resourceName` (string, required): 资源名称

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "objectMeta": {
      "name": "app-config",
      "namespace": "default",
      "creationTimestamp": "2024-01-01T00:00:00Z"
    },
    "typeMeta": {
      "kind": "ConfigMap",
      "apiVersion": "v1"
    },
    "data": {
      "app.properties": "key1=value1\nkey2=value2"
    },
    "yaml": "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: app-config\n  namespace: default\ndata:\n  app.properties: |\n    key1=value1\n    key2=value2"
  }
}
```

### 7.3 更新资源

**接口地址**: `PUT /api/v1/clusters/{clusterName}/resources/{resourceType}/{namespace}/{resourceName}`

**功能说明**: 更新指定资源的配置

**路径参数**:
- `clusterName` (string, required): 集群名称  
- `resourceType` (string, required): 资源类型
- `namespace` (string, required): 命名空间
- `resourceName` (string, required): 资源名称

**请求体**:
```json
{
  "yaml": "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: app-config\n  namespace: default\ndata:\n  app.properties: |\n    key1=newvalue1\n    key2=newvalue2"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "资源更新成功",
  "data": {
    "updated": true,
    "resourceVersion": "12345"
  }
}
```

## 8. 错误码定义

| 错误码 | 说明 | 详细描述 |
|--------|------|----------|
| 200 | 成功 | 请求成功处理 |
| 400 | 请求错误 | 请求参数有误 |
| 401 | 未授权 | 缺少认证信息 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 资源不存在 | 请求的资源不存在 |
| 500 | 服务器错误 | 内部服务器错误 |
| 502 | 网关错误 | 无法连接到 Karmada/Member Cluster |
| 503 | 服务不可用 | 服务临时不可用 |

## 9. 认证与权限

### 9.1 认证方式

- **Bearer Token**: 在 Header 中携带 `Authorization: Bearer <token>`
- **ServiceAccount**: 使用 Kubernetes ServiceAccount Token

### 9.2 权限控制

- 基于 Kubernetes RBAC 进行权限控制
- 不同用户角色拥有不同的 API 访问权限
- 敏感操作需要额外的权限验证

## 10. 限流与监控

### 10.1 限流策略

- 每个 IP 每分钟最多 1000 次请求
- 每个用户每分钟最多 500 次请求
- 敏感操作（如更新资源）每分钟最多 100 次

### 10.2 监控指标

- API 调用次数和响应时间
- 错误率统计
- 资源使用情况监控 