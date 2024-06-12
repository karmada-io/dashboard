#!/bin/bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
SHELL_FOLDER=$(pwd)
REPO_ROOT=$(cd ../ && pwd)
source "${REPO_ROOT}"/hack/util/init.sh && util:init:init_scripts

function usage() {
  echo "This script deploys karmada control plane components to a given cluster."
  echo "Note: This script is an internal script and is not intended used by end-users."
  echo "Usage: hack/deploy-karmada.sh <KARMADA_HOST_KUBECONFIG> <KARMADA_HOST> <KARMADA_APISERVER> [KARMADA_HOST_CLUSTER_TYPE]"
  echo "Example: hack/deploy-karmada.sh ~/.kube/config karmada-host karmada-apiserver local"
  echo "Parameters:"
  echo "        KARMADA_HOST_KUBECONFIG          path to karmada-host kubeconfig"
  echo "        KARMADA_HOST                     context-name in KARMADA_HOST_KUBECONFIG"
  echo "        KARMADA_APISERVER                context-name for karmada-apiserver,"
  echo "                                         this script will append karmada-apiserver kubeconfig to KARMADA_HOST_KUBECONFIG"
  echo "        KARMADA_HOST_CLUSTER_TYPE        The type of your cluster that will install Karmada. Optional values are 'local' and 'remote',"
  echo "                                         'local' is default, as that is for the local environment, i.e. for the cluster created by kind."
  echo "                                         And if you want to install karmada to a standalone cluster, set it as 'remote'"
}

