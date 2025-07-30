# Copyright 2022 The Karmada Authors.
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

# Use the official ttyd image as the base
FROM tsl0922/ttyd:1.7.7

ARG KARMADACTL_VERSION=v1.13.0
ARG KUBECTL_VERSION=v1.32.0
ARG TARGETARCH
ARG TRZSZ_VERSION=1.1.8

# Switch to root so we can install packages or make changes
USER root

# Install required packages
RUN apt-get update && apt-get install -y curl wget && rm -rf /var/lib/apt/lists/*

# Download and install kubectl
RUN curl -fLo /usr/local/bin/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl" \
  && chmod +x /usr/local/bin/kubectl

# Download and install karmadactl using the version ARG
RUN curl -fL "https://github.com/karmada-io/karmada/releases/download/${KARMADACTL_VERSION}/karmadactl-linux-${TARGETARCH}.tgz" \
    | tar -xzf - -C /usr/local/bin karmadactl \
    && chmod +x /usr/local/bin/karmadactl

# Install trzsz (server-side component)
# Map TARGETARCH to trzsz binary naming convention  
RUN case "${TARGETARCH}" in \
        "amd64") TRZSZ_ARCH="x86_64" ;; \
        "arm64") TRZSZ_ARCH="aarch64" ;; \
        "arm") TRZSZ_ARCH="arm" ;; \
        *) TRZSZ_ARCH="${TARGETARCH}" ;; \
    esac \
    && wget -O /tmp/trzsz.tar.gz "https://github.com/trzsz/trzsz-go/releases/download/v${TRZSZ_VERSION}/trzsz_${TRZSZ_VERSION}_linux_${TRZSZ_ARCH}.tar.gz" \
    && tar -xzf /tmp/trzsz.tar.gz -C /tmp \
    && find /tmp -name "trz" -exec mv {} /usr/local/bin/ \; \
    && find /tmp -name "tsz" -exec mv {} /usr/local/bin/ \; \
    && chmod +x /usr/local/bin/trz /usr/local/bin/tsz \
    && rm -rf /tmp/trzsz*

# Create a new non-root user 'ttyd'
RUN useradd -m ttyd

# Switch to the ttyd user
USER ttyd

# CRITICAL FIX: Add -W flag to enable writable mode and trzsz support
CMD ["ttyd", "-W", "-t", "enableTrzsz=true", "/bin/bash"]