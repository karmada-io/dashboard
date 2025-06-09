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

package db

// PodInfo is the pod info.
type PodInfo struct {
	Name string `json:"name"`
}

// Metric is the metric info.
type Metric struct {
	Name   string        `json:"name"`
	Help   string        `json:"help"`
	Type   string        `json:"type"`
	Values []MetricValue `json:"values,omitempty"`
}

// MetricValue is the metric value info.
type MetricValue struct {
	Labels  map[string]string `json:"labels,omitempty"`
	Value   string            `json:"value"`
	Measure string            `json:"measure"`
}

// ParsedData is the parsed data info.
type ParsedData struct {
	CurrentTime string             `json:"currentTime"`
	Metrics     map[string]*Metric `json:"metrics"`
}