if [[ $# -ne 3 && $# -ne 4 ]]; then
  usage
  exit 1
fi


# parse from arguments
KARMADA_HOST_KUBECONFIG=${1}
KARMADA_HOST=${2}
KARMADA_APISERVER=${3}
# KARMADA_HOST_CLUSTER_TYPE can be 'local'/'remote'
# default value of KARMADA_HOST_CLUSTER_TYPE is local, i.e. cluster created by kind.
KARMADA_HOST_CLUSTER_TYPE=${4:-"local"}
# after karmada deployed, the kubeconfig for karmada apiserver will be append to KARMADA_HOST_KUBECONFIG
# by invoking util::misc::append_client_kubeconfig, so we use KARMADA_KUBECONFIG_PATH as an alias to KARMADA_HOST_KUBECONFIG
KARMADA_KUBECONFIG_PATH=${KARMADA_HOST_KUBECONFIG}



# variable define
CERT_DIR=${CERT_DIR:-${DEFAULT_CERT_DIR}}
ROOT_CA_FILE=${CERT_DIR}/ca.crt
ROOT_CA_KEY=${CERT_DIR}/ca.key

# whether create a 'LoadBalancer' type service for karmada apiserver
LOAD_BALANCER=${LOAD_BALANCER:-false}
KARMADA_APISERVER_SECURE_PORT=${KARMADA_APISERVER_SECURE_PORT:-5443}

ARTIFACTS_DIR="${REPO_ROOT}"/artifacts

# execute kubectl cmd on ${KARMADA_HOST}
# NOTICE:
#   karmada_host_kubectl will use global variable ${KARMADA_KUBECONFIG_PATH} and ${KARMADA_HOST}
#   this function can used only if
#   util::verify::check_kubeconfig_and_context "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" passed
function karmada_host_kubectl() {
  kubectl --kubeconfig="${KARMADA_KUBECONFIG_PATH}" --context="${KARMADA_HOST}" "$@"
}

# execute kubectl cmd on ${KARMADA_APISERVER}
# NOTICE:
#   karmada_apiserver_kubectl will use global variable ${KARMADA_KUBECONFIG_PATH} and ${KARMADA_APISERVER}
#   this function can used only if
#   util::verify::check_kubeconfig_and_context "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_APISERVER}" passed
function karmada_apiserver_kubectl() {
  kubectl --kubeconfig="${KARMADA_KUBECONFIG_PATH}" --context="${KARMADA_APISERVER}" "$@"
}


INFO "Check necessary clis"
for cli in "openssl" "cfssl" "cfssljson" "nslookup"; do
  cli_check_result=$(util::verify::check_cmd ${cli}; echo $?)
  if [[ ${cli_check_result} -eq 0 ]]; then
    NOTICE "CLI check: '${cli}' existence check - PASSED"
  else
    ERROR "CLI check: '${cli}' existence check - NOT PASSED"
    ERROR "It seems that '${cli}' is not installed on your machine, please install '${cli}' follow the instructions provided by $(util::misc::print_install_tips ${cli})"
    exit 1
  fi
done


INFO "Check kubeconfig and context-name for ${KARMADA_HOST}"
check_karmada_host_result=$(util::verify::check_kubeconfig_and_context "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}"; echo $?)
if [[ ${check_karmada_host_result} -eq 0 ]]; then
  NOTICE "Kubeconfig check for ${KARMADA_HOST} - PASSED"
else
  ERROR "Kubeconfig check for ${KARMADA_HOST} - NOT PASSED"
  ERROR "Please check the existence of kubeconfig[${KARMADA_KUBECONFIG_PATH}] and validity of context[${KARMADA_HOST}]"
  exit 1
fi

# Use x.x.x.8 IP address, which is the same CIDR with the node address of the Kind cluster,
# as the loadBalancer service address of component karmada-interpreter-webhook-example.
apiserver_ip=$(util::misc::get_apiserver_ip_from_kubeconfig "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}")
interpreter_webhook_example_service_external_ip_prefix=$(echo "${apiserver_ip}" | awk -F. '{printf "%s.%s.%s",$1,$2,$3}')
interpreter_webhook_example_service_external_ip_address=${interpreter_webhook_example_service_external_ip_prefix}.8

# KARMADA_APISERVER_SERVICE_TYPE is the service type of karmada API Server,
# For connectivity, it will be different when KARMADA_HOST_CLUSTER_TYPE is different.
# When KARMADA_HOST_CLUSTER_TYPE=local,  we will create a ClusterIP type Service. And when
# When KARMADA_HOST_CLUSTER_TYPE=remote, we directly use hostNetwork to access Karmada API Server outside the
# karmada-host cluster. Of course, you can create a LoadBalancer service by setting $LOAD_BALANCER=true
KARMADA_APISERVER_SERVICE_TYPE="ClusterIP"
if [ "${KARMADA_HOST_CLUSTER_TYPE}" = "local" ]; then
  # local mode
  KARMADA_APISERVER_IP=${apiserver_ip}
else
  # remote mode
  # KARMADA_APISERVER_IP will be got when Karmada API Server is ready
  if [ "${LOAD_BALANCER}" = true ]; then
    KARMADA_APISERVER_SERVICE_TYPE="LoadBalancer"
  fi
  # make sure HOST_CLUSTER_TYPE is in local and remote
  KARMADA_HOST_CLUSTER_TYPE="remote"
fi


INFO "Clean outdated cert dir"
mkdir -p "${CERT_DIR}" &>/dev/null ||  mkdir -p "${CERT_DIR}"
rm -f "${CERT_DIR}/*" &>/dev/null ||  rm -f "${CERT_DIR}/*"


# prepare artifacts
# for debug
# TEMP_PATH="/tmp/tmp.IfZpx6WpRn"
# mkdir -p ${TEMP_PATH}
TEMP_PATH=$(mktemp -d)
trap '{ rm -rf ${TEMP_PATH}; }' EXIT
INFO "Prepare artifacts in path: ${TEMP_PATH}"
cp -rf "${REPO_ROOT}"/artifacts/deploy "${TEMP_PATH}"
# ${DEPLOY_DIR} has the same files as ${REPO_ROOT}"/artifacts/deploy
DEPLOY_DIR="${TEMP_PATH}"/deploy


INFO "Prepare cert in path: ${CERT_DIR}"

INFO "Create CA signers"
DEBUG "Create CA[ca] signers"
util::misc::create_signing_certkey \
  "" "${CERT_DIR}" \
  "ca" "karmada" '"client auth","server auth"'
DEBUG "Create CA[front-proxy-ca] signers"
util::misc::create_signing_certkey \
  "" "${CERT_DIR}" \
  "front-proxy-ca" "front-proxy-ca" '"client auth","server auth"'
DEBUG "Create CA[etcd-ca] signers"
util::misc::create_signing_certkey \
  "" "${CERT_DIR}" \
  "etcd-ca" "etcd-ca" '"client auth","server auth"'

INFO "Sign certificates"
util::misc::create_certkey \
  "" "${CERT_DIR}" \
  "ca" "karmada" "system:admin" "system:masters" \
  "kubernetes.default.svc" "*.etcd.karmada-system.svc.cluster.local" "*.karmada-system.svc.cluster.local" "*.karmada-system.svc" "localhost" "127.0.0.1" "${interpreter_webhook_example_service_external_ip_address}"
util::misc::create_certkey \
  "" "${CERT_DIR}" \
  "ca" "apiserver" "karmada-apiserver" "" \
  "*.etcd.karmada-system.svc.cluster.local" "*.karmada-system.svc.cluster.local" "*.karmada-system.svc" "localhost" "127.0.0.1" "${apiserver_ip}"
util::misc::create_certkey \
  "" "${CERT_DIR}" \
  "front-proxy-ca" "front-proxy-client" "front-proxy-client" "" \
  "kubernetes.default.svc" "*.etcd.karmada-system.svc.cluster.local" "*.karmada-system.svc.cluster.local" "*.karmada-system.svc" "localhost" "127.0.0.1"
util::misc::create_certkey \
  "" "${CERT_DIR}" \
  "etcd-ca" "etcd-server" "etcd-server" "" \
  "kubernetes.default.svc" "*.etcd.karmada-system.svc.cluster.local" "*.karmada-system.svc.cluster.local" "*.karmada-system.svc" "localhost" "127.0.0.1"
util::misc::create_certkey \
  "" "${CERT_DIR}" \
  "etcd-ca" "etcd-client" "etcd-client" "" \
  "*.etcd.karmada-system.svc.cluster.local" "*.karmada-system.svc.cluster.local" "*.karmada-system.svc" "localhost" "127.0.0.1"

INFO "Create namespace on ${KARMADA_HOST}"
karmada_host_kubectl apply -f "${DEPLOY_DIR}"/namespace.yaml | INFO


INFO "Encode certificates"
karmada_ca=$(base64 < "${ROOT_CA_FILE}" | tr -d '\r\n')
karmada_ca_key=$(base64 < "${ROOT_CA_KEY}" | tr -d '\r\n')
karmada_crt=$(base64 < "${CERT_DIR}/karmada.crt" | tr -d '\r\n')
karmada_key=$(base64 < "${CERT_DIR}/karmada.key" | tr -d '\r\n')
karmada_apiserver_crt=$(base64 < "${CERT_DIR}/apiserver.crt" | tr -d '\r\n')
karmada_apiserver_key=$(base64 < "${CERT_DIR}/apiserver.key" | tr -d '\r\n')
front_proxy_ca_crt=$(base64 < "${CERT_DIR}/front-proxy-ca.crt" | tr -d '\r\n')
front_proxy_client_crt=$(base64 < "${CERT_DIR}/front-proxy-client.crt" | tr -d '\r\n')
front_proxy_client_key=$(base64 < "${CERT_DIR}/front-proxy-client.key" | tr -d '\r\n')
etcd_ca_crt=$(base64 < "${CERT_DIR}/etcd-ca.crt" | tr -d '\r\n')
etcd_server_crt=$(base64 < "${CERT_DIR}/etcd-server.crt" | tr -d '\r\n')
etcd_server_key=$(base64 < "${CERT_DIR}/etcd-server.key" | tr -d '\r\n')
etcd_client_crt=$(base64 < "${CERT_DIR}/etcd-client.crt" | tr -d '\r\n')
etcd_client_key=$(base64 < "${CERT_DIR}/etcd-client.key" | tr -d '\r\n')


INFO "Replace variables and apply to cluster"
karmada_cert_secret_path="${DEPLOY_DIR}"/karmada-cert-secret.yaml
secret_path="${DEPLOY_DIR}"/secret.yaml
karmada_webhook_cert_secret_path="${DEPLOY_DIR}"/karmada-webhook-cert-secret.yaml
for secret_file in ${karmada_cert_secret_path} ${secret_path} ${karmada_webhook_cert_secret_path}; do
  INFO "Replace variables for ${secret_file}"
  sed -i'' -e "s/{{ca_crt}}/${karmada_ca}/g" "${secret_file}"
  sed -i'' -e "s/{{ca_key}}/${karmada_ca_key}/g" "${secret_file}"
  sed -i'' -e "s/{{client_crt}}/${karmada_crt}/g" "${secret_file}"
  sed -i'' -e "s/{{client_key}}/${karmada_key}/g" "${secret_file}"
  sed -i'' -e "s/{{apiserver_crt}}/${karmada_apiserver_crt}/g" "${secret_file}"
  sed -i'' -e "s/{{apiserver_key}}/${karmada_apiserver_key}/g" "${secret_file}"
  sed -i'' -e "s/{{front_proxy_ca_crt}}/${front_proxy_ca_crt}/g" "${secret_file}"
  sed -i'' -e "s/{{front_proxy_client_crt}}/${front_proxy_client_crt}/g" "${secret_file}"
  sed -i'' -e "s/{{front_proxy_client_key}}/${front_proxy_client_key}/g" "${secret_file}"
  sed -i'' -e "s/{{etcd_ca_crt}}/${etcd_ca_crt}/g" "${secret_file}"
  sed -i'' -e "s/{{etcd_server_crt}}/${etcd_server_crt}/g" "${secret_file}"
  sed -i'' -e "s/{{etcd_server_key}}/${etcd_server_key}/g" "${secret_file}"
  sed -i'' -e "s/{{etcd_client_crt}}/${etcd_client_crt}/g" "${secret_file}"
  sed -i'' -e "s/{{etcd_client_key}}/${etcd_client_key}/g" "${secret_file}"
  sed -i'' -e "s/{{server_key}}/${karmada_key}/g" "${secret_file}"
  sed -i'' -e "s/{{server_certificate}}/${karmada_crt}/g" "${secret_file}"

  INFO "Apply ${secret_file} on ${KARMADA_HOST}"
  karmada_host_kubectl apply -f "${secret_file}" | INFO
done


# deploy etcd
INFO "Start deploy etcd on ${KARMADA_HOST}"
karmada_host_kubectl apply -f "${REPO_ROOT}"/artifacts/deploy/karmada-etcd.yaml | while IFS= read -r line; do
   INFO "$line"
done
INFO "Wait for etcd is ready"
util::misc::wait_pod_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${ETCD_POD_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
INFO "Etcd is ready"

INFO "Replace variables in yaml files"
for k8s_resource_file in $(find "${DEPLOY_DIR}" -maxdepth 1 -type f | grep -e "\.yaml$"); do
  sed -i'' -e "s/{{KARMADA_VERSION}}/${KARMADA_VERSION}/g" "${k8s_resource_file}"
done
sed -i'' -e "s/{{service_type}}/${KARMADA_APISERVER_SERVICE_TYPE}/g" "${DEPLOY_DIR}"/karmada-apiserver.yaml

INFO "Create apiserver service on ${KARMADA_HOST}"
karmada_host_kubectl apply -f "${DEPLOY_DIR}"/karmada-apiserver.yaml | while IFS= read -r line; do
  INFO "$line"
done
INFO "Wait for karmada-apiserver is ready"
util::misc::wait_pod_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${APISERVER_POD_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
INFO "Karmada-apiserver is ready"

# get Karmada apiserver IP at remote mode
if [ "${KARMADA_HOST_CLUSTER_TYPE}" = "remote" ]; then
  case $KARMADA_APISERVER_SERVICE_TYPE in
    'ClusterIP')
      KARMADA_APISERVER_IP=$(karmada_host_kubectl get pod -l app=karmada-apiserver -n "${KARMADA_SYSTEM_NAMESPACE}" -o=jsonpath='{.items[0].status.podIP}')
      ;;
    'LoadBalancer')
      if util::misc::wait_service_external_ip "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" "karmada-apiserver" "${KARMADA_SYSTEM_NAMESPACE}"; then
        INFO "Get service external IP: ${SERVICE_EXTERNAL_IP}, wait to check network connectivity"
        KARMADA_APISERVER_IP=$(util::misc::get_load_balancer_ip) || KARMADA_APISERVER_IP=''
      else
        ERROR "Wait service external IP timeout, please check the load balancer IP of service: karmada-apiserver"
        exit 1
      fi
      ;;
  esac
fi


if [[ -n "${KARMADA_APISERVER_IP}" ]]; then
  INFO "Karmada API Server's IP is: ${KARMADA_APISERVER_IP}, host cluster type is: ${KARMADA_HOST_CLUSTER_TYPE}"
else
  ERROR "Failed to get Karmada API server IP after creating service 'karmada-apiserver' (host cluster type: ${KARMADA_HOST_CLUSTER_TYPE}), please verify."
  exit 1
fi


# write karmada api server config to kubeconfig file
INFO "Append ${KARMADA_APISERVER} context to ${KARMADA_KUBECONFIG_PATH}"
util::misc::append_client_kubeconfig \
  "${KARMADA_KUBECONFIG_PATH}" \
  "${CERT_DIR}/karmada.crt" "${CERT_DIR}/karmada.key" \
  "${KARMADA_APISERVER_IP}" "${KARMADA_APISERVER_SECURE_PORT}" "${KARMADA_APISERVER}"



INFO "Check kubeconfig and context-name for ${KARMADA_HOST}"
check_karmada_apiserver_result=$(util::verify::check_kubeconfig_and_context "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_APISERVER}"; echo $?)
if [[ ${check_karmada_apiserver_result} -eq 0 ]]; then
  NOTICE "Kubeconfig check for ${KARMADA_APISERVER} - PASSED"
else
  ERROR "Kubeconfig check for ${KARMADA_APISERVER} - NOT PASSED"
  ERROR "Please check the existence of kubeconfig[${KARMADA_KUBECONFIG_PATH}] and validity of context[${KARMADA_APISERVER}]"
  exit 1
fi

INFO "Create namespace on ${KARMADA_APISERVER}"
karmada_apiserver_kubectl apply -f "${DEPLOY_DIR}"/namespace.yaml | INFO

INFO "Create kube-controller-manager on ${KARMADA_HOST}"
karmada_host_kubectl apply -f "${DEPLOY_DIR}/kube-controller-manager.yaml" | INFO

INFO "Create aggregated-apiserver on ${KARMADA_HOST}"
karmada_host_kubectl apply -f "${DEPLOY_DIR}/karmada-aggregated-apiserver.yaml" | INFO
INFO "Wait for aggregated-apiserver is ready"
util::misc::wait_pod_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${KARMADA_AGGREGATION_APISERVER_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
INFO "Aggregated-apiserver is ready"


INFO "Create karmada-search on ${KARMADA_HOST}"
karmada_host_kubectl apply -f "${DEPLOY_DIR}/karmada-search.yaml" | INFO
INFO "Wait for karmada-search is ready"
util::misc::wait_pod_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${KARMADA_SEARCH_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
INFO "Karmada-search is ready"

INFO "Create karmada-metrics-adapter on ${KARMADA_HOST}"
karmada_host_kubectl apply -f "${DEPLOY_DIR}/karmada-metrics-adapter.yaml" | INFO
INFO "Wait for karmada-metrics-adapter is ready"
util::misc::wait_pod_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${KARMADA_METRICS_ADAPTER_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
INFO "Karmada-metrics-adapter is ready"


crd_dir="${DEPLOY_DIR}/"_crds
util::misc::fill_cabundle "${ROOT_CA_FILE}" "${crd_dir}"/patches/webhook_in_resourcebindings.yaml
util::misc::fill_cabundle "${ROOT_CA_FILE}" "${crd_dir}"/patches/webhook_in_clusterresourcebindings.yaml
karmada_apiserver_kubectl apply -k "${crd_dir}"

# render the caBundle in these apiservice with root ca, then karmada-apiserver can use caBundle to verify corresponding AA's server-cert
util::misc::fill_cabundle "${ROOT_CA_FILE}" "${DEPLOY_DIR}/karmada-aggregated-apiserver-apiservice.yaml"
util::misc::fill_cabundle "${ROOT_CA_FILE}" "${DEPLOY_DIR}/karmada-metrics-adapter-apiservice.yaml"
util::misc::fill_cabundle "${ROOT_CA_FILE}" "${DEPLOY_DIR}/karmada-search-apiservice.yaml"


# deploy webhook configurations on karmada apiserver
sed -i'' -e "s/{{caBundle}}/${karmada_ca}/g" "${DEPLOY_DIR}/webhook-configuration.yaml"
karmada_apiserver_kubectl apply -f "${DEPLOY_DIR}/webhook-configuration.yaml" | INFO


# deploy APIService on karmada apiserver for karmada-aggregated-apiserver
karmada_apiserver_kubectl apply -f "${DEPLOY_DIR}"/karmada-aggregated-apiserver-apiservice.yaml | INFO
# make sure apiservice for v1alpha1.cluster.karmada.io is Available
util::verify::wait_apiservice_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_APISERVER}" \
  "${KARMADA_AGGREGATION_APISERVER_LABEL}"

# deploy APIService on karmada apiserver for karmada-search
karmada_apiserver_kubectl apply -f "${DEPLOY_DIR}"/karmada-search-apiservice.yaml | INFO
# make sure apiservice for v1alpha1.search.karmada.io is Available
util::verify::wait_apiservice_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_APISERVER}" \
  "${KARMADA_SEARCH_LABEL}"

# deploy APIService on karmada apiserver for karmada-metrics-adapter
karmada_apiserver_kubectl apply -f "${DEPLOY_DIR}"/karmada-metrics-adapter-apiservice.yaml | INFO
# make sure apiservice for karmada metrics adapter is Available
util::verify::wait_apiservice_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_APISERVER}" \
  "${KARMADA_METRICS_ADAPTER_LABEL}"

# grant the admin clusterrole read and write permissions for Karmada resources
karmada_apiserver_kubectl apply -f "${DEPLOY_DIR}/admin-clusterrole-aggregation.yaml" | INFO

# deploy cluster proxy rbac for admin
karmada_apiserver_kubectl apply -f "${DEPLOY_DIR}/cluster-proxy-admin-rbac.yaml" | INFO

karmada_apiserver_address=https://"${KARMADA_APISERVER_IP}":"${KARMADA_APISERVER_SECURE_PORT}"
sed -i'' -e "s/{{ca_crt}}/${karmada_ca}/g" "${DEPLOY_DIR}"/bootstrap-token-configuration.yaml
sed -i'' -e "s|{{apiserver_address}}|${karmada_apiserver_address}|g" "${DEPLOY_DIR}"/bootstrap-token-configuration.yaml
karmada_apiserver_kubectl apply -f "${DEPLOY_DIR}"/bootstrap-token-configuration.yaml



# deploy controller-manager on host cluster
karmada_host_kubectl apply -f "${DEPLOY_DIR}"/karmada-controller-manager.yaml | INFO
# deploy scheduler on host cluster
karmada_host_kubectl apply -f "${DEPLOY_DIR}"/karmada-scheduler.yaml | INFO
# deploy descheduler on host cluster
karmada_host_kubectl apply -f "${DEPLOY_DIR}"/karmada-descheduler.yaml | INFO
# deploy webhook on host cluster
karmada_host_kubectl apply -f "${DEPLOY_DIR}"/karmada-webhook.yaml | INFO

# make sure all karmada control plane components are ready
util::misc::wait_pod_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${KARMADA_CONTROLLER_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
util::misc::wait_pod_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${KARMADA_SCHEDULER_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
util::misc::wait_pod_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${KUBE_CONTROLLER_POD_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
util::misc::wait_pod_ready \
  "${KARMADA_KUBECONFIG_PATH}" "${KARMADA_HOST}" \
  "${KARMADA_WEBHOOK_LABEL}" "${KARMADA_SYSTEM_NAMESPACE}"
