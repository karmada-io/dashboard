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

# This function will load scripts in util dir by invoking source command
# NOTICE:
#   for scripts under the util dir, donnot invoke this function!!!
#   otherwise it will cause circular dependency!!!
# Parameters:
# Return:
function util:init:init_scripts() {
  for script in "b-log.sh" "verify.sh" "constant.sh" "misc.sh" "git.sh"
  do
    # shellcheck disable=SC1090
    source "${REPO_ROOT}"/hack/util/"${script}"
  done
  LOG_LEVEL_INFO
}


# This function will load scripts in util dir by invoking source command, for scripts under the util fold
# Parameters:
# Return:
function util:init:internal_init_scripts() {
  source "${REPO_ROOT}"/hack/util/b-log.sh
  LOG_LEVEL_INFO
}
