# Component metrics

Karmada Dashboard can chart the metrics exposed by Karmada control-plane
components. The **Metrics** page lets you select a component, a time window and
a pod scope, inspect the available metrics, and keep a dashboard of the panels
that matter to you.

The feature is served by the `karmada-dashboard-metrics-scraper`, which is
deployed with the Helm chart. The web deployment proxies browser requests to
the scraper, so the scraper does not need to be exposed outside the cluster.

## How metrics are collected

The scraper supports two providers.

| Provider | Collection | Time window | Retention |
| --- | --- | --- | --- |
| `sqlite` (default) | Scrapes each component's metrics endpoint every 10 seconds and stores the samples in SQLite files inside the scraper pod. | 15 minutes | Lost when the pod is replaced. Intended for quick inspection, not long-term history. |
| `prometheus` | Runs range queries against an existing Prometheus-compatible endpoint. | 5 minutes to 6 hours | Whatever retention the Prometheus instance provides. |

Use the `prometheus` provider for regular use or when you need history; the
`sqlite` provider is convenient when no monitoring stack is available.

## Deploying the metrics scraper

The scraper is part of the `karmada-dashboard` Helm chart and is deployed by
default. The `artifacts/` manifests currently install only the web and API
components, so a dashboard installed from those manifests does not include the
Metrics data source.

The commands below assume the dashboard's kubeconfig Secret already exists and
that Karmada is installed in `karmada-system`. Adjust the namespace if your
installation differs. The chart reads the Karmada kubeconfig from the
`karmada-kubeconfig` Secret by default; change the components' `kubeconfigName`
values if your Secret has a different name. When installing from a clone, run
`helm dependency build charts/karmada-dashboard` once before the first command
so the chart's `common` dependency is available.

### SQLite (default)

```bash
helm upgrade --install karmada-dashboard charts/karmada-dashboard \
  --namespace karmada-system --create-namespace
```

No additional values are needed. The Metrics page starts showing samples after
the first scrape cycle.

### Bundled Prometheus

For a development or test cluster, the chart can deploy a small Prometheus
instance and configure the scraper to use it:

```bash
helm upgrade --install karmada-dashboard charts/karmada-dashboard \
  --namespace karmada-system --create-namespace \
  --set prometheus.enabled=true
```

When `prometheus.enabled` is true, the chart:

- deploys Prometheus with the retention and scrape interval from
  `prometheus.retention` (default `24h`) and `prometheus.scrapeInterval`
  (default `15s`);
- scrapes the Karmada control-plane pods in `prometheus.scrapeNamespace`
  (default `karmada-system`) using the client certificate Secret named by
  `prometheus.karmadaTLSSecretName`;
- points the scraper at the bundled Prometheus service, overriding
  `metrics_scraper.provider`.

For pull-mode member clusters whose Pod CIDRs are not routable from the host
cluster, add their metrics endpoints to `prometheus.agentTargets`:

```yaml
prometheus:
  enabled: true
  agentTargets:
    - address: 172.18.0.5:30080
      cluster: member3
      pod: karmada-agent
```

### Existing Prometheus

Production deployments should normally point the scraper at the shared
monitoring platform:

```yaml
metrics_scraper:
  provider: prometheus
  prometheus:
    url: https://prometheus.example.com
    timeout: 30s
```

Apply the values with `helm upgrade --install ... -f values.yaml`.

The endpoint must expose the Prometheus HTTP API and be reachable from the
scraper pod. For an authenticated or private-CA endpoint, reference existing
Secrets in the dashboard namespace:

```yaml
metrics_scraper:
  provider: prometheus
  prometheus:
    url: https://prometheus.example.com
    bearerTokenSecret:
      name: prometheus-token
      key: token
    caSecret:
      name: prometheus-ca
      key: ca.crt
```

Set `metrics_scraper.prometheus.insecureSkipVerify: true` only for testing.
The token and CA files are mounted read-only into the scraper.

## Using the Metrics page

Open **Metrics** in the sidebar. The page header shows the selected component,
the pod scope, when the data was last generated, and the active provider.

The scope controls are:

- **Component** — the Karmada component to inspect, for example
  `karmada-scheduler`, `karmada-controller-manager`, or
  `karmada-metrics-adapter`.
- **Window** — the query range. This control is enabled only with the
  `prometheus` provider. SQLite mode always uses the most recent 15 minutes.
- **Pod** — `All pods (sum)` aggregates the component's pods, or select one pod
  to see only its series.

