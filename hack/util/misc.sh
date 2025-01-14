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

source "${REPO_ROOT}/hack/util/init.sh" && util:init:internal_init_scripts

############################
# util for local-up-karmada.sh
############################

# util::misc::delete_necessary_resources deletes clusters(karmada-host, member1, member2 and member3) and related resources directly
# this function do three things: delete cluster、remove kubeconfig、record delete log
# Parameters:
#   $1: kubeconfig files of clusters, separated by ",", such as "~/.kube/karmada.config,~/.kube/members.config"
#   $2: clusters, separated by ",", such as "karmada-host,member1"
#   $3: log file path, such as "/tmp/karmada/"
# Return:
function util::misc::delete_necessary_resources() {
  local config_files=${1}
  local clusters=${2}
  local log_path=${3}
  local log_file="${log_path}"/delete-necessary-resources.log

  rm -f "${log_file}"
  mkdir -p "${log_path}"

  local config_file_arr
  IFS=',' read -r -a config_file_arr <<< "${config_files}"
  for config_file in "${config_file_arr[@]}"; do
    DEBUG "Delete config file:${config_file}"
    rm -f "${config_file}"
  done

  local cluster_arr
  IFS=',' read -r -a cluster_arr <<< "${clusters}"
  for cluster in "${cluster_arr[@]}"; do
    DEBUG "Delete cluster:${cluster}"
    kind delete clusters "${cluster}" >> "${log_file}" 2>&1
  done

  INFO "Deleted all necessary clusters and the log file is in ${log_file}"
}

# This function will print install tips for specified cli
# Parameters:
#   $1: cli name, such as docker、kind
# Return:
#   tips for install missing cli
function util::misc::print_install_tips() {
  case $1 in
    'docker')
      echo 'https://docs.docker.com/engine/install/'
      ;;
    'kind')
      echo 'https://kind.sigs.k8s.io/docs/user/quick-start/#installation'
      ;;
    'kubectl')
      echo 'https://kubernetes.io/docs/tasks/tools/'
      ;;
    'karmadactl')
      echo 'https://karmada.io/docs/installation/install-cli-tools/'
      ;;
    'openssl')
      echo 'https://www.openssl.org/source/'
      ;;
    'cfssl' | 'cfssljson')
      echo "https://github.com/cloudflare/cfssl?tab=readme-ov-file#installation"
      ;;
    *)
      echo "according to pkg manager to install '${1}'"
      ;;
  esac
}

############################
# util for deploy-karmada.sh
############################

SERVICE_EXTERNAL_IP=''
# util::misc::wait_service_external_ip give a service external ip when it is ready, if not, wait until timeout
# NOTICE:
#   this function will set global variable SERVICE_EXTERNAL_IP, 
#   you can get SERVICE_EXTERNAL_IP by invoke util::misc::get_load_balancer_ip
# Parameters:
#   $1: kubeconfig file, such as "~/.kube/karmada.config"
#   $2: context name in kubeconfig file, such as "karmada-apiserver"
#   $3: service name in kubernetes
#   $4: namespace for kubernetes service
# Return:
#   0: wait for external ip successfully
#   1: wait failed
function util::misc::wait_service_external_ip() {
  local kubeconfig_path=$1
  local context_name=$2
  local service_name=$3
  local namespace=$4
  local external_ip
  local tmp
  for tmp in {1..30}; do
    set +e
    ## if .status.loadBalancer does not have `ingress` field, return "".
    ## if .status.loadBalancer has `ingress` field but one of `ingress` field does not have `hostname` or `ip` field, return "<no value>".
    external_host=$(kubectl --context="${context_name}" get service "${service_name}" -n "${namespace}" --template="{{range .status.loadBalancer.ingress}}{{.hostname}} {{end}}" | xargs)
    external_ip=$(kubectl --context="${context_name}" get service "${service_name}" -n "${namespace}" --template="{{range .status.loadBalancer.ingress}}{{.ip}} {{end}}" | xargs)
    set -e
    if [[ ! -z "${external_host}" && "${external_host}" != "<no value>" ]]; then # Compatibility with hostname, such as AWS
      external_ip=$external_host
    fi
    if [[ -z "${external_ip}" || "${external_ip}" = "<no value>" ]]; then
      echo "wait the external ip of ${service_name} ready..."
      sleep 6
      continue
    else
      SERVICE_EXTERNAL_IP="${external_ip}"
      return 0
    fi
  done
  return 1
}

