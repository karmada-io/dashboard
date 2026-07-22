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

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
)

// GetMetrics returns the metrics for the given app name
func GetMetrics(c *gin.Context) {
	appName := c.Param("app_name")
	queryType := c.Query("type")

	if queryType == "sync_on" || queryType == "sync_off" {
		syncValue := 0
		if queryType == "sync_on" {
			syncValue = 1
		}
		scrape.HandleSyncOperation(c, appName, syncValue, queryType)
		return
	}

	if queryType == "metricsdetails" {
		QueryMetrics(c)
		return
	}

	if queryType == "sync_status" {
		scrape.CheckAppStatus(c)
		return
	}

	// Pass nil for the save channel; live metrics are persisted by background goroutines only.
	allMetrics, errors, err := scrape.FetchMetrics(c.Request.Context(), appName, nil)
	if err != nil {
		status := http.StatusBadGateway
		if strings.Contains(strings.ToLower(err.Error()), "no pods found") {
			status = http.StatusServiceUnavailable
		}
		c.JSON(status, gin.H{"errors": errors, "error": err.Error()})
		return
	}
	if len(allMetrics) > 0 {
		c.JSON(http.StatusOK, allMetrics)
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "No metrics data found", "errors": errors})
	}
}

// GetVisualization returns visualization-oriented time series for the given app.
func GetVisualization(c *gin.Context) {
	GetSchedulerVisualization(c)
}