The panels below the controls are refreshed every 10 seconds. Use the refresh
button in the header to request new data immediately. A warning banner appears
when only part of the requested data could be retrieved, and an empty state
explains when no samples are available for the selected scope.

### Customizing panels

Select **Customize dashboard** to enter edit mode. In edit mode you can:

- add a panel with **Add panel**;
- edit or delete an existing panel;
- drag panels to reorder them;
- select **Done editing** to leave edit mode.

**Explore metrics with DSL query** opens the metric explorer, where you can
search the metric catalog, choose an aggregation (`sum`, `avg`, `max`, `min`,
or `rate`), add label filters, and preview the series before adding the metric
as a panel. Panels can be rendered as a line, area, bar, or gauge chart.

**Reset to default** discards the customized layout and restores the
automatically generated panels for the component.

## Persisting and sharing a layout

The initial layout for each component comes from the `metrics_dashboards` list
in the dashboard ConfigMap (`prod.yaml`). Changes made through edit mode or the
metric explorer apply to the current dashboard session; they are not written
back to the ConfigMap, so reloading the page or switching to another component
can discard them.

To publish a layout for all users, add it to `metrics_dashboards` in the
`karmada-dashboard-configmap` ConfigMap, or to
`dashboardConfig.metricsDashboards` in the Helm values. A Helm values file
replaces the chart's default list, so include every component layout you want
to keep in that file. For example:

```yaml
metrics_dashboards:
  - version: 1
    component: karmada-scheduler
    panels:
      - id: karmada-scheduler-01
        metric_name: karmada_scheduler_schedule_attempts_total
        chart_type: line
        title: Schedule attempts
        visible: true
        order: 0
```

The fields are:

| Field | Description |
| --- | --- |
| `component` | Component key, matching the value in the component selector. |
| `panels[].id` | Unique panel ID within the component. |
| `panels[].metric_name` | Metric to chart. |
| `panels[].chart_type` | `line`, `area`, `bar`, or `gauge`. |
| `panels[].title` | Panel title. |
| `panels[].visible` | Whether the panel is shown. |
| `panels[].order` | Display order. |

The metrics scraper watches the ConfigMap, so a saved change is available
without restarting it. The toolbar's copy action copies the
current component layout as JSON for review or sharing; use the field names
above when adding it to the ConfigMap.

When no layout is configured for a component, the dashboard generates a
default one from a set of common metrics that the component exposes.

## Metrics-scraper flags

The following flags are useful when running the scraper outside the Helm
chart. They are passed to the `karmada-dashboard-metrics-scraper` binary. Pass
`--namespace` with the namespace where the dashboard ConfigMap is installed;
the Helm chart does this for you.

| Flag | Default | Description |
| --- | --- | --- |
| `--metrics-provider` | `sqlite` | `sqlite` or `prometheus`. |
| `--scrape-interval` | `10s` | Interval between SQLite scrape cycles. |
| `--prometheus-url` | empty | Prometheus-compatible query endpoint. Required for the `prometheus` provider. |
| `--prometheus-timeout` | `30s` | Timeout for Prometheus API requests. |
| `--prometheus-bearer-token-file` | empty | File containing a bearer token for Prometheus. |
| `--prometheus-ca-file` | empty | CA certificate file for Prometheus TLS. |
| `--prometheus-insecure-skip-verify` | `false` | Skip Prometheus TLS certificate verification. |

## Troubleshooting

**The Metrics page shows a load error or no data.**

- Confirm that the scraper is running:
  `kubectl -n karmada-system get deployment karmada-dashboard-metrics-scraper`.
  If it is absent, the dashboard was probably installed from `artifacts/`;
  install it with the Helm chart instead.
- Check the scraper logs for scrape or query errors:
  `kubectl -n karmada-system logs deployment/karmada-dashboard-metrics-scraper`.
- With the `sqlite` provider, wait at least one scrape interval and make sure
  the 15-minute window contains samples.
- With the `prometheus` provider, verify that `--prometheus-url` is reachable
  from the scraper pod and that any token or CA Secret is mounted correctly.

**The Window control is disabled.**

SQLite mode always queries the last 15 minutes. Switch to the `prometheus`
provider to query a larger window.

**My panel changes disappeared after reloading or switching components.**

Edit-mode changes are kept for the current session only. Save the layout in the
ConfigMap as described in
[Persisting and sharing a layout](#persisting-and-sharing-a-layout) to keep it
and make it available to other users.
