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

for script in "b-log.sh" "misc.sh"; do
  # shellcheck disable=SC1090
  source "${REPO_ROOT}/hack/util/${script}"
done


# util::verify::wait_apiservice_ready waits for apiservice state becomes Available until timeout.
# Parameters:
#   $1: kubeconfig file, such as "~/.kube/karmada.config"
#   $2: context name in kubeconfig file, such as "karmada-apiserver"
#   $3: apiservice label, such as "app=etcd"
#   $4: time out, default is '30s'
# Return:
#   result code for wait apiservice
function util::verify::wait_apiservice_ready() {
    local kubeconfig_path=$1
    local context_name=$2
    local apiservice_label=$3
    local timeout=${4:-30s}

    INFO "wait the ${apiservice_label} Available..."
    set +e
    util::misc::kubectl_with_retry --kubeconfig="${kubeconfig_path}" --context="${context_name}" wait --for=condition=Available --timeout="${timeout}" apiservices -l app="${apiservice_label}"
    ret=$?
    set -e
    if [ $ret -ne 0 ];then
      echo "kubectl describe info:"
      kubectl --context="$context_name" describe apiservices -l app=${apiservice_label}
    fi
    return ${ret}
}

# This function is used to check whether "cmd" exist under $PATH
# Parameters:
#   $1: "cmd" name, such as "kubectl"、"docker"、"kind"
# Return:
#   0: check passed
#   1: check not passed
function util::verify::check_cmd {
  local cmd
  cmd=$(command -v "${1}")
  if [[ ! -x ${cmd} ]]; then
    return 1
  else
    return 0
  fi
}

# This function is used to check whether "docker" exist under $PATH
# Parameters:
# Return:
#   0: check passed
#   1: check not passed
function util::verify::check_docker() {
  local is_docker_installed=0
  is_docker_installed=$(util::verify::check_cmd "docker"; echo $?)
  if [[ ${is_docker_installed} -ne 0 ]]; then
     return 1
  fi

  # use the result code to detect whether docker can work properly
  # because we set -e global, if docker cannot work, the result code will non-zero
  # use set +e to allow non-zero result code temporarily
  local is_docker_ok=0
  set +e
  is_docker_ok=$(docker ps -q>/dev/null 2>&1; echo $?)
  set -e
  if [[ ${is_docker_ok} -ne 0 ]]; then
    return 1
  else
    return 0
  fi
}

# This function will check OS and ARCH before installing, only amd64 or arm64 and linux or darwin are allowed
# Parameters:
#   $1: "os" name, such as "linux"
#   $2: "arch" name, such "arm64"、"amd64"
# Return:
#   0: check passed
#   1: check not passed
function util::verify::check_os_and_arch() {
  local OS=${1:-}
  local ARCH=${2:-}
  if [[ "$ARCH" =~ ^(amd64|arm64)$ ]]; then
    if [[ "$OS" =~ ^(linux|darwin)$ ]]; then
        return 0
    fi
  fi
  return 1
}

# util::verify::wait_file_exist checks if a file exists, if not, wait until timeout
# Parameters:
#   $1: path to file, such as "/var/run/host.config"
#   $2: timeout, such as 300
# Return:
#   0: check passed
#   1: check not passed
function util::verify::wait_file_exist() {
  local file_path=${1}
  local timeout=${2}
  for ((time=0; time<timeout; time++)); do
    if [[ -e ${file_path} ]]; then
        return 0
    fi
    sleep 1
  done
  return 1
}

# util::verify::wait_for_condition blocks until the provided condition becomes true
# NOTICE: this function maybe output during process of check.
#         if some error occurs during process of check, the function will exit
# Parameters:
#   $1: message indicating what conditions is being waited for (e.g. 'ok')
#   $2: a string representing an eval'able condition.  When eval'd it should not output
#        anything to stdout or stderr.
#   $3: optional timeout in seconds. If not provided, waits forever.
# Return:
#   1 if the condition is not met before the timeout, the return value cannot be used to check
function util::verify::wait_for_condition() {
  local msg=$1
  # condition should be a string that can be eval'd.
  local condition=$2
  local timeout=${3:-}

  local start_msg="Waiting for ${msg}"
  local error_msg="[ERROR] Timeout waiting for condition ${msg}"

  local counter=0
  while ! eval "${condition}"; do
    if [[ "${counter}" = "0" ]]; then
      echo -n "${start_msg}"
    fi

    if [[ -z "${timeout}" || "${counter}" -lt "${timeout}" ]]; then
      counter=$((counter + 1))
      if [[ -n "${timeout}" ]]; then
        echo -n '.'
      fi
      sleep 1
    else
      echo -e "\n${error_msg}"
      exit 1
    fi
  done

  if [[ "${counter}" != "0" && -n "${timeout}" ]]; then
    echo ' done'
  fi
}

