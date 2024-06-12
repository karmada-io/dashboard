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

source "${REPO_ROOT}"/hack/util/init.sh && util:init:init_scripts

REGISTRY=${REGISTRY:-"docker.io/karmada"}
VERSION=${VERSION:="unknown"}
DOCKER_BUILD_ARGS=${DOCKER_BUILD_ARGS:-}
SIGN_IMAGE=${SIGN_IMAGE:-"0"}
DOCKER_FILE=${DOCKER_FILE:-"buildx.Dockerfile"}

function build_images() {
  local -r target=$1
  local -r output_type=${OUTPUT_TYPE:-docker}
  local platforms="${BUILD_PLATFORMS:-"$(util::misc::host_platform)"}"

  # Preferentially use `docker build`. If we are building multi platform,
  # or cross building, change to `docker buildx build`
  cross=$(is_cross "${platforms}")
  if [[ "${cross}" == "true" ]]; then
    build_cross_image "${output_type}" "${target}" "${platforms}"
  else
    build_local_image "${output_type}" "${target}" "${platforms}"
  fi
}

function build_local_image() {
  local -r output_type=$1
  local -r target=$2
  local -r platform=$3

  local -r image_name="${REGISTRY}/${target}:${VERSION}"

  echo "Building image for ${platform}: ${image_name}"
  set -x
  # shellcheck disable=SC2086
  docker build --build-arg BINARY="${target}" ${DOCKER_BUILD_ARGS} \
          --tag "${image_name}" \
          --file "${REPO_ROOT}/cluster/images/${DOCKER_FILE}" \
          "${REPO_ROOT}/_output/bin/${platform}"
  set +x
  if [[ "$output_type" == "registry" ]]; then
    docker push "${image_name}"
    signImage "${image_name}"
  fi
}

function build_cross_image() {
  local -r output_type=$1
  local -r target=$2
  local -r platforms=$3

  local -r image_name="${REGISTRY}/${target}:${VERSION}"

  echo "Cross building image for ${platforms}: ${image_name}"
  set -x
  docker buildx build --output=type="${output_type}" \
          --platform "${platforms}" \
          --build-arg BINARY="${target}" \
          "${DOCKER_BUILD_ARGS}" \
          --tag "${image_name}" \
          --file "${REPO_ROOT}/cluster/images/${DOCKER_FILE}" \
          "${REPO_ROOT}/_output/bin"
  # sign_image "${image_name}"
  set +x
}

function sign_image(){
  if [ "$SIGN_IMAGE" = "1" ];then
    local -r target=$1
    echo "Signing image: ""${target}"
    cosign sign --yes "${target}"
  fi
}

function is_cross() {
  local platforms=$1

  IFS="," read -ra platform_array <<< "${platforms}"
  if [[ ${#platform_array[@]} -ne 1 ]]; then
    echo true
    return
  fi

  local -r arch=${platforms##*/}
  if [[ "$arch" == $(go env GOHOSTARCH) ]]; then
    echo false
  else
    echo true
  fi
}

build_images "$@"
