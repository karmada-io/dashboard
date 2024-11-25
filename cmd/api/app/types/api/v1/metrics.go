package v1  

type PodInfo struct {
	Name string `json:"name"`
}

type MetricInfo struct {
	Help string `json:"help"`
	Type string `json:"type"`
}

type Metric struct {
	Name   string        `json:"name"`
	Help   string        `json:"help"`
	Type   string        `json:"type"`
	Values []MetricValue `json:"values,omitempty"`
}

type MetricValue struct {
	Labels  map[string]string `json:"labels,omitempty"`
	Value   string            `json:"value"`
	Measure string            `json:"measure"`
}

type ParsedData struct {
	CurrentTime string             `json:"currentTime"`
	Metrics     map[string]*Metric `json:"metrics"`
}
