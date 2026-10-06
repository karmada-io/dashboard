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
	"strings"

	v1 "k8s.io/api/core/v1"
)

// DefaultAcceleratorResources is used when the dashboard config does not set
// accelerator_resources. It is the resource name the NVIDIA device plugin
// advertises on GPU nodes.
var DefaultAcceleratorResources = []string{"nvidia.com/gpu"}

// GetAcceleratorResources returns the extended resource names whose
// quantities are summed as accelerator (GPU) devices. Entries are trimmed and
// de-duplicated; an absent or effectively empty list falls back to
// DefaultAcceleratorResources, so a config without the key behaves exactly
// as before the key existed.
func GetAcceleratorResources() []v1.ResourceName {
	return normalizeAcceleratorResources(dashboardConfig.AcceleratorResources)
}

func normalizeAcceleratorResources(configured []string) []v1.ResourceName {
	names := make([]v1.ResourceName, 0, len(configured))
	seen := make(map[string]struct{}, len(configured))
	for _, name := range configured {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if _, dup := seen[name]; dup {
			continue
		}
		seen[name] = struct{}{}
		names = append(names, v1.ResourceName(name))
	}
	if len(names) == 0 {
		for _, name := range DefaultAcceleratorResources {
			names = append(names, v1.ResourceName(name))
		}
	}
	return names
}
