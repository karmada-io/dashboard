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
	"net"

	"github.com/spf13/pflag"
)

// Options contains everything necessary to create and run api.
type Options struct {
	BindAddress         net.IP
	Port                int
	InsecureBindAddress net.IP
	InsecurePort        int
	StaticDir           string
	I18nDir             string
	EnableApiProxy      bool
	ApiProxyEndpoint    string
	DashboardConfigPath string
}

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
	fs.BoolVar(&o.EnableApiProxy, "enable-api-proxy", true, "whether enable proxy to karmada-dashboard-api, if set true, all requests with /api prefix will be proxyed to karmada-dashboard-api.karmada-system.svc.cluster.local")
	fs.StringVar(&o.ApiProxyEndpoint, "api-proxy-endpoint", "http://karmada-dashboard-api.karmada-system.svc.cluster.local:8000", "karmada-dashboard-api endpoint")
	fs.StringVar(&o.DashboardConfigPath, "dashboard-config-path", "./config/dashboard-config.yaml", "path to dashboard config file")
}
