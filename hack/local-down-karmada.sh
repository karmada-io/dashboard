#!/bin/bash
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

function usage() {
    echo "This script will clean resources created by local-up-karmada.sh."
    echo "Usage: hack/local-down-karmada.sh [-k] [-h]"
    echo "Parameters:"
    echo "        k: keep the local images"
    echo "        h: print help information"
}

ALL_IMAGES=("${DEFAULT_IMAGES[@]}")

keep_images="false"
while getopts 'kh' OPT; do
  case $OPT in
      k) keep_images="true";;
      h)
        usage
        exit 0
        ;;
      ?)
        usage
        exit 1
        ;;
  esac
done

# step1、step2 share the same process as `util::misc::delete_necessary_resources`, may be reuse util::misc::delete_necessary_resources in the future, but more logs info here, keep it now.
KARMADA_HOST=${KARMADA_HOST:-"${DEFAULT_KARMADA_HOST_CONTEXT}"}
CLUSTER1=${CLUSTER1:-"member1"}
CLUSTER2=${CLUSTER2:-"member2"}
CLUSTER3=${CLUSTER3:-"member3"}


#step1 remove kind clusters
INFO "Start removing kind clusters"
kind delete cluster --name "${KARMADA_HOST}"
kind delete cluster --name "${CLUSTER1}"
kind delete cluster --name "${CLUSTER2}"
kind delete cluster --name "${CLUSTER3}"
INFO "Remove kind clusters successfully."

#step2. remove kubeconfig
INFO "Start removing kubeconfig"
KARMADA_KUBECONFIG_PATH=${KARMADA_KUBECONFIG_PATH:-"${DEFAULT_KARMADA_KUBECONFIG_PATH}"}
MEMBER_CLUSTER_KUBECONFIG_PATH=${MEMBER_CLUSTER_KUBECONFIG:-"${DEFAULT_MEMBER_CLUSTER_KUBECONFIG_PATH}"}
if [ -f "${KARMADA_KUBECONFIG_PATH}" ] ; then
    rm "${KARMADA_KUBECONFIG_PATH}"
    INFO "Remove kubeconfig ${KARMADA_KUBECONFIG_PATH} successfully."
fi
if [ -f "${MEMBER_CLUSTER_KUBECONFIG_PATH}" ] ; then
    rm "${MEMBER_CLUSTER_KUBECONFIG_PATH}"
    INFO "Remove kubeconfig ${MEMBER_CLUSTER_KUBECONFIG_PATH} successfully."
fi
INFO "Remove kubeconfig successfully."

#step3. remove docker images
INFO "Start removing images"
if [[ "${keep_images}" == "false" ]] ; then
  for image in "${ALL_IMAGES[@]}"; do
    docker rmi "${image}" || true
  done
  INFO "Remove images successfully."
else
  INFO "Skip removing images as required."
fi

INFO "Local Karmada is removed successfully."
