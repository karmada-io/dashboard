#!/bin/bash

# Karmada Dashboard API 测试脚本 (Shell/Curl版本)
# 测试 Karmada Dashboard 的所有 API 接口

# 不要在错误时立即退出，让脚本继续运行完所有测试
# set -e  # 注释掉这行

# 默认配置
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
API_VERSION="v1"
TOKEN="${TOKEN:-}"
VERBOSE="${VERBOSE:-false}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

# 增加测试计数
count_test() {
    ((TOTAL_TESTS++))
}

# 发送 HTTP 请求的通用函数
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local expected_codes="$4"
    local test_name="$5"
    
    count_test
    
    local url="${API_BASE_URL}/api/${API_VERSION}${endpoint}"
    local curl_opts=("-s" "-w" "%{http_code}" "-o" "/tmp/api_response.json")
    
    # 添加认证头
    if [[ -n "$TOKEN" ]]; then
        curl_opts+=("-H" "Authorization: Bearer $TOKEN")
        log_debug "使用认证 Token: ${TOKEN:0:20}..."
    fi
    
    # 添加 Content-Type
    curl_opts+=("-H" "Content-Type: application/json")
    
    # 添加请求方法和数据
    curl_opts+=("-X" "$method")
    if [[ -n "$data" ]]; then
        curl_opts+=("-d" "$data")
        log_debug "请求数据: $data"
    fi
    
    # 添加 URL
    curl_opts+=("$url")
    
    log_info "🚀 测试: $test_name"
    log_info "📡 请求: $method $url"
    
    if [[ "$VERBOSE" == "true" ]]; then
        log_debug "完整 curl 命令: curl ${curl_opts[*]}"
    fi
    
    # 执行请求
    local http_code
    http_code=$(curl "${curl_opts[@]}" 2>/tmp/curl_error.log || echo "000")
    
    # 读取响应内容
    local response_content=""
    if [[ -f "/tmp/api_response.json" ]]; then
        response_content=$(cat /tmp/api_response.json 2>/dev/null || echo "")
    fi
    
    # 读取 curl 错误信息
    local curl_error=""
    if [[ -f "/tmp/curl_error.log" ]]; then
        curl_error=$(cat /tmp/curl_error.log 2>/dev/null || echo "")
    fi
    
    # 显示响应信息
    log_info "📥 响应状态码: $http_code"
    
    if [[ -n "$curl_error" ]]; then
        log_error "❌ Curl 错误: $curl_error"
    fi
    
    # 显示响应内容
    if [[ -n "$response_content" ]]; then
        log_info "📄 响应内容 (完整数据):"
        if command -v jq &> /dev/null; then
            echo "$response_content" | jq . 2>/dev/null || echo "$response_content"
        else
            echo "$response_content"
        fi
    elif [[ "$http_code" != "000" ]]; then
        log_info "📄 响应内容: (空)"
    fi
    
    # 检查响应码
    if [[ "$expected_codes" == *"$http_code"* ]]; then
        log_success "$test_name ✅"
    else
        log_error "$test_name ❌ (状态码: $http_code, 期望: $expected_codes)"
    fi
    
    echo "----------------------------------------"
}

# 健康检查测试
test_health_check() {
    log_info "🔍 开始健康检查测试..."
    
    count_test
    local url="${API_BASE_URL}/health"
    
    log_info "🚀 测试: 健康检查"
    log_info "📡 请求: GET $url"
    
    local http_code
    local response_content
    
    # 执行健康检查请求
    response_content=$(curl -s -w "\n%{http_code}" "$url" 2>/tmp/curl_error.log || echo -e "\n000")
    http_code=$(echo "$response_content" | tail -n1)
    response_content=$(echo "$response_content" | head -n -1)
    
    # 读取 curl 错误信息
    local curl_error=""
    if [[ -f "/tmp/curl_error.log" ]]; then
        curl_error=$(cat /tmp/curl_error.log 2>/dev/null || echo "")
    fi
    
    log_info "📥 响应状态码: $http_code"
    
    if [[ -n "$curl_error" ]]; then
        log_error "❌ Curl 错误: $curl_error"
    fi
    
    if [[ -n "$response_content" ]]; then
        log_info "📄 响应内容 (完整数据):"
        if command -v jq &> /dev/null; then
            echo "$response_content" | jq . 2>/dev/null || echo "$response_content"
        else
            echo "$response_content"
        fi
    fi
    
    if [[ "$http_code" == "200" ]]; then
        log_success "健康检查 ✅"
    else
        log_error "健康检查 ❌ (状态码: $http_code)"
        if [[ "$http_code" == "000" ]]; then
            log_warning "💡 提示: 可能是服务未启动或网络连接问题"
        fi
    fi
    
    echo "----------------------------------------"
}

