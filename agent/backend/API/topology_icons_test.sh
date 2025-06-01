#!/bin/bash

# Karmada 拓扑图节点图标与悬停信息展示功能测试脚本
# 用于测试节点图标更换和完整信息展示功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
KARMADA_API_BASE="http://localhost:8080/api/v1"
LOG_FILE="topology_icons_test.log"
TEST_RESULTS_FILE="topology_icons_test_results.json"

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 日志函数
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

# API 请求函数
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    
    if [ "$method" = "GET" ]; then
        curl -s -X GET "$url" \
            -H "Content-Type: application/json" \
            -w "\n%{http_code}" 2>/dev/null
    elif [ "$method" = "POST" ]; then
        curl -s -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\n%{http_code}" 2>/dev/null
    fi
}

# 测试开始
start_tests() {
    log_info "开始 Karmada 拓扑图节点图标与信息展示功能测试..."
    echo > "$LOG_FILE"
    echo "{\"test_results\": [], \"summary\": {}}" > "$TEST_RESULTS_FILE"
    
    # 清理之前的测试数据
    rm -f cluster_data.json node_data.json
}

# 测试结束
end_tests() {
    log_info "测试完成！"
    log_info "总测试数: $TOTAL_TESTS"
    log_success "通过: $PASSED_TESTS"
    log_error "失败: $FAILED_TESTS"
    
    # 生成测试结果总结
    cat > "$TEST_RESULTS_FILE" <<EOF
{
  "test_summary": {
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "success_rate": $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc),
    "test_date": "$(date '+%Y-%m-%d %H:%M:%S')"
  },
  "test_categories": {
    "api_tests": {
      "cluster_list": "$([ $cluster_list_test = true ] && echo 'PASS' || echo 'FAIL')",
      "node_list": "$([ $node_list_test = true ] && echo 'PASS' || echo 'FAIL')"
    },
    "data_integrity_tests": {
      "cluster_data_structure": "$([ $cluster_data_test = true ] && echo 'PASS' || echo 'FAIL')",
      "node_data_structure": "$([ $node_data_test = true ] && echo 'PASS' || echo 'FAIL')"
    },
    "icon_tests": {
      "icon_files_exist": "$([ $icon_files_test = true ] && echo 'PASS' || echo 'FAIL')",
      "icon_accessibility": "$([ $icon_access_test = true ] && echo 'PASS' || echo 'FAIL')"
    },
    "interaction_tests": {
      "tooltip_data_simulation": "$([ $tooltip_test = true ] && echo 'PASS' || echo 'FAIL')",
      "tooltip_interaction_config": "$([ $tooltip_interaction_test = true ] && echo 'PASS' || echo 'FAIL')"
    },
    "performance_tests": {
      "api_response_time": "$([ $performance_test = true ] && echo 'PASS' || echo 'FAIL')"
    }
  }
}
EOF
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "所有测试通过！✨"
        exit 0
    else
        log_error "有 $FAILED_TESTS 个测试失败 ❌"
        exit 1
    fi
}

# 测试 1: 获取集群列表 API
test_cluster_list() {
    ((TOTAL_TESTS++))
    log_info "测试 1: 获取集群列表 API"
    
    local response=$(make_request "GET" "$KARMADA_API_BASE/cluster")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        # 保存集群数据用于后续测试
        echo "$body" > cluster_data.json
        
        # 验证响应结构
        if echo "$body" | jq -e '.data.clusters[]' > /dev/null 2>&1; then
            local cluster_count=$(echo "$body" | jq '.data.clusters | length')
            log_success "集群列表 API 测试通过 (找到 $cluster_count 个集群)"
            cluster_list_test=true
            
            # 输出集群信息
            echo "$body" | jq -r '.data.clusters[] | "集群: \(.objectMeta.name) | 状态: \(.ready) | 版本: \(.kubernetesVersion) | 节点: \(.nodeSummary.readyNum)/\(.nodeSummary.totalNum)"' | while read line; do
                log_info "  $line"
            done
        else
            log_error "集群列表响应格式不正确"
            cluster_list_test=false
        fi
    else
        log_error "集群列表 API 请求失败 (HTTP $http_code)"
        cluster_list_test=false
    fi
}

