

| title                                  | authors | reviewers | approvers | creation-date |
|----------------------------------------| --- | --- | --- | --- |
| OIDC Integration | @warjiang | @ | @ | 2026-04-12 |


## Summary

Karmada Dashboard currently supports only a basic Bearer token login model. Users must manually obtain and paste a JWT (typically a Kubernetes ServiceAccount token) to sign in. This approach does not fit enterprise environments, where integration with an existing identity system is usually required.

Dex is a federated OpenID Connect (OIDC) identity provider (IdP). It acts as a unified entry point to upstream identity providers and issues OIDC ID tokens on their behalf. This allows applications to integrate with different enterprise identity systems through one standardized interface.

This proposal describes integrating Dex as the OIDC provider for Karmada Dashboard, so enterprise users can log in with existing organizational accounts via the standard OAuth 2.0 authorization code flow.

## Motivation

The current token-based model has several limitations in enterprise environments:

- **Manual token handling**: Users must generate, copy, and paste ServiceAccount tokens manually, which is error-prone and creates friction.
- **No enterprise IdP integration**: It cannot authenticate users through LDAP, Active Directory, or other enterprise identity systems.
- **No SSO support**: Users cannot reuse existing single sign-on infrastructure.
- **Short-lived tokens**: Kubernetes ServiceAccount tokens expire, forcing users to repeat manual steps.
- **Weak identity mapping**: Dashboard sessions are not naturally tied to real organizational identities, which hurts auditability and RBAC governance.

## Goals

- Use Dex as the OIDC provider and implement the standard OAuth 2.0 authorization code flow.
- Allow users to sign in to Karmada Dashboard with enterprise accounts via Dex.
- Keep backward compatibility: the existing token-based login flow must remain available.

## Non-Goals

- Building a custom identity provider.
- Implementing refresh token rotation or silent token renewal in this phase.

## Proposal

### User Stories

### Story 1

As a platform engineer in an enterprise, I want Karmada Dashboard to support direct enterprise-account login, so users do not need to manually manage Kubernetes ServiceAccount tokens.

Today, onboarding a new team member requires:

1. Creating a Kubernetes ServiceAccount.
2. Binding the correct RBAC roles.
3. Exporting the token and distributing it securely.
4. Asking the user to paste the token into Dashboard.

After integrating Dex OIDC, the process becomes:

1. Configure Dex to connect to the enterprise identity source.
2. Bind permissions to enterprise identities.
3. Let users sign in with enterprise credentials.

### Story 2

As an organizational administrator, I need all infrastructure management tools to authenticate through a centralized IdP, so we can enforce unified audit trails, MFA policies, and immediate offboarding access revocation.

The current token-based approach bypasses the IdP completely. With Dex OIDC integration, all Karmada Dashboard logins go through the IdP, enabling:

- Centralized auditing of who accessed Karmada Dashboard and when.
- Mandatory MFA enforcement based on IdP policy.
- Immediate access revocation by disabling users in the IdP.

### Notes / Constraints / Caveats

- **Dex deployment prerequisites**: Dex must be deployed in advance, and it must be reachable by both Dashboard backend (for token exchange) and end-user browsers (for authorization redirects).
- **HTTPS is required**.
- **State parameter**: The authorization code flow must use a random `state` value to prevent CSRF attacks.
- **API server configuration**: Both Karmada API server and member-cluster Kubernetes API servers must be configured with OIDC settings such as `--oidc-issuer-url` and `--oidc-client-id`.

### Risks and Mitigations

- **Risk**: If Dex is unavailable, login is interrupted.
- **Risk**: Tokens may expire during an active session.

## Design Details

1. When OIDC is enabled, the login page displays the Enterprise Login option:

   ![enterprise-login.png](./1-enterprise-login.png)

2. Feishu authorization:

   ![lark-login.png](./2-lark-login.png)

3. After successful authorization, users are redirected to the dashboard, where they can see the currently signed-in user and a logout button.

   ![dashboard.png](./3-dashboard.png)


### Flow Diagram

#### Sequence Diagram

```mermaid
sequenceDiagram
    participant User as User Browser
    participant Frontend as Dashboard Frontend
    participant Backend as Dashboard API
    participant Dex as Dex (OIDC Provider)
    participant Feishu as Feishu OAuth
    participant Karmada as Karmada API Server
    participant Member1 as member1 API Server

    Note over User,Backend: 1) Start login
    User->>Frontend: Click "Enterprise Login"
    Frontend->>Backend: GET /api/v1/auth/oidc/login
    Backend->>Backend: Generate state and store
    Backend-->>Frontend: {authUrl, state}
    Frontend->>User: Redirect to Dex authUrl

    Note over User,Feishu: 2) Authenticate with Feishu
    User->>Dex: /auth?client_id=...&state=...
    Dex->>Feishu: Redirect to authorize
    Feishu-->>User: Login & consent
    User->>Feishu: Submit auth
    Feishu-->>Dex: Authorization result
    Dex-->>User: Redirect /login/callback?code=...&state=...

    Note over User,Backend: 3) Exchange code
    User->>Frontend: Open /login/callback?code&state
    Frontend->>Frontend: Validate state from sessionStorage
    Frontend->>Backend: GET /api/v1/auth/oidc/callback?code&state
    Backend->>Backend: Validate one-time state
    Backend->>Dex: Exchange code for tokens
    Dex-->>Backend: id_token
    Backend->>Backend: Verify ID token (JWKS)
    Backend-->>Frontend: {token: id_token}
    Frontend->>Frontend: Store token

    Note over Frontend,Member1: 4) Access control plane and member cluster
    Frontend->>Backend: /api/v1/... Authorization: Bearer id_token
    Backend->>Karmada: Proxy request with same bearer token
    Karmada->>Karmada: OIDC verify + RBAC check (control plane)
    Karmada-->>Backend: 200/403
    Backend-->>Frontend: Response

    Frontend->>Backend: /api/v1/member/member1/... + X-Member-ClusterName: member1
    Backend->>Karmada: cluster proxy to member1 (bearer token)
    Karmada->>Member1: Forward request
    Member1->>Member1: OIDC verify + RBAC check (member1)
    Member1-->>Karmada: 200/403
    Karmada-->>Backend: Response
    Backend-->>Frontend: Response
```

#### Component View

```mermaid
graph TB
    A[Dashboard Login Page] --> B[GET /api/v1/auth/oidc/login]
    B --> C[Dex]
    C --> D[Feishu OAuth]
    D --> C
    C --> E[Frontend /login/callback]
    E --> F[GET /api/v1/auth/oidc/callback]
    F --> C
    F --> G[Return id_token]

    G --> H[Control Plane APIs]
    H --> I[Karmada APIServer OIDC + RBAC]

    G --> J[Member APIs /api/v1/member/member1/...]
    J --> K[Karmada cluster proxy]
    K --> L[member1 APIServer OIDC + RBAC]
```

#### Authorization Notes

- Successful OIDC login does not grant permissions by itself; access is still controlled by Kubernetes RBAC.
- RBAC must be configured separately for:
  - the control plane (`karmada-apiserver`)
  - target member clusters (for example `member1`)
- Recommended subject format: `oidc:<claim-value>`, aligned with `--oidc-username-claim` and `--oidc-username-prefix`.


## Test Plan

### Integration Tests

- **OIDCCallbackPage**: verify that the callback page correctly extracts the token from backend response and stores it.
- **LoginPage**: verify that the **Enterprise Login** button is rendered only when OIDC is enabled, and redirects to the expected URL when clicked.
