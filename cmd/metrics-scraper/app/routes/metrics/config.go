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

package metrics

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/config"
)

// GetDashboardConfig returns the persisted metrics dashboards for every component.
func GetDashboardConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"dashboards": config.GetMetricsDashboards(),
	})
}

// SaveDashboardConfig persists (upserts) the metrics dashboard for a single
// component into the dashboard ConfigMap so it is shared across browsers.
func SaveDashboardConfig(c *gin.Context) {
	var body struct {
		Dashboard config.MetricsDashboard `json:"dashboard"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}
	if strings.TrimSpace(body.Dashboard.Component) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "dashboard.component is required"})
		return
	}

	if err := config.UpsertMetricsDashboard(client.InClusterClient(), body.Dashboard); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to persist config: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"dashboards": config.GetMetricsDashboards(),
	})
}
