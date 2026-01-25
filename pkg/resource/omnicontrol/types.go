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
	karmadapolicyv1alpha1 "github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmadaworkv1alpha1 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha1"
	karmadaworkv1alpha2 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha2"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// ClusterStatus holds the sync state of a resource in a member cluster.
type ClusterStatus struct {
	ClusterName string                    `json:"clusterName"`
	SyncStatus  string                    `json:"syncStatus"`
	Work        *karmadaworkv1alpha1.Work `json:"work,omitempty"`
}

// ResourceTopology aggregates a resource's propagation path: Template → Policy → Binding → Work.
type ResourceTopology struct {
	Resource        *unstructured.Unstructured               `json:"resource"`
	Policy          *karmadapolicyv1alpha1.PropagationPolicy `json:"policy,omitempty"`
	Binding         *karmadaworkv1alpha2.ResourceBinding     `json:"binding,omitempty"`
	ClusterStatuses []ClusterStatus                          `json:"clusterStatuses,omitempty"`
}
