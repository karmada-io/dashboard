# Karmada-Manager API 响应示例文档

## 概述

本文档包含所有Karmada-Manager后端API的真实响应示例，基于实际运行环境的测试结果。

## 1. 系统概览 API

### 请求
```http
GET /api/v1/overview
```

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "karmadaInfo": {
      "version": {
        "gitVersion": "v1.13.2",
        "gitCommit": "c292ad93c55259d553cc3a4408c6a33b682a93b6",
        "gitTreeState": "clean",
        "buildDate": "2025-04-30T07:36:02Z",
        "goVersion": "go1.22.12",
        "compiler": "gc",
        "platform": "linux/amd64"
      },
      "status": "running",
      "createTime": "2025-05-19T12:55:19Z"
    },
    "memberClusterStatus": {
      "nodeSummary": {
        "totalNum": 9,
        "readyNum": 9
      },
      "cpuSummary": {
        "totalCPU": 36,
        "allocatedCPU": 21.65
      },
      "memorySummary": {
        "totalMemory": 34185674752,
        "allocatedMemory": 18447556658
      }
    }
  }
}
```

## 2. 集群管理 API

### 2.1 获取集群列表

#### 请求
```http
GET /api/v1/clusters
```

#### 响应示例
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
          "name": "branch",
          "creationTimestamp": "2025-05-19T13:43:59Z",
          "uid": "c9befe5f-7b39-47cd-ac86-199e0844f77f"
        },
        "typeMeta": {
          "kind": "cluster"
        },
        "ready": "True",
        "kubernetesVersion": "v1.30.11+rke2r1",
        "syncMode": "Push",
        "nodeSummary": {
          "totalNum": 4,
          "readyNum": 4
        },
        "allocatedResources": {
          "cpuCapacity": 16,
          "cpuFraction": 65.78125,
          "memoryCapacity": 16978542592,
          "memoryFraction": 60.32089832204911,
          "allocatedPods": 36,
          "podCapacity": 440,
          "podFraction": 8.18181818181818
        }
      },
      {
        "objectMeta": {
          "name": "master",
          "creationTimestamp": "2025-05-19T13:18:34Z",
          "uid": "932dddc5-dc3e-4179-803c-2a0ffd310cb5"
        },
        "typeMeta": {
          "kind": "cluster"
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
          "memoryFraction": 53.74281801825406,
          "allocatedPods": 39,
          "podCapacity": 550,
          "podFraction": 7.090909090909091
        }
      }
    ],
    "errors": []
  }
}
```

### 2.2 获取集群详情

#### 请求
```http
GET /api/v1/clusters/master
```

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "objectMeta": {
      "name": "master",
      "creationTimestamp": "2025-05-19T13:18:34Z",
      "uid": "932dddc5-dc3e-4179-803c-2a0ffd310cb5"
    },
    "typeMeta": {
      "kind": "cluster"
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
      "memoryFraction": 53.74281801825406,
      "allocatedPods": 39,
      "podCapacity": 550,
      "podFraction": 7.090909090909091
    }
  }
}
```

## 3. 节点管理 API

### 3.1 获取节点列表

#### 请求
```http
GET /api/v1/member/master/nodes
```

#### 响应示例（部分）
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
            "beta.kubernetes.io/arch": "amd64",
            "beta.kubernetes.io/instance-type": "rke2",
            "beta.kubernetes.io/os": "linux",
            "kubernetes.io/arch": "amd64",
            "kubernetes.io/hostname": "m-rke2-master01.example.com",
            "kubernetes.io/os": "linux",
            "node-role.kubernetes.io/control-plane": "true",
            "node-role.kubernetes.io/etcd": "true",
            "node-role.kubernetes.io/master": "true"
          },
          "creationTimestamp": "2025-05-18T11:25:09Z",
          "uid": "aebaa2c6-8a33-4b9a-adf4-82fd35c8ef2f"
        },
        "typeMeta": {
          "kind": "node"
        },
        "status": {
          "capacity": {
            "cpu": "4",
            "ephemeral-storage": "41152252Ki",
            "hugepages-1Gi": "0",
            "hugepages-2Mi": "0",
            "memory": "4031720Ki",
            "pods": "110"
          },
          "allocatable": {
            "cpu": "4",
            "ephemeral-storage": "37899308367",
            "hugepages-1Gi": "0",
            "hugepages-2Mi": "0",
            "memory": "3929320Ki",
            "pods": "110"
          }
        },
        "podSummary": {
          "totalCount": 19,
          "runningCount": 19,
          "pendingCount": 0,
          "failedCount": 0
        },
        "resourceSummary": {
          "cpu": {
            "capacity": "4",
            "allocatable": "4",
            "allocated": "1710m",
            "utilization": "42.8%"
          },
          "memory": {
            "capacity": "4031720Ki",
            "allocatable": "3929320Ki",
            "allocated": "1847689216",
            "utilization": "45.8%"
          },
          "pods": {
            "capacity": "110",
            "allocatable": "110",
            "allocated": "19",
            "utilization": "17.3%"
          }
        },
        "clusterName": "master"
      }
    ],
    "errors": []
  }
}
```

