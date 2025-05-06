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

package v1

import "github.com/karmada-io/dashboard/pkg/config"

// SetDashboardConfigRequest is the request for setting dashboard config
// SetDashboardConfigRequest 是设置 dashboard 配置的请求
type SetDashboardConfigRequest struct {
	// DockerRegistries 是 docker 注册表
	DockerRegistries []config.DockerRegistry `json:"docker_registries"`
	// ChartRegistries 是 chart 注册表
	ChartRegistries  []config.ChartRegistry  `json:"chart_registries"`
	// MenuConfigs 是菜单配置
	MenuConfigs      []config.MenuConfig     `json:"menu_configs"`
}
