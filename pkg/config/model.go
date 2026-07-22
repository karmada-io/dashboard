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

// MetricLabelFilter represents a single label matcher used by a metric panel query.
type MetricLabelFilter struct {
	Key   string `yaml:"key" json:"key"`
	Value string `yaml:"value" json:"value"`
}

// MetricPanelQuery represents the query definition backing a metric panel.
type MetricPanelQuery struct {
	Metric       string              `yaml:"metric" json:"metric"`
	Aggregation  string              `yaml:"aggregation" json:"aggregation"`
	LabelFilters []MetricLabelFilter `yaml:"label_filters,omitempty" json:"labelFilters,omitempty"`
}

// MetricPanel represents a single chart panel on the metrics dashboard.
type MetricPanel struct {
	ID         string            `yaml:"id" json:"id"`
	MetricName string            `yaml:"metric_name" json:"metricName"`
	ChartType  string            `yaml:"chart_type" json:"chartType"`
	Title      string            `yaml:"title" json:"title"`
	Visible    bool              `yaml:"visible" json:"visible"`
	Query      *MetricPanelQuery `yaml:"query,omitempty" json:"query,omitempty"`
	Order      *int              `yaml:"order,omitempty" json:"order,omitempty"`
}

// MetricsDashboard represents the persisted panel layout for a single component.
type MetricsDashboard struct {
	Version   int           `yaml:"version" json:"version"`
	Component string        `yaml:"component" json:"component"`
	Panels    []MetricPanel `yaml:"panels" json:"panels"`
}

// DashboardConfig represents the configuration structure for the Karmada dashboard.
type DashboardConfig struct {
	DockerRegistries  []DockerRegistry   `yaml:"docker_registries" json:"docker_registries"`
	ChartRegistries   []ChartRegistry    `yaml:"chart_registries" json:"chart_registries"`
	MenuConfigs       []MenuConfig       `yaml:"menu_configs" json:"menu_configs"`
	PathPrefix        string             `yaml:"path_prefix" json:"path_prefix"`
	MetricsDashboards []MetricsDashboard `yaml:"metrics_dashboards,omitempty" json:"metrics_dashboards,omitempty"`
}
