# Copyright 2025 The Karmada Authors.
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

# Stage 1: Builder
# Use the Go version specified in go.mod (1.24)
FROM golang:1.25-alpine AS builder

# Install make, git and bash
# git is used to clone the repository, make is used to execute build commands, and bash is used to execute the build.sh script
RUN apk add --no-cache make git bash

# Set the working directory
WORKDIR /src

# Clone the specified git repository
RUN git clone https://github.com/warjiang/karmada-mcp-server.git .

# Set the target operating system and architecture for multi-platform builds
# These parameters are provided by the `docker buildx build` command at build time
ARG TARGETOS
ARG TARGETARCH

# Use the Makefile to build the binary, passing in the platform parameters
# This will call the project's own hack/build.sh script
RUN make build GOOS=${TARGETOS} GOARCH=${TARGETARCH}

# Move the compiled binary to the /src directory for easy copying in the next stage
RUN cp /src/_output/bin/${TARGETOS}/${TARGETARCH}/karmada-mcp-server /src/karmada-mcp-server

# Stage 2: Final Image
# Use the scratch image as the final base image
FROM alpine:3.23.2

# Copy the compiled binary from the builder stage to the final image
# The binary has been moved to /src/karmada-mcp-server in the previous stage
COPY --from=builder /src/karmada-mcp-server /karmada-mcp-server

# Set the executable to be executed when the container starts
ENTRYPOINT ["/karmada-mcp-server"]
