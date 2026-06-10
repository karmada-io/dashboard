#!/usr/bin/env bash
# Copyright 2026 The Karmada Authors.
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
SCRIPT_DIR=$(pwd)
# Prefer git repo root; fallback to script directory for standalone usage.
if REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
  :
else
  REPO_ROOT="${SCRIPT_DIR}"
fi

IMAGE_NAME=${IMAGE_NAME:-"feishu-callback"}
REGISTRY=${REGISTRY:-"docker.io/karmada"}
VERSION=${VERSION:-"latest"}
DOCKER_BUILD_ARGS=${DOCKER_BUILD_ARGS:-}
DOCKER_FILE=${DOCKER_FILE:-"${SCRIPT_DIR}/Dockerfile"}
OUTPUT_TYPE=${OUTPUT_TYPE:-"docker"}
BUILD_PLATFORMS=${BUILD_PLATFORMS:-"$(go env GOHOSTOS)/$(go env GOHOSTARCH)"}
APP_PKG=${APP_PKG:-}

# If build context is repo root, point go build to this example package.
if [[ -z "${APP_PKG}" ]] && [[ "${REPO_ROOT}" != "${SCRIPT_DIR}" ]]; then
  APP_PKG="./docs/examples/feishu-callback"
fi

is_cross() {
  local platforms=$1

  IFS="," read -ra platform_array <<< "${platforms}"
  if [[ ${#platform_array[@]} -ne 1 ]]; then
    echo true
    return
  fi

  local arch=${platforms##*/}
  if [[ "${arch}" == "$(go env GOHOSTARCH)" ]]; then
    echo false
  else
    echo true
  fi
}

build_local_image() {
  local output_type=$1
  local platform=$2
  local image="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

  echo "Building image for ${platform}: ${image}"
  set -x
  # shellcheck disable=SC2086
  docker build ${DOCKER_BUILD_ARGS} \
    ${APP_PKG:+--build-arg APP_PKG="${APP_PKG}"} \
    --tag "${image}" \
    --file "${DOCKER_FILE}" \
    "${REPO_ROOT}"
  set +x

  if [[ "${output_type}" == "registry" ]]; then
    docker push "${image}"
  fi
}

build_cross_image() {
  local output_type=$1
  local platforms=$2
  local image="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

  echo "Cross building image for ${platforms}: ${image}"
  set -x
  # shellcheck disable=SC2086
  docker buildx build --output=type="${output_type}" \
    --platform "${platforms}" \
    ${DOCKER_BUILD_ARGS} \
    ${APP_PKG:+--build-arg APP_PKG="${APP_PKG}"} \
    --tag "${image}" \
    --file "${DOCKER_FILE}" \
    "${REPO_ROOT}"
  set +x
}

main() {
  local output_type="${OUTPUT_TYPE}"
  local platforms="${BUILD_PLATFORMS}"

  if [[ "$(is_cross "${platforms}")" == "true" ]]; then
    build_cross_image "${output_type}" "${platforms}"
  else
    build_local_image "${output_type}" "${platforms}"
  fi
}

main "$@"
