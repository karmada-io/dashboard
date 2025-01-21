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
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
	"github.com/gin-gonic/gin"
)
 
var requests = make(chan scrape.SaveRequest)

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

	allMetrics, errors, err := scrape.FetchMetrics(c.Request.Context(), appName, requests)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"errors": errors, "error": err.Error()})
		return
	}
	if len(allMetrics) > 0 {
		c.JSON(http.StatusOK, allMetrics)
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No metrics data found", "errors": errors})
	}
}