# util::misc::get_load_balancer_ip get a valid load balancer ip from kubernetes service's 'loadBalancer' , if not, wait until timeout
# NOTICE:
#   this function will set global variable SERVICE_EXTERNAL_IP.
#   call 'util::misc::wait_service_external_ip' before using this function
# Parameters:
# Return: 
#   load balancer ip
function util::misc::get_load_balancer_ip() {
  local tmp
  local first_ip
  if [[ -n "${SERVICE_EXTERNAL_IP}" ]]; then
    first_ip=$(echo "${SERVICE_EXTERNAL_IP}" | awk '{print $1}') #temporarily choose the first one
    for tmp in {1..10}; do
      #if it is a host, check dns first
      if [[ ! "${first_ip}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        if ! nslookup "${first_ip}" > /dev/null; then # host dns lookup failed
          sleep 30
          continue
        fi
      fi
      set +e
      connect_test=$(curl -s -k -m 5 https://"${first_ip}":5443/readyz)
      set -e
      if [[ "${connect_test}" = "ok" ]]; then
        echo "${first_ip}"
        return 0
      else
        sleep 3
        continue
      fi
    done
  fi
  return 1
}


############################
# sys util
############################

# This function will return os name, only linux and macos are allowed
# Parameters:
# Return: 
#   os name
function util::misc::get_os_name() {
  local aliased_os
  uname_out=$(uname -a)
  case "${uname_out}" in
    Linux*)
      aliased_os="linux"
      ;;
    Darwin*)
      aliased_os="darwin"
      ;;
    *)
      aliased_os="unknown:${uname_out}"
      ;;
  esac
  echo "${aliased_os}"
}

# This function will return arch name
# Parameters:
# Return: 
#   os arch
function util::misc::get_os_arch() {
  local aliased_arch
  uname_out=$(uname -m)
  case "${uname_out}" in
    x86_64)
      aliased_arch="amd64"
      ;;
    *)
      aliased_arch="${uname_out}"
      ;;
  esac
  echo "${aliased_arch}"
}

# This function will return host_platform info
# NOTICE:
#   this function need golang as requirement
# Parameters:
# Return:
#   host_platform info
function util::misc::host_platform() {
  echo "$(go env GOHOSTOS)/$(go env GOHOSTARCH)"
}


############################
# kind util
############################

# util::misc::create_cluster creates a kind cluster and don't wait for control plane node to be ready.
# after create kind cluster, you should use util::verify::check_clusters_ready before interacting with kind cluster
# Parameters:
#   $1: cluster_name, such as "member-1"
#   $2: kubeconfig file, such as "~/.kube/member-tmp-member1.config"
#   $3: node docker image to use for booting the cluster, such as "kindest/node:v1.19.1"
#   $4: log file path, such as "/tmp/logs/"
#   $5: kind cluster config file, optional
# Return: 
function util::misc::create_cluster() {
  local cluster_name=${1}
  local kubeconfig=${2}
  local kind_image=${3}
  local log_path=${4}
  local cluster_config=${5:-}
  DEBUG "Create cluster params: cluster_name:${cluster_name} kubeconfig:${kubeconfig} kind_image:${kind_image} \
    log_path:${log_path} cluster_config:${cluster_config}"

  mkdir -p "${log_path}"
  rm -rf "${log_path}/${cluster_name}.log"
  rm -f "${kubeconfig}"

  nohup kind create cluster --name "${cluster_name}" --kubeconfig="${kubeconfig}" --image="${kind_image}" --config="${cluster_config}" >> "${log_path}"/"${cluster_name}".log 2>&1 &
  INFO "Creating cluster ${cluster_name} and the log file is in ${log_path}/${cluster_name}.log"
}

# util::misc::kubectl_with_retry will retry if execute kubectl command failed
# tolerate kubectl command failure that may happen before the pod is created by  StatefulSet/Deployment.
# NOTICE:
#   all of the input parameters will not be checked, pass to kubectl directly
# Parameters:
#   $1: cluster name, such as "host"
# Return:
#   0: execute kubectl command after limited retry
#   1: cannot execute kubectl command correctly after limited retry
function util::misc::kubectl_with_retry() {
  local ret=0
  for i in {1..10}; do
    kubectl "$@"
    ret=$?
    if [[ ${ret} -ne 0 ]]; then
      INFO "kubectl $* failed, retrying(${i} times)"
      sleep 1
      continue
    else
      return 0
    fi
  done

  ERROR "kubectl $* failed"
  kubectl "$@"
  return ${ret}
}

