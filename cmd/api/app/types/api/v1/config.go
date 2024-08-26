package v1

import "github.com/karmada-io/dashboard/pkg/config"

type SetDashboardConfigRequest struct {
	DockerRegistries []config.DockerRegistry `json:"docker_registries"`
	ChartRegistries  []config.ChartRegistry  `json:"chart_registries"`
	MenuConfigs      []config.MenuConfig     `json:"menu_configs"`
}
