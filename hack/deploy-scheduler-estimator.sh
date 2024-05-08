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
  echo "This script will deploy karmada-scheduler-estimator of a cluster."
  echo "Usage: hack/deploy-scheduler-estimator.sh <KARMADA_HOST_KUBECONFIG> <KARMADA_HOST> <MEMBER_CLUSTER_KUBECONFIG> <MEMBER_CLUSTER>"
  echo "Example: hack/deploy-scheduler-estimator.sh ~/.kube/karmada.config karmada-host ~/.kube/members.config member1"
  echo "Parameters:"
  echo "        KARMADA_HOST_KUBECONFIG          path to karmada-host kubeconfig"
  echo "        KARMADA_HOST                     context-name in KARMADA_HOST_KUBECONFIG"
  echo "        MEMBER_CLUSTER_KUBECONFIG        path to member-cluster kubeconfig"
  echo "        MEMBER_CLUSTER                   context-name in MEMBER_CLUSTER_KUBECONFIG"
}

if [[ $# -ne 4 ]]; then
  usage
  exit 1
fi
KARMADA_HOST_KUBECONFIG=${1}
KARMADA_HOST=${2}
MEMBER_CLUSTER_KUBECONFIG=${3}
MEMBER_CLUSTER=${4}


INFO "Check kubeconfig and context-name for ${KARMADA_HOST}"
check_karmada_host_result=$(util::verify::check_kubeconfig_and_context "${KARMADA_HOST_KUBECONFIG}" "${KARMADA_HOST}"; echo $?)
if [[ ${check_karmada_host_result} -eq 0 ]]; then
  NOTICE "Kubeconfig check for ${KARMADA_HOST} - PASSED"
else
  ERROR "Kubeconfig check for ${KARMADA_HOST} - NOT PASSED"
  ERROR "Please check the existence of kubeconfig[${KARMADA_HOST_KUBECONFIG}] and validity of context[${KARMADA_HOST}]"
  exit 1
fi

INFO "Check kubeconfig and context-name for ${MEMBER_CLUSTER}"
check_member_cluster_result=$(util::verify::check_kubeconfig_and_context "${MEMBER_CLUSTER_KUBECONFIG}" "${MEMBER_CLUSTER}"; echo $?)
if [[ ${check_member_cluster_result} -eq 0 ]]; then
  NOTICE "Kubeconfig check for ${MEMBER_CLUSTER} - PASSED"
else
  ERROR "Kubeconfig check for ${MEMBER_CLUSTER} - NOT PASSED"
  ERROR "Please check the existence of kubeconfig[${MEMBER_CLUSTER_KUBECONFIG}] and validity of context[${MEMBER_CLUSTER}]"
  exit 1
fi

function karmada_host_kubectl() {
  kubectl --kubeconfig="${KARMADA_HOST_KUBECONFIG}" --context="${KARMADA_HOST}" "$@"
}

function member_cluster_kubectl() {
  kubectl --kubeconfig="${MEMBER_CLUSTER_KUBECONFIG}" --context="${MEMBER_CLUSTER}" "$@"
}


TEMP_PATH="$(mktemp -d)"
trap '{ rm -rf ${TEMP_PATH}; }' EXIT


MEMBER_CLUSTER_KUBECONFIG_FILE_NAME="$(basename "${MEMBER_CLUSTER_KUBECONFIG}")"
MEMBER_CLUSTER_KUBECONFIG_TEMP_PATH="${TEMP_PATH}/${MEMBER_CLUSTER_KUBECONFIG_FILE_NAME}"
MEMBER_CLUSTER_KUBECONFIG_SECRET="${MEMBER_CLUSTER}-kubeconfig"




# --minify will generate minified kubeconfig file with required context
# --flatten will embed certificate
member_cluster_kubectl config view --minify  --flatten > "${MEMBER_CLUSTER_KUBECONFIG_TEMP_PATH}"

# check whether the kubeconfig secret has been created before
if ! karmada_host_kubectl get secrets -n "${KARMADA_SYSTEM_NAMESPACE}" | grep "${MEMBER_CLUSTER_KUBECONFIG_SECRET}"; then
  # create secret
  karmada_host_kubectl create secret generic "${MEMBER_CLUSTER_KUBECONFIG_SECRET}" "--from-file=${MEMBER_CLUSTER_KUBECONFIG_SECRET}=${MEMBER_CLUSTER_KUBECONFIG_TEMP_PATH}" -n "${KARMADA_SYSTEM_NAMESPACE}"
fi

# deploy scheduler estimator
INFO "Prepare and replace variables for karmada-scheduler-estimator.yaml"
karmada_scheduler_estimator_path="${TEMP_PATH}"/karmada-scheduler-estimator.yaml
cp "${REPO_ROOT}"/artifacts/deploy/karmada-scheduler-estimator.yaml "${karmada_scheduler_estimator_path}"
sed -i'' -e "s/{{member_cluster_name}}/${MEMBER_CLUSTER}/g" "${karmada_scheduler_estimator_path}"
sed -i'' -e "s/{{KARMADA_VERSION}}/${KARMADA_VERSION}/g" "${karmada_scheduler_estimator_path}"
# shellcheck disable=SC2002
cat "${karmada_scheduler_estimator_path}" | DEBUG


INFO "Apply karmada-scheduler-estimator.yaml on cluster ${KARMADA_HOST}"
karmada_host_kubectl apply -f "${karmada_scheduler_estimator_path}"

function print_success() {
  echo "Karmada scheduler estimator of cluster ${MEMBER_CLUSTER} has been deployed."
  echo "Note: To enable scheduler estimator, please deploy other scheduler estimators of all clusters."
  echo "      After that, specify the option '--enable-scheduler-estimator=true' of karmada-scheduler."
}

print_success
