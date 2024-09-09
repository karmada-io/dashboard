GOOS 					?= $(shell go env GOOS)
GOARCH 					?= $(shell go env GOARCH)
VERSION 				?= $(shell hack/version.sh)
# Images management
REGISTRY				?= "docker.io/karmada"
REGISTRY_USER_NAME  	?= ""
REGISTRY_PASSWORD   	?= ""
REGISTRY_SERVER_ADDRESS ?= ""

TARGETS := karmada-dashboard-api \
		   karmada-dashboard-web \


# Build binary.
#
# Args:
#   GOOS:   OS to build.
#   GOARCH: Arch to build.
#
# Example:
#   make
#   make all
#   make karmada-dashboard-api GOOS=linux
.PHONY: $(TARGETS)
$(TARGETS):
	BUILD_PLATFORMS=$(GOOS)/$(GOARCH) hack/build.sh $@

.PHONY: all
all: $(TARGETS)

# Build image.
#
# Args:
#   GOARCH:      Arch to build.
#   OUTPUT_TYPE: Destination to save image(docker/registry).
#
# Example:
#   make images
#   make image-karmada-dashboard-api
#   make image-karmada-dashboard-api GOARCH=arm64
IMAGE_TARGET=$(addprefix image-, $(TARGETS))
.PHONY: $(IMAGE_TARGET)
$(IMAGE_TARGET):
	set -e;\
	target=$$(echo $(subst image-,,$@));\
	make $$target GOOS=linux;\
	VERSION=$(VERSION) REGISTRY=$(REGISTRY) BUILD_PLATFORMS=linux/$(GOARCH) hack/docker.sh $$target


bundle-ui-dashboard:
	cd ui && pnpm run dashboard:build
bin-karmada-dashboard-web:
	BUILD_PLATFORMS=$(GOOS)/$(GOARCH) hack/build.sh karmada-dashboard-web
image-karmada-dashboard-web:
	BUILD_PLATFORMS=linux/$(GOARCH) hack/build.sh karmada-dashboard-web
	cp -R ui/apps/dashboard/dist _output/bin/linux/$(GOARCH)/dist
	DOCKER_FILE="build-web.Dockerfile" VERSION=$(VERSION) REGISTRY=$(REGISTRY) BUILD_PLATFORMS=linux/$(GOARCH) hack/docker.sh karmada-dashboard-web

