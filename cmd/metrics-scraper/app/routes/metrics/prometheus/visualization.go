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
	"context"
	"fmt"
	"maps"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	defaultVisualizationWindow = 15 * time.Minute
	maxVisualizationWindow     = 6 * time.Hour
	defaultPodMode             = "all"
)

var (
	prometheusName      = regexp.MustCompile(`^[a-zA-Z_:][a-zA-Z0-9_:]*$`)
	prometheusLabelName = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)
)

// Point is a single point in a time series.
type Point struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}

// VisualizationMeta is metadata for visualization responses.
type VisualizationMeta struct {
	AppName           string `json:"appName"`
	Provider          string `json:"provider"`
	Window            string `json:"window"`
	PodMode           string `json:"podMode"`
	SampleIntervalSec int    `json:"sampleIntervalSec"`
	GeneratedAt       string `json:"generatedAt"`
}

// VisualizationMetricInfo describes an available metric and its suggested chart.
type VisualizationMetricInfo struct {
	Name           string `json:"name"`
	Type           string `json:"type"`
	SuggestedChart string `json:"suggestedChart"`
}

// MetricCatalogItem provides metadata used by the dashboard metric picker.
type MetricCatalogItem struct {
	Name           string `json:"name"`
	Help           string `json:"help"`
	PrometheusType string `json:"prometheusType"`
	SuggestedChart string `json:"suggestedChart"`
	Group          string `json:"group"`
}

// SchedulerVisualizationResponse is the API contract for component metric charts.
type SchedulerVisualizationResponse struct {
	Meta             VisualizationMeta              `json:"meta"`
	Timeseries       map[string][]Point             `json:"timeseries"`
	MetricLabels     map[string][]map[string]string `json:"metricLabels,omitempty"`
	Pods             []string                       `json:"pods"`
	Warnings         []string                       `json:"warnings,omitempty"`
	AvailableMetrics []VisualizationMetricInfo      `json:"availableMetrics,omitempty"`
	MetricsCatalog   []MetricCatalogItem            `json:"metricsCatalog,omitempty"`
}

// GetSchedulerVisualization returns Prometheus-backed component time series.
func (h *Handler) GetSchedulerVisualization(c *gin.Context) {
	appName := c.Param("app_name")
	if !supportedComponent(appName) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported metrics component"})
		return
	}
	window, err := parseWindow(c.Query("window"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	podMode := c.DefaultQuery("pod", defaultPodMode)
	refresh, err := strconv.ParseBool(cmp.Or(c.Query("refresh"), "false"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "refresh must be true or false"})
		return
	}

	now := time.Now()
	catalog, series, err := h.client.catalog(c.Request.Context(), appName, now.Add(-window), now, refresh)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	pods := h.client.podsFromSeries(appName, series)
	requested, err := requestedCatalog(c.Query("metrics"), catalog)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := SchedulerVisualizationResponse{
		Meta: VisualizationMeta{
			AppName:     appName,
			Provider:    "prometheus",
			Window:      window.String(),
			PodMode:     podMode,
			GeneratedAt: now.UTC().Format(time.RFC3339),
		},
		Timeseries:     map[string][]Point{},
		Pods:           pods,
		MetricsCatalog: catalog,
	}
	if slices.ContainsFunc(requested, func(item MetricCatalogItem) bool {
		return item.Name == "karmada_build_info"
	}) {
		response.MetricLabels = map[string][]map[string]string{
			"karmada_build_info": h.client.metricLabels(series, appName, podMode, "karmada_build_info"),
		}
	}
	if c.Query("metrics") == "" {
		c.JSON(http.StatusOK, response)
		return
	}

	step := max(window/240, time.Second)
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 8)
	for _, item := range requested {
		wg.Go(func() {
			sem <- struct{}{}
			defer func() { <-sem }()
			query := h.client.visualizationQuery(appName, podMode, item)
			points, queryErr := h.client.queryRange(c.Request.Context(), query, now.Add(-window), now, step)
			mu.Lock()
			defer mu.Unlock()
			if queryErr != nil {
				response.Warnings = append(response.Warnings, fmt.Sprintf("%s: %v", item.Name, queryErr))
				return
			}
			if len(points) > 0 {
				response.Timeseries[item.Name] = points
			}
		})
	}
	wg.Wait()
	response.Meta.SampleIntervalSec = detectSampleInterval(response.Timeseries)
	response.AvailableMetrics = buildAvailableMetrics(response.Timeseries, catalog)
	slices.Sort(response.Warnings)
	if len(response.Timeseries) == 0 {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":    fmt.Sprintf("no %s visualization data available in requested window", appName),
			"pods":     pods,
			"warnings": response.Warnings,
		})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (p *Client) metricLabels(series []map[string]string, appName, pod, metric string) []map[string]string {
	cluster, podName := splitPod(appName, pod)
	var result []map[string]string
	for _, labels := range series {
		if labels["__name__"] != metric ||
			(podName != defaultPodMode && labels["pod"] != podName) ||
			(cluster != "" && labels["cluster"] != cluster) {
			continue
		}
		item := maps.Clone(labels)
		delete(item, "__name__")
		result = append(result, item)
	}
	return result
}

