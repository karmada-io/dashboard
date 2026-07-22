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

package scrape

import (
	"bytes"
	"context"
	"encoding/pem"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"

	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/db"
)

func TestGetAuthenticatedPodMetricsUsesKarmadaCredentials(t *testing.T) {
	const token = "metrics-reader-token"
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer "+token {
			http.Error(w, "missing Karmada credentials", http.StatusForbidden)
			return
		}
		if r.URL.Path != "/custom-metrics" {
			http.NotFound(w, r)
			return
		}
		_, _ = w.Write([]byte("# TYPE karmada_build_info gauge\nkarmada_build_info 1\n"))
	}))
	defer server.Close()

	serverURL, err := url.Parse(server.URL)
	if err != nil {
		t.Fatalf("parse test server URL: %v", err)
	}
	host, port, err := net.SplitHostPort(serverURL.Host)
	if err != nil {
		t.Fatalf("split test server address: %v", err)
	}
	certificate := server.Certificate()
	caData := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certificate.Raw})

	got, err := getAuthenticatedPodMetrics(
		context.Background(),
		&rest.Config{BearerToken: token, TLSClientConfig: rest.TLSClientConfig{CAData: caData}},
		db.PodInfo{Name: "aggregated-apiserver-0", IP: host},
		&db.ComponentConfig{Scheme: "https", Port: port, MetricsPath: "/custom-metrics"},
	)
	if err != nil {
		t.Fatalf("getAuthenticatedPodMetrics returned error: %v", err)
	}
	if string(got) != "# TYPE karmada_build_info gauge\nkarmada_build_info 1\n" {
		t.Fatalf("unexpected metrics body %q", got)
	}
}

func TestGetAuthenticatedPodMetricsRequiresPodIP(t *testing.T) {
	_, err := getAuthenticatedPodMetrics(
		context.Background(),
		&rest.Config{},
		db.PodInfo{Name: "pending-pod"},
		&db.ComponentConfig{Scheme: "https", Port: "443", MetricsPath: "/metrics"},
	)
	if err == nil {
		t.Fatal("expected an error for a pod without an IP")
	}
}

func TestParseFiniteMetricValue(t *testing.T) {
	for _, raw := range []string{"NaN", "+Inf", "-Inf", "not-a-number"} {
		if value, ok := parseFiniteMetricValue(raw); ok {
			t.Fatalf("parseFiniteMetricValue(%q) = %v, true; want rejected", raw, value)
		}
	}
	if value, ok := parseFiniteMetricValue(" 12.5 "); !ok || value != 12.5 {
		t.Fatalf("parseFiniteMetricValue(valid) = %v, %t; want 12.5, true", value, ok)
	}
}

func TestGetAuthenticatedPodMetricsIntegration(t *testing.T) {
	podIP := os.Getenv("METRICS_INTEGRATION_POD_IP")
	kubeconfig := os.Getenv("METRICS_INTEGRATION_KUBECONFIG")
	if podIP == "" || kubeconfig == "" {
		t.Skip("set METRICS_INTEGRATION_POD_IP and METRICS_INTEGRATION_KUBECONFIG to run")
	}

	karmadaConfig, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		t.Fatalf("load Karmada kubeconfig: %v", err)
	}
	component := os.Getenv("METRICS_INTEGRATION_COMPONENT")
	if component == "" {
		component = db.KarmadaAggregatedAPIServer
	}
	cfg := db.GetComponentConfig(component)
	if cfg == nil {
		t.Fatalf("%s scrape config is missing", component)
	}

	metrics, err := getAuthenticatedPodMetrics(
		context.Background(),
		karmadaConfig,
		db.PodInfo{Name: "integration-target", IP: podIP},
		cfg,
	)
	if err != nil {
		t.Fatalf("scrape %s: %v", component, err)
	}
	if !bytes.Contains(metrics, []byte("# HELP")) || !bytes.Contains(metrics, []byte("# TYPE")) {
		t.Fatalf("response is not Prometheus metrics text (length %d)", len(metrics))
	}
	t.Logf("scraped %d bytes from %s", len(metrics), component)
}