# util::misc::wait_cluster_ready waits for cluster state becomes ready until timeout.
# Parameters:
#   $1: kubeconfig file, such as "~/.kube/karmada.config"
#   $2: context name for control plane, such as "karmada-apiserver"
#   $3: context name for member cluster, such as "member1"
# Return:
#   0: waiting cluster ready successfully
#   1: waiting cluster ready failed
function util::misc::wait_cluster_ready() {
  local kubeconfig_file=$1
  local context_name=$2
  local cluster_name=$3

  echo "wait the cluster $cluster_name onBoard..."
  set +e
  util::misc::kubectl_with_retry \
    --kubeconfig="${kubeconfig_file}" --context="$context_name" \
    wait --for=condition=Ready --timeout=60s clusters "${cluster_name}"
  ret=$?
  set -e
  if [ $ret -ne 0 ]; then
    echo "kubectl describe info:"
    kubectl --context="$context_name" describe clusters "${cluster_name}"
  fi
  return ${ret}
}

# util::misc::wait_pod_ready waits for pod state becomes ready until timeout.
# Parameters:
#   $1: kubeconfig file, such as "~/.kube/karmada.config"
#   $2: context name in kubeconfig file, such as "karmada-apiserver"
#   $3: pod label, such as "app=etcd"
#   $4: pod namespace, such as "karmada-system"
#   $5: time out, such as "200s", default is 30s
# Return:
#   0: waiting pod ready successfully
#   1: waiting pod ready failed
function util::misc::wait_pod_ready() {
  local kubeconfig_path=$1
  local context_name=$2
  local pod_label=$3
  local pod_namespace=$4
  local timeout=${5:-30s}

  INFO "wait the $pod_label ready..."
  set +e
  util::misc::kubectl_with_retry \
    --kubeconfig="${kubeconfig_path}" --context="$context_name" \
    wait --for=condition=Ready --timeout="${timeout}" pods -l app="${pod_label}" -n "${pod_namespace}"
  ret=$?
  set -e
  if [ $ret -ne 0 ];then
    echo "kubectl describe info:"
    kubectl --kubeconfig="${kubeconfig_path}" --context="$context_name" describe pod -l app="${pod_label}" -n "${pod_namespace}"
    echo "kubectl logs info:"
    kubectl --kubeconfig="${kubeconfig_path}" --context="$context_name" logs -l app="${pod_label}" -n "${pod_namespace}"
  fi
  return ${ret}
}

# This function gets apiserver's ip from kubeconfig by context name
# Parameters:
#   $1: kubeconfig file, such as "~/.kube/karmada.config"
#   $2: context name in kubeconfig file, such as "karmada-apiserver"
# Return:
#   apiserver's ip
function util::misc::get_apiserver_ip_from_kubeconfig() {
  local kubeconfig_path=$1
  local context_name=$2
  local cluster_name apiserver_url
  # shellcheck disable=SC2016
  cluster_name=$(kubectl config view --kubeconfig="${kubeconfig_path}" --template='{{ range $_, $value := .contexts }}{{if eq $value.name '"\"${context_name}\""'}}{{$value.context.cluster}}{{end}}{{end}}')
  # shellcheck disable=SC2016
  apiserver_url=$(kubectl config view --kubeconfig="${kubeconfig_path}" --template='{{range $_, $value := .clusters }}{{if eq $value.name '"\"${cluster_name}\""'}}{{$value.cluster.server}}{{end}}{{end}}')
  echo "${apiserver_url}" | awk -F/ '{print $3}' | sed 's/:.*//'
}

############################
# docker util
############################

# This function returns the IP address of a docker instance, for linux
# Parameters:
#   $1: docker instance name
# Return:
#   container ip
function util::misc::get_docker_native_ipaddress() {
  local container_name=$1
  docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${container_name}"
}

# This function returns the IP address and port of a specific docker instance's host IP, for macos
# NOTICE:
#   Use for getting host IP and port for cluster
#   "6443/tcp" assumes that API server port is 6443 and protocol is TCP
# Parameters:
#   $1: docker instance name
# Return:
#   container ip
function util::misc::get_docker_host_ip_port() {
  local container_name=$1
  docker inspect --format='{{range $key, $value := index .NetworkSettings.Ports "6443/tcp"}}{{if eq $key 0}}{{$value.HostIp}}:{{$value.HostPort}}{{end}}{{end}}' "${container_name}"
}

############################
# network util
############################

