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
<!-- ```shell
_output/bin/${os name}/${os arch}/karmada-dashboard-api \
  --karmada-kubeconfig=${path/to/karmada.config} \
  --karmada-context=karmada-apiserver \
  --skip-karmada-apiserver-tls-verify \
  --kubeconfig=${path/to/karmada.config} \
  --context=karmada-host \
  --insecure-port=8000
``` -->

```shell
./root/dashboard/_output/bin/linux/amd64/karmada-dashboard-api \
  --karmada-kubeconfig=/root/.kube/karmada.config \
  --karmada-context=karmada-apiserver \
  --kubeconfig=/root/.kube/karmada.config \
  --context=karmada-host \
  --insecure-port=8000
```

After that, you can start the dashboard fronted project, install frontend dependencies with `cd ui && pnpm install` firstly. And then start the dashboard fronted project by executing:
```shell
cd ui
pnpm run dashboard:dev
```
then open your browser with `http://localhost:5173/`, if you can see the overview page of dashboard, it means everything is ok, start developing now.

---

# 开发

## 架构
Karmada dashboard项目由**后端**和**前端**部分组成。后端部分包含两个项目，`api`项目和`web`项目。`web`项目主要负责提供静态资源服务（包括页面静态文件和i18n翻译资源）以及转发前端的API请求。`api`项目主要负责通过使用`client-go` SDK与`karmada-host`和`karmada-apiserver`的apiserver服务交互来管理Kubernetes资源（CRUD操作），这部分的实现位于pkg目录中。

前端部分是基于`pnpm`的monorepo项目。所有与前端项目相关的工程都位于`ui`目录中。`packages`目录主要存储可重用的前端组件，如`navigations`、`editors`，甚至`translation tools`。`apps`目录包含可以从外部直接访问的项目，如`dashboard`项目。在生产环境中，apps目录中的项目构建后，会通过Dockerfile中的`cp`命令将压缩的静态资源复制到容器中供外部访问。

## 开发环境

确保安装了以下软件并添加到您的路径中：

- [Docker](https://docs.docker.com/engine/install/)
- [Go](https://golang.org/dl/)（在[`go.mod`](go.mod)中检查所需版本）
- [Node.js](https://nodejs.org/en/download)（在[`ui/package.json`](ui/package.json)中检查所需版本）
- [Pnpm](https://pnpm.io/installation)

## 入门指南

克隆仓库后，首先您应该在本地机器上准备所有需要的镜像。
您可以通过执行以下命令在线加载所有需要的镜像：
```shell
cp hack/images/image.list.load.online.example hack/images/image.list
bash hack/ops/load-images.sh hack/images/image.list
```
如果您有私有注册表，您也可以通过在`image.list`中用私有注册表地址包装镜像来更改镜像。

同时，您也可以在离线模式下加载镜像。在加载镜像之前，您需要预先在`hack/images/`文件夹中下载所有离线镜像文件，然后执行以下命令：
```shell
cp hack/images/image.list.load.offline.example hack/images/image.list
bash hack/ops/load-images.sh hack/images/image.list
```

在您的机器上加载所有需要的镜像后，您可以执行代码来启动由kind提供支持的用于开发目的的最小环境。
```shell
bash hack/local-up-karmada.sh
```

最小环境由一个主集群和三个成员集群组成，主集群负责部署karmada控制平面，karmada控制平面启动后，成员集群将由karmada控制平面管理，member1和member2集群将以`push`模式管理，member3集群将以`pull`模式管理。当您看到安装成功提示后，您可以启动`api`项目。要在本地启动`api`项目，您应该获取`karmada-apiserver`和`karmada-host`上下文的kubeconfig，您可以在`$HOME/.kubeconfig/karmada.config`下获取文件。执行命令`make karmada-dashboard-api`构建`api`项目的二进制文件，您可以通过以下方式启动`api`：
```shell
./_output/bin/linux/amd64/karmada-dashboard-api \
  --karmada-kubeconfig=/root/.kube/karmada.config \
  --karmada-context=karmada-apiserver \
  --skip-karmada-apiserver-tls-verify \
  --kubeconfig=/root/.kube/karmada.config \
  --context=karmada-host \
  --insecure-port=8000
```
之后，您可以启动dashboard前端项目，首先通过`cd ui && pnpm install`安装前端依赖。然后通过执行以下命令启动dashboard前端项目：
```shell
cd ui
pnpm run dashboard:dev
```
然后用浏览器打开`http://localhost:5173/`，如果您能看到dashboard的概览页面，说明一切正常，现在开始开发吧。

## 开发构建项目脚本命令

后端构建命令

```bash
cd /root/dashboard && make karmada-dashboard-api  && ./_output/bin/linux/amd64/karmada-dashboard-api --karmada-kubeconfig=/root/.kube/karmada.config --karmada-context=karmada-apiserver --kubeconfig=/root/.kube/karmada.config --context=karmada-host
```

```bash
make karmada-dashboard-api  && ./_output/bin/linux/amd64/karmada-dashboard-api --karmada-kubeconfig=/root/.kube/karmada.config --karmada-context=karmada-apiserver --kubeconfig=/root/.kube/config --context=default
```

前端构建命令

```bash
cd ui && pnpm run dashboard:dev
```