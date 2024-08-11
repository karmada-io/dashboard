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
# for debug, need to be controlled by options
# LOG_LEVEL_DEBUG
# variable define
# minimal test environment consists of a master cluster, and the other three member clusters
# master cluster: a kubernetes cluster just like other clusters, apart from that, the karmada control plane will
#                 be installed in this kubernetes cluster.
# member cluster: member1~member3 will be served as member clusters, but member1~2 will be served in the push mode,
#                 while member3 will be served in the pull mode.

## cluster variables
KARMADA_HOST=${KARMADA_HOST:-"karmada-host"}
KARMADA_APISERVER=${KARMADA_APISERVER:-"karmada-apiserver"}
CLUSTER1=${CLUSTER1:-"member1"}
CLUSTER2=${CLUSTER2:-"member2"}
CLUSTER3=${CLUSTER3:-"member3"}

## kubeconfig variables
## kubeconfig for control plane, including host kubernetes cluster and karmada control plane
KUBECONFIG_DIR=${KUBECONFIG_DIR:-"${HOME}/.kube"}
KARMADA_KUBECONFIG_PATH=${KARMADA_KUBECONFIG_PATH:-"${KUBECONFIG_DIR}/karmada.config"}
MEMBER_CLUSTER_KUBECONFIG_PATH=${MEMBER_CLUSTER_KUBECONFIG_PATH:-"${KUBECONFIG_DIR}/members.config"}

### kubeconfig for member clusters
### these config files will be stored in ${KUBECONFIG_DIR} with prefix(${MEMBER_CLUSTER_KUBECONFIG_PREFIX}) temporarily,
### and be merged into to a single kubeconfig file finally.
MEMBER_CLUSTER_KUBECONFIG_PREFIX="member-tmp"
MEMBER_CLUSTER_KUBECONFIG_DIR_PREFIX="${KUBECONFIG_DIR}/${MEMBER_CLUSTER_KUBECONFIG_PREFIX}"
CLUSTER1_KUBECONFIG_PATH="${MEMBER_CLUSTER_KUBECONFIG_DIR_PREFIX}-${CLUSTER1}.config"
CLUSTER2_KUBECONFIG_PATH="${MEMBER_CLUSTER_KUBECONFIG_DIR_PREFIX}-${CLUSTER2}.config"
CLUSTER3_KUBECONFIG_PATH="${MEMBER_CLUSTER_KUBECONFIG_DIR_PREFIX}-${CLUSTER3}.config"

## cluster version variables
REGISTRY=${REGISTRY:-"${DEFAULT_REGISTRY}"}
CLUSTER_VERSION=${CLUSTER_VERSION:-"${DEFAULT_CLUSTER_VERSION}"}
CLUSTER_IMAGE="${REGISTRY}/kindest/node:${CLUSTER_VERSION}"

## log variables
LOG_DIR=${LOG_DIR:-"/tmp/karmada"}

ALL_IMAGES=("${DEFAULT_IMAGES[@]}")

# specify host_ip address
HOST_IP_ADDRESS=${1:-}


ALL_CLUSTERS=(
  "${KARMADA_HOST}"
  "${CLUSTER1}"
  "${CLUSTER2}"
  "${CLUSTER3}"
)
MEMBER_CLUSTERS=(
  "${CLUSTER1}"
  "${CLUSTER2}"
  "${CLUSTER3}"
)
PUSH_MODE_CLUSTERS=(
  "${CLUSTER1}"
  "${CLUSTER2}"
)
PULL_MODE_CLUSTERS=(
  "${CLUSTER3}"
)

# check prerequirements
INFO "Check bootstrap os/arch"
bs_os=$(util::misc::get_os_name)
bs_arch=$(util::misc::get_os_arch)
if util::verify::check_os_and_arch "${bs_os}" "${bs_arch}"; then
  NOTICE "Bootstrap os/arch check - PASSED"
else
  ERROR "Bootstrap os/arch check - NOT PASSED"
  ERROR "Sorry, Karmada installation does not support ${bs_os}/${bs_arch} at the moment"
  exit 1
fi

