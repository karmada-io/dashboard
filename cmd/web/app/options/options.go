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

	"github.com/spf13/pflag"
)

// Options contains everything necessary to create and run api.
type Options struct {
	BindAddress                         net.IP
	Port                                int
	InsecureBindAddress                 net.IP
	InsecurePort                        int
	StaticDir                           string
	I18nDir                             string
	Namespace                           string
	EnableAPIProxy                      bool
	APIProxyEndpoint                    string
	EnableKubernetesDashboardAPIProxy   bool
	KubernetesDashboardAPIProxyEndpoint string
	EnableMetricsScraperProxy           bool
	MetricsScraperProxyEndpoint         string
	DashboardConfigPath                 string
}

// NewOptions creates a new Options object with default parameters.
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
	fs.StringVar(&o.StaticDir, "static-dir", "./static", "directory to serve static files")
	fs.StringVar(&o.I18nDir, "i18n-dir", "./i18n", "directory to serve i18n files")
	fs.StringVar(&o.Namespace, "namespace", "karmada-system", "Namespace where the dashboard is installed, used to build the default proxy endpoints")
	fs.BoolVar(&o.EnableAPIProxy, "enable-api-proxy", true, "whether enable proxy to karmada-dashboard-api, if set true, all requests with /api prefix will be proxied to the karmada-dashboard-api service")
	fs.StringVar(&o.APIProxyEndpoint, "api-proxy-endpoint", "", "karmada-dashboard-api endpoint (default: http://karmada-dashboard-api.<namespace>.svc.cluster.local:8000)")
	fs.BoolVar(&o.EnableKubernetesDashboardAPIProxy, "enable-kubernetes-dashboard-api-proxy", true, "whether enable proxy to kubernetes-dashboard-api, if set true, all requests with /clusterapi prefix will be proxied to the kubernetes-dashboard-api service")
	fs.StringVar(&o.KubernetesDashboardAPIProxyEndpoint, "kubernetes-dashboard-api-proxy-endpoint", "", "kubernetes-dashboard-api endpoint (default: http://kubernetes-dashboard-api.<namespace>.svc.cluster.local:8000)")
	fs.BoolVar(&o.EnableMetricsScraperProxy, "enable-metrics-scraper-proxy", true, "whether enable proxy to karmada-dashboard-metrics-scraper, if set true, all requests with /metrics-scraper prefix will be proxied to the metrics-scraper endpoint")
	fs.StringVar(&o.MetricsScraperProxyEndpoint, "metrics-scraper-proxy-endpoint", "", "karmada-dashboard-metrics-scraper endpoint (default: http://karmada-dashboard-metrics-scraper.<namespace>.svc.cluster.local:8000)")
	fs.StringVar(&o.DashboardConfigPath, "dashboard-config-path", "./config/dashboard-config.yaml", "path to dashboard config file")
}

// Complete fills in the proxy endpoints that were not set explicitly, using
// the namespace the dashboard is installed in.
func (o *Options) Complete() {
	if o.APIProxyEndpoint == "" {
		o.APIProxyEndpoint = fmt.Sprintf("http://karmada-dashboard-api.%s.svc.cluster.local:8000", o.Namespace)
	}
	if o.KubernetesDashboardAPIProxyEndpoint == "" {
		o.KubernetesDashboardAPIProxyEndpoint = fmt.Sprintf("http://kubernetes-dashboard-api.%s.svc.cluster.local:8000", o.Namespace)
	}
	if o.MetricsScraperProxyEndpoint == "" {
		o.MetricsScraperProxyEndpoint = fmt.Sprintf("http://karmada-dashboard-metrics-scraper.%s.svc.cluster.local:8000", o.Namespace)
	}
}