# 认证接口测试
test_authentication() {
    log_info "🔐 开始认证接口测试..."
    
    # 测试登录接口
    local login_data='{
        "username": "admin",
        "password": "admin123",
        "loginType": "token"
    }'
    make_request "POST" "/login" "$login_data" "200 401" "登录接口"
    
    # 测试用户信息接口
    make_request "GET" "/me" "" "200 401 403" "用户信息接口"
}

# 概览接口测试
test_overview() {
    log_info "📊 开始概览接口测试..."
    make_request "GET" "/overview" "" "200 401 403" "概览接口"
}

# 集群管理接口测试
test_cluster_apis() {
    log_info "🏗️ 开始集群管理接口测试..."
    
    # 测试获取集群列表
    make_request "GET" "/cluster" "" "200 401 403" "获取集群列表"
    make_request "GET" "/clusters" "" "200 401 403" "获取集群列表(复数)"
    
    # 测试获取集群详情（假设有集群）
    make_request "GET" "/cluster/master" "" "200 401 403 404" "获取集群详情"
    
    # 测试创建集群接口
    local cluster_data='{
        "memberClusterName": "master",
        "memberClusterNamespace": "karmada-cluster",
        "memberClusterKubeConfig": "# fake kubeconfig for testing",
        "syncMode": "Push"
    }'
    make_request "POST" "/cluster" "$cluster_data" "200 400 401 403 422" "创建集群接口"
    
    # 测试更新集群接口
    local update_data='{
        "labels": [{"key": "test", "value": "test"}],
        "taints": []
    }'
    make_request "PUT" "/cluster/master" "$update_data" "200 400 401 403 404" "更新集群接口"
    
    # 测试删除集群接口
    # make_request "DELETE" "/cluster/master" "" "200 401 403 404" "删除集群接口"
}

# 命名空间接口测试
test_namespace_apis() {
    log_info "📁 开始命名空间接口测试..."
    
    # 测试获取命名空间列表
    make_request "GET" "/namespace" "" "200 401 403" "获取命名空间列表"
    
    # 测试获取命名空间详情
    make_request "GET" "/namespace/default" "" "200 401 403 404" "获取命名空间详情"
    
    # 测试获取命名空间事件
    make_request "GET" "/namespace/default/event" "" "200 401 403 404" "获取命名空间事件"
    
    # 测试创建命名空间
    local ns_data='{
        "name": "test-namespace",
        "skipAutoPropagation": false
    }'
    make_request "POST" "/namespace" "$ns_data" "200 201 400 401 403 409 422" "创建命名空间接口"
}

# 部署接口测试
test_deployment_apis() {
    log_info "🚀 开始部署接口测试..."
    
    # 测试获取部署列表
    make_request "GET" "/deployment" "" "200 401 403" "获取部署列表"
    make_request "GET" "/deployment/default" "" "200 401 403 404" "获取指定命名空间部署列表"
    
    # 测试获取部署详情
    make_request "GET" "/deployment/default/test-deployment" "" "200 401 403 404" "获取部署详情"
    
    # 测试获取部署事件
    make_request "GET" "/deployment/default/test-deployment/event" "" "200 401 403 404" "获取部署事件"
    
    # 测试创建部署
    local deployment_data='{
        "namespace": "default",
        "content": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: test-deployment\n  namespace: default\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: test-app\n  template:\n    metadata:\n      labels:\n        app: test-app\n    spec:\n      containers:\n      - name: test-container\n        image: nginx:latest\n        ports:\n        - containerPort: 80"
    }'
    make_request "POST" "/deployment" "$deployment_data" "200 201 400 401 403 409 422" "创建部署接口"
}