INFO "Check necessary clis"
for cli in "docker" "kind" "kubectl" "karmadactl"; do
  cli_check_result=0
  if [[ ${cli} == "docker" ]]; then
    cli_check_result=$(util::verify::check_docker ${cli}; echo $?)
  else
    cli_check_result=$(util::verify::check_cmd ${cli}; echo $?)
  fi

  if [[ ${cli_check_result} -eq 0 ]]; then
    NOTICE "CLI check: '${cli}' existence check - PASSED"
  else
    ERROR "CLI check: '${cli}' existence check - NOT PASSED"
    ERROR "It seems that '${cli}' is not installed on your machine, please install '${cli}' follow the instructions provided by $(util::misc::print_install_tips ${cli})"
    exit 1
  fi
done

# start all k8s clusters with help of kind, including one control plane and three member clusters
INFO "Delete necessary resources"
util::misc::delete_necessary_resources \
  "${KARMADA_KUBECONFIG_PATH},${MEMBER_CLUSTER_KUBECONFIG_PATH}" \
  "${KARMADA_HOST},${CLUSTER1},${CLUSTER2},${CLUSTER3}" \
  "${LOG_DIR}"

TEMP_PATH=$(mktemp -d)
trap '{ rm -rf ${TEMP_PATH}; }' EXIT

ARTIFACTS_DIR="${REPO_ROOT}/artifacts"
KIND_CLUSTER_CONFIG_DIR="${ARTIFACTS_DIR}/kindClusterConfig"
INFO "Prepare kindClusterConfig in path: ${TEMP_PATH}"
for kind_config_file in "karmada-host.yaml" "member1.yaml" "member2.yaml"; do
  cp -f "${KIND_CLUSTER_CONFIG_DIR}/${kind_config_file}" "${TEMP_PATH}/${kind_config_file}"
  sed -i'' -e "s/{{host_ipaddress}}/${HOST_IP_ADDRESS}/g" "${TEMP_PATH}/${kind_config_file}"
done

INFO "Start host cluster"
if [[ -n "${HOST_IP_ADDRESS}" ]]; then # If bind the port of clusters(karmada-host, member1 and member2) to the host IP
  util::verify::ip_address "${HOST_IP_ADDRESS}"
  util::misc::create_cluster \
    "${KARMADA_HOST}" \
    "${KARMADA_KUBECONFIG_PATH}" \
    "${CLUSTER_IMAGE}" \
    "${LOG_DIR}" \
    "${TEMP_PATH}"/karmada-host.yaml
else
  util::misc::create_cluster \
    "${KARMADA_HOST}" \
    "${KARMADA_KUBECONFIG_PATH}" \
    "${CLUSTER_IMAGE}" \
    "${LOG_DIR}"
fi

INFO "Waiting for the host cluster to be ready..."
util::verify::check_clusters_ready "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}"
INFO "Host cluster already started"

INFO "Start member clusters"
util::misc::create_cluster \
  "${CLUSTER1}" \
  "${CLUSTER1_KUBECONFIG_PATH}" \
  "${CLUSTER_IMAGE}" \
  "${LOG_DIR}" \
  "${TEMP_PATH}"/member1.yaml
util::misc::create_cluster \
  "${CLUSTER2}" \
  "${CLUSTER2_KUBECONFIG_PATH}" \
  "${CLUSTER_IMAGE}" \
  "${LOG_DIR}" \
  "${TEMP_PATH}"/member2.yaml
util::misc::create_cluster \
  "${CLUSTER3}" \
  "${CLUSTER3_KUBECONFIG_PATH}" \
  "${CLUSTER_IMAGE}" \
  "${LOG_DIR}"
INFO "Start member clusters finished"

INFO "Waiting for the member clusters to be ready..."
for cluster in "${MEMBER_CLUSTERS[@]}"; do
  INFO "Wait for member cluster ${cluster} to be ready..."
  cluster_kubeconfig_path="${MEMBER_CLUSTER_KUBECONFIG_DIR_PREFIX}-${cluster}.config"
  util::verify::check_clusters_ready "${cluster_kubeconfig_path}" "${cluster}"
  NOTICE "Member cluster ${cluster} is ready..."
done

# load components images to kind cluster, the image will be loaded regardless of whether it will be used for simplicity.
for cluster in "${ALL_CLUSTERS[@]}"; do
  INFO "Start loading image in cluster[${cluster}]"
  for image in "${ALL_IMAGES[@]}"; do
    DEBUG "Loading image ${image} into ${cluster}"
    kind load docker-image "${image}" --name="${cluster}" -v -1
    DEBUG "Loading image ${image} into ${cluster} successfully"
  done
  INFO "Load image in cluster[${cluster}] finished"
done


