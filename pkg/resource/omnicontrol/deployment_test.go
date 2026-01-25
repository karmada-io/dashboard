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

package omnicontrol

import (
	"testing"

	karmadafake "github.com/karmada-io/karmada/pkg/generated/clientset/versioned/fake"
	"k8s.io/client-go/kubernetes/fake"
)

func TestGetDeploymentTopology_NotFound(t *testing.T) {
	k8sClient := fake.NewSimpleClientset()
	karmadaClient := karmadafake.NewSimpleClientset()

	_, err := GetDeploymentTopology(k8sClient, karmadaClient, "default", "nonexistent")
	if err == nil {
		t.Error("expected error when deployment does not exist, got nil")
	}
}
