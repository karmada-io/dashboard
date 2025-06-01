#!/bin/bash

# Karmada Dashboard 树形拓扑图接口测试脚本
# 测试树形拓扑图相关的API接口功能

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# API配置
BASE_URL="http://localhost:8000/api/v1"
TOKEN=""  # 如果需要的话可以设置token

# 辅助函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}$1${NC}"
}

# HTTP请求函数
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_codes=$4
    local description=$5
    
    log_info "🚀 测试: $description"
    log_info "📡 请求: $method $BASE_URL$endpoint"
    
    if [ -n "$data" ]; then
        log_info "📤 请求数据: $data"
    fi
    
    # 构建curl命令
    local curl_cmd="curl -s -w 'HTTP_STATUS:%{http_code}' -X $method"
    
    if [ -n "$TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $TOKEN'"
    fi
    
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    # 执行请求
    local response=$(eval $curl_cmd)
    local http_status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    local response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    log_info "📥 响应状态码: $http_status"
    
    # 美化JSON响应
    if command -v jq &> /dev/null; then
        local formatted_response=$(echo "$response_body" | jq . 2>/dev/null)
        if [ $? -eq 0 ]; then
            log_info "📄 响应内容 (格式化):"
            echo "$formatted_response" | head -50
            if [ $(echo "$formatted_response" | wc -l) -gt 50 ]; then
                log_warning "响应内容过长，仅显示前50行..."
            fi
        else
            log_info "📄 响应内容 (原始):"
            echo "$response_body" | head -20
        fi
    else
        log_info "📄 响应内容:"
        echo "$response_body" | head -20
    fi
    
    # 检查状态码
    if [[ " $expected_codes " =~ " $http_status " ]]; then
        log_success "$description ✅"
    else
        log_error "$description ❌ (期望: $expected_codes, 实际: $http_status)"
    fi
    
    echo "----------------------------------------"
    
    return $http_status
}

# 获取集群列表，用于后续测试
get_clusters() {
    log_info "🔍 获取集群列表用于测试..."
    local response=$(curl -s -X GET "$BASE_URL/cluster")
    if command -v jq &> /dev/null; then
        echo "$response" | jq -r '.data.clusters[].objectMeta.name' 2>/dev/null
    else
        # 简单解析，如果没有jq
        echo "$response" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g'
    fi
}

