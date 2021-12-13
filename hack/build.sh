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

LDFLAGS="$(util::git::version_ldflags) ${LDFLAGS:-}"

function get_target_source() {
  local target=$1
  for s in "${KARMADA_TARGET_SOURCE[@]}"; do
    if [[ "$s" == ${target}=* ]]; then
      echo "${s##${target}=}"
      return
    fi
  done
}

function build_binary() {
  local -r target=$1

  IFS="," read -ra platforms <<< "${BUILD_PLATFORMS:-}"
  if [[ ${#platforms[@]} -eq 0 ]]; then
    platforms=("$(util::misc::host_platform)")
  fi

  for platform in "${platforms[@]}"; do
    echo "!!! Building ${target} for ${platform}:"
    build_binary_for_platform "${target}" "${platform}"
    echo "!!! Building ${target} for ${platform} finished"
  done
}

function build_binary_for_platform() {
  local -r target=$1
  local -r platform=$2
  local -r os=${platform%/*}
  local -r arch=${platform##*/}
  local target_source
  target_source=$(get_target_source "$target")
  local gopkg
  gopkg=${KARMADA_GO_PACKAGE}/${target_source}
  set -x
  CGO_ENABLED=0 GOOS=${os} GOARCH=${arch} go build \
      -ldflags "${LDFLAGS:-}" \
      -o "${REPO_ROOT}/_output/bin/${platform}/$target" \
      "${gopkg}"
  set +x
}

build_binary "$@"