### 3.2 获取节点详情

#### 请求
```http
GET /api/v1/member/master/nodes/m-rke2-master01.example.com
```

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "objectMeta": {
      "name": "m-rke2-master01.example.com",
      "labels": {
        "beta.kubernetes.io/arch": "amd64",
        "beta.kubernetes.io/instance-type": "rke2",
        "beta.kubernetes.io/os": "linux",
        "kubernetes.io/arch": "amd64",
        "kubernetes.io/hostname": "m-rke2-master01.example.com",
        "kubernetes.io/os": "linux",
        "node-role.kubernetes.io/control-plane": "true",
        "node-role.kubernetes.io/etcd": "true",
        "node-role.kubernetes.io/master": "true",
        "node.kubernetes.io/instance-type": "rke2"
      },
      "creationTimestamp": "2025-05-18T11:25:09Z",
      "uid": "aebaa2c6-8a33-4b9a-adf4-82fd35c8ef2f"
    },
    "typeMeta": {
      "kind": "node"
    },
    "status": {
      "capacity": {
        "cpu": "4",
        "ephemeral-storage": "41152252Ki",
        "hugepages-1Gi": "0",
        "hugepages-2Mi": "0",
        "memory": "4031720Ki",
        "pods": "110"
      },
      "allocatable": {
        "cpu": "4",
        "ephemeral-storage": "37899308367",
        "hugepages-1Gi": "0",
        "hugepages-2Mi": "0",
        "memory": "3929320Ki",
        "pods": "110"
      },
      "nodeInfo": {
        "machineID": "57e069c7b7a746ffa1a2e1b8f830bd81",
        "systemUUID": "4217AE03-EFD3-2A87-6FF6-D0FE5EB47AF6",
        "bootID": "cb28b7d5-5bee-4f5b-8c5c-ae77ce9c1f66",
        "kernelVersion": "5.10.134-18.an8.x86_64",
        "osImage": "OpenAnolis 8.9",
        "containerRuntimeVersion": "containerd://1.7.15-k3s1",
        "kubeletVersion": "v1.30.11+rke2r1",
        "kubeProxyVersion": "v1.30.11+rke2r1",
        "operatingSystem": "linux",
        "architecture": "amd64"
      },
      "conditions": [
        {
          "type": "Ready",
          "status": "True",
          "lastHeartbeatTime": "2025-05-20T01:14:34Z",
          "lastTransitionTime": "2025-05-18T11:25:28Z",
          "reason": "KubeletReady",
          "message": "kubelet is posting ready status"
        }
      ]
    },
    "podSummary": {
      "totalCount": 19,
      "runningCount": 19,
      "pendingCount": 0,
      "failedCount": 0
    },
    "resourceSummary": {
      "cpu": {
        "capacity": "4",
        "allocatable": "4",
        "allocated": "1710m",
        "utilization": "42.8%"
      },
      "memory": {
        "capacity": "4031720Ki",
        "allocatable": "3929320Ki",
        "allocated": "1847689216",
        "utilization": "45.8%"
      },
      "pods": {
        "capacity": "110",
        "allocatable": "110",
        "allocated": "19",
        "utilization": "17.3%"
      }
    },
    "clusterName": "master"
  }
}
```

### 3.3 获取节点上的Pod列表

#### 请求
```http
GET /api/v1/member/master/nodes/m-rke2-master01.example.com/pods
```

#### 响应示例（部分）
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "listMeta": {
      "totalItems": 19
    },
    "items": [
      {
        "objectMeta": {
          "name": "higress-gateway-68d974f7b5-cbd59",
          "namespace": "higress-system",
          "labels": {
            "app": "higress-gateway",
            "higress": "higress-system-higress-gateway",
            "pod-template-hash": "68d974f7b5",
            "sidecar.istio.io/inject": "false"
          },
          "creationTimestamp": "2025-05-20T00:44:02Z",
          "uid": "0da51c49-e5fd-429f-b59b-daa17c503b9b"
        },
        "typeMeta": {
          "kind": "pod"
        },
        "status": {
          "conditions": [
            {
              "type": "PodReadyCondition",
              "status": "True"
            }
          ]
        }
      }
    ],
    "errors": []
  }
}
```

## 4. 工作负载调度 API

### 请求
```http
GET /api/v1/workloads/default/nginx-deployment/scheduling?kind=Deployment
```

### 响应示例（无ResourceBinding）
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "workloadInfo": {
      "name": "nginx-deployment",
      "namespace": "default",
      "kind": "Deployment",
      "apiVersion": "apps/v1",
      "replicas": 0,
      "readyReplicas": 0
    },
    "propagationPolicy": null,
    "overridePolicy": null,
    "clusterPlacements": [],
    "schedulingStatus": {
      "phase": "Pending",
      "message": "No resource binding found"
    }
  }
}
```

## 5. 策略管理 API

### 5.1 获取传播策略列表

#### 请求
```http
GET /api/v1/propagationpolicies
```

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "listMeta": {
      "totalItems": 0
    },
    "propagationpolicys": [],
    "errors": []
  }
}
```