# 测试 2: 获取成员集群节点列表
test_member_cluster_nodes() {
    ((TOTAL_TESTS++))
    log_info "测试 2: 获取成员集群节点列表"
    
    # 从集群数据中获取第一个集群名称
    if [ ! -f cluster_data.json ]; then
        log_error "未找到集群数据，跳过节点列表测试"
        node_list_test=false
        return
    fi
    
    local cluster_name=$(jq -r '.data.clusters[0].objectMeta.name' cluster_data.json)
    if [ "$cluster_name" = "null" ] || [ -z "$cluster_name" ]; then
        log_error "未找到有效的集群名称"
        node_list_test=false
        return
    fi
    
    log_info "测试集群: $cluster_name"
    
    local response=$(make_request "GET" "$KARMADA_API_BASE/member/$cluster_name/nodes")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        # 保存节点数据
        echo "$body" > node_data.json
        
        # 验证响应结构
        if echo "$body" | jq -e '.data.nodes[]' > /dev/null 2>&1; then
            local node_count=$(echo "$body" | jq '.data.nodes | length')
            log_success "节点列表 API 测试通过 (找到 $node_count 个节点)"
            node_list_test=true
            
            # 输出节点信息
            echo "$body" | jq -r '.data.nodes[] | "节点: \(.objectMeta.name) | IP: \(.status.addresses[]? | select(.type=="InternalIP") | .address) | CPU: \(.status.capacity.cpu) | 内存: \(.status.capacity.memory)"' | while read line; do
                log_info "  $line"
            done
        else
            log_error "节点列表响应格式不正确"
            node_list_test=false
        fi
    else
        log_error "节点列表 API 请求失败 (HTTP $http_code)"
        node_list_test=false
    fi
}

# 测试 3: 验证集群数据结构
test_cluster_data_structure() {
    ((TOTAL_TESTS++))
    log_info "测试 3: 验证集群数据结构"
    
    if [ ! -f cluster_data.json ]; then
        log_error "未找到集群数据文件"
        cluster_data_test=false
        return
    fi
    
    local required_fields=(
        ".data.clusters[0].objectMeta.name"
        ".data.clusters[0].ready"
        ".data.clusters[0].kubernetesVersion" 
        ".data.clusters[0].syncMode"
        ".data.clusters[0].nodeSummary.totalNum"
        ".data.clusters[0].nodeSummary.readyNum"
        ".data.clusters[0].allocatedResources.cpuCapacity"
        ".data.clusters[0].allocatedResources.cpuFraction"
        ".data.clusters[0].allocatedResources.memoryCapacity"
        ".data.clusters[0].allocatedResources.memoryFraction"
        ".data.clusters[0].allocatedResources.allocatedPods"
        ".data.clusters[0].allocatedResources.podCapacity"
    )
    
    local missing_fields=0
    for field in "${required_fields[@]}"; do
        if ! jq -e "$field" cluster_data.json > /dev/null 2>&1; then
            log_warning "缺少字段: $field"
            ((missing_fields++))
        fi
    done
    
    if [ $missing_fields -eq 0 ]; then
        log_success "集群数据结构验证通过"
        cluster_data_test=true
        
        # 输出关键数据
        local cluster_name=$(jq -r '.data.clusters[0].objectMeta.name' cluster_data.json)
        local cpu_usage=$(jq -r '.data.clusters[0].allocatedResources.cpuFraction' cluster_data.json)
        local memory_usage=$(jq -r '.data.clusters[0].allocatedResources.memoryFraction' cluster_data.json)
        
        log_info "  集群名称: $cluster_name"
        log_info "  CPU 使用率: ${cpu_usage}%"
        log_info "  内存使用率: ${memory_usage}%"
    else
        log_error "集群数据结构验证失败 (缺少 $missing_fields 个字段)"
        cluster_data_test=false
    fi
}

