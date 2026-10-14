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

package options

import (
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/spf13/pflag"
)

const (
	MetricsProviderSQLite     = "sqlite"
	MetricsProviderPrometheus = "prometheus"
)

// Options contains everything necessary to create and run api.
type Options struct {
	BindAddress                   net.IP
	Port                          int
	InsecureBindAddress           net.IP
	InsecurePort                  int
	KubeConfig                    string
	KubeContext                   string
	SkipKubeApiserverTLSVerify    bool
	KarmadaKubeConfig             string
	KarmadaContext                string
	SkipKarmadaApiserverTLSVerify bool
	Namespace                     string
	MetricsProvider               string
	ScrapeInterval                time.Duration
	PrometheusURL                 string
	PrometheusTimeout             time.Duration
	PrometheusBearerTokenFile     string
	PrometheusCAFile              string
	PrometheusInsecureSkipVerify  bool
	DisableCSRFProtection         bool
	OpenAPIEnabled                bool
}

// NewOptions returns initialized Options.
func NewOptions() *Options {
	return &Options{}
}

// AddFlags adds flags of api to the specified FlagSet
func (o *Options) AddFlags(fs *pflag.FlagSet) {
	if o == nil {
		return
	}
	fs.IPVar(&o.BindAddress, "bind-address", net.IPv4(127, 0, 0, 1), "IP address on which to serve the --port, set to 0.0.0.0 for all interfaces")
	fs.IntVar(&o.Port, "port", 8001, "secure port to listen to for incoming HTTPS requests")
	fs.IPVar(&o.InsecureBindAddress, "insecure-bind-address", net.IPv4(127, 0, 0, 1), "IP address on which to serve the --insecure-port, set to 0.0.0.0 for all interfaces")
	fs.IntVar(&o.InsecurePort, "insecure-port", 8000, "port to listen to for incoming HTTP requests")
	fs.StringVar(&o.KubeConfig, "kubeconfig", "", "Path to the host cluster kubeconfig file.")
	fs.StringVar(&o.KubeContext, "context", "", "The name of the kubeconfig context to use.")
	fs.BoolVar(&o.SkipKubeApiserverTLSVerify, "skip-kube-apiserver-tls-verify", false, "enable if connection with remote Kubernetes API server should skip TLS verify")
	fs.StringVar(&o.KarmadaKubeConfig, "karmada-kubeconfig", "", "Path to the karmada control plane kubeconfig file.")
	fs.StringVar(&o.KarmadaContext, "karmada-context", "", "The name of the karmada-kubeconfig context to use.")
	fs.BoolVar(&o.SkipKarmadaApiserverTLSVerify, "skip-karmada-apiserver-tls-verify", false, "enable if connection with remote Karmada API server should skip TLS verify")
	fs.StringVar(&o.Namespace, "namespace", "karmada-dashboard", "Namespace to use when accessing Dashboard specific resources, i.e. configmap")
	fs.StringVar(&o.MetricsProvider, "metrics-provider", MetricsProviderSQLite, "Metrics provider to use: sqlite or prometheus.")
	fs.DurationVar(&o.ScrapeInterval, "scrape-interval", 10*time.Second, "Interval between metrics scrape cycles, e.g. 5s, 30s, 1m")
	fs.StringVar(&o.PrometheusURL, "prometheus-url", "", "Prometheus-compatible query endpoint URL.")
	fs.DurationVar(&o.PrometheusTimeout, "prometheus-timeout", 30*time.Second, "Timeout for Prometheus API requests.")
	fs.StringVar(&o.PrometheusBearerTokenFile, "prometheus-bearer-token-file", "", "File containing a bearer token for Prometheus.")
	fs.StringVar(&o.PrometheusCAFile, "prometheus-ca-file", "", "CA certificate file for Prometheus TLS.")
	fs.BoolVar(&o.PrometheusInsecureSkipVerify, "prometheus-insecure-skip-verify", false, "Skip Prometheus TLS certificate verification.")
	fs.BoolVar(&o.DisableCSRFProtection, "disable-csrf-protection", false, "allows disabling CSRF protection")
	fs.BoolVar(&o.OpenAPIEnabled, "openapi-enabled", false, "enables OpenAPI v2 endpoint under '/apidocs.json'")
}

// Validate checks whether the selected metrics provider has the required options.
func (o *Options) Validate() error {
	switch o.MetricsProvider {
	case MetricsProviderSQLite:
		return nil
	case MetricsProviderPrometheus:
		if strings.TrimSpace(o.PrometheusURL) == "" {
			return fmt.Errorf("--prometheus-url is required when --metrics-provider=%s", MetricsProviderPrometheus)
		}
		return nil
	default:
		return fmt.Errorf("unsupported --metrics-provider %q, must be %q or %q", o.MetricsProvider, MetricsProviderSQLite, MetricsProviderPrometheus)
	}
}
