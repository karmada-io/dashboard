#!/usr/bin/env bash
set -euo pipefail

# Path
UPSTREAM_REPO_URL="https://github.com/kubernetes/dashboard.git"
UPSTREAM_CLONE_DIR="./_upstream-k8s-dashboard"
CLIENT_WRAPPER_DIR="./cmd/k8s-dashboard-api/clientwrapper"
MAIN_WRAPPER_DIR="./cmd/k8s-dashboard-api/mainwrapper"
DEST_MODULES_DIR="./cmd/modules"
BRANCH="main" 

echo "==> Step 1: Clone or update upstream Kubernetes Dashboard repo"

if [ -d "$UPSTREAM_CLONE_DIR/.git" ]; then
  echo "Upstream repo found, fetching latest changes..."
  git -C "$UPSTREAM_CLONE_DIR" fetch origin
  git -C "$UPSTREAM_CLONE_DIR" checkout "$BRANCH"
  git -C "$UPSTREAM_CLONE_DIR" reset --hard "origin/$BRANCH"
else
  echo "Cloning upstream repo (sparse checkout of modules directory only)..."
  git clone --filter=blob:none --no-checkout "$UPSTREAM_REPO_URL" "$UPSTREAM_CLONE_DIR"
  git -C "$UPSTREAM_CLONE_DIR" sparse-checkout init --cone
  git -C "$UPSTREAM_CLONE_DIR" sparse-checkout set modules
  git -C "$UPSTREAM_CLONE_DIR" checkout "$BRANCH"
fi

# some files not changed
rsync -a --delete --exclude='.git' \
       "$UPSTREAM_CLONE_DIR/modules/" "$DEST_MODULES_DIR/"
echo "==> Step 2: Sync modules/common/client to clientwrapper (excluding client.go)"
rsync -a --delete --exclude='client.go' "$UPSTREAM_CLONE_DIR/modules/common/client/" "$CLIENT_WRAPPER_DIR/"

echo "==> Step 3: Sync modules/api to mainwrapper (excluding main.go and arg.go)"
rsync -a --delete --exclude='main.go' --exclude='arg.go' "$UPSTREAM_CLONE_DIR/modules/api/" "$MAIN_WRAPPER_DIR/"

echo "==> Step 4: Run Go mod tidy, build, and test"

go mod tidy
go build ./...
go test ./...