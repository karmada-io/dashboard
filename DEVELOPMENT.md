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

After cloning the repository, first you should prepare all required images in your local machine.
You can load all required images online by executing:
```shell
cp hack/images/image.list.load.online.example hack/images/image.list
bash hack/ops/load-images.sh hack/images/image.list
```
If you have private registry, you can also change images in `image.list` by wrapping image with your private registry address.

Meanwhile, you can load images in offline mode. Before loading images, you need download all offline image files in the folder 
`hack/images/` in advance, and then you can execute the following command: 
```shell
cp hack/images/image.list.load.offline.example hack/images/image.list
bash hack/ops/load-images.sh hack/images/image.list
```

After loading all required images in your machine, you execute the code to start a minimal environment powered by kind for purpose of developing. 
```shell
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
After that, you can start the dashboard fronted project, install frontend dependencies with `cd ui && pnpm install` firstly. And then start the dashboard fronted project by executing:
```shell
cd ui
pnpm run dashboard:dev
```
then open your browser with `http://localhost:5173/`, if you can see the overview page of dashboard, it means everything is ok, start developing now.

_output/bin/linux/amd64/karmada-dashboard-api   --karmada-kubeconfig=/root/.kube/karmada.config   --karmada-context=karmada-apiserver   --kubeconfig=/root/.kube/config   --context=default   --insecure-port=8000

export KUBECONFIG=/etc/karmada/karmada-apiserver.config

kubectl -n karmada-system get secret/karmada-dashboard-secret -o go-template="{{.data.token | base64decode}}" && echo

eyJhbGciOiJSUzI1NiIsImtpZCI6IngyN2IzYnE0TkdIRFpOSXFleWpkemg1Z01zTHpNM1RfV3VfbDRqcEtYUncifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrYXJtYWRhLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJrYXJtYWRhLWRhc2hib2FyZC1zZWNyZXQiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoia2FybWFkYS1kYXNoYm9hcmQiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiJhOGM4N2Y5Ny1kMGY5LTQ0ZWUtOTY5ZC1mODc4MGM1NTNjZjIiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a2FybWFkYS1zeXN0ZW06a2FybWFkYS1kYXNoYm9hcmQifQ.Bz1A-hgBPJHXh6487a_CJq_Kvo5q6V-wYt4volNlIM-aoeyPlSGdlT53TGfrRXAlV8tSo_RKX-aa-OTjP5T6dXeiU0dIcFIRI5d5kZWBFDnoxDzk9nTVncO6Q3SCosGKK2b4Fpm8tZjckIQdruc3Y59Nl-LqLmesuPnow_ldNZOgbxUfwvnBJ_lT6r_ZgRha3gv3jw9jlH3_6fISxwpwGNgdkvQDOPZfX7amFumzmMaackcvaCiD2QOd3CXeJjny6ZUZSaR5AjP3gIaMWxR0BVyQlZKrGpP9iSEj48tSoaO4Lj2H-TMe8eAp9Q6leXaM4rO-H5deDM4rrIjsy_993_cyWTgtDHUsbHX08-M_DHHeiibQ_RjazJqgTA9MEBIQiD-YmVManWh8P6JQT0zHtAB70r-Ly-DmpjwsEQjW9YA6xi0CIsRTjBPPj10YXKqOfi2jLOfeqBrCgo7zYUny2HTZ2_wPOSHtjOyAOaiHU2nmGSSq6k9o2dbtQtev8HMM