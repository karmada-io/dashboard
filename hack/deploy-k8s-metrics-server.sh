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
REPO_ROOT=$(cd ../ && pwd)

source "${REPO_ROOT}"/hack/util/init.sh && util:init:init_scripts

function usage() {
  echo "This script will deploy metrics-server in member clusters."
  echo "Usage: hack/deploy-k8s-metrics-server.sh <MEMBER_CLUSTER_KUBECONFIG> <MEMBER_CLUSTER>"
  echo "Example: hack/deploy-k8s-metrics-server.sh ~/.kube/members.config member1"
  echo "Parameters:"
  echo "        MEMBER_CLUSTER_KUBECONFIG        path to member-cluster kubeconfig"
  echo "        MEMBER_CLUSTER                   context-name in MEMBER_CLUSTER_KUBECONFIG"
}

TEMP_PATH=$(mktemp -d)
trap '{ rm -rf ${TEMP_PATH}; }' EXIT

if [[ $# -ne 2 ]]; then
  usage
  exit 1
fi


MEMBER_CLUSTER_KUBECONFIG=${1}
MEMBER_CLUSTER=${2}
INFO "Check kubeconfig and context-name for ${MEMBER_CLUSTER}"
check_member_cluster_result=$(util::verify::check_kubeconfig_and_context "${MEMBER_CLUSTER_KUBECONFIG}" "${MEMBER_CLUSTER}"; echo $?)
if [[ ${check_member_cluster_result} -eq 0 ]]; then
  NOTICE "Kubeconfig check for ${MEMBER_CLUSTER} - PASSED"
else
  ERROR "Kubeconfig check for ${MEMBER_CLUSTER} - NOT PASSED"
  ERROR "Please check the existence of kubeconfig[${MEMBER_CLUSTER_KUBECONFIG}] and validity of context[${MEMBER_CLUSTER}]"
  exit 1
fi

# here we prepare metrics-server@v0.6.3 yaml files, if you want to upgrade, you can download it,
# and replace it metrics-server.yaml manually undert the artifacts dir
# wget https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.6.3/components.yaml
INFO "Prepare metrics-server.yaml in ${TEMP_PATH}"
metrics_server_path="${TEMP_PATH}"/metrics-server.yaml
cp "${REPO_ROOT}/artifacts/metrics-server.yaml" "${metrics_server_path}"

INFO "Replace variable in metrics-server.yaml"
sed -i'' -e 's/args:/args:\n        - --kubelet-insecure-tls=true/' "${metrics_server_path}"

# deploy metrics-server in member cluster
INFO "Apply metrics-server.yaml in cluster ${MEMBER_CLUSTER}"
kubectl --kubeconfig="${MEMBER_CLUSTER_KUBECONFIG}" --context="${MEMBER_CLUSTER}" apply -f "${metrics_server_path}" | while IFS= read -r line; do
    INFO "$line"
done
