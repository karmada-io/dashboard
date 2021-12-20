# Creating sample user

In this guide, we will find out how to create a new user using Service Account mechanism of Kubernetes, grant this user admin permissions and login to Dashboard using bearer token tied to this user.

**IMPORTANT:** Make sure that you know what you are doing before proceeding. Granting admin privileges to Dashboard's Service Account might be a security risk.

Please switch your context to karmada before creating Service Account

```shell
export KUBECONFIG="$HOME/.kube/karmada.config"
kubectl config use-context karmada-apiserver
```

## Creating a Service Account

We are creating Service Account with name `karmada-user` in namespace `karmada-system` first.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: karmada-user
  namespace: karmada-system
```

## Creating a ClusterRoleBinding

In most cases after provisioning cluster using `kops`, `kubeadm` or any other popular tool, the `ClusterRole` `cluster-admin` already exists in the cluster. We can use it and create only `ClusterRoleBinding` for our `ServiceAccount`.
If it does not exist then you need to create this role first and grant required privileges manually.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: karmada-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: karmada-user
  namespace: karmada-system
```

## Getting a Bearer Token

Now we need to find token we can use to log in. Execute following command:

```shell
kubectl -n karmada-system get secret $(kubectl -n karmada-system get sa/karmada-user -o jsonpath="{.secrets[0].name}") -o go-template="{{.data.token | base64decode}}"
```

It should print something like:

```
eyJhbGciOiJSUzI1NiIsImtpZCI6IlFUbXVnR2ZBaGtnQk9oY2dSTEZEMThaVC1vVU1fSVZ4TnpQME5Xd3UwNnMifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJlY2RhdGFhcGktdG9rZW4tZnp6NDYiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZWNkYXRhYXBpIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiNTljNDdkMDEtYmM3OC00OTc1LWJhNzEtMzM3ODdiYmQ5OGY0Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50Omt1YmUtc3lzdGVtOmVjZGF0YWFwaSJ9.UNs9Zw-98bhT9D6aXBmMOIfi92g0tAcAIT6r_vFjhJrCKzKqdxZ_tQOwosrE4fpBYZerbBDl_K5uMq_v-Fi-cWtrA646OPS0sz81TrTaqH4SPraXmRqAj0BaVwbg9S9Vonc1KMogChad56EqKoXPRrxfWUy4KXGrg7gkHQpPJja3T04-c6k4BWTr-iCghDxgJ6AzfNqknHAKRRIURAKBNhP4bp8C5HRivl2ZV9d5JcHY324cZxVcXvCjr3SNn28yvpGMrxMxD_x8fSNiBVya0rdvdd0qDbMsPFv8pMf6yLwCdVztPh8en4B2YEZw6GwcgMpa8u6BRM1WHQcxKVr3Rg
```

Now copy the token and paste it into `Enter token` field on the login screen.



Click `Sign in` button and that's it. You are now logged in as an admin.
