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
	"cmp"
	"encoding/json"
	"fmt"
	"maps"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const defaultExploreAggregation = "sum"

// LabelFilter defines an exact Prometheus label matcher.
type LabelFilter struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// ExploreMeta is metadata for metric exploration responses.
type ExploreMeta struct {
	Metric      string        `json:"metric"`
	Aggregation string        `json:"aggregation"`
	Labels      []LabelFilter `json:"labels"`
	Window      string        `json:"window"`
	PodMode     string        `json:"podMode"`
	GeneratedAt string        `json:"generatedAt"`
}

// ExploreResponse is the API contract for metric exploration.
type ExploreResponse struct {
	Meta            ExploreMeta         `json:"meta"`
	Timeseries      []Point             `json:"timeseries"`
	AvailableLabels map[string][]string `json:"availableLabels"`
}

// GetMetricExplore returns one metric with aggregation and exact label filters.
func (h *Handler) GetMetricExplore(c *gin.Context) {
	appName := c.Param("app_name")
	if !supportedComponent(appName) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported metrics component"})
		return
	}
	metricName := strings.TrimSpace(c.Query("metric"))
	if !prometheusName.MatchString(metricName) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "metric is required and must be a valid Prometheus metric name"})
		return
	}
	aggregation, err := parseExploreAggregation(c.Query("aggregation"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	filters, err := parseLabelFilters(c.Query("labels"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	window, err := parseWindow(c.Query("window"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	podMode := c.DefaultQuery("pod", defaultPodMode)
	now := time.Now()
	catalog, _, err := h.client.catalog(c.Request.Context(), appName, now.Add(-window), now, false)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	item, ok := catalogItem(metricName, catalog)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("metric %q is not available for this component", metricName)})
		return
	}

	seriesMetric := metricName
	if item.PrometheusType == "histogram" || item.PrometheusType == "summary" {
		seriesMetric += "_sum"
	}
	labelSeries, err := h.client.series(c.Request.Context(), h.client.selector(appName, podMode, nil, seriesMetric), now.Add(-window), now)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	availableLabels := h.client.availableLabels(labelSeries)
	query := h.client.exploreQuery(appName, podMode, filters, item, aggregation)
	points, err := h.client.queryRange(c.Request.Context(), query, now.Add(-window), now, max(window/240, time.Second))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	if len(points) == 0 {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": fmt.Sprintf("no %s data available in requested window", metricName)})
		return
	}
	c.JSON(http.StatusOK, ExploreResponse{
		Meta: ExploreMeta{
			Metric:      metricName,
			Aggregation: aggregation,
			Labels:      filters,
			Window:      window.String(),
			PodMode:     podMode,
			GeneratedAt: now.UTC().Format(time.RFC3339),
		},
		Timeseries:      points,
		AvailableLabels: availableLabels,
	})
}

func (p *Client) exploreQuery(appName, pod string, filters []LabelFilter, item MetricCatalogItem, aggregation string) string {
	if item.PrometheusType == "histogram" || item.PrometheusType == "summary" {
		if aggregation == "rate" {
			aggregation = "sum"
		}
		sumSelector := p.selector(appName, pod, filters, item.Name+"_sum")
		countSelector := p.selector(appName, pod, filters, item.Name+"_count")
		return aggregation + "(rate(" + sumSelector + "[1m])) / " + aggregation + "(rate(" + countSelector + "[1m]))"
	}
	selector := p.selector(appName, pod, filters, item.Name)
	if aggregation == "rate" {
		return "sum(rate(" + selector + "[1m]))"
	}
	return aggregation + "(" + selector + ")"
}

func (p *Client) availableLabels(series []map[string]string) map[string][]string {
	sets := map[string]map[string]bool{}
	for _, labels := range series {
		for key, value := range labels {
			if key == "__name__" || key == "job" || value == "" {
				continue
			}
			if sets[key] == nil {
				sets[key] = map[string]bool{}
			}
			sets[key][value] = true
		}
	}
	result := make(map[string][]string, len(sets))
	for key, values := range sets {
		result[key] = slices.Sorted(maps.Keys(values))
	}
	return result
}

func parseExploreAggregation(raw string) (string, error) {
	value := strings.ToLower(strings.TrimSpace(cmp.Or(raw, defaultExploreAggregation)))
	switch value {
	case "sum", "avg", "max", "min", "rate":
		return value, nil
	default:
		return "", fmt.Errorf("invalid aggregation %q, expected one of sum, avg, max, min, rate", raw)
	}
}

func parseLabelFilters(raw string) ([]LabelFilter, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	var filters []LabelFilter
	if err := json.Unmarshal([]byte(raw), &filters); err != nil {
		return nil, fmt.Errorf("invalid labels, expected JSON array of {key,value}: %w", err)
	}
	for _, filter := range filters {
		if !prometheusLabelName.MatchString(filter.Key) {
			return nil, fmt.Errorf("invalid label name %q", filter.Key)
		}
	}
	return filters, nil
}

func catalogItem(name string, catalog []MetricCatalogItem) (MetricCatalogItem, bool) {
	for _, item := range catalog {
		if item.Name == name {
			return item, true
		}
	}
	return MetricCatalogItem{}, false
}
