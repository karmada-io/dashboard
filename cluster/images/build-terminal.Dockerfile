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

# Switch to root so we can install packages or make changes
USER root

# (Optional) Install packages if needed
# For example, if you need bash on Alpine:
# RUN apk update && apk add --no-cache bash
# RUN apt-get update && apt-get install -y curl
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*


# Download and install kubectl
RUN curl -fLo /usr/local/bin/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl" \
  && chmod +x /usr/local/bin/kubectl



# Download and install karmadactl using the version ARG
RUN curl -fL "https://github.com/karmada-io/karmada/releases/download/${KARMADACTL_VERSION}/karmadactl-linux-${TARGETARCH}.tgz" \
    | tar -xzf - -C /usr/local/bin karmadactl \
    && chmod +x /usr/local/bin/karmadactl

# Create a new non-root user 'ttyd'
RUN useradd -m ttyd

# Switch to the ttyd user
USER ttyd


# Override the entrypoint if you prefer bash over sh
# (Only do this if bash is installed in the container)
# ENTRYPOINT ["ttyd", "bash"]
