#!/usr/bin/env bash
# Copyright 2026 The Karmada Authors.
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

set -o errexit
set -o nounset
set -o pipefail

REPO_ROOT=$(dirname "${BASH_SOURCE[0]}")/..
CERT_DIR=${CERT_DIR:-"${HOME}/.karmada"}
source "${REPO_ROOT}"/hack/util.sh

function usage() {
  echo "Generate and apply a dashboard kubeconfig secret for Karmada Dashboard."
  echo "Usage: hack/generate-karmada-dashboard-kubeconfig.sh <HOST_CLUSTER_KUBECONFIG> <HOST_CONTEXT_NAME>"
  echo "Example: hack/generate-karmada-dashboard-kubeconfig.sh ~/.kube/karmada.config karmada-host"
}

function ensure_karmada_repo_initialized() {
  if [[ -d "${CERT_DIR}" ]]; then
    return
  fi

  echo "ERROR: ${CERT_DIR} does not exist."
  echo "Please clone Karmada first: https://github.com/karmada-io/karmada/"
  echo "Then run: hack/local-up-karmada.sh"
  exit 1
}

function ensure_dashboard_cert_exists() {
  local crt_file="${CERT_DIR}/karmada-dashboard-client.crt"
  local key_file="${CERT_DIR}/karmada-dashboard-client.key"
  local ca_file="${CERT_DIR}/ca.crt"
  local ca_key_file="${CERT_DIR}/ca.key"
  local ca_config_file="${CERT_DIR}/ca-config.json"

  if [[ -f "${crt_file}" && -f "${key_file}" ]]; then
    return
  fi

  if [[ ! -f "${ca_file}" || ! -f "${ca_key_file}" || ! -f "${ca_config_file}" ]]; then
    echo "ERROR: dashboard client cert/key not found in ${CERT_DIR}."
    echo "Expected files:"
    echo "  - ${crt_file}"
    echo "  - ${key_file}"
    echo "And CA files for on-demand generation:"
    echo "  - ${ca_file}"
    echo "  - ${ca_key_file}"
    echo "  - ${ca_config_file}"
    echo "Please run Karmada install first (to generate certs) or provide CERT_DIR."
    exit 1
  fi

  echo "Generating missing dashboard client certificate in ${CERT_DIR}..."
  util::cmd_must_exist "openssl"
  util::cmd_must_exist_cfssl "v1.6.5"
  util::create_certkey "" "${CERT_DIR}" "ca" "karmada-dashboard-client" "system:karmada:karmada-dashboard" "system:masters"
}

function generate_config_secret() {
  local component=$1
  local ca_crt=$2
  local client_crt=$3
  local client_key=$4
  local temp_path=$5

  cp "${REPO_ROOT}"/artifacts/deploy/karmada-config-secret.yaml "${temp_path}"/${component}-config-secret.yaml
  sed -i'' -e "s/\${component}/${component}/g" "${temp_path}"/${component}-config-secret.yaml
  sed -i'' -e "s/\${ca_crt}/${ca_crt}/g" "${temp_path}"/${component}-config-secret.yaml
  sed -i'' -e "s/\${client_crt}/${client_crt}/g" "${temp_path}"/${component}-config-secret.yaml
  sed -i'' -e "s/\${client_key}/${client_key}/g" "${temp_path}"/${component}-config-secret.yaml
  kubectl --kubeconfig="${HOST_CLUSTER_KUBECONFIG}" --context="${HOST_CLUSTER_NAME}" apply -f "${temp_path}"/${component}-config-secret.yaml
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

HOST_CLUSTER_KUBECONFIG=$1
HOST_CLUSTER_NAME=$2

if [[ ! -f "${HOST_CLUSTER_KUBECONFIG}" ]]; then
  echo "ERROR: kubeconfig file not found: ${HOST_CLUSTER_KUBECONFIG}"
  usage
  exit 1
fi

if ! kubectl config get-contexts "${HOST_CLUSTER_NAME}" --kubeconfig="${HOST_CLUSTER_KUBECONFIG}" >/dev/null 2>&1; then
  echo "ERROR: context '${HOST_CLUSTER_NAME}' not found in ${HOST_CLUSTER_KUBECONFIG}"
  usage
  exit 1
fi

ensure_karmada_repo_initialized
ensure_dashboard_cert_exists

if [[ ! -f "${REPO_ROOT}/artifacts/deploy/karmada-config-secret.yaml" ]]; then
  echo "ERROR: missing template file: ${REPO_ROOT}/artifacts/deploy/karmada-config-secret.yaml"
  exit 1
fi

TEMP_PATH=$(mktemp -d)
trap '{ rm -rf "${TEMP_PATH}"; }' EXIT

karmada_ca=$(base64 < "${CERT_DIR}/ca.crt" | tr -d '\r\n')
KARMADA_DASHBOARD_CLIENT_CRT=$(base64 < "${CERT_DIR}/karmada-dashboard-client.crt" | tr -d '\r\n')
KARMADA_DASHBOARD_CLIENT_KEY=$(base64 < "${CERT_DIR}/karmada-dashboard-client.key" | tr -d '\r\n')

generate_config_secret "karmada-dashboard" "${karmada_ca}" "${KARMADA_DASHBOARD_CLIENT_CRT}" "${KARMADA_DASHBOARD_CLIENT_KEY}" "${TEMP_PATH}"

echo "Secret generated successfully:"
echo "  namespace: karmada-system"
echo "  name: karmada-dashboard-config"
echo "You can verify with:"
echo "  kubectl --kubeconfig=\"${HOST_CLUSTER_KUBECONFIG}\" --context=\"${HOST_CLUSTER_NAME}\" -n karmada-system get secret karmada-dashboard-config"