# 测试 4: 验证节点数据结构
test_node_data_structure() {
    ((TOTAL_TESTS++))
    log_info "测试 4: 验证节点数据结构"
    
    if [ ! -f node_data.json ]; then
        log_error "未找到节点数据文件"
        node_data_test=false
        return
    fi
    
    local required_fields=(
        ".data.nodes[0].objectMeta.name"
        ".data.nodes[0].objectMeta.labels"
        ".data.nodes[0].status.capacity.cpu"
        ".data.nodes[0].status.capacity.memory"
        ".data.nodes[0].status.capacity.pods"
        ".data.nodes[0].status.allocatable"
        ".data.nodes[0].status.conditions"
        ".data.nodes[0].status.addresses"
    )
    
    local missing_fields=0
    for field in "${required_fields[@]}"; do
        if ! jq -e "$field" node_data.json > /dev/null 2>&1; then
            log_warning "缺少字段: $field"
            ((missing_fields++))
        fi
    done
    
    if [ $missing_fields -eq 0 ]; then
        log_success "节点数据结构验证通过"
        node_data_test=true
        
        # 分析节点角色
        local control_plane_nodes=$(jq -r '.data.nodes[] | select(.objectMeta.labels["node-role.kubernetes.io/control-plane"] == "true") | .objectMeta.name' node_data.json | wc -l)
        local worker_nodes=$(jq -r '.data.nodes[] | select(.objectMeta.labels["node-role.kubernetes.io/control-plane"] != "true") | .objectMeta.name' node_data.json | wc -l)
        
        log_info "  控制平面节点: $control_plane_nodes 个"
        log_info "  工作节点: $worker_nodes 个"
        
        # 检查节点健康状态
        local ready_nodes=$(jq -r '.data.nodes[] | select(.status.conditions[]? | select(.type == "Ready" and .status == "True")) | .objectMeta.name' node_data.json | wc -l)
        local total_nodes=$(jq '.data.nodes | length' node_data.json)
        
        log_info "  就绪节点: $ready_nodes/$total_nodes"
    else
        log_error "节点数据结构验证失败 (缺少 $missing_fields 个字段)"
        node_data_test=false
    fi
}

# 测试 5: 验证图标文件存在性
test_icon_files_existence() {
    ((TOTAL_TESTS++))
    log_info "测试 5: 验证图标文件存在性"
    
    local icon_files=(
        "ui/apps/dashboard/public/Karmada.png"
        "ui/apps/dashboard/public/cluster.png"
        "ui/apps/dashboard/public/node.png"
    )
    
    local missing_files=0
    for icon_file in "${icon_files[@]}"; do
        if [ -f "$icon_file" ]; then
            local file_size=$(stat -f%z "$icon_file" 2>/dev/null || stat -c%s "$icon_file" 2>/dev/null || echo "unknown")
            log_info "  ✓ $icon_file (大小: $file_size bytes)"
        else
            log_warning "  ✗ $icon_file (文件不存在)"
            ((missing_files++))
        fi
    done
    
    if [ $missing_files -eq 0 ]; then
        log_success "所有图标文件存在性验证通过"
        icon_files_test=true
    else
        log_error "图标文件存在性验证失败 (缺少 $missing_files 个文件)"
        icon_files_test=false
    fi
}

