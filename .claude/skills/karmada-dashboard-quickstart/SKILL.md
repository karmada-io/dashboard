---
name: karmada-dashboard-quickstart
description: QuickStart for getting the Karmada Dashboard running on an existing kind-based Karmada dev environment and exposing it for access. Use when asked to bring up / install / start the dashboard following the README QuickStart, especially on a kind cluster or a cloud VM (e.g. Oracle Cloud) where the dashboard must be reachable from another host.
---

# Deploy Karmada Dashboard (kind dev env)

Brings up `karmada-dashboard-api` + `karmada-dashboard-web` (+ `kubernetes-dashboard-api`)
on the `karmada-host` cluster and exposes the web UI on the host's `8000` port.

This skill encodes the working procedure **and the non-obvious gotchas** that the README
QuickStart misses. Follow it top to bottom; skip steps only after verifying their state.

## Assumptions / prerequisites

- A Karmada control plane is already running (here: a kind dev env with clusters
  `karmada-host`, `member1/2/3`). Verify before doing anything:
  ```bash
  export KUBECONFIG="$HOME/.kube/karmada.config"
  kubectl config use-context karmada-host
  kubectl get deployments.apps -n karmada-system   # karmada-apiserver et al should be READY
  ```
- Certs exist in `$HOME/.karmada` (`ca.crt`, `ca.key`, `ca-config.json`).
- Tools available: `kubectl`, `docker`. Run all commands from the repo root.
- The node can reach Docker Hub — the dashboard images (`karmada/karmada-dashboard-*`,
  `karmada/kubernetes-dashboard-api`, all `imagePullPolicy: IfNotPresent`) are pulled
  automatically on deploy. **No manual image build/load is needed.**
- Two contexts exist in `~/.kube/karmada.config`: `karmada-host` (where the dashboard
  runs) and `karmada-apiserver` (where the login ServiceAccount/token lives). **Do not
  mix them up** — this is a common source of errors.

## Step 1 — Create the kubeconfig secret

The deployment manifests mount a secret named **`karmada-dashboard-config`**
(see `secretName: karmada-dashboard-config` in `artifacts/dashboard/karmada-dashboard-{web,api}.yaml`).
Create it with the helper script (it generates the dashboard client cert on demand from
the CA in `$HOME/.karmada`):

```bash
export KUBECONFIG="$HOME/.kube/karmada.config"
bash hack/generate-karmada-dashboard-kubeconfig.sh "$HOME/.kube/karmada.config" karmada-host
# -> creates secret/karmada-dashboard-config in namespace karmada-system
```

**GOTCHA:** the secret name must be exactly `karmada-dashboard-config`. Creating a plain
`kubeconfig` secret instead (an older README instruction, now fixed) leaves the pods stuck
in `ContainerCreating` with
`MountVolume.SetUp failed ... secret "karmada-dashboard-config" not found`.

## Step 2 — Deploy the dashboard (NodePort overlay)

Images are pulled automatically by the node.

```bash
export KUBECONFIG="$HOME/.kube/karmada.config"
kubectl config use-context karmada-host
kubectl apply -k artifacts/overlays/nodeport-mode
```

Wait for rollout (first run also pulls images, so allow time):
```bash
for d in karmada-dashboard-web karmada-dashboard-api kubernetes-dashboard-api; do
  kubectl rollout status deployment/$d -n karmada-system --timeout=180s
done
kubectl get pods -n karmada-system | grep -i dashboard   # all should be 1/1 Running
```

## Step 3 — Create the login ServiceAccount and get the JWT token

**Switch context to `karmada-apiserver`** for these (the SA/token live on the Karmada API
server, not the host cluster):

```bash
export KUBECONFIG="$HOME/.kube/karmada.config"
kubectl config use-context karmada-apiserver
kubectl apply -f artifacts/dashboard/karmada-dashboard-sa.yaml
# optional: member-cluster proxy access for cluster management
kubectl apply -f artifacts/dashboard/karmada-dashboard-clusterrolebinding.yaml

# fetch the token (paste into the dashboard "Enter token" field)
kubectl -n karmada-system get secret/karmada-dashboard-secret \
  -o go-template="{{.data.token | base64decode}}"
```

## Step 4 — Expose the web UI on the host's 8000 port

**GOTCHA:** On kind, the `NodePort` (32000) only lives on the node *container's* internal
IP, so it is not reachable from the host network. Use `kubectl port-forward` to publish
the web service on the host's `8000` port (the README's documented alternative). Bind
`--address 0.0.0.0` so it listens on all interfaces (needed for remote access; use the
default `127.0.0.1` if local-only is enough):

```bash
export KUBECONFIG="$HOME/.kube/karmada.config"
kubectl config use-context karmada-host
kubectl port-forward -n karmada-system services/karmada-dashboard-web \
  --address 0.0.0.0 8000:8000
# run in background (nohup ... &) if it must outlive the shell
```

This process is **session-bound**: it dies if the shell exits, the host reboots, or the
web pod restarts. For a durable setup, run it as a systemd service instead.

Verify locally: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/` → `200`.

## Step 5 — Accessing from another host (cloud VMs)

Step 4 already confirms local access works. To reach the dashboard from another machine
when it runs on a public-cloud VM, remind the user to **open the corresponding security
group / firewall rule** (e.g. an ingress rule for TCP port 8000) so inbound traffic can
reach the host.

## Quick teardown

```bash
export KUBECONFIG="$HOME/.kube/karmada.config"
kubectl config use-context karmada-host
kubectl delete -k artifacts/overlays/nodeport-mode
kubectl -n karmada-system delete secret karmada-dashboard-config
# kill any running port-forward: pkill -f "port-forward.*karmada-dashboard-web"
```
