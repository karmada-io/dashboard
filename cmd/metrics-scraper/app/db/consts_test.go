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

package db

import "testing"

func TestComponentScrapeConfigs(t *testing.T) {
	tests := []struct {
		name       string
		port       string
		scheme     string
		selector   string
		serverName string
		insecure   bool
	}{
		{KarmadaScheduler, "8080", "http", "app=karmada-scheduler", "", false},
		{KarmadaDescheduler, "8080", "http", "app=karmada-descheduler", "", false},
		{KarmadaWebhook, "8080", "http", "app=karmada-webhook", "", false},
		{KarmadaAggregatedAPIServer, "443", "https", "app=karmada-aggregated-apiserver", "karmada-aggregated-apiserver.karmada-system.svc", false},
		{KarmadaAPIServer, "5443", "https", "app=karmada-apiserver", "karmada-apiserver.karmada-system.svc", false},
		{KarmadaSearch, "443", "https", "app=karmada-search", "karmada-search.karmada-system.svc", false},
		{KarmadaKubeControllerManager, "10257", "https", "app=kube-controller-manager", "", true},
		{KarmadaSchedulerEstimator + "-member1", "8080", "http", "app=karmada-scheduler-estimator-member1", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := GetComponentConfig(tt.name)
			if cfg == nil {
				t.Fatalf("GetComponentConfig(%q) returned nil", tt.name)
			}
			if cfg.Port != tt.port || cfg.Scheme != tt.scheme || cfg.LabelSelector != tt.selector || cfg.ServerName != tt.serverName || cfg.InsecureSkipVerify != tt.insecure {
				t.Fatalf("GetComponentConfig(%q) = %#v, want port=%q scheme=%q selector=%q serverName=%q insecure=%t", tt.name, cfg, tt.port, tt.scheme, tt.selector, tt.serverName, tt.insecure)
			}
		})
	}
}

func TestGetComponentConfigRejectsUnknownComponent(t *testing.T) {
	if cfg := GetComponentConfig("not-a-karmada-component"); cfg != nil {
		t.Fatalf("expected nil config, got %#v", cfg)
	}
}