# util::misc::add_routes will add routes for given kind cluster
# Parameters:
#   $1: name of the kind cluster want to add routes
#   $2: the kubeconfig path of the cluster wanted to be connected
#   $3: the context in kubeconfig of the cluster wanted to be connected
# Return:
function util::misc::add_routes() {
  unset IFS
  routes=$(kubectl --kubeconfig "${2}" --context "${3}" get nodes -o jsonpath='{range .items[*]}ip route add {.spec.podCIDR} via {.status.addresses[?(.type=="InternalIP")].address}{"\n"}{end}')
  INFO "Connecting cluster ${1} to ${2}"

  IFS=$'\n'
  for n in $(kind get nodes --name "${1}"); do
    for r in $routes; do
      DEBUG "exec cmd in docker $n $r"
      eval "docker exec $n $r"
    done
  done
  unset IFS
}


############################
# cert util
############################

# util::misc::create_signing_certkey creates a CA
# Parameters:
#   $1: whether in sudo mode, if not in sudo mode, just pass ""
#   $2: dest_dir to store certs
#   $3: cert identifier, generated cert will be like ${3}.crt/${3}.key
#   $4: common name
#   $5: purpose for generate cert, only a mark
# Return:
function util::misc::create_signing_certkey() {
    local sudo=$1
    local dest_dir=$2
    local id=$3
    local cn=$4
    local purpose=$5
    # Create ca
    ${sudo} /usr/bin/env bash -e <<EOF
    rm -f "${dest_dir}/${id}.crt" "${dest_dir}/${id}.key"
    openssl req -x509 -sha256 -new -nodes -days 3650 -newkey rsa:2048 -keyout "${dest_dir}/${id}.key" -out "${dest_dir}/${id}.crt" -subj "/CN=${cn}/"
    echo '{"signing":{"default":{"expiry":"43800h","usages":["signing","key encipherment",${purpose}]}}}' > "${dest_dir}/${id}-config.json"
EOF
}


# util::misc::create_certkey signs a certificate
# Parameters:
#  - $1: whether in sudo mode, if not in sudo mode, just pass ""
#  - $2: dest_dir to store certs
#  - $3: name of certificate authority
#  - $4: identifier of cert name
#  - $5: common name
#  - $6: organization
# Return:
function util::misc::create_certkey() {
    local sudo=$1
    local dest_dir=$2
    local ca=$3
    local id=$4
    local cn=${5:-$4}
    local og=$6
    local hosts=""
    local SEP=""
    shift 6
    while [[ -n "${1:-}" ]]; do
        hosts+="${SEP}\"$1\""
        SEP=","
        shift 1
    done
    ${sudo} /usr/bin/env bash -e <<EOF
    cd ${dest_dir}
    echo '{"CN":"${cn}","hosts":[${hosts}],"names":[{"O":"${og}"}],"key":{"algo":"rsa","size":2048}}' | cfssl gencert -ca=${ca}.crt -ca-key=${ca}.key -config=${ca}-config.json - | cfssljson -bare ${id}
    mv "${id}-key.pem" "${id}.key"
    mv "${id}.pem" "${id}.crt"
    rm -f "${id}.csr"
EOF
}

# util::misc::append_client_kubeconfig creates a new context including a cluster and a user to the existed kubeconfig file
# Parameters:
#   $1: kubeconfig file, such as "~/.kube/karmada.config"
#   $2: client_certificate_file
#   $3: client_key_file
#   $4: api_host
#   $5: api_port
#   $6: client_id
#   $7: token
# Return:
function util::misc::append_client_kubeconfig() {
    local kubeconfig_path=$1
    local client_certificate_file=$2
    local client_key_file=$3
    local api_host=$4
    local api_port=$5
    local client_id=$6
    local token=${7:-}
    kubectl config set-cluster "${client_id}" --server=https://"${api_host}:${api_port}" --insecure-skip-tls-verify=true --kubeconfig="${kubeconfig_path}"
    kubectl config set-credentials "${client_id}" --token="${token}" --client-certificate="${client_certificate_file}" --client-key="${client_key_file}" --embed-certs=true --kubeconfig="${kubeconfig_path}"
    kubectl config set-context "${client_id}" --cluster="${client_id}" --user="${client_id}" --kubeconfig="${kubeconfig_path}"
}

# util::misc::fill_cabundle replace caBundle variable in target file
# Parameters:
#  - $1: ca file path
#  - $2: conf file path, such path to a k8s yaml file
# Return:
function util::misc::fill_cabundle() {
  local ca_file=$1
  local conf=$2

  # shellcheck disable=SC2002,SC2155
  local ca_string=$(cat "${ca_file}" | base64 | tr "\n" " "|sed s/[[:space:]]//g)
  sed -i'' -e "s/{{caBundle}}/${ca_string}/g" "${conf}"
}
