package environment

import (
	"fmt"
)

const (
	userAgent = "karmada-dashboard"
	dev       = "0.0.0-dev"
)

var (
	Version      = dev // Version of this binary
	gitVersion   = "v0.0.0-master"
	gitCommit    = "unknown" // sha1 from git, output of $(git rev-parse HEAD)
	gitTreeState = "unknown" // state of git tree, either "clean" or "dirty"
	buildDate    = "unknown" // build date in ISO8601 format, output of $(date -u +'%Y-%m-%dT%H:%M:%SZ')
)

func IsDev() bool {
	return Version == dev
}

func UserAgent() string {
	return fmt.Sprintf("%s:%s", userAgent, Version)
}