# This function will check format of input address
# NOTICE:
#   if not passed ip check, the function will exit
# Parameters:
#   $1: ip_address
# Return:
function util::verify::ip_address() {
  local ip_address=${1}
  if [[ ! "${ip_address}" =~ ^(([1-9]?[0-9]|1[0-9][0-9]|2([0-4][0-9]|5[0-5]))\.){3}([1-9]?[0-9]|1[0-9][0-9]|2([0-4][0-9]|5[0-5]))$ ]]; then
    ERROR "Invalid IP address:${ip_address}"
    exit 1
  fi
}

# this function will checks if a cluster is ready, including if not, wait until timeout
# NOTICE:
#   if some error occurs during process of check, the function will exit
# Parameters:
#   $1: kubeconfig file, such as "~/.kube/karmada.config"
#   $2: context name in kubeconfig file, such as "karmada-host"
# Return:
function util::verify::check_clusters_ready() {
  local kubeconfig_path=${1}
  local context_name=${2}

  INFO "Waiting for kubeconfig file ${kubeconfig_path} and cluster ${context_name} to be ready..."
  if ! util::verify::wait_file_exist "${kubeconfig_path}" 300; then
    DEBUG "Timeout waiting for file exist ${kubeconfig_path}"
    ERROR "Timeout waiting for clusters ${context_name} to be ready"
    exit 1
  fi
  INFO "Create cluster ${context_name} successfully"

  util::verify::wait_for_condition \
    'running' \
    "docker inspect --format='{{.State.Status}}' ${context_name}-control-plane &> /dev/null" \
    300
  INFO "Cluster ${context_name}'s container is ready"


  INFO  "Rename cluster kind-${context_name} -> ${context_name}"
  kubectl config rename-context "kind-${context_name}" "${context_name}" --kubeconfig="${kubeconfig_path}" | NOTICE

  local os_name
  os_name=$(util::misc::get_os_name)

  local container_ip_port
  case $os_name in
    linux)
      container_ip_port=$(util::misc::get_docker_native_ipaddress "${context_name}-control-plane")":6443"
      ;;
    darwin)
      container_ip_port=$(util::misc::get_docker_host_ip_port "${context_name}-control-plane")
      ;;
    *)
      ERROR "OS ${os_name} does NOT support for getting container ip in installation script"
      exit 1
  esac

  INFO  "Set cluster ${context_name} apiserver to 'https://${container_ip_port}'"
  kubectl config set-cluster "kind-${context_name}" --server="https://${container_ip_port}" --kubeconfig="${kubeconfig_path}" | NOTICE

  util::verify::wait_for_condition \
      'ok' \
      "kubectl --kubeconfig ${kubeconfig_path} --context ${context_name} get --raw=/healthz &> /dev/null" \
      300
  INFO "Cluster ${context_name} is ready"
}

# util::verify::check_kubeconfig_and_context check existence of kubeconfig and validity of context
# Parameters:
#   $1: KUBECONFIG file, such as "/var/run/host.config"
#   $2: k8s context name, such as "karmada-apiserver"
# Return:
#   0: check passed
#   1: check not passed
function util::verify::check_kubeconfig_and_context() {
  local kubeconfig_path=${1}
  local context_name=${2}
  local ret=0
  if [[ ! -f "${kubeconfig_path}" ]]; then
    return 1
  fi
  kubectl config get-contexts --kubeconfig="${kubeconfig_path}" "${context_name}">/dev/null 2>&1
  ret=$?
  return ${ret}
}
