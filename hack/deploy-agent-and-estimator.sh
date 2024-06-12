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
  echo "This script will deploy karmada-agent in member cluster and karmada-scheduler-estimator of the cluster in karmada-host."
  echo "Usage: hack/deploy-agent-and-estimator.sh <KARMADA_HOST_KUBECONFIG> <KARMADA_HOST> <KARMADA_APISERVER_KUBECONFIG> <KARMADA_APISERVER> <MEMBER_CLUSTER_KUBECONFIG> <MEMBER_CLUSTER>"
  echo "Example: hack/deploy-agent-and-estimator.sh ~/.kube/karmada.config karmada-host ~/.kube/karmada.config karmada-apiserver ~/.kube/members.config member1"
  echo "Parameters:"
  echo "        KARMADA_HOST_KUBECONFIG          path to karmada-host kubeconfig"
  echo "        KARMADA_HOST                     context-name in KARMADA_HOST_KUBECONFIG"
  echo "        KARMADA_APISERVER_KUBECONFIG     path to karmada-apiserver kubeconfig"
  echo "        KARMADA_APISERVER                context-name in KARMADA_APISERVER_KUBECONFIG"
  echo "        MEMBER_CLUSTER_KUBECONFIG        path to member-cluster kubeconfig"
  echo "        MEMBER_CLUSTER                   context-name in MEMBER_CLUSTER_KUBECONFIG"
}

if [[ $# -ne 6 ]]; then
  usage
  exit 1
fi


KARMADA_HOST_KUBECONFIG=${1}
KARMADA_HOST=${2}
KARMADA_APISERVER_KUBECONFIG=${3}
KARMADA_APISERVER=${4}
MEMBER_CLUSTER_KUBECONFIG=${5}
MEMBER_CLUSTER=${6}

INFO "Check kubeconfig and context-name for ${KARMADA_HOST}"
check_karmada_host_result=$(util::verify::check_kubeconfig_and_context "${KARMADA_HOST_KUBECONFIG}" "${KARMADA_HOST}"; echo $?)
if [[ ${check_karmada_host_result} -eq 0 ]]; then
  NOTICE "Kubeconfig check for ${KARMADA_HOST} - PASSED"
else
  ERROR "Kubeconfig check for ${KARMADA_HOST} - NOT PASSED"
  ERROR "Please check the existence of kubeconfig[${KARMADA_HOST_KUBECONFIG}] and validity of context[${KARMADA_HOST}]"
  exit 1
fi

INFO "Check kubeconfig and context-name for ${KARMADA_APISERVER}"
check_karmada_apiserver_result=$(util::verify::check_kubeconfig_and_context "${KARMADA_APISERVER_KUBECONFIG}" "${KARMADA_APISERVER}"; echo $?)
if [[ ${check_karmada_apiserver_result} -eq 0 ]]; then
  NOTICE "Kubeconfig check for ${KARMADA_APISERVER} - PASSED"
else
  ERROR "Kubeconfig check for ${KARMADA_APISERVER} - NOT PASSED"
  ERROR "Please check the existence of kubeconfig[${KARMADA_APISERVER_KUBECONFIG}] and validity of context[${KARMADA_APISERVER}]"
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


"${REPO_ROOT}"/hack/deploy-scheduler-estimator.sh \
    "${KARMADA_HOST_KUBECONFIG}" "${KARMADA_HOST}" \
    "${MEMBER_CLUSTER_KUBECONFIG}" "${MEMBER_CLUSTER}"
"${REPO_ROOT}"/hack/deploy-karmada-agent.sh \
    "${KARMADA_APISERVER_KUBECONFIG}" "${KARMADA_APISERVER}" \
    "${MEMBER_CLUSTER_KUBECONFIG}" "${MEMBER_CLUSTER}"
