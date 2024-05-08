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
  echo "This script will deploy karmada agent to a cluster."
  echo "Usage: hack/deploy-karmada-agent.sh <KARMADA_APISERVER_KUBECONFIG> <KARMADA_APISERVER> <MEMBER_CLUSTER_KUBECONFIG> <MEMBER_CLUSTER>"
  echo "Example: hack/deploy-karmada-agent.sh ~/.kube/karmada.config karmada-apiserver ~/.kube/members.config member1"
  echo "Parameters:"
  echo "        KARMADA_APISERVER_KUBECONFIG          path to karmada-apiserver kubeconfig"
  echo "        KARMADA_APISERVER                     context-name in KARMADA_APISERVER_KUBECONFIG"
  echo "        MEMBER_CLUSTER_KUBECONFIG             path to member-cluster kubeconfig"
  echo "        MEMBER_CLUSTER                        context-name in MEMBER_CLUSTER_KUBECONFIG"
}

if [[ $# -ne 4 ]]; then
  usage
  exit 1
fi

KARMADA_APISERVER_KUBECONFIG=${1}
KARMADA_APISERVER=${2}
MEMBER_CLUSTER_KUBECONFIG=${3}
MEMBER_CLUSTER=${4}
INFO "Deploy karmada-agent on cluster ${MEMBER_CLUSTER}"
DEBUG "Deploy parameters:"
DEBUG "KARMADA_APISERVER_KUBECONFIG:${KARMADA_APISERVER_KUBECONFIG}"
DEBUG "KARMADA_APISERVER:${KARMADA_APISERVER}"
DEBUG "MEMBER_CLUSTER_KUBECONFIG:${MEMBER_CLUSTER_KUBECONFIG}"
DEBUG "MEMBER_CLUSTER:${MEMBER_CLUSTER}"

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

function karmada_apiserver_kubectl() {
  kubectl --kubeconfig="${KARMADA_APISERVER_KUBECONFIG}" --context="${KARMADA_APISERVER}" "$@"
}

function member_cluster_kubectl() {
  kubectl --kubeconfig="${MEMBER_CLUSTER_KUBECONFIG}" --context="${MEMBER_CLUSTER}" "$@"
}


AGENT_IMAGE_PULL_POLICY=${IMAGE_PULL_POLICY:-IfNotPresent}

INFO "Create namespace for karmada agent"
member_cluster_kubectl apply -f "${REPO_ROOT}/artifacts/agent/namespace.yaml"

INFO "Create serviceaccount, clusterrole and clusterrolebinding for karmada agent"
member_cluster_kubectl apply -f "${REPO_ROOT}/artifacts/agent/serviceaccount.yaml"
member_cluster_kubectl apply -f "${REPO_ROOT}/artifacts/agent/clusterrole.yaml"
member_cluster_kubectl apply -f "${REPO_ROOT}/artifacts/agent/clusterrolebinding.yaml"

INFO "Create secret for karmada agent"
member_cluster_kubectl create secret generic karmada-kubeconfig --from-file=karmada-kubeconfig="${KARMADA_APISERVER_KUBECONFIG}" -n "${KARMADA_SYSTEM_NAMESPACE}"

# extract api endpoint of member cluster
# shellcheck disable=SC2086
#member_cluster=$(member_cluster_kubectl config view -o jsonpath='{.contexts[?(@.name == "'${MEMBER_CLUSTER}'")].context.cluster}')
# shellcheck disable=SC2086
member_cluster_api_endpoint=$(member_cluster_kubectl config view -o jsonpath='{.clusters[?(@.name == "'${MEMBER_CLUSTER}'")].cluster.server}')

# deploy karmada agent
TEMP_PATH=$(mktemp -d)
trap '{ rm -rf ${TEMP_PATH}; }' EXIT

INFO "Prepare artifacts for karmada agent in ${TEMP_PATH}"
karmada_agent_path="${TEMP_PATH}"/karmada-agent.yaml
cp "${REPO_ROOT}"/artifacts/agent/karmada-agent.yaml "${karmada_agent_path}"

INFO "Replace variables in karmada-agent.yaml"
sed -i'' -e "s/{{KARMADA_VERSION}}/${KARMADA_VERSION}/g" "${karmada_agent_path}"
sed -i'' -e "s/{{karmada_context}}/${KARMADA_APISERVER}/g" "${karmada_agent_path}"
sed -i'' -e "s/{{member_cluster_name}}/${MEMBER_CLUSTER}/g" "${karmada_agent_path}"
sed -i'' -e "s/{{image_pull_policy}}/${AGENT_IMAGE_PULL_POLICY}/g" "${karmada_agent_path}"
sed -i'' -e "s|{{member_cluster_api_endpoint}}|${member_cluster_api_endpoint}|g" "${karmada_agent_path}"

INFO "Apply karmada-agent.yaml on cluster ${MEMBER_CLUSTER}"
DEBUG "MEMBER_CLUSTER_KUBECONFIG:${MEMBER_CLUSTER_KUBECONFIG}"
DEBUG "MEMBER_CLUSTER:${MEMBER_CLUSTER}"
DEBUG "karmada_agent_path:${karmada_agent_path}"
member_cluster_kubectl apply -f "${karmada_agent_path}"

INFO "Wait for karmada-agent is ready"
util::misc::wait_pod_ready \
  "${MEMBER_CLUSTER_KUBECONFIG}" "${MEMBER_CLUSTER}" \
  "${AGENT_POD_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
INFO "Karmada-agent is ready"
