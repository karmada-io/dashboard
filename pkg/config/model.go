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

package config

// DockerRegistry represents a Docker registry configuration.
type DockerRegistry struct {
	Name     string `yaml:"name" json:"name"`
	URL      string `yaml:"url" json:"url"`
	User     string `yaml:"user" json:"user"`
	Password string `yaml:"password" json:"password"`
	AddTime  int64  `yaml:"add_time" json:"add_time"`
}

// ChartRegistry represents a Helm chart registry configuration.
type ChartRegistry struct {
	Name     string `yaml:"name" json:"name"`
	URL      string `yaml:"url" json:"url"`
	User     string `yaml:"user" json:"user"`
	Password string `yaml:"password" json:"password"`
	AddTime  int64  `yaml:"add_time" json:"add_time"`
}

// MenuConfig represents a menu configuration.
type MenuConfig struct {
	Path       string       `yaml:"path" json:"path"`
	Enable     bool         `yaml:"enable" json:"enable"`
	SidebarKey string       `yaml:"sidebar_key" json:"sidebar_key"`
	Children   []MenuConfig `yaml:"children" json:"children,omitempty"`
}

// DashboardConfig represents the configuration structure for the Karmada dashboard.
type DashboardConfig struct {
	DockerRegistries []DockerRegistry `yaml:"docker_registries" json:"docker_registries"`
	ChartRegistries  []ChartRegistry  `yaml:"chart_registries" json:"chart_registries"`
	MenuConfigs      []MenuConfig     `yaml:"menu_configs" json:"menu_configs"`
	PathPrefix       string           `yaml:"path_prefix" json:"path_prefix"`
}
