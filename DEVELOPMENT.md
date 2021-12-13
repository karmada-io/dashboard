# Development

## Architecture

The Karmada dashboard project consists of **backend** and **frontend** parts. The part of backend includes two projects, `api` and `web` project. The `web` project is mainly responsible for serving static resources (including static files of pages and i18n translation resources) and forwarding API requests for frontend. The `api` project is primarily responsible for managing Kubernetes resources (CRUD operations) by interfacing with the apiserver service of `karmada-host` and `karmada-apiserver` by using the `client-go` SDK, the implementation of this part is located in the pkg directory.

The part of frontend is a monorepo project based on `pnpm`. All engineering related to the frontend project is located in the `ui` directory. The `packages` directory mainly stores reusable frontend components such as `navigations`, `editors`, or even `translation tools`. The `apps` directory contains projects that can be accessed directly from the outside, such as the `dashboard` project. In the production environment, after the projects in the apps directory are built, the compressed static resources are copied into the container using the `cp` command in the Dockerfile for external access.

## Development Environment

Make sure the following software is installed and added to your path:

- [Docker](https://docs.docker.com/engine/install/)
- [Go](https://golang.org/dl/) (check the required version in [`go.mod`](go.mod))
- [Node.js](https://nodejs.org/en/download) (check the required version in [`ui/package.json`](ui/package.json))
- [Pnpm](https://pnpm.io/installation)

## Getting Started

Local development of the Karmada dashboard requires an existing Karmada environment. You can set up a minimal environment by running the [hack/local-up-karmada.sh script in the karmada repository](https://github.com/karmada-io/karmada/blob/master/hack/local-up-karmada.sh).

```shell
git clone https://github.com/karmada-io/karmada.git <path-to-karmada-repo>
bash hack/local-up-karmada.sh
```

The minimal environment consists of one host cluster and three member cluster, the host cluster is responsible for deploying karmada control-plane, after karmada control-plane is up, member clusters will be managed by karmada control-plane, member1 and member2 cluster will be managed in `push` mode, and the member3 cluster will be managed in `pull` mode. After you see the success tips for installing, you can start `api` project. To start the `api` project locally, you should fetch kubeconfig for `karmada-apiserver` and `karmada-host` context, you can get the file under the `$HOME/.kubeconfig/karmada.config`. Executing command `make karmada-dashboard-api` to build binary for `api` project, you can start `api` by

```shell
_output/bin/${os name}/${os arch}/karmada-dashboard-api \
  --karmada-kubeconfig=${path/to/karmada.config} \
  --karmada-context=karmada-apiserver \
  --skip-karmada-apiserver-tls-verify \
  --kubeconfig=${path/to/karmada.config} \
  --context=karmada-host \
  --insecure-port=8000
```

> Note: if the `karmada-dashboard-api` failed to start because of the following error: `"Could not init karmada in-cluster client" err="specifying a root certificates file with the insecure flag is not allowed`, remove the `--skip-karmada-apiserver-tls-verify` argument and try again.

After that, you can start the dashboard frontend project, install frontend dependencies with `cd ui && pnpm install` firstly. And then start the dashboard frontend project by executing:

```shell
cd ui
pnpm run dashboard:dev
```

then open your browser with `http://localhost:5173/`, if you can see the overview page of dashboard, it means everything is ok, start developing now.