# 主测试函数
main() {
    log_header "==============================================="
    log_header "🌳 Karmada Dashboard 树形拓扑图接口测试"
    log_header "==============================================="
    
    # 1. 测试概览接口（获取控制平面信息）
    log_header "📊 第一层：Karmada 控制平面信息"
    make_request "GET" "/overview" "" "200 401 403" "获取Karmada控制平面概览"
    
    # 2. 测试集群列表接口（获取中间层信息）
    log_header "🏗️ 第二层：成员集群列表"
    make_request "GET" "/cluster" "" "200 401 403" "获取成员集群列表"
    make_request "GET" "/clusters" "" "200 401 403" "获取成员集群列表(复数)"
    
    # 3. 获取集群名称列表
    log_info "🔍 获取可用集群列表..."
    local clusters=($(get_clusters))
    log_info "发现集群: ${clusters[*]}"
    
    if [ ${#clusters[@]} -eq 0 ]; then
        log_warning "未发现任何集群，跳过节点测试"
        return
    fi
    
    # 4. 测试每个集群的节点信息（第三层）
    log_header "🖥️ 第三层：集群节点信息"
    
    for cluster in "${clusters[@]}"; do
        if [ -n "$cluster" ] && [ "$cluster" != "null" ]; then
            log_header "📍 测试集群: $cluster"
            
            # 获取集群详情
            make_request "GET" "/cluster/$cluster" "" "200 401 403 404" "获取集群${cluster}详情"
            
            # 获取集群节点列表（核心功能）
            make_request "GET" "/member/$cluster/nodes" "" "200 401 403 404" "获取集群${cluster}节点列表"
            
            # 测试分页功能
            make_request "GET" "/member/$cluster/nodes?page=1&itemsPerPage=5" "" "200 401 403 404" "获取集群${cluster}节点列表(分页)"
            
            # 测试排序功能
            make_request "GET" "/member/$cluster/nodes?sortBy=name&sortDirection=asc" "" "200 401 403 404" "获取集群${cluster}节点列表(排序)"
            
            # 获取第一个节点详情（如果存在）
            log_info "🔍 尝试获取集群 $cluster 的节点详情..."
            local node_response=$(curl -s "$BASE_URL/member/$cluster/nodes")
            if command -v jq &> /dev/null; then
                local first_node=$(echo "$node_response" | jq -r '.data.nodes[0].objectMeta.name' 2>/dev/null)
                if [ -n "$first_node" ] && [ "$first_node" != "null" ]; then
                    log_info "发现节点: $first_node"
                    make_request "GET" "/member/$cluster/nodes/$first_node" "" "200 401 403 404" "获取节点${first_node}详情"
                    make_request "GET" "/member/$cluster/nodes/$first_node/pods" "" "200 401 403 404" "获取节点${first_node}上的Pod"
                else
                    log_warning "集群 $cluster 中未发现节点"
                fi
            else
                # 尝试通用节点名称
                make_request "GET" "/member/$cluster/nodes/test-node" "" "200 401 403 404" "获取节点test-node详情"
            fi
        fi
    done
    
    # 5. 测试树形拓扑图的错误场景
    log_header "❌ 错误场景测试"
    make_request "GET" "/member/nonexistent-cluster/nodes" "" "404 400" "测试不存在的集群"
    make_request "GET" "/member/master/nodes/nonexistent-node" "" "404 400" "测试不存在的节点"
    
    # 6. 测试性能相关的接口
    log_header "⚡ 性能测试"
    log_info "测试并发请求处理能力..."
    
    # 并发测试概览接口
    for i in {1..5}; do
        make_request "GET" "/overview" "" "200 401 403" "并发测试${i}: 获取概览" &
    done
    wait
    
    # 总结
    log_header "==============================================="
    log_header "🎯 树形拓扑图测试总结"
    log_header "==============================================="
    log_success "✅ 测试完成！"
    log_info "📝 测试覆盖范围："
    log_info "   - Karmada 控制平面信息获取"
    log_info "   - 成员集群列表获取"
    log_info "   - 集群节点列表获取（支持分页、排序）"
    log_info "   - 节点详情获取"
    log_info "   - 节点Pod列表获取"
    log_info "   - 错误场景处理"
    log_info "   - 并发请求测试"
    log_info ""
    log_info "🌳 树形拓扑图层次结构："
    log_info "   第一层: Karmada 控制平面 (/overview)"
    log_info "   第二层: 成员集群 (/cluster)"
    log_info "   第三层: 集群节点 (/member/{cluster}/nodes)"
    log_info ""
    log_info "💡 前端集成建议："
    log_info "   - 实现懒加载，点击时才获取节点数据"
    log_info "   - 添加加载状态指示器"
    log_info "   - 使用颜色编码显示节点状态"
    log_info "   - 支持节点角色图标区分"
}

# 检查依赖
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装，请先安装 curl"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq 未安装，JSON 格式化将被禁用"
        log_info "建议安装 jq 以获得更好的输出格式"
    fi
}

# 脚本入口
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Karmada Dashboard 树形拓扑图接口测试脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  --token TOKEN  设置认证token"
    echo "  --url URL      设置API基础URL (默认: http://localhost:8000/api/v1)"
    echo ""
    echo "示例:"
    echo "  $0                                    # 运行所有测试"
    echo "  $0 --token abc123                     # 使用token运行测试"
    echo "  $0 --url http://karmada.example.com   # 使用自定义URL"
    exit 0
fi

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --token)
            TOKEN="$2"
            shift 2
            ;;
        --url)
            BASE_URL="$2/api/v1"
            shift 2
            ;;
        *)
            log_error "未知参数: $1"
            exit 1
            ;;
    esac
done

# 运行测试
check_dependencies
main 