# 服务接口测试
test_service_apis() {
    log_info "🌐 开始服务接口测试..."
    
    # 测试获取服务列表
    make_request "GET" "/service" "" "200 401 403" "获取服务列表"
    make_request "GET" "/service/default" "" "200 401 403 404" "获取指定命名空间服务列表"
    
    # 测试获取服务详情
    make_request "GET" "/service/default/test-service" "" "200 401 403 404" "获取服务详情"
    
    # 测试获取服务事件
    make_request "GET" "/service/default/test-service/event" "" "200 401 403 404" "获取服务事件"
}

# 策略接口测试
test_policy_apis() {
    log_info "📋 开始策略接口测试..."
    
    local policies=("propagationpolicy" "clusterpropagationpolicy" "overridepolicy" "clusteroverridepolicy")
    
    for policy in "${policies[@]}"; do
        # 测试获取策略列表
        make_request "GET" "/$policy" "" "200 401 403" "获取${policy}列表"
        
        # 测试删除策略
        local delete_data='{"name": "test-policy", "namespace": "default"}'
        make_request "DELETE" "/$policy" "$delete_data" "200 400 401 403 404 422" "删除${policy}接口"
    done
}

# 工作负载接口测试
test_workload_apis() {
    log_info "⚙️ 开始工作负载接口测试..."
    
    local workloads=("daemonset" "statefulset" "job" "cronjob" "ingress")
    
    for workload in "${workloads[@]}"; do
        # 测试获取工作负载列表
        make_request "GET" "/$workload" "" "200 401 403" "获取${workload}列表"
        make_request "GET" "/$workload/default" "" "200 401 403 404" "获取指定命名空间${workload}列表"
    done
}

# 配置接口测试
test_config_apis() {
    log_info "🔧 开始配置接口测试..."
    
    local configs=("configmap" "secret")
    
    for config in "${configs[@]}"; do
        # 测试获取配置列表
        make_request "GET" "/$config" "" "200 401 403" "获取${config}列表"
        make_request "GET" "/$config/default" "" "200 401 403 404" "获取指定命名空间${config}列表"
    done
}

# 非结构化资源接口测试
test_unstructured_apis() {
    log_info "🔀 开始非结构化资源接口测试..."
    
    # 测试获取非结构化资源
    make_request "GET" "/_raw/pod/namespace/default/name/test-pod" "" "200 401 403 404" "获取非结构化资源"
    
    # 测试删除非结构化资源
    make_request "DELETE" "/_raw/pod/namespace/default/name/test-pod" "" "200 401 403 404" "删除非结构化资源"
    
    # 测试集群级别资源
    make_request "GET" "/_raw/node/name/test-node" "" "200 401 403 404" "获取集群级别资源"
}

# 成员集群接口测试
test_member_cluster_apis() {
    log_info "🌍 开始成员集群接口测试..."
    
    # 使用实际存在的集群名称
    local cluster_names=("master" "branch")
    
    for cluster_name in "${cluster_names[@]}"; do
        log_info "🔍 测试集群: $cluster_name"
        
        # 测试成员集群节点接口
        make_request "GET" "/member/$cluster_name/nodes" "" "200 401 403 404" "获取成员集群${cluster_name}节点列表"
        
        # 测试成员集群节点详情
        make_request "GET" "/member/$cluster_name/nodes/test-node" "" "200 401 403 404" "获取成员集群${cluster_name}节点详情"
        
        # 测试成员集群服务接口
        make_request "GET" "/member/$cluster_name/service" "" "200 401 403 404" "获取成员集群${cluster_name}服务列表"
        make_request "GET" "/member/$cluster_name/services" "" "200 401 403 404" "获取成员集群${cluster_name}服务列表(复数)"
        
        # 测试成员集群指定命名空间服务
        make_request "GET" "/member/$cluster_name/service/default" "" "200 401 403 404" "获取成员集群${cluster_name}默认命名空间服务"
        
        # 测试成员集群服务详情
        make_request "GET" "/member/$cluster_name/service/default/kubernetes" "" "200 401 403 404" "获取成员集群${cluster_name}服务详情"
        
        # 如果有其他成员集群相关的路由，也可以在这里测试
        # 例如: deployment, namespace, pod 等
    done
}

