#!/usr/bin/env bash
# Copyright 2022 The Karmada Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
SHELL_FOLDER=$(pwd)
REPO_ROOT=$(cd ../ && pwd)

usage() {
  echo "Usage: $0 [branch_name] [--force] [--debug] [--help]"
  echo "  branch_name: The branch name to clone from the kubernetes/dashboard repository. Defaults to 'release/7.10.1'."
  echo "  --force:     Force re-cloning the repository if the tmp directory already exists."
  echo "  --debug:     Enable debug mode, which prints all commands as they are executed."
  echo "  --help:      Display this help message."
  exit 0
}

TMP_DIR=${REPO_ROOT}/.tmp
BRANCH_NAME="release/7.10.1"
FORCE=false
DEBUG=false

# Argument parsing
while (( "$#" )); do
  case "$1" in
    --force)
      FORCE=true
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --help|-h)
      usage
      ;;
    *)
      BRANCH_NAME=$1
      shift
      ;;
  esac
done

if [[ "$DEBUG" == true ]]; then
  set -x
fi

if [[ "$FORCE" == true && -d "${TMP_DIR}" ]]; then
  echo "Force option is set, removing existing tmp directory..."
  rm -rf "${TMP_DIR}"
fi

if [[ -d "${TMP_DIR}" ]]; then
  echo "tmp dir ${TMP_DIR} already exists, skipping clone"
else
  echo "clone kubernetes dashboard"
  git clone --depth=1 --branch ${BRANCH_NAME} https://github.com/kubernetes/dashboard.git ${TMP_DIR}
  echo "clone finished"
fi


rm -rf ${REPO_ROOT}/cmd/kubernetes-dashboard-api
mkdir -p ${REPO_ROOT}/cmd/kubernetes-dashboard-api
cp -R ${REPO_ROOT}/tmp/modules/api/ ${REPO_ROOT}/cmd/kubernetes-dashboard-api

mkdir -p ${REPO_ROOT}/pkg/kubernetes-dashboard-common
cp -R ${REPO_ROOT}/tmp/modules/common/ ${REPO_ROOT}/pkg/kubernetes-dashboard-common



rm -rf ${REPO_ROOT}/cmd/kubernetes-dashboard-api/go.{mod,sum}
rm -rf ${REPO_ROOT}/pkg/kubernetes-dashboard-common/tools
for file in $(find "${REPO_ROOT}/cmd/kubernetes-dashboard-api/" -type f -name "*.go"); do
  sed -i "" "s|k8s.io/dashboard/api/pkg/|github.com/karmada-io/dashboard/cmd/kubernetes-dashboard-api/pkg/|g" "$file"
done

go mod tidy