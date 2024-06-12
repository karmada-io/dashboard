# ops scripts
## dump-images
Description: `dump-images.sh` is used to export container images from the local docker space to a tar.gz file, which is useful for offline deployment scenarios.

Usage: `hack/ops/dump-images.sh <IMAGE_LIST> [IMAGE_DIR]`

The format of `IMAGE_LIST` can be referred to in the `hack/images/image.list.example` file. An example is as follows:
```
etcd;registry.k8s.io/etcd:3.5.9-0;;etcd-3.5.9-0.tar.gz;
karmada-apiserver;registry.k8s.io/kube-apiserver:v1.27.11;;kube-apiserver-v1.27.11.tar.gz;
```
It means we want to export the local image `registry.k8s.io/etcd:3.5.9-0` as `etcd-3.5.9-0.tar.gz` file for the etcd component.

The `IMAGE_DIR` parameter is optional which represents the directory where the exported container image file will be stored. By default, it is set to the `hack/images` directory under the current repository directory.

## load-images

Description: `load-images.sh` is used to load container images into the local docker space before starting the local testing environment. It supports three modes: `online` (e.g., Docker Hub, private image registry), `offline` (using `docker save` command to export image files), and `hybrid` (some components loaded in `online` mode and some components `loaded` in offline mode).

Usage: `hack/ops/load-images.sh <IMAGE_LIST> [IMAGE_DIR]`

The difference between `online`, `offline`, and `hybrid` modes lies in the format of the `IMAGE_LIST` parameter corresponding to the `image.list` file.

`IMAGE_DIR` is an optional parameter that needs to be specified when there are components loaded in `offline` mode.

An example of an `online` IMAGE_LIST is as follows:
```
etcd;registry.k8s.io/etcd:3.5.9-0;your-private-registry/etcd:3.5.9-0;;
```
It means the etcd component will be pulled from your private image registry(`your-private-registry`), and after pulling image successfully, it will be tagged as `registry.k8s.io/etcd:3.5.9-0`. This approach provides a flexible way to load images, and avoids the need for extensive `sed` replacements.
An example of an `offline` IMAGE_LIST is as follows:
```
etcd;registry.k8s.io/etcd:3.5.9-0;;etcd-3.5.9-0.tar.gz;
```
It means the etcd component will be loaded from the local `IMAGE_DIR` directory as `etcd-3.5.9-0.tar.gz`. After loading images successfully, it will be tagged as `registry.k8s.io/etcd:3.5.9-0`.

An example of an `hybrid` IMAGE_LIST is as follows:
```
etcd;registry.k8s.io/etcd:3.5.9-0;;etcd-3.5.9-0.tar.gz;
kube-controller-manager;registry.k8s.io/kube-controller-manager:v1.27.11;your-private-registry/kube-controller-manager:v1.27.11;;
```
It means the etcd component will be loaded in `offline` mode, while the kube-controller-manager component will be loaded in `online` mode.