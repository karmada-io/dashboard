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

package metrics

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGetComponentPodsSuccess(t *testing.T) {
	original := discoverComponentPods
	defer func() { discoverComponentPods = original }()
	discoverComponentPods = func(_ context.Context, appName string) ([]string, []string, error) {
		if appName != "karmada-aggregated-apiserver" {
			t.Fatalf("unexpected app name %q", appName)
		}
		return []string{"aggregated-0", "aggregated-1"}, nil, nil
	}

	c, w := newVisualizationContext("/api/v1/metrics/karmada-aggregated-apiserver/pods")
	c.Params = gin.Params{{Key: "app_name", Value: "karmada-aggregated-apiserver"}}
	GetComponentPods(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var response componentPodsResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.Pods) != 2 {
		t.Fatalf("expected 2 pods, got %#v", response.Pods)
	}
}

func TestGetComponentPodsDiscoveryFailure(t *testing.T) {
	original := discoverComponentPods
	defer func() { discoverComponentPods = original }()
	discoverComponentPods = func(_ context.Context, _ string) ([]string, []string, error) {
		return nil, []string{"list failed"}, errors.New("discovery failed")
	}

	c, w := newVisualizationContext("/api/v1/metrics/karmada-aggregated-apiserver/pods")
	c.Params = gin.Params{{Key: "app_name", Value: "karmada-aggregated-apiserver"}}
	GetComponentPods(c)
	if w.Code != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d body=%s", w.Code, w.Body.String())
	}
}
