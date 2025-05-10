#!/bin/bash
# 本地构建Karmada Dashboard镜像
# 不依赖网络下载包，使用本地构建方式


# 直接使用本地构建脚本来构建镜像

# 指定版本:
# ./local-build.sh -v v1.0.0
 
# 部署时，需要修改部署YAML文件中的镜像标签，从main改为您构建的标签（如dev）：
# image: karmada/karmada-dashboard-api:dev
# image: karmada/karmada-dashboard-web:dev

set -e

# 修正REPO_ROOT的计算方式，以支持从任何目录调用脚本
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
if [[ $(basename "$SCRIPT_DIR") == "hack" ]]; then
  # 如果脚本在hack目录下
  REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
else
  # 如果脚本已经在项目根目录
  REPO_ROOT="$SCRIPT_DIR"
fi

VERSION=${VERSION:-"latest"}
REGISTRY=${REGISTRY:-"docker.io/karmada"}

echo "==================== Karmada Dashboard 本地镜像构建 ===================="
echo "版本: $VERSION"
echo "镜像仓库: $REGISTRY"
echo "项目根目录: $REPO_ROOT"
echo "=================================================================="

# 创建临时构建目录
BUILD_DIR=$(mktemp -d)
echo "使用临时构建目录: $BUILD_DIR"

# 确保退出时删除临时目录
trap "rm -rf $BUILD_DIR" EXIT

# 构建API镜像
echo "1. 构建API镜像"

# 编译API二进制文件
echo "1.1 编译API二进制文件"
cd $REPO_ROOT
make karmada-dashboard-api GOOS=linux
cp -f $REPO_ROOT/_output/bin/linux/amd64/karmada-dashboard-api $BUILD_DIR/

# 创建不需要网络的Dockerfile
cat > $BUILD_DIR/Dockerfile.api << EOF
FROM alpine:3.18

# 不使用apk添加包，使用最小镜像
COPY karmada-dashboard-api /bin/karmada-dashboard-api
WORKDIR /bin

# 设置容器入口点
ENTRYPOINT ["/bin/karmada-dashboard-api"]
EOF

# 构建镜像
echo "1.2 构建API镜像"
(cd $BUILD_DIR && docker build -t ${REGISTRY}/karmada-dashboard-api:${VERSION} -f Dockerfile.api .)
echo "API镜像构建完成: ${REGISTRY}/karmada-dashboard-api:${VERSION}"

# 构建Web镜像
echo "2. 构建Web镜像"

# 编译前端代码
echo "2.1 构建前端代码"
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
echo "2.2 编译Web二进制文件"
make karmada-dashboard-web GOOS=linux
cp -f $REPO_ROOT/_output/bin/linux/amd64/karmada-dashboard-web $BUILD_DIR/

# 复制前端构建产物
echo "2.3 复制前端构建产物"
mkdir -p $BUILD_DIR/dist
cp -r $REPO_ROOT/ui/apps/dashboard/dist/* $BUILD_DIR/dist/

# 创建不需要网络的Dockerfile
cat > $BUILD_DIR/Dockerfile.web << EOF
FROM alpine:3.18

# 不使用apk添加包，使用最小镜像
COPY dist /static
COPY karmada-dashboard-web /bin/karmada-dashboard-web
WORKDIR /bin

# 设置容器入口点
ENTRYPOINT ["/bin/karmada-dashboard-web"]
EOF

# 构建镜像
echo "2.4 构建Web镜像"
(cd $BUILD_DIR && docker build -t ${REGISTRY}/karmada-dashboard-web:${VERSION} -f Dockerfile.web .)
echo "Web镜像构建完成: ${REGISTRY}/karmada-dashboard-web:${VERSION}"

# 输出结果
echo ""
echo "==================== 构建完成 ===================="
echo "API 镜像: $REGISTRY/karmada-dashboard-api:$VERSION"
echo "Web 镜像: $REGISTRY/karmada-dashboard-web:$VERSION"
echo "使用 docker images 命令查看已构建的镜像"
echo "=================================================" 

