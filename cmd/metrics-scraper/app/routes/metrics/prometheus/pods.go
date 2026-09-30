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

import (
	"maps"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type componentPodsResponse struct {
	AppName  string   `json:"appName"`
	Pods     []string `json:"pods"`
	Warnings []string `json:"warnings,omitempty"`
}

// GetComponentPods returns pods discovered through Prometheus series labels.
func (h *Handler) GetComponentPods(c *gin.Context) {
	appName := c.Param("app_name")
	if !supportedComponent(appName) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported metrics component"})
		return
	}
	now := time.Now()
	_, series, err := h.client.catalog(c.Request.Context(), appName, now.Add(-defaultVisualizationWindow), now, false)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error(), "pods": []string{}})
		return
	}
	c.JSON(http.StatusOK, componentPodsResponse{AppName: appName, Pods: h.client.podsFromSeries(appName, series)})
}

func (p *Client) podsFromSeries(appName string, series []map[string]string) []string {
	set := map[string]bool{}
	for _, labels := range series {
		pod := labels["pod"]
		if pod == "" {
			continue
		}
		if appName == "karmada-agent" && labels["cluster"] != "" {
			pod = labels["cluster"] + "/" + pod
		}
		set[pod] = true
	}
	return slices.Sorted(maps.Keys(set))
}

func splitPod(appName, value string) (string, string) {
	if appName == "karmada-agent" {
		if cluster, pod, ok := strings.Cut(value, "/"); ok {
			return cluster, pod
		}
	}
	return "", value
}
