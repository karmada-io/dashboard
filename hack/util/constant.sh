#!/bin/bash
# Copyright 2024 The Karmada Authors.
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

DEFAULT_KUBECONFIG_DIR="${HOME}"/.kube
DEFAULT_KARMADA_KUBECONFIG="karmada.config"
DEFAULT_MEMBER_CLUSTER_KUBECONFIG="members.config"
DEFAULT_KARMADA_KUBECONFIG_PATH=${DEFAULT_KUBECONFIG_DIR}/${DEFAULT_KARMADA_KUBECONFIG}
DEFAULT_MEMBER_CLUSTER_KUBECONFIG_PATH=${DEFAULT_KUBECONFIG_DIR}/${DEFAULT_MEMBER_CLUSTER_KUBECONFIG}
DEFAULT_KARMADA_HOST_CONTEXT="karmada-host"
DEFAULT_KARMADA_APISERVER_CONTEXT="karmada-apiserver"

DEFAULT_CERT_DIR="${HOME}"/.karmada

DEFAULT_REGISTRY="docker.io"
DEFAULT_CLUSTER_VERSION="v1.27.11"
KARMADA_VERSION="v1.9.0"

DEFAULT_KARMADA_IMAGES=(
  "docker.io/karmada/karmada-controller-manager:${KARMADA_VERSION}"
  "docker.io/karmada/karmada-scheduler:${KARMADA_VERSION}"
  "docker.io/karmada/karmada-descheduler:${KARMADA_VERSION}"
  "docker.io/karmada/karmada-webhook:${KARMADA_VERSION}"
  "docker.io/karmada/karmada-scheduler-estimator:${KARMADA_VERSION}"
  "docker.io/karmada/karmada-aggregated-apiserver:${KARMADA_VERSION}"
  "docker.io/karmada/karmada-search:${KARMADA_VERSION}"
  "docker.io/karmada/karmada-metrics-adapter:${KARMADA_VERSION}"
  "docker.io/karmada/karmada-agent:${KARMADA_VERSION}"
)

DEFAULT_THIRD_PARTY_IMAGES=(
  "registry.k8s.io/etcd:3.5.9-0"
  "registry.k8s.io/kube-apiserver:${DEFAULT_CLUSTER_VERSION}"
  "registry.k8s.io/kube-controller-manager:${DEFAULT_CLUSTER_VERSION}"
  "registry.k8s.io/metrics-server/metrics-server:v0.6.3"
)
DEFAULT_IMAGES=(
  "${DEFAULT_KARMADA_IMAGES[@]}"
  "${DEFAULT_THIRD_PARTY_IMAGES[@]}"
)


KARMADA_SYSTEM_NAMESPACE="karmada-system"
ETCD_POD_LABEL="etcd"
APISERVER_POD_LABEL="karmada-apiserver"
KUBE_CONTROLLER_POD_LABEL="kube-controller-manager"
KARMADA_AGGREGATION_APISERVER_LABEL="karmada-aggregated-apiserver"
KARMADA_CONTROLLER_LABEL="karmada-controller-manager"
KARMADA_SCHEDULER_LABEL="karmada-scheduler"
KARMADA_WEBHOOK_LABEL="karmada-webhook"
AGENT_POD_LABEL="karmada-agent"
INTERPRETER_WEBHOOK_EXAMPLE_LABEL="karmada-interpreter-webhook-example"
KARMADA_SEARCH_LABEL="karmada-search"
KARMADA_OPENSEARCH_LABEL="karmada-opensearch"
KARMADA_OPENSEARCH_DASHBOARDS_LABEL="karmada-opensearch-dashboards"
KARMADA_METRICS_ADAPTER_LABEL="karmada-metrics-adapter"

KARMADA_GO_PACKAGE="github.com/karmada-io/dashboard"
KARMADA_TARGET_SOURCE=(
  karmada-dashboard-api=cmd/api
  karmada-dashboard-web=cmd/web
)


#https://textkool.com/en/ascii-art-generator?hl=default&vl=default&font=DOS%20Rebel&text=KARMADA
KARMADA_GREETING='
------------------------------------------------------------------------------------------------------
 █████   ████   █████████   ███████████   ██████   ██████   █████████   ██████████     █████████
░░███   ███░   ███░░░░░███ ░░███░░░░░███ ░░██████ ██████   ███░░░░░███ ░░███░░░░███   ███░░░░░███
 ░███  ███    ░███    ░███  ░███    ░███  ░███░█████░███  ░███    ░███  ░███   ░░███ ░███    ░███
 ░███████     ░███████████  ░██████████   ░███░░███ ░███  ░███████████  ░███    ░███ ░███████████
 ░███░░███    ░███░░░░░███  ░███░░░░░███  ░███ ░░░  ░███  ░███░░░░░███  ░███    ░███ ░███░░░░░███
 ░███ ░░███   ░███    ░███  ░███    ░███  ░███      ░███  ░███    ░███  ░███    ███  ░███    ░███
 █████ ░░████ █████   █████ █████   █████ █████     █████ █████   █████ ██████████   █████   █████
░░░░░   ░░░░ ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░     ░░░░░ ░░░░░   ░░░░░ ░░░░░░░░░░   ░░░░░   ░░░░░
------------------------------------------------------------------------------------------------------
'
