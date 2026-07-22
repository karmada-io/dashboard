/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package db

import "strings"

const (
	// Namespace is the namespace of karmada.
	Namespace = "karmada-system"
	// KarmadaAgent is the name of karmada agent.
	KarmadaAgent = "karmada-agent"
	// KarmadaScheduler is the name of karmada scheduler.
	KarmadaScheduler = "karmada-scheduler"
	// KarmadaSchedulerEstimator is the name of karmada scheduler estimator.
	KarmadaSchedulerEstimator = "karmada-scheduler-estimator"
	// KarmadaControllerManager is the name of karmada controller manager.
	KarmadaControllerManager = "karmada-controller-manager"
	// KarmadaAggregatedAPIServer is the name of karmada aggregated apiserver.
	KarmadaAggregatedAPIServer = "karmada-aggregated-apiserver"
	// KarmadaAPIServer is the name of karmada apiserver.
	KarmadaAPIServer = "karmada-apiserver"
	// KarmadaDescheduler is the name of karmada descheduler.
	KarmadaDescheduler = "karmada-descheduler"
	// KarmadaKubeControllerManager is the name of karmada kube controller manager.
	KarmadaKubeControllerManager = "karmada-kube-controller-manager"
	// KarmadaMetricsAdapter is the name of karmada metrics adapter.
	KarmadaMetricsAdapter = "karmada-metrics-adapter"
	// KarmadaSearch is the name of karmada search.
	KarmadaSearch = "karmada-search"
	// KarmadaWebhook is the name of karmada webhook.
	KarmadaWebhook = "karmada-webhook"

	// DefaultMetricsPort is used by Karmada components that expose a dedicated
	// controller-runtime metrics listener.
	DefaultMetricsPort = "8080"
)

// ComponentConfig holds the scrape configuration for a single Karmada component.
type ComponentConfig struct {
	// Name is the component name used by the dashboard and metrics database.
	Name string
	// LabelSelector selects the component pods in the host cluster.
	LabelSelector string
	// Port is the metrics port.
	Port string
	// Scheme is "http" or "https".
	Scheme string
	// MetricsPath is the path to the metrics endpoint (default "/metrics").
	MetricsPath string
	// ServerName is used to verify a secure component's serving certificate
	// while connecting directly to its pod IP.
	ServerName string
	// InsecureSkipVerify is reserved for components such as the upstream
	// kube-controller-manager that generate an ephemeral self-signed serving
	// certificate which cannot be validated with the Karmada CA.
	InsecureSkipVerify bool
}

// AllComponents returns the full list of scrapeable Karmada control-plane components.
func AllComponents() []ComponentConfig {
	return []ComponentConfig{
		{Name: KarmadaScheduler, LabelSelector: "app=" + KarmadaScheduler, Port: DefaultMetricsPort, Scheme: "http", MetricsPath: "/metrics"},
		{Name: KarmadaControllerManager, LabelSelector: "app=" + KarmadaControllerManager, Port: DefaultMetricsPort, Scheme: "http", MetricsPath: "/metrics"},
		{Name: KarmadaAgent, LabelSelector: "app=" + KarmadaAgent, Port: DefaultMetricsPort, Scheme: "http", MetricsPath: "/metrics"},
		{Name: KarmadaSchedulerEstimator, LabelSelector: "app=" + KarmadaSchedulerEstimator, Port: DefaultMetricsPort, Scheme: "http", MetricsPath: "/metrics"},
		{Name: KarmadaAggregatedAPIServer, LabelSelector: "app=" + KarmadaAggregatedAPIServer, Port: "443", Scheme: "https", MetricsPath: "/metrics", ServerName: serviceServerName(KarmadaAggregatedAPIServer)},
		{Name: KarmadaAPIServer, LabelSelector: "app=" + KarmadaAPIServer, Port: "5443", Scheme: "https", MetricsPath: "/metrics", ServerName: serviceServerName(KarmadaAPIServer)},
		{Name: KarmadaDescheduler, LabelSelector: "app=" + KarmadaDescheduler, Port: DefaultMetricsPort, Scheme: "http", MetricsPath: "/metrics"},
		// kube-controller-manager generates an ephemeral self-signed serving
		// certificate for 127.0.0.1 even when it binds to all interfaces.
		{Name: KarmadaKubeControllerManager, LabelSelector: "app=kube-controller-manager", Port: "10257", Scheme: "https", MetricsPath: "/metrics", InsecureSkipVerify: true},
		{Name: KarmadaMetricsAdapter, LabelSelector: "app=" + KarmadaMetricsAdapter, Port: DefaultMetricsPort, Scheme: "http", MetricsPath: "/metrics"},
		{Name: KarmadaSearch, LabelSelector: "app=" + KarmadaSearch, Port: "443", Scheme: "https", MetricsPath: "/metrics", ServerName: serviceServerName(KarmadaSearch)},
		{Name: KarmadaWebhook, LabelSelector: "app=" + KarmadaWebhook, Port: DefaultMetricsPort, Scheme: "http", MetricsPath: "/metrics"},
	}
}

func serviceServerName(component string) string {
	return component + "." + Namespace + ".svc"
}

// GetComponentConfig returns the ComponentConfig for the given app name, or nil if not found.
func GetComponentConfig(appName string) *ComponentConfig {
	for _, c := range AllComponents() {
		if c.Name == appName {
			return &c
		}
		if c.Name == KarmadaSchedulerEstimator && strings.HasPrefix(appName, KarmadaSchedulerEstimator+"-") {
			c.Name = appName
			c.LabelSelector = "app=" + appName
			return &c
		}
	}
	return nil
}

// MetricTier defines storage priority for metrics.
type MetricTier int

const (
	// TierHigh - always stored at full resolution (process_*, workqueue_*, go_goroutines, go_threads).
	TierHigh MetricTier = iota
	// TierMedium - stored every scrape but without histogram buckets.
	TierMedium
	// TierLow - sampled every 3rd scrape (rest_client_*, etcd_*, apiserver_*).
	TierLow
)

// GetMetricTier returns the storage tier for a metric based on its name prefix.
func GetMetricTier(metricName string) MetricTier {
	// High priority: core operational metrics
	highPrefixes := []string{"process_", "workqueue_", "go_goroutines", "go_threads", "go_memstats_"}
	for _, p := range highPrefixes {
		if strings.HasPrefix(metricName, p) {
			return TierHigh
		}
	}
	// Low priority: verbose client/etcd/apiserver metrics
	lowPrefixes := []string{"rest_client_", "etcd_", "apiserver_request_", "reflector_"}
	for _, p := range lowPrefixes {
		if strings.HasPrefix(metricName, p) {
			return TierLow
		}
	}
	return TierMedium
}
