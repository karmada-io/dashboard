#!/bin/bash
# 构建Karmada Dashboard的两个镜像：API和Web
# 优先使用本地镜像构建模式

set -e

# 设置环境变量
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
VERSION=${VERSION:-"latest"}
REGISTRY=${REGISTRY:-"docker.io/karmada"}
PUSH=${PUSH:-"false"}  # 是否推送镜像到仓库

# 使用帮助
function show_help() {
  echo "用法: $0 [选项]"
  echo "选项:"
  echo "  -v, --version VERSION    指定镜像版本，默认为 'latest'"
  echo "  -r, --registry REGISTRY  指定镜像仓库，默认为 'docker.io/karmada'"
  echo "  -p, --push               构建后推送镜像到仓库"
  echo "  -h, --help               显示此帮助信息"
  exit 0
}

# 处理命令行参数
while [ "$1" != "" ]; do
  case $1 in
    -v | --version )  shift
                      VERSION=$1
                      ;;
    -r | --registry ) shift
                      REGISTRY=$1
                      ;;
    -p | --push )     PUSH="true"
                      ;;
    -h | --help )     show_help
                      ;;
    * )               show_help
                      ;;
  esac
  shift
done

# 输出构建信息
echo "==================== Karmada Dashboard 镜像构建 ===================="
echo "版本: $VERSION"
echo "镜像仓库: $REGISTRY"
echo "推送镜像: $PUSH"
echo "=================================================================="

# 1. 构建API服务镜像
echo "开始构建 API 服务镜像..."

# 编译API二进制文件
echo "1.1 编译 karmada-dashboard-api 二进制文件"
cd $REPO_ROOT
make karmada-dashboard-api GOOS=linux

# 构建API镜像
echo "1.2 构建 karmada-dashboard-api 镜像"
if [ "$PUSH" = "true" ]; then
  # 如果需要推送，设置OUTPUT_TYPE为registry
  DOCKER_FILE=Dockerfile VERSION=$VERSION REGISTRY=$REGISTRY OUTPUT_TYPE=registry $REPO_ROOT/hack/docker.sh karmada-dashboard-api
else
  DOCKER_FILE=Dockerfile VERSION=$VERSION REGISTRY=$REGISTRY $REPO_ROOT/hack/docker.sh karmada-dashboard-api
fi

echo "API 服务镜像构建完成!"

# 2. 构建Web服务镜像
echo "开始构建 Web 服务镜像..."

# 构建前端项目
echo "2.1 构建前端项目"
cd $REPO_ROOT/ui
# 检查和安装依赖
if [ ! -d "node_modules" ]; then
  echo "安装前端依赖..."
  pnpm install
fi
# 构建前端项目
echo "编译前端项目..."
pnpm run dashboard:build
cd $REPO_ROOT

# 编译Web二进制文件
echo "2.2 编译 karmada-dashboard-web 二进制文件"
make karmada-dashboard-web GOOS=linux

# 确保dist目录存在
echo "2.3 准备前端构建产物"
mkdir -p $REPO_ROOT/_output/bin/linux/amd64/dist
# 复制前端构建产物
cp -r $REPO_ROOT/ui/apps/dashboard/dist/* $REPO_ROOT/_output/bin/linux/amd64/dist/

# 构建Web镜像
echo "2.4 构建 karmada-dashboard-web 镜像"
if [ "$PUSH" = "true" ]; then
  # 如果需要推送，设置OUTPUT_TYPE为registry
  DOCKER_FILE=build-web.Dockerfile VERSION=$VERSION REGISTRY=$REGISTRY OUTPUT_TYPE=registry $REPO_ROOT/hack/docker.sh karmada-dashboard-web
else
  DOCKER_FILE=build-web.Dockerfile VERSION=$VERSION REGISTRY=$REGISTRY $REPO_ROOT/hack/docker.sh karmada-dashboard-web
fi

echo "Web 服务镜像构建完成!"

# 输出结果信息
echo ""
echo "==================== 构建完成 ===================="
echo "API 镜像: $REGISTRY/karmada-dashboard-api:$VERSION"
echo "Web 镜像: $REGISTRY/karmada-dashboard-web:$VERSION"
if [ "$PUSH" = "true" ]; then
  echo "镜像已推送到 $REGISTRY"
else
  echo "使用 docker images 命令查看已构建的镜像"
  echo "如需推送镜像到仓库，请使用 -p 或 --push 参数"
fi
echo "=================================================" 