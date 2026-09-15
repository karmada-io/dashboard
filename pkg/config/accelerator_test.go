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

package config

import (
	"reflect"
	"testing"

	"gopkg.in/yaml.v3"
	v1 "k8s.io/api/core/v1"
)

func TestGetAcceleratorResourcesDefaultsWhenAbsent(t *testing.T) {
	saved := dashboardConfig
	t.Cleanup(func() { dashboardConfig = saved })

	// A config written before accelerator_resources existed.
	var cfg DashboardConfig
	if err := yaml.Unmarshal([]byte("docker_registries: []\npath_prefix: ''\n"), &cfg); err != nil {
		t.Fatalf("unmarshal config: %v", err)
	}
	dashboardConfig = cfg

	got := GetAcceleratorResources()
	want := []v1.ResourceName{"nvidia.com/gpu"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("GetAcceleratorResources() = %v, want %v", got, want)
	}
}

func TestGetAcceleratorResourcesUsesConfiguredList(t *testing.T) {
	saved := dashboardConfig
	t.Cleanup(func() { dashboardConfig = saved })

	var cfg DashboardConfig
	raw := "accelerator_resources:\n  - nvidia.com/gpu\n  - amd.com/gpu\n"
	if err := yaml.Unmarshal([]byte(raw), &cfg); err != nil {
		t.Fatalf("unmarshal config: %v", err)
	}
	dashboardConfig = cfg

	got := GetAcceleratorResources()
	want := []v1.ResourceName{"nvidia.com/gpu", "amd.com/gpu"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("GetAcceleratorResources() = %v, want %v", got, want)
	}
}

func TestNormalizeAcceleratorResources(t *testing.T) {
	tests := []struct {
		name       string
		configured []string
		want       []v1.ResourceName
	}{
		{name: "nil falls back to default", configured: nil, want: []v1.ResourceName{"nvidia.com/gpu"}},
		{name: "empty falls back to default", configured: []string{}, want: []v1.ResourceName{"nvidia.com/gpu"}},
		{name: "blank entries fall back to default", configured: []string{" ", ""}, want: []v1.ResourceName{"nvidia.com/gpu"}},
		{
			name:       "trims and de-duplicates, keeping order",
			configured: []string{" amd.com/gpu ", "nvidia.com/gpu", "amd.com/gpu"},
			want:       []v1.ResourceName{"amd.com/gpu", "nvidia.com/gpu"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeAcceleratorResources(tt.configured); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("normalizeAcceleratorResources(%v) = %v, want %v", tt.configured, got, tt.want)
			}
		})
	}
}
