/*
Copyright 2026 The Karmada Authors.

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

import "testing"

func TestCompleteProxyEndpoints(t *testing.T) {
	tests := []struct {
		name             string
		namespace        string
		apiEndpoint      string
		expectAPI        string
		expectK8sAPI     string
		expectScraperAPI string
	}{
		{
			name:             "default namespace",
			namespace:        "karmada-system",
			expectAPI:        "http://karmada-dashboard-api.karmada-system.svc.cluster.local:8000",
			expectK8sAPI:     "http://kubernetes-dashboard-api.karmada-system.svc.cluster.local:8000",
			expectScraperAPI: "http://karmada-dashboard-metrics-scraper.karmada-system.svc.cluster.local:8000",
		},
		{
			name:             "custom namespace",
			namespace:        "dashboard",
			expectAPI:        "http://karmada-dashboard-api.dashboard.svc.cluster.local:8000",
			expectK8sAPI:     "http://kubernetes-dashboard-api.dashboard.svc.cluster.local:8000",
			expectScraperAPI: "http://karmada-dashboard-metrics-scraper.dashboard.svc.cluster.local:8000",
		},
		{
			name:             "explicit endpoint is preserved",
			namespace:        "dashboard",
			apiEndpoint:      "http://localhost:8000",
			expectAPI:        "http://localhost:8000",
			expectK8sAPI:     "http://kubernetes-dashboard-api.dashboard.svc.cluster.local:8000",
			expectScraperAPI: "http://karmada-dashboard-metrics-scraper.dashboard.svc.cluster.local:8000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts := &Options{
				Namespace:        tt.namespace,
				APIProxyEndpoint: tt.apiEndpoint,
			}

			opts.Complete()

			if opts.APIProxyEndpoint != tt.expectAPI {
				t.Errorf("APIProxyEndpoint = %q, want %q", opts.APIProxyEndpoint, tt.expectAPI)
			}
			if opts.KubernetesDashboardAPIProxyEndpoint != tt.expectK8sAPI {
				t.Errorf("KubernetesDashboardAPIProxyEndpoint = %q, want %q", opts.KubernetesDashboardAPIProxyEndpoint, tt.expectK8sAPI)
			}
			if opts.MetricsScraperProxyEndpoint != tt.expectScraperAPI {
				t.Errorf("MetricsScraperProxyEndpoint = %q, want %q", opts.MetricsScraperProxyEndpoint, tt.expectScraperAPI)
			}
		})
	}
}
