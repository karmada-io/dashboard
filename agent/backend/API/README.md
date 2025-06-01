# Karmada Dashboard API 测试工具

本目录包含了用于测试 Karmada Dashboard API 接口的工具和文档。

## 文件说明

- `karmada_api_test.py` - Python 版本的 API 测试脚本
- `karmada_api_test.sh` - Shell/Curl 版本的 API 测试脚本  
- `karmada_api_documentation.md` - 完整的 API 接口文档
- `README.md` - 本说明文件

## Python 测试脚本使用方法

### 安装依赖

```bash
pip install requests pyyaml
```

### 基本使用

```bash
# 使用默认设置 (http://localhost:8000)
python karmada_api_test.py

# 指定 API 地址
python karmada_api_test.py --url http://your-api-server:8000

# 使用认证 token
python karmada_api_test.py --token your-jwt-token

# 详细输出模式
python karmada_api_test.py --verbose

# 组合使用
python karmada_api_test.py --url http://localhost:8000 --token your-token --verbose
```

### 环境变量

你也可以使用环境变量来配置：

```bash
export API_BASE_URL=http://localhost:8000
export TOKEN=your-jwt-token
python karmada_api_test.py
```

## Shell 测试脚本使用方法

### 依赖检查

确保系统已安装：
- `curl` (必需)
- `jq` (可选，用于 JSON 格式化)

### 基本使用

```bash
# 给脚本执行权限
chmod +x karmada_api_test.sh

# 使用默认设置
./karmada_api_test.sh

# 指定 API 地址
./karmada_api_test.sh --url http://your-api-server:8000

# 使用认证 token
./karmada_api_test.sh --token your-jwt-token

# 详细输出模式
./karmada_api_test.sh --verbose

# 查看帮助
./karmada_api_test.sh --help
```

### 环境变量

```bash
export API_BASE_URL=http://localhost:8000
export TOKEN=your-token
export VERBOSE=true
./karmada_api_test.sh
```

## 测试内容

两个测试脚本都会测试以下 API 接口：

### 认证接口
- 用户登录 (`POST /api/v1/login`)
- 获取用户信息 (`GET /api/v1/me`)

### 系统概览
- 获取系统概览 (`GET /api/v1/overview`)

### 集群管理
- 获取集群列表 (`GET /api/v1/cluster`)
- 获取集群详情 (`GET /api/v1/cluster/{name}`)
- 创建集群 (`POST /api/v1/cluster`)
- 更新集群 (`PUT /api/v1/cluster/{name}`)
- 删除集群 (`DELETE /api/v1/cluster/{name}`)

### 命名空间管理
- 获取命名空间列表 (`GET /api/v1/namespace`)
- 获取命名空间详情 (`GET /api/v1/namespace/{name}`)
- 获取命名空间事件 (`GET /api/v1/namespace/{name}/event`)
- 创建命名空间 (`POST /api/v1/namespace`)

### 工作负载管理
- 部署 (Deployment)
- 服务 (Service)
- 状态副本集 (StatefulSet)
- 守护进程集 (DaemonSet)
- 任务 (Job)
- 定时任务 (CronJob)
- 入口 (Ingress)

### 配置管理
- 配置映射 (ConfigMap)
- 密钥 (Secret)

### 策略管理
- 传播策略 (PropagationPolicy)
- 集群传播策略 (ClusterPropagationPolicy)
- 覆盖策略 (OverridePolicy)
- 集群覆盖策略 (ClusterOverridePolicy)

### 非结构化资源
- 获取任意 Kubernetes 资源
- 删除非结构化资源

### 成员集群
- 获取成员集群节点
- 获取成员集群服务

## 测试结果

测试脚本会输出详细的测试结果，包括：

- ✅ 通过的测试 (绿色)
- ❌ 失败的测试 (红色)
- 测试统计信息
- 成功率

### 状态码说明

测试脚本会检查以下 HTTP 状态码：

- `200` - 请求成功
- `201` - 资源创建成功
- `400` - 请求参数错误 (某些测试中认为是正常的)
- `401` - 未认证 (没有 token 时是正常的)
- `403` - 权限不足 (某些情况下是正常的)
- `404` - 资源不存在 (某些测试中是正常的)
- `409` - 资源冲突
- `422` - 数据验证失败

## 使用建议

### 1. 开发环境测试

在开发环境中，你可以直接运行测试脚本来验证 API 是否正常工作：

```bash
# 启动 Karmada Dashboard API 服务
cd /path/to/karmada-dashboard
make run-api

# 在另一个终端运行测试
./agent/backend/API/karmada_api_test.sh --url http://localhost:8000
```

### 2. CI/CD 集成

可以将测试脚本集成到 CI/CD 流水线中：

```yaml
# GitHub Actions 示例
- name: Test API
  run: |
    python agent/backend/API/karmada_api_test.py --url ${{ env.API_URL }}
```

### 3. 监控和告警

可以定期运行测试脚本来监控 API 健康状态：

```bash
# 定时任务示例
*/5 * * * * /path/to/karmada_api_test.sh --url http://api.example.com >> /var/log/api_test.log 2>&1
```

## 自定义测试

### 添加新的测试用例

如果需要测试新的 API 接口，可以：

1. **Python 脚本**: 在 `KarmadaAPITester` 类中添加新的测试方法
2. **Shell 脚本**: 添加新的测试函数

示例（Python）：

```python
def test_new_api(self):
    """新接口测试"""
    logger.info("开始新接口测试...")
    
    try:
        response = self.make_request("GET", "/new-endpoint")
        success = response.status_code in [200, 401, 403]
        self.log_test_result("新接口测试", success, f"状态码: {response.status_code}")
    except Exception as e:
        self.log_test_result("新接口测试", False, str(e))
```

### 修改预期状态码

如果某个接口的预期行为发生变化，可以修改对应测试中的预期状态码列表。

## 故障排除

### 常见问题

1. **连接被拒绝**
   - 确认 API 服务是否已启动
   - 检查 URL 和端口是否正确

2. **认证失败**
   - 确认 token 是否有效
   - 检查 token 格式是否正确

3. **权限不足**
   - 确认用户是否有相应权限
   - 检查角色绑定配置

4. **请求超时**
   - 检查网络连接
   - 适当增加超时时间

### 调试模式

使用 `--verbose` 参数可以看到详细的请求和响应信息，有助于问题排查。

## 贡献

如果你发现测试脚本的问题或需要添加新的测试用例，欢迎提交 PR 或 Issue。

## 更新日志

- **v1.0.0** (2024年): 初始版本
  - 包含完整的 API 测试覆盖
  - 支持 Python 和 Shell 两种实现
  - 提供详细的 API 文档 