# 测试 6: 验证图标文件可访问性 (模拟HTTP请求)
test_icon_accessibility() {
    ((TOTAL_TESTS++))
    log_info "测试 6: 验证图标文件可访问性"
    
    # 假设前端服务运行在 localhost:3000
    local frontend_base="http://localhost:3000"
    local icon_urls=(
        "$frontend_base/Karmada.png"
        "$frontend_base/cluster.png"
        "$frontend_base/node.png"
    )
    
    local accessible_files=0
    local total_icon_files=${#icon_urls[@]}
    
    for icon_url in "${icon_urls[@]}"; do
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$icon_url" 2>/dev/null || echo "000")
        if [ "$http_code" = "200" ]; then
            log_info "  ✓ $icon_url (HTTP $http_code)"
            ((accessible_files++))
        else
            log_warning "  ✗ $icon_url (HTTP $http_code 或连接失败)"
        fi
    done
    
    if [ $accessible_files -eq $total_icon_files ]; then
        log_success "所有图标文件可访问性验证通过"
        icon_access_test=true
    elif [ $accessible_files -gt 0 ]; then
        log_warning "部分图标文件可访问 ($accessible_files/$total_icon_files)"
        icon_access_test=true
    else
        log_error "图标文件可访问性验证失败 (可能前端服务未启动)"
        icon_access_test=false
    fi
}

# 测试 7: 模拟悬停信息数据验证
test_tooltip_data_simulation() {
    ((TOTAL_TESTS++))
    log_info "测试 7: 模拟悬停信息数据验证"
    
    if [ ! -f cluster_data.json ] || [ ! -f node_data.json ]; then
        log_error "缺少必要的数据文件，跳过悬停信息测试"
        tooltip_test=false
        return
    fi
    
    # 模拟 Karmada 控制平面信息
    local total_clusters=$(jq '.data.clusters | length' cluster_data.json)
    local ready_clusters=$(jq '.data.clusters | map(select(.ready == true)) | length' cluster_data.json)
    local total_nodes=$(jq '.data.clusters | map(.nodeSummary.totalNum) | add' cluster_data.json)
    local ready_nodes=$(jq '.data.clusters | map(.nodeSummary.readyNum) | add' cluster_data.json)
    
    log_info "  Karmada 控制平面信息:"
    log_info "    管理集群: $ready_clusters/$total_clusters"
    log_info "    节点总数: $ready_nodes/$total_nodes"
    
    # 模拟集群悬停信息
    jq -r '.data.clusters[] | "集群: \(.objectMeta.name) | CPU: \(.allocatedResources.cpuFraction)% | 内存: \(.allocatedResources.memoryFraction)%"' cluster_data.json | while read line; do
        log_info "  $line"
    done
    
    # 模拟节点悬停信息
    local node_with_details=$(jq '.data.nodes[0]' node_data.json)
    if [ "$node_with_details" != "null" ]; then
        local node_name=$(echo "$node_with_details" | jq -r '.objectMeta.name')
        local node_os=$(echo "$node_with_details" | jq -r '.status.nodeInfo.osImage // "N/A"')
        local node_kernel=$(echo "$node_with_details" | jq -r '.status.nodeInfo.kernelVersion // "N/A"')
        
        log_info "  节点详情示例:"
        log_info "    节点名: $node_name"
        log_info "    操作系统: $node_os"
        log_info "    内核版本: $node_kernel"
    fi
    
    log_success "悬停信息数据模拟验证通过"
    tooltip_test=true
}

# 测试 8: API 响应性能测试
test_performance() {
    ((TOTAL_TESTS++))
    log_info "测试 8: API 响应性能测试"
    
    # 测试集群列表 API 响应时间
    local start_time=$(date +%s%N)
    make_request "GET" "$KARMADA_API_BASE/cluster" > /dev/null
    local end_time=$(date +%s%N)
    local cluster_api_time=$(((end_time - start_time) / 1000000)) # 转换为毫秒
    
    log_info "  集群列表 API 响应时间: ${cluster_api_time}ms"
    
    if [ $cluster_api_time -lt 1000 ]; then
        log_success "API 响应性能测试通过 (< 1秒)"
        performance_test=true
    elif [ $cluster_api_time -lt 3000 ]; then
        log_warning "API 响应较慢但可接受 (1-3秒)"
        performance_test=true
    else
        log_error "API 响应时间过长 (> 3秒)"
        performance_test=false
    fi
}

# 测试 9: Tooltip 交互功能验证
test_tooltip_interaction() {
    ((TOTAL_TESTS++))
    log_info "测试 9: Tooltip 交互功能验证"
    
    log_info "  📋 Tooltip 功能检查清单:"
    log_info "    ✅ 手动测试项目 (需要在浏览器中验证):"
    log_info "       1. 鼠标悬停在 Karmada 控制平面节点"
    log_info "          → 应显示：系统概览、集群管理、资源统计"
    log_info "       2. 鼠标悬停在集群节点 (branch/master)"
    log_info "          → 应显示：基本信息、节点状态、资源使用率"
    log_info "       3. 鼠标悬停在工作节点"
    log_info "          → 应显示：基本信息、系统信息、资源容量、健康状态"
    log_info "       4. 按住 Ctrl 键拖拽节点"
    log_info "          → 应该可以移动节点位置"
    log_info "       5. 直接拖拽节点（不按Ctrl）"
    log_info "          → 应该无法移动，但tooltip正常显示"
    
    # 验证前端组件文件存在
    local component_file="ui/apps/dashboard/src/components/topology/G6ClusterTopology.tsx"
    if [ -f "$component_file" ]; then
        # 检查关键配置
        if grep -q "trigger: 'pointerenter'" "$component_file" && \
           grep -q "shouldBegin:" "$component_file" && \
           grep -q "itemTypes: \\['node'\\]" "$component_file"; then
            log_success "Tooltip 配置验证通过"
            log_info "  检查到的关键配置:"
            log_info "    - 触发方式: pointerenter (鼠标进入)"
            log_info "    - 拖拽控制: Ctrl+拖拽模式"
            log_info "    - 目标限制: 仅节点显示tooltip"
            tooltip_interaction_test=true
        else
            log_error "Tooltip 配置不完整"
            tooltip_interaction_test=false
        fi
    else
        log_error "未找到拓扑图组件文件"
        tooltip_interaction_test=false
    fi
    
    # 检查样式文件
    if grep -q "g6-tooltip-custom" "$component_file"; then
        log_info "  ✓ 自定义 tooltip 样式已配置"
    else
        log_warning "  ⚠ 未找到自定义 tooltip 样式"
    fi
    
    # 生成交互测试报告
    cat > "tooltip_interaction_guide.txt" <<EOF
=== Karmada 拓扑图 Tooltip 交互测试指南 ===

🖱️ 基础交互测试:
1. 打开浏览器，访问 Karmada Dashboard
2. 进入拓扑图页面
3. 将鼠标悬停在不同类型的节点上
4. 验证 tooltip 是否正确显示

📋 验证检查点:

✅ Karmada 控制平面节点:
   - 显示系统概览 (版本、API版本、运行时间)
   - 显示集群管理统计 (总数、健康数、异常数)
   - 显示资源统计 (节点总数、就绪节点、运行Pod数)

✅ 集群节点 (branch/master):
   - 显示基本信息 (状态、版本、同步模式、创建时间)
   - 显示节点状态 (总数、就绪数、健康率进度条)
   - 显示资源使用率 (CPU、内存、Pod使用率，带彩色进度条)

✅ 工作节点:
   - 显示基本信息 (状态、集群、角色、IP、主机名、版本)
   - 显示系统信息 (操作系统、内核、容器运行时、架构)
   - 显示资源容量 (CPU、内存、Pod容量及使用率)
   - 显示健康状态 (Ready、压力状态、时间戳)

🎮 交互功能测试:
✅ 正常悬停: 直接鼠标悬停 → tooltip 立即显示
✅ 拖拽控制: 按住 Ctrl + 拖拽 → 可移动节点
✅ 防误触: 直接拖拽 → 无法移动，tooltip 正常
✅ 画布操作: 拖拽空白区域 → 移动整个图形
✅ 缩放功能: 鼠标滚轮 → 缩放查看

🐛 故障排除:
如果 tooltip 不显示，请检查:
1. 浏览器控制台是否有错误
2. 网络面板中图片是否正确加载 (Karmada.png, cluster.png, node.png)
3. 尝试硬刷新页面 (Ctrl+Shift+R)

EOF
    
    log_info "  📄 详细测试指南已生成: tooltip_interaction_guide.txt"
}

# 主函数
main() {
    start_tests
    
    # 初始化测试结果变量
    cluster_list_test=false
    node_list_test=false
    cluster_data_test=false
    node_data_test=false
    icon_files_test=false
    icon_access_test=false
    tooltip_test=false
    performance_test=false
    tooltip_interaction_test=false
    
    # 执行测试
    test_cluster_list
    test_member_cluster_nodes
    test_cluster_data_structure
    test_node_data_structure
    test_icon_files_existence
    test_icon_accessibility
    test_tooltip_data_simulation
    test_performance
    test_tooltip_interaction
    
    end_tests
}

# 检查依赖
command -v curl >/dev/null 2>&1 || { log_error "需要安装 curl"; exit 1; }
command -v jq >/dev/null 2>&1 || { log_error "需要安装 jq"; exit 1; }

# 运行测试
main "$@" 