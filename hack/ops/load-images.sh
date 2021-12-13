#!/bin/bash
# Copyright 2021 The Karmada Authors.
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
REPO_ROOT=$(cd ../../ && pwd)

source "${REPO_ROOT}"/hack/util/init.sh && util:init:init_scripts

function usage() {
  echo "This script is used to load images which will be used for karmada."
  echo "Note: This script is an internal script and is not intended used by end-users."
  echo "Usage: hack/ops/load-images.sh <IMAGE_LIST> [IMAGE_DIR]"
  echo "Example: hack/ops/load-images.sh hack/images/image.list"
  echo "Parameters: "
  echo "        IMAGE_LIST        List of image descriptions you want to load in docker"
  echo "        IMAGE_DIR         Target dir to store the dump file of docker image, optional"
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

IMAGE_FILE_PATH=${1}
IMAGE_DIR=${2:-"${REPO_ROOT}"/hack/images}

# unify relative path and absolute path
if [[ ${IMAGE_FILE_PATH} != /* ]]; then
  IMAGE_FILE_PATH="${REPO_ROOT}/${IMAGE_FILE_PATH}"
fi

# ensure the image_file_path exist
INFO "Image file path: ${IMAGE_FILE_PATH}"
if [ ! -f "${IMAGE_FILE_PATH}" ]; then
  ERROR "File ${IMAGE_FILE_PATH} not exits."
  exit 1
fi

INFO "Check ${IMAGE_DIR} exist."
if [ ! -d "${IMAGE_DIR}" ]; then
  WARN "Dir ${IMAGE_DIR} not exits, maybe some errors occur."
fi

# shellcheck disable=SC2002
lines=$(cat "${IMAGE_FILE_PATH}" | grep -v '^\s*$' | grep -v '^#' )
for line in $lines; do
  IFS=';' read -r -a line_items <<< "${line}"
  if [ "${#line_items[@]}" -ne 4 ]; then
    WARN "Line[$line] contains ${#line_items[@]} fields, expect 4 fields, skip it"
    continue
  else
    component_name=${line_items[0]}
    image_name=${line_items[1]}
    online_image_name=${line_items[2]}
    offline_image_name=${line_items[3]}

    if [ -z "${component_name}" ] || [ -z "${image_name}" ]; then
      WARN "Line[$line] contains empty component_name or image_name, skip it"
      continue
    fi

    mode="unknown"
    if [[ -n "${online_image_name}" ]]; then
      mode='online'
    else
      if [[ -n "${offline_image_name}" ]]; then
        mode='offline'
      fi
    fi

    if [ "${mode}" = "unknown" ] && [ -z "${online_image_name}" ]; then
      online_image_name=${image_name}
      mode='online'
    fi
    INFO "Load and retag image for component[${component_name}]"
    INFO "Load image in [${mode}] mode"
    if [ "${mode}" = "online" ]; then
      docker pull "${online_image_name}"
      load_image_name=${online_image_name}
    else
      image_path=${REPO_ROOT}/hack/images/${offline_image_name}
      load_image_name=$(docker load -i "${image_path}" | grep 'Loaded image' | awk -F':' '{print $2":"$3}' | awk '$1=$1')
    fi
    INFO "Retag ${load_image_name} to ${image_name}"
    docker tag "${load_image_name}" "${image_name}"
  fi
done

INFO "Load docker images finished"