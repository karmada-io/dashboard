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

package prometheus

import "strings"

var components = map[string]bool{
	"karmada-scheduler":               true,
	"karmada-controller-manager":      true,
	"karmada-agent":                   true,
	"karmada-aggregated-apiserver":    true,
	"karmada-apiserver":               true,
	"karmada-descheduler":             true,
	"karmada-kube-controller-manager": true,
	"karmada-metrics-adapter":         true,
	"karmada-search":                  true,
	"karmada-webhook":                 true,
}

func supportedComponent(name string) bool {
	return components[name] || strings.HasPrefix(name, "karmada-scheduler-estimator-")
}
