#!/bin/bash
set -euo pipefail


function util::git::get_version() {
  # git describe --tags --dirty
  # GIT_VERSION=$(git rev-parse --abbrev-ref HEAD)
  v=$(git rev-parse --abbrev-ref HEAD)
  v=${v//\//-}
  echo "${v}"
}

function util::git::version_ldflags() {
  # Git information
  GIT_VERSION=$(git rev-parse --abbrev-ref HEAD)
  GIT_COMMIT_HASH=$(git rev-parse HEAD)
  if git_status=$(git status --porcelain 2>/dev/null) && [[ -z ${git_status} ]]; then
    GIT_TREESTATE="clean"
  else
    GIT_TREESTATE="dirty"
  fi
  BUILDDATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  LDFLAGS="-X github.com/karmada-io/dashboard/pkg/environment.gitVersion=${GIT_VERSION} \
           -X github.com/karmada-io/dashboard/pkg/environment.gitCommit=${GIT_COMMIT_HASH} \
           -X github.com/karmada-io/dashboard/pkg/environment.gitTreeState=${GIT_TREESTATE} \
           -X github.com/karmada-io/dashboard/pkg/environment.buildDate=${BUILDDATE}"
  echo "$LDFLAGS"
}

