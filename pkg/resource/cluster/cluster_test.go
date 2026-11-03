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

package cluster

import (
	"testing"

	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestToClusterReadyUsesReadyCondition(t *testing.T) {
	tests := []struct {
		name       string
		conditions []metav1.Condition
		want       metav1.ConditionStatus
	}{
		{
			name: "ready",
			conditions: []metav1.Condition{
				{Type: v1alpha1.ClusterConditionCompleteAPIEnablements, Status: metav1.ConditionTrue},
				{Type: v1alpha1.ClusterConditionReady, Status: metav1.ConditionTrue},
			},
			want: metav1.ConditionTrue,
		},
		{
			name: "offline cluster keeps other conditions true",
			conditions: []metav1.Condition{
				{Type: v1alpha1.ClusterConditionCompleteAPIEnablements, Status: metav1.ConditionTrue},
				{Type: v1alpha1.ClusterConditionReady, Status: metav1.ConditionFalse},
			},
			want: metav1.ConditionFalse,
		},
		{
			name: "ready condition not reported yet",
			conditions: []metav1.Condition{
				{Type: v1alpha1.ClusterConditionCompleteAPIEnablements, Status: metav1.ConditionTrue},
			},
			want: metav1.ConditionUnknown,
		},
		{
			name: "no conditions",
			want: metav1.ConditionUnknown,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cluster := &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: "member1"},
				Status:     v1alpha1.ClusterStatus{Conditions: tt.conditions},
			}
			if got := toCluster(cluster).Ready; got != tt.want {
				t.Errorf("toCluster().Ready = %q, want %q", got, tt.want)
			}
		})
	}
}