# install karmada control plane components
INFO "Deploy karmada control plane components"
"${REPO_ROOT}"/hack/deploy-karmada.sh "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" "${KARMADA_APISERVER}"

# wait until the member cluster ready and join member clusters
# connecting networks between karmada-host, member1 and member2 clusters
# join push mode member clusters
INFO "Connecting cluster networks..."
INFO "Connect ${CLUSTER1}<-->${CLUSTER2}"
util::misc::add_routes "${CLUSTER1}" "${CLUSTER2_KUBECONFIG_PATH}" "${CLUSTER2}"
util::misc::add_routes "${CLUSTER2}" "${CLUSTER1_KUBECONFIG_PATH}" "${CLUSTER1}"

INFO "Connect ${KARMADA_HOST}<-->${CLUSTER1}"
util::misc::add_routes "${KARMADA_HOST}" "${CLUSTER1_KUBECONFIG_PATH}" "${CLUSTER1}"
util::misc::add_routes "${CLUSTER1}" "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}"

INFO "Connect ${KARMADA_HOST}<-->${CLUSTER2}"
util::misc::add_routes "${KARMADA_HOST}" "${CLUSTER2_KUBECONFIG_PATH}" "${CLUSTER2}"
util::misc::add_routes "${CLUSTER2}" "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}"
INFO "Cluster networks connected"


for push_cluster in "${PUSH_MODE_CLUSTERS[@]}"; do
  cluster_kubeconfig_path="${MEMBER_CLUSTER_KUBECONFIG_DIR_PREFIX}-${push_cluster}.config"
  karmadactl join \
    --kubeconfig "${KARMADA_KUBECONFIG_PATH}" \
    --karmada-context="${KARMADA_APISERVER}" \
    --cluster-kubeconfig="${cluster_kubeconfig_path}" \
    --cluster-context="${push_cluster}" \
    "${push_cluster}"

  "${REPO_ROOT}"/hack/deploy-scheduler-estimator.sh \
    "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
    "${cluster_kubeconfig_path}" "${push_cluster}"
done

# deploy karmada agent in pull mode member clusters
"${REPO_ROOT}"/hack/deploy-agent-and-estimator.sh \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_APISERVER}" \
  "${CLUSTER3_KUBECONFIG_PATH}" "${CLUSTER3}"


# deploy metrics-server in member clusters
for cluster in "${MEMBER_CLUSTERS[@]}"; do
  INFO "Deploy k8s metrics server in ${cluster}"
  cluster_kubeconfig_path="${MEMBER_CLUSTER_KUBECONFIG_DIR_PREFIX}-${cluster}.config"
  "${REPO_ROOT}"/hack/deploy-k8s-metrics-server.sh "${cluster_kubeconfig_path}" "${cluster}"

  # wait all of clusters member1, member2 and member3 status is ready
  INFO "Wait cluster ${cluster} join/register status ready"
  util::misc::wait_cluster_ready "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_APISERVER}" "${cluster}"
done

# merge temporary kubeconfig of member clusters by kubectl
# variable define in scripts will not make effect to parent shell thread
export KUBECONFIG=$(find "${KUBECONFIG_DIR}" -maxdepth 1 -type f | grep "${MEMBER_CLUSTER_KUBECONFIG_PREFIX}" | tr '\n' ':')
kubectl config view --flatten > "${MEMBER_CLUSTER_KUBECONFIG_PATH}"
for tmp_config_file in $(find "${KUBECONFIG_DIR}" -maxdepth 1 -type f | grep "${MEMBER_CLUSTER_KUBECONFIG_PREFIX}"); do
  DEBUG "Remove ${tmp_config_file}"
  rm -f "${tmp_config_file}"
done

function print_success() {
  echo -e "$KARMADA_GREETING"
  echo "Local Karmada is running."
  echo -e "\nTo start using your karmada, run:"
  echo -e "  export KUBECONFIG=${KARMADA_KUBECONFIG_PATH}"
  echo "Please use 'kubectl config use-context ${KARMADA_HOST}/${KARMADA_APISERVER}' to switch the host and control plane cluster."
  echo -e "\nTo manage your member clusters, run:"
  echo -e "  export KUBECONFIG=${MEMBER_CLUSTER_KUBECONFIG_PATH}"
  echo "Please use 'kubectl config use-context ${CLUSTER1}/${CLUSTER2}/${CLUSTER3}' to switch to the different member cluster."
}

print_success

