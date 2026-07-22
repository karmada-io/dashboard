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
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/db"
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
)

type componentPodsResponse struct {
	AppName  string   `json:"appName"`
	Pods     []string `json:"pods"`
	Warnings []string `json:"warnings,omitempty"`
}

var discoverComponentPods = scrape.DiscoverComponentPods

// GetComponentPods returns the live Kubernetes pods selected for a component.
func GetComponentPods(c *gin.Context) {
	appName := c.Param("app_name")
	if db.GetComponentConfig(appName) == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported metrics component"})
		return
	}

	pods, warnings, err := discoverComponentPods(c.Request.Context(), appName)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error":    err.Error(),
			"pods":     pods,
			"warnings": warnings,
		})
		return
	}
	if pods == nil {
		pods = []string{}
	}
	c.JSON(http.StatusOK, componentPodsResponse{
		AppName:  appName,
		Pods:     pods,
		Warnings: warnings,
	})
}