func (p *Client) catalog(ctx context.Context, appName string, start, end time.Time, refresh bool) ([]MetricCatalogItem, []map[string]string, error) {
	cacheKey := appName + ":" + end.Sub(start).String()
	p.cacheMu.Lock()
	entry, ok := p.cache[cacheKey]
	if !refresh && ok && time.Now().Before(entry.expires) {
		p.cacheMu.Unlock()
		return slices.Clone(entry.items), slices.Clone(entry.series), nil
	}
	p.cacheMu.Unlock()

	series, err := p.series(ctx, p.selector(appName, defaultPodMode, nil, ""), start, end)
	if err != nil {
		return nil, nil, err
	}
	metadata, err := p.metadata(ctx)
	if err != nil {
		return nil, nil, err
	}
	names := map[string]bool{}
	for _, labels := range series {
		names[labels["__name__"]] = true
	}
	items := make([]MetricCatalogItem, 0, len(metadata))
	for name, entries := range metadata {
		if len(entries) == 0 || !prometheusName.MatchString(name) {
			continue
		}
		metricType := strings.ToLower(entries[0].Type)
		if metricType != "gauge" && metricType != "counter" && metricType != "histogram" && metricType != "summary" {
			continue
		}
		if !names[name] && !((metricType == "histogram" || metricType == "summary") && names[name+"_sum"] && names[name+"_count"]) {
			continue
		}
		items = append(items, MetricCatalogItem{
			Name:           name,
			Help:           entries[0].Help,
			PrometheusType: metricType,
			SuggestedChart: suggestedChart(name),
			Group:          metricGroup(name),
		})
	}
	slices.SortFunc(items, func(a, b MetricCatalogItem) int {
		return cmp.Compare(a.Name, b.Name)
	})
	p.cacheMu.Lock()
	p.cache[cacheKey] = catalogCacheEntry{expires: time.Now().Add(catalogTTL), items: items, series: series}
	p.cacheMu.Unlock()
	return items, series, nil
}

func requestedCatalog(raw string, catalog []MetricCatalogItem) ([]MetricCatalogItem, error) {
	byName := make(map[string]MetricCatalogItem, len(catalog))
	for _, item := range catalog {
		byName[item.Name] = item
	}
	var result []MetricCatalogItem
	seen := map[string]bool{}
	for name := range strings.SplitSeq(raw, ",") {
		name = strings.TrimSpace(name)
		if name == "" || seen[name] {
			continue
		}
		item, ok := byName[name]
		if !ok {
			return nil, fmt.Errorf("metric %q is not available for this component", name)
		}
		seen[name] = true
		result = append(result, item)
		if len(result) > maxMetrics {
			return nil, fmt.Errorf("at most %d metrics can be queried at once", maxMetrics)
		}
	}
	return result, nil
}

func (p *Client) visualizationQuery(appName, pod string, item MetricCatalogItem) string {
	selector := p.selector(appName, pod, nil, item.Name)
	switch item.Name {
	case "leader_election_master_status":
		return "max(" + selector + ")"
	case "cluster_ready_state":
		return "min(" + selector + ")"
	}
	switch item.PrometheusType {
	case "counter":
		return "sum(rate(" + selector + "[1m]))"
	case "histogram", "summary":
		sumSelector := p.selector(appName, pod, nil, item.Name+"_sum")
		countSelector := p.selector(appName, pod, nil, item.Name+"_count")
		return "sum(rate(" + sumSelector + "[1m])) / sum(rate(" + countSelector + "[1m]))"
	default:
		return "sum(" + selector + ")"
	}
}

func (p *Client) selector(appName, pod string, filters []LabelFilter, metric string) string {
	matchers := []string{`job="` + escapePromQL(appName) + `"`}
	if pod != "" && pod != defaultPodMode {
		cluster, podName := splitPod(appName, pod)
		if cluster != "" {
			matchers = append(matchers, `cluster="`+escapePromQL(cluster)+`"`)
		}
		matchers = append(matchers, `pod="`+escapePromQL(podName)+`"`)
	}
	for _, filter := range filters {
		matchers = append(matchers, filter.Key+`="`+escapePromQL(filter.Value)+`"`)
	}
	prefix := metric
	if prefix != "" {
		prefix += "{"
	} else {
		prefix = "{"
	}
	return prefix + strings.Join(matchers, ",") + "}"
}

func parseWindow(raw string) (time.Duration, error) {
	if raw == "" {
		return defaultVisualizationWindow, nil
	}
	window, err := time.ParseDuration(raw)
	if err != nil || window <= 0 || window > maxVisualizationWindow {
		return 0, fmt.Errorf("invalid window %q, expected a positive duration up to %s", raw, maxVisualizationWindow)
	}
	return window, nil
}

func buildAvailableMetrics(series map[string][]Point, catalog []MetricCatalogItem) []VisualizationMetricInfo {
	var result []VisualizationMetricInfo
	for _, item := range catalog {
		if len(series[item.Name]) > 0 {
			result = append(result, VisualizationMetricInfo{Name: item.Name, Type: item.PrometheusType, SuggestedChart: item.SuggestedChart})
		}
	}
	return result
}

func detectSampleInterval(series map[string][]Point) int {
	for _, points := range series {
		if len(points) > 1 {
			first, err1 := time.Parse(time.RFC3339, points[0].Timestamp)
			second, err2 := time.Parse(time.RFC3339, points[1].Timestamp)
			if err1 == nil && err2 == nil {
				return int(second.Sub(first).Seconds())
			}
		}
	}
	return 0
}

func suggestedChart(name string) string {
	if strings.Contains(name, "bytes") || strings.Contains(name, "memory") {
		return "area"
	}
	return "line"
}

func metricGroup(name string) string {
	if index := strings.IndexByte(name, '_'); index > 0 {
		return name[:index]
	}
	return "other"
}

func escapePromQL(value string) string {
	return strings.NewReplacer(`\`, `\\`, "\n", `\n`, `"`, `\"`).Replace(value)
}

func sortPoints(points []Point) {
	slices.SortFunc(points, func(a, b Point) int {
		return cmp.Compare(a.Timestamp, b.Timestamp)
	})
}