### 5.2 获取覆盖策略列表

#### 请求
```http
GET /api/v1/overridepolicies
```

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "listMeta": {
      "totalItems": 0
    },
    "overridepolicys": [],
    "errors": []
  }
}
```

## 6. 成员集群资源 API

### 6.1 获取命名空间列表

#### 请求
```http
GET /api/v1/member/master/namespace
```

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "listMeta": {
      "totalItems": 6
    },
    "namespaces": [
      {
        "objectMeta": {
          "name": "default",
          "labels": {
            "kubernetes.io/metadata.name": "default"
          },
          "creationTimestamp": "2025-05-18T11:21:47Z",
          "uid": "8d9bc1d7-4aee-4237-91c0-666c3b3e85ca"
        },
        "typeMeta": {
          "kind": "namespace"
        },
        "phase": "Active",
        "skipAutoPropagation": false
      }
    ],
    "errors": []
  }
}
```

### 6.2 获取部署列表

#### 请求
```http
GET /api/v1/member/master/deployment
```

#### 响应示例（部分）
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "listMeta": {
      "totalItems": 7
    },
    "status": {
      "running": 7,
      "pending": 0,
      "failed": 0,
      "succeeded": 0,
      "terminating": 0
    },
    "deployments": [
      {
        "objectMeta": {
          "name": "higress-console",
          "namespace": "higress-system",
          "labels": {
            "app.kubernetes.io/instance": "higress",
            "app.kubernetes.io/managed-by": "Helm",
            "app.kubernetes.io/name": "higress-console",
            "app.kubernetes.io/version": "2.1.3",
            "helm.sh/chart": "higress-console-2.1.3"
          },
          "creationTimestamp": "2025-05-19T06:04:06Z",
          "uid": "0096b3e5-6e71-4946-a1ed-8b0caf0a16b5"
        },
        "typeMeta": {
          "kind": "deployment"
        },
        "containerImages": [
          "higress-registry.cn-hangzhou.cr.aliyuncs.com/higress/higress-console:2.1.3"
        ],
        "initContainerImages": [],
        "podInfo": {
          "current": 1,
          "desired": 1,
          "running": 1,
          "pending": 0,
          "failed": 0,
          "succeeded": 0,
          "warnings": []
        }
      }
    ],
    "errors": []
  }
}
```

### 6.3 获取服务列表

#### 请求
```http
GET /api/v1/member/master/service
```

#### 响应示例（部分）
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "listMeta": {
      "totalItems": 7
    },
    "services": [
      {
        "objectMeta": {
          "name": "kubernetes",
          "namespace": "default",
          "labels": {
            "component": "apiserver",
            "provider": "kubernetes"
          },
          "creationTimestamp": "2025-05-18T11:21:48Z",
          "uid": "d85963d3-bdb6-47f4-887c-31f1560f8fb5"
        },
        "typeMeta": {
          "kind": "service"
        },
        "internalEndpoint": {
          "host": "kubernetes",
          "ports": [
            {
              "port": 443,
              "protocol": "TCP",
              "nodePort": 0
            }
          ]
        },
        "externalEndpoints": [],
        "selector": null,
        "type": "ClusterIP",
        "clusterIP": "10.43.0.1"
      }
    ],
    "errors": []
  }
}
```

## 7. 错误响应示例

### 7.1 不存在的端点
```json
404 page not found
```

### 7.2 不存在的集群
```json
{
  "code": 500,
  "message": "clusters.cluster.karmada.io \"nonexistent-cluster\" not found",
  "data": null
}
```

### 7.3 不存在的工作负载
```json
{
  "code": 500,
  "message": "failed to get workload info: no resource binding found for nonexistent/nonexistent",
  "data": null
}
```

## 8. 响应数据说明

### 8.1 通用响应格式
所有API响应都遵循统一格式：
```json
{
  "code": 200,          // HTTP状态码
  "message": "success", // 响应消息
  "data": {}           // 实际数据
}
```

### 8.2 分页支持
支持分页的API可使用以下参数：
- `page`: 页码（从1开始）
- `limit`: 每页数量
- `sortBy`: 排序字段
- `ascending`: 是否升序

### 8.3 过滤支持
支持过滤的API可使用以下参数：
- `filterBy`: 过滤字段
- `name`: 按名称过滤

### 8.4 数据完整性
- 所有时间戳使用RFC3339格式
- 资源名称、UID等保持Kubernetes原生格式
- 数值类型保持原始精度
- 布尔值明确表示true/false

## 9. 性能指标

基于实际测试环境的响应数据大小：
- 概览信息：~705字节
- 集群列表：~1013字节
- 节点列表：~30KB（5个节点）
- 节点详情：~6KB
- 节点Pod列表：~40KB（19个Pod）
- 部署列表：~6KB（7个部署）
- 服务列表：~6KB（7个服务）
- Pod列表：~52KB（45个Pod）

这些数据展示了API在真实环境中的表现，为前端优化和缓存策略提供参考。 