# Karmada OIDC (Dex + Lark) Integration Guide

## 1. Prerequisites

- `DEX_DOMAIN`, for example `dex.example.com`
- `DASHBOARD_DOMAIN`, for example `karmada.example.com`
- Create a Lark app and obtain `clientID/clientSecret`
- Ensure network connectivity from the Kubernetes cluster to Dex and Dashboard
- Generate a Dashboard OIDC client secret:

```bash
export DASHBOARD_OIDC_CLIENT_SECRET="$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')"
```

## 2. Install Dex

Create `values.dex.yaml` and replace placeholders (domain, client credentials, etc.):

```yaml
image:
  repository: "${DEX_IMAGE_REPOSITORY}"

config:
  issuer: "https://${DEX_DOMAIN}"
  storage:
    type: kubernetes
    config:
      inCluster: true
  oauth2:
    skipApprovalScreen: true

  staticClients:
    - name: Karmada Dashboard
      id: "karmada-dashboard"
      secret: "${DASHBOARD_OIDC_CLIENT_SECRET}"
      redirectURIs:
        - "https://${DASHBOARD_DOMAIN}/login/callback"
        - "http://localhost:5173/login/callback"

  connectors:
    - type: oauth
      id: feishu
      name: Feishu
      config:
        clientID: "<LARK_CLIENT_ID>"
        clientSecret: "<LARK_CLIENT_SECRET>"
        redirectURI: "https://${DEX_DOMAIN}/callback"
        authorizationURL: "https://accounts.feishu.cn/open-apis/authen/v1/authorize"
        tokenURL: "https://open.feishu.cn/open-apis/authen/v2/oauth/token"
        userInfoURL: "http://feishu-userinfo-adapter.dex.svc.cluster.local/userinfo"
        scopes: []
        userIDKey: open_id
        claimMapping:
          userNameKey: name
          preferredUsernameKey: en_name
          emailKey: email
          emailVerifiedKey: email_verified
        insecureSkipEmailVerified: true

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: "${DEX_DOMAIN}"
      paths:
        - path: /
          pathType: Prefix
```

Run installation:

```bash
helm repo add dex https://charts.dexidp.io
helm upgrade --install dex dex/dex \
  -n dex --create-namespace \
  -f docs/examples/feishu-callback/values.dex.yaml
```

Verify after installation:

```bash
kubectl -n dex get pods
curl -s "https://${DEX_DOMAIN}/.well-known/openid-configuration"
```

## 3. Install Feishu UserInfo Adapter

Feishu `userinfo` payload does not fully match Dex claim expectations. Deploy an adapter to flatten claims.

Install:

```bash
kubectl apply -f docs/examples/feishu-callback/dex-feishu-adapter.yaml
```

## 4. Align Startup Flags

### 4.1 `karmada-apiserver`

Use `sub` as the stable user identifier:

```bash
--oidc-issuer-url=https://${DEX_DOMAIN}
--oidc-client-id=karmada-dashboard
--oidc-username-claim=sub
--oidc-username-prefix=oidc:
```

If group-based authorization is enabled, also add:

```bash
--oidc-groups-claim=groups
--oidc-groups-prefix=oidc:
```

### 4.2 `karmada-dashboard-api`

```bash
--oidc-issuer-url=https://${DEX_DOMAIN}
--oidc-client-id=karmada-dashboard
--oidc-client-secret=${DASHBOARD_OIDC_CLIENT_SECRET}
--oidc-redirect-url=http://localhost:5173/login/callback
--oidc-scopes=openid,email,profile
```

## 5. Authorization (RBAC)

OIDC login authenticates identity only. Access is still controlled by Kubernetes RBAC.

Control plane binding example:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-user-cluster-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: oidc:<OIDC_USER_SUBJECT>
```

Member cluster binding example:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dashboard-member-readonly-oidc-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dashboard-member-readonly
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: oidc:<OIDC_USER_SUBJECT>
```

## 6. Login Validation

1. The login page shows **Enterprise Login**.
2. Clicking it redirects to the Lark login page.
3. After successful authorization, the user is redirected back to Dashboard and the current login user is visible.
