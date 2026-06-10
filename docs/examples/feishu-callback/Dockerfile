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

FROM golang:1.25.10-alpine AS builder

ARG TARGETOS
ARG TARGETARCH
ARG APP_PKG=.

WORKDIR /src

COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -trimpath -ldflags="-s -w" -o /out/feishushu-callback "${APP_PKG}"

FROM alpine:3.23.4

ARG ALPINE_MIRROR=""
RUN if [ -n "${ALPINE_MIRROR}" ]; then \
      printf "https://${ALPINE_MIRROR}/alpine/v3.23/main\nhttps://${ALPINE_MIRROR}/alpine/v3.23/community\n" > /etc/apk/repositories; \
    fi \
    && apk add --no-cache ca-certificates tzdata

COPY --from=builder /out/feishushu-callback /bin/feishushu-callback

EXPOSE 18080

ENTRYPOINT ["/bin/feishushu-callback"]