# 调度接口测试
test_scheduling_apis() {
    log_info "📋 开始调度接口测试..."
    
    # 测试工作负载调度信息
    local workload_types=("Deployment" "StatefulSet" "DaemonSet")
    
    for workload_type in "${workload_types[@]}"; do
        # 测试获取工作负载调度信息
        make_request "GET" "/workloads/default/test-deployment/scheduling?kind=$workload_type" "" "200 401 403 404" "获取${workload_type}调度信息"
    done
    
    # 测试实际存在的deployment调度信息
    make_request "GET" "/workloads/default/test-deployment/scheduling" "" "200 401 403 404" "获取test-deployment调度信息"
}

# 显示帮助信息
show_help() {
    cat << EOF
Karmada Dashboard API 测试脚本

用法: $0 [选项]

选项:
    --url URL           API 基础 URL (默认: http://localhost:8000)
    --token TOKEN       认证 token
    --verbose           详细输出模式
    --help              显示此帮助信息

环境变量:
    API_BASE_URL        API 基础 URL
    TOKEN               认证 token
    VERBOSE             详细输出模式 (true/false)

示例:
    $0 --url http://localhost:8000 --verbose
    $0 --token your-jwt-token
    
    # 使用环境变量
    API_BASE_URL=http://localhost:8000 TOKEN=your-token VERBOSE=true $0

EOF
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            API_BASE_URL="$2"
            shift 2
            ;;
        --token)
            TOKEN="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 主测试函数
run_all_tests() {
    local start_time=$(date +%s)
    
    log_info "🎯 开始运行 Karmada Dashboard API 测试..."
    log_info "🌐 API 基础 URL: $API_BASE_URL"
    
    if [[ -n "$TOKEN" ]]; then
        log_info "🔐 使用认证 Token: ${TOKEN:0:20}..."
    else
        log_warning "⚠️  未提供认证 Token，某些接口可能返回 401/403"
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "🔍 详细模式已启用"
    fi
    
    echo "===================================================="
    
    # 执行所有测试，即使某个测试失败也继续执行
    test_health_check > health.log || true
    test_authentication > authentication.log || true
    test_overview > overview.log || true
    test_cluster_apis > cluster.log || true
    test_namespace_apis > namespace.log || true
    test_deployment_apis > deployment.log || true
    test_service_apis > service.log || true
    test_policy_apis > policy.log || true
    test_workload_apis > workload.log || true
    test_config_apis > config.log || true
    test_unstructured_apis > unstructured.log || true
    test_member_cluster_apis > member.log || true
    test_scheduling_apis > scheduling.log || true
    
    echo "===================================================="
    
    # 计算耗时
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 输出测试结果汇总
    log_info "📊 测试结果汇总:"
    echo "  📈 总测试数: $TOTAL_TESTS"
    echo "  ✅ 通过数: $PASSED_TESTS"
    echo "  ❌ 失败数: $FAILED_TESTS"
    echo "  ⏱️  测试耗时: ${duration} 秒"
    
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo "  📊 成功率: ${success_rate}%"
        
        if [[ $success_rate -eq 100 ]]; then
            log_success "🎉 所有测试通过！"
        elif [[ $success_rate -ge 80 ]]; then
            log_warning "⚠️  大部分测试通过，少数失败"
        else
            log_error "❌ 多个测试失败，需要检查服务状态"
        fi
    fi
    
    echo "===================================================="
    
    # 清理临时文件
    rm -f /tmp/api_response.json /tmp/curl_error.log
    
    # 根据测试结果设置退出码
    if [[ $FAILED_TESTS -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "⚠️  jq 未安装，JSON 响应将以原始格式显示"
        log_info "💡 安装 jq 可获得更好的 JSON 格式化显示: sudo yum install jq 或 sudo apt install jq"
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "❌ 缺少必要的依赖: ${missing_deps[*]}"
        echo "请安装这些工具后再运行测试"
        exit 1
    fi
}

# 主程序入口
main() {
    # 检查依赖
    check_dependencies
    
    # 显示启动信息
    echo "=================================================="
    echo "🚀 Karmada Dashboard API 测试脚本"
    echo "📅 启动时间: $(date)"
    echo "🖥️  运行环境: $(uname -s) $(uname -r)"
    echo "=================================================="
    
    # 运行测试
    run_all_tests
}

# 如果脚本被直接执行，则运行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 