package config

type DockerRegistry struct {
	Name     string `yaml:"name" json:"name"`
	Url      string `yaml:"url" json:"url"`
	User     string `yaml:"user" json:"user"`
	Password string `yaml:"password" json:"password"`
	AddTime  int64  `yaml:"add_time" json:"add_time"`
}

type ChartRegistry struct {
	Name     string `yaml:"name" json:"name"`
	Url      string `yaml:"url" json:"url"`
	User     string `yaml:"user" json:"user"`
	Password string `yaml:"password" json:"password"`
	AddTime  int64  `yaml:"add_time" json:"add_time"`
}

type MenuConfig struct {
	Path       string       `yaml:"path" json:"path"`
	Enable     bool         `yaml:"enable" json:"enable"`
	SidebarKey string       `yaml:"sidebar_key" json:"sidebar_key"`
	Children   []MenuConfig `yaml:"children" json:"children,omitempty"`
}

type DashboardConfig struct {
	DockerRegistries []DockerRegistry `yaml:"docker_registries" json:"docker_registries"`
	ChartRegistries  []ChartRegistry  `yaml:"chart_registries" json:"chart_registries"`
	MenuConfigs      []MenuConfig     `yaml:"menu_configs" json:"menu_configs"`
}
