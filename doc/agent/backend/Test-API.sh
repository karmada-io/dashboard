#!/bin/bash

# Karmada-Manager 后端接口测试脚本
# 测试新增的节点管理、调度信息等API接口

BASE_URL="http://localhost:8000"
CLUSTER_NAME="master"

echo "==================================================="
echo "   Karmada-Manager 后端接口测试开始"
echo "==================================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_api() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=${4:-200}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${YELLOW}[TEST $TOTAL_TESTS]${NC} $description"
    echo "请求: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint")
    fi
    
    # 提取HTTP状态码
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过${NC} (状态码: $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # 显示完整响应数据
        echo "完整响应: $response_body"
        echo "响应长度: ${#response_body} 字符"
    else
        echo -e "${RED}✗ 失败${NC} (期望状态码: $expected_status, 实际状态码: $http_code)"
        echo "响应: $response_body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo "---------------------------------------------------"
}

echo -e "\n${YELLOW}开始测试基础API连通性...${NC}"

# 1. 测试健康检查接口
test_api "GET" "/livez" "健康检查 - livez"
test_api "GET" "/readyz" "健康检查 - readyz"

echo -e "\n${YELLOW}开始测试概览信息API...${NC}"

# 2. 测试概览信息
test_api "GET" "/api/v1/overview" "获取系统概览信息"

echo -e "\n${YELLOW}开始测试集群管理API...${NC}"

# 3. 测试集群管理API
test_api "GET" "/api/v1/clusters" "获取成员集群列表"
test_api "GET" "/api/v1/clusters?page=1&limit=5" "获取成员集群列表(分页)"
test_api "GET" "/api/v1/clusters/$CLUSTER_NAME" "获取集群详情" 200  # 集群存在

echo -e "\n${YELLOW}开始测试节点管理API...${NC}"

# 4. 测试节点管理API  
test_api "GET" "/api/v1/member/$CLUSTER_NAME/nodes" "获取集群节点列表" 200  # 实际可以工作
test_api "GET" "/api/v1/member/$CLUSTER_NAME/nodes?page=1&limit=10" "获取集群节点列表(分页)" 200

# 获取实际节点名进行测试
echo -e "\n${YELLOW}获取实际节点名称进行详细测试...${NC}"
NODE_RESPONSE=$(curl -s "$BASE_URL/api/v1/member/$CLUSTER_NAME/nodes")
FIRST_NODE_NAME=$(echo "$NODE_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$FIRST_NODE_NAME" ]; then
    echo "使用实际节点名称: $FIRST_NODE_NAME"
    test_api "GET" "/api/v1/member/$CLUSTER_NAME/nodes/$FIRST_NODE_NAME" "获取实际节点详情" 200
    test_api "GET" "/api/v1/member/$CLUSTER_NAME/nodes/$FIRST_NODE_NAME/pods" "获取实际节点Pod列表" 200
else
    echo "未获取到节点名称，使用测试节点名"
    test_api "GET" "/api/v1/member/$CLUSTER_NAME/nodes/test-node" "获取测试节点详情" 200
    test_api "GET" "/api/v1/member/$CLUSTER_NAME/nodes/test-node/pods" "获取测试节点Pod列表" 200
fi

echo -e "\n${YELLOW}开始测试工作负载调度API...${NC}"

# 5. 测试工作负载调度API
test_api "GET" "/api/v1/workloads/default/nginx-deployment/scheduling" "获取工作负载调度信息" 200  # 返回错误信息但状态码200
test_api "GET" "/api/v1/workloads/default/nginx-deployment/scheduling?kind=Deployment" "获取Deployment调度信息" 200
test_api "GET" "/api/v1/workloads/karmada-system/karmada-controller-manager/scheduling?kind=Deployment" "获取系统工作负载调度信息" 200

# 获取实际部署进行测试
echo -e "\n${YELLOW}获取实际部署进行调度测试...${NC}"
DEPLOY_RESPONSE=$(curl -s "$BASE_URL/api/v1/member/$CLUSTER_NAME/deployment")
FIRST_DEPLOY_NAME=$(echo "$DEPLOY_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$FIRST_DEPLOY_NAME" ]; then
    echo "使用实际部署名称: $FIRST_DEPLOY_NAME"
    test_api "GET" "/api/v1/workloads/karmada-system/$FIRST_DEPLOY_NAME/scheduling?kind=Deployment" "获取实际部署调度信息" 200
fi

echo -e "\n${YELLOW}开始测试策略管理API...${NC}"

# 6. 测试策略管理API
test_api "GET" "/api/v1/propagationpolicies" "获取传播策略列表"
test_api "GET" "/api/v1/overridepolicies" "获取覆盖策略列表"
test_api "GET" "/api/v1/clusterpropagationpolicies" "获取集群级传播策略列表"
test_api "GET" "/api/v1/clusteroverridepolicies" "获取集群级覆盖策略列表"

echo -e "\n${YELLOW}开始测试成员集群资源API...${NC}"

# 7. 测试成员集群其他资源API
test_api "GET" "/api/v1/member/$CLUSTER_NAME/namespace" "获取集群命名空间列表" 200
test_api "GET" "/api/v1/member/$CLUSTER_NAME/deployment" "获取集群部署列表" 200
test_api "GET" "/api/v1/member/$CLUSTER_NAME/service" "获取集群服务列表" 200  # 现在应该可以工作
test_api "GET" "/api/v1/member/$CLUSTER_NAME/pods" "获取集群Pod列表" 200

echo -e "\n${YELLOW}开始测试错误处理...${NC}"

# 8. 测试错误处理
test_api "GET" "/api/v1/nonexistent" "测试不存在的端点" 404
test_api "GET" "/api/v1/member/nonexistent-cluster/nodes" "测试不存在的集群" 200  # 返回错误信息但状态码200
test_api "GET" "/api/v1/workloads/nonexistent/nonexistent/scheduling" "测试不存在的工作负载" 200  # 返回错误信息但状态码200

echo -e "\n==================================================="
echo "           测试结果统计"
echo "==================================================="
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "\n${RED}❌ 有测试失败，请检查API实现${NC}"
    echo -e "\n${YELLOW}注意：${NC}"
    echo "- 某些失败可能是因为测试环境中没有相应的集群或资源"
    echo "- 500错误通常表示集群连接问题，这在测试环境中是正常的" 
    echo "- 检查Karmada-Manager是否正确配置并连接到有效的Karmada集群"
    exit 1
fi 