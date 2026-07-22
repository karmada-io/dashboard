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
	"database/sql"
	"fmt"
	"math"
	"net/http"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
)

const (
	defaultVisualizationWindow = 15 * time.Minute
	maxVisualizationWindow     = 6 * time.Hour
	defaultPodMode             = "all"
)

var (
	getDBFunc        = scrape.GetDB
	triggerScrapeNow = scrape.TriggerScrapeNow
)

// Point is a single point in a time series.
type Point struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}

// metricMeta holds discovered metric metadata from the database.
type metricMeta struct {
	name    string
	help    string
	mtype   string // gauge, counter, histogram, summary
	measure string // primary measure for aggregation
}

// VisualizationMeta is metadata for visualization responses.
type VisualizationMeta struct {
	AppName           string `json:"appName"`
	Window            string `json:"window"`
	PodMode           string `json:"podMode"`
	SampleIntervalSec int    `json:"sampleIntervalSec"`
	GeneratedAt       string `json:"generatedAt"`
}

// VisualizationMetricInfo describes an available metric and its suggested chart type|.
type VisualizationMetricInfo struct {
	Name           string `json:"name"`
	Type           string `json:"type"`
	SuggestedChart string `json:"suggestedChart"`
}

// MetricCatalogItem provides full metadata about a metric for frontend rendering.
type MetricCatalogItem struct {
	Name           string `json:"name"`
	Help           string `json:"help"`
	PrometheusType string `json:"prometheusType"`
	SuggestedChart string `json:"suggestedChart"`
	Group          string `json:"group"`
}

// SchedulerVisualizationResponse is the API contract for scheduler metric charts.
type SchedulerVisualizationResponse struct {
	Meta             VisualizationMeta         `json:"meta"`
	Timeseries       map[string][]Point        `json:"timeseries"`
	Pods             []string                  `json:"pods"`
	Warnings         []string                  `json:"warnings,omitempty"`
	AvailableMetrics []VisualizationMetricInfo `json:"availableMetrics,omitempty"`
	MetricsCatalog   []MetricCatalogItem       `json:"metricsCatalog,omitempty"`
}

// GetSchedulerVisualization returns chart-oriented scheduler time series from metrics-scraper DB.
func GetSchedulerVisualization(c *gin.Context) {
	appName := c.Param("app_name")
	if appName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "app_name is required"})
		return
	}

	window, err := parseWindow(c.Query("window"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	podMode := c.DefaultQuery("pod", defaultPodMode)
	refresh, err := parseRefresh(c.Query("refresh"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var warnings []string
	if refresh {
		scrapeErrors, scrapeErr := triggerScrapeNow(c.Request.Context(), appName)
		if scrapeErr != nil {
			c.JSON(http.StatusBadGateway, gin.H{
				"error":   scrapeErr.Error(),
				"errors":  scrapeErrors,
				"message": fmt.Sprintf("failed to refresh %s metrics before visualization query", appName),
			})
			return
		}
		warnings = append(warnings, scrapeErrors...)
	}

	dbConn, err := getDBFunc(appName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open metrics database"})
		return
	}

	podTables, err := listPodTables(dbConn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to list %s pod tables", appName)})
		return
	}
	if len(podTables) == 0 {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": fmt.Sprintf("no %s metrics data found", appName)})
		return
	}

	selectedTables, err := selectPodTables(podTables, podMode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	metricsFilter := c.Query("metrics")
	var requestedMetrics []string
	if metricsFilter != "" {
		for _, m := range strings.Split(metricsFilter, ",") {
			m = strings.TrimSpace(m)
			if m != "" {
				requestedMetrics = append(requestedMetrics, m)
			}
		}
	}

	cutoff := time.Now().Add(-window)
	series, catalog, err := buildDynamicVisualization(dbConn, selectedTables, cutoff, window, requestedMetrics)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to build visualization: %v", err)})
		return
	}

	if !hasAnySeriesData(series) {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": fmt.Sprintf("no %s visualization data available in requested window", appName),
			"pods":  desanitizePods(selectedTables),
		})
		return
	}

	resp := SchedulerVisualizationResponse{
		Meta: VisualizationMeta{
			AppName:           appName,
			Window:            window.String(),
			PodMode:           podMode,
			SampleIntervalSec: detectSampleInterval(series),
			GeneratedAt:       time.Now().Format(time.RFC3339),
		},
		Timeseries:       series,
		Pods:             desanitizePods(selectedTables),
		Warnings:         warnings,
		AvailableMetrics: buildAvailableMetrics(series),
		MetricsCatalog:   catalog,
	}
	c.JSON(http.StatusOK, resp)
}

func buildAvailableMetrics(series map[string][]Point) []VisualizationMetricInfo {
	metricChartMapping := map[string]VisualizationMetricInfo{
		"workqueueDepth":             {Name: "workqueueDepth", Type: "gauge", SuggestedChart: "bar"},
		"workqueueAddsRate":          {Name: "workqueueAddsRate", Type: "counter_rate", SuggestedChart: "line"},
		"workqueueRetriesRate":       {Name: "workqueueRetriesRate", Type: "counter_rate", SuggestedChart: "line"},
		"workqueueQueueDurationAvg":  {Name: "workqueueQueueDurationAvg", Type: "histogram_avg", SuggestedChart: "area"},
		"workqueueWorkDurationAvg":   {Name: "workqueueWorkDurationAvg", Type: "histogram_avg", SuggestedChart: "area"},
		"processResidentMemoryBytes": {Name: "processResidentMemoryBytes", Type: "gauge", SuggestedChart: "gauge"},
		"processCPUSecondsRate":      {Name: "processCPUSecondsRate", Type: "counter_rate", SuggestedChart: "line"},
	}

	var available []VisualizationMetricInfo
	for key, points := range series {
		if len(points) == 0 {
			continue
		}
		if info, ok := metricChartMapping[key]; ok {
			available = append(available, info)
		} else {
			// Unknown metrics default to line chart
			available = append(available, VisualizationMetricInfo{Name: key, Type: "unknown", SuggestedChart: "line"})
		}
	}
	return available
}

func parseWindow(windowRaw string) (time.Duration, error) {
	if windowRaw == "" {
		return defaultVisualizationWindow, nil
	}

	window, err := time.ParseDuration(windowRaw)
	if err != nil || window <= 0 {
		return 0, fmt.Errorf("invalid window %q, expected a positive Go duration such as 15m", windowRaw)
	}
	if window > maxVisualizationWindow {
		return 0, fmt.Errorf("invalid window %q, maximum supported window is %s", windowRaw, maxVisualizationWindow)
	}
	return window, nil
}

func parseRefresh(refreshRaw string) (bool, error) {
	if refreshRaw == "" {
		return false, nil
	}
	value, err := strconv.ParseBool(refreshRaw)
	if err != nil {
		return false, fmt.Errorf("invalid refresh %q, expected true or false", refreshRaw)
	}
	return value, nil
}

func listPodTables(dbConn *sql.DB) ([]string, error) {
	rows, err := dbConn.Query(`
		SELECT name
		FROM sqlite_master
		WHERE type='table'
		AND name NOT LIKE '%_values'
		AND name NOT LIKE '%_labels'
		AND name NOT LIKE '%_label_strings'
		AND name NOT LIKE '%_metadata'
		AND name NOT LIKE '%_time_load'
		AND name NOT LIKE '%_aggregates'
		AND name != 'sqlite_sequence'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if scanErr := rows.Scan(&name); scanErr != nil {
			return nil, scanErr
		}
		tables = append(tables, name)
	}

	slices.Sort(tables)
	return tables, nil
}

func selectPodTables(tables []string, podMode string) ([]string, error) {
	if podMode == "" || podMode == defaultPodMode {
		return tables, nil
	}

	target := strings.ReplaceAll(podMode, "-", "_")
	for _, table := range tables {
		if table == target {
			return []string{table}, nil
		}
	}
	return nil, fmt.Errorf("pod %q not found in metrics data", podMode)
}

func buildComponentVisualization(dbConn *sql.DB, podTables []string, cutoff time.Time) (map[string][]Point, error) {
	type metricAccumulator struct {
		mu   sync.Mutex
		data map[time.Time]float64
	}

	workqueueDepth := &metricAccumulator{data: map[time.Time]float64{}}
	workqueueAdds := &metricAccumulator{data: map[time.Time]float64{}}
	workqueueRetries := &metricAccumulator{data: map[time.Time]float64{}}
	queueDurationSum := &metricAccumulator{data: map[time.Time]float64{}}
	queueDurationCount := &metricAccumulator{data: map[time.Time]float64{}}
	workDurationSum := &metricAccumulator{data: map[time.Time]float64{}}
	workDurationCount := &metricAccumulator{data: map[time.Time]float64{}}
	processResidentMemory := &metricAccumulator{data: map[time.Time]float64{}}
	processCPUTotal := &metricAccumulator{data: map[time.Time]float64{}}

	var wg sync.WaitGroup
	var firstErr error
	var errOnce sync.Once

	for _, table := range podTables {
		wg.Add(1)
		go func(table string) {
			defer wg.Done()

			type metricSpec struct {
				name    string
				measure string
				acc     *metricAccumulator
			}
			specs := []metricSpec{
				{"workqueue_depth", "current_value", workqueueDepth},
				{"workqueue_adds_total", "total", workqueueAdds},
				{"workqueue_retries_total", "total", workqueueRetries},
				{"workqueue_queue_duration_seconds", "sum", queueDurationSum},
				{"workqueue_queue_duration_seconds", "count", queueDurationCount},
				{"workqueue_work_duration_seconds", "sum", workDurationSum},
				{"workqueue_work_duration_seconds", "count", workDurationCount},
				{"process_resident_memory_bytes", "current_value", processResidentMemory},
				{"process_cpu_seconds_total", "total", processCPUTotal},
			}

			for _, spec := range specs {
				localMap := map[time.Time]float64{}
				if err := accumulateMetric(dbConn, table, spec.name, spec.measure, cutoff, localMap); err != nil {
					errOnce.Do(func() { firstErr = err })
					return
				}
				spec.acc.mu.Lock()
				for t, v := range localMap {
					spec.acc.data[t] += v
				}
				spec.acc.mu.Unlock()
			}
		}(table)
	}
	wg.Wait()

	if firstErr != nil {
		return nil, firstErr
	}

	result := map[string][]Point{
		"workqueueDepth":       mapToPoints(workqueueDepth.data),
		"workqueueAddsRate":    counterRate(mapToPoints(workqueueAdds.data)),
		"workqueueRetriesRate": counterRate(mapToPoints(workqueueRetries.data)),
		"workqueueQueueDurationAvg": histogramAverage(
			mapToPoints(queueDurationSum.data),
			mapToPoints(queueDurationCount.data),
		),
		"workqueueWorkDurationAvg": histogramAverage(
			mapToPoints(workDurationSum.data),
			mapToPoints(workDurationCount.data),
		),
		"processResidentMemoryBytes": mapToPoints(processResidentMemory.data),
		"processCPUSecondsRate":      counterRate(mapToPoints(processCPUTotal.data)),
	}

	return result, nil
}

// buildDynamicVisualization discovers all metrics from DB dynamically, classifies them by type,
// and builds timeseries for each metric. Returns series and a catalog of all discovered metrics.
func buildDynamicVisualization(dbConn *sql.DB, podTables []string, cutoff time.Time, window time.Duration, requestedMetrics []string) (map[string][]Point, []MetricCatalogItem, error) {
	if len(podTables) == 0 {
		return nil, nil, nil
	}

	resolution := ""
	useAggregates := false
	if window > 5*time.Minute && window <= 1*time.Hour {
		resolution = "1m"
		useAggregates = true
	} else if window > 1*time.Hour {
		resolution = "5m"
		useAggregates = true
	}

	// Step 1: discover all distinct metric names and their types from the DB.
	// Prefer metadata tables so discovery still works when raw samples have aged out.
	discoveredMetrics := map[string]*metricMeta{}
	var discoveryMu sync.Mutex
	var wg sync.WaitGroup
	var firstErr error
	var errOnce sync.Once

	for _, table := range podTables {
		wg.Add(1)
		go func(table string) {
			defer wg.Done()
			query := fmt.Sprintf(`
				SELECT md.name, COALESCE(md.type, ''), COALESCE(md.help, '')
				FROM %s_metadata md
				WHERE ? IS NOT NULL
			`, table)
			fallbackQuery := fmt.Sprintf(`
				SELECT DISTINCT m.name, '', ''
				FROM %s m
				WHERE m.currentTime >= ?
			`, table)
			rows, err := queryWithMetadataFallback(dbConn, fmt.Sprintf("%s_metadata", table), query, fallbackQuery, cutoff.Format(time.RFC3339))
			if err != nil {
				errOnce.Do(func() { firstErr = err })
				return
			}
			defer rows.Close()

			for rows.Next() {
				var name, mtype, help string
				if err := rows.Scan(&name, &mtype, &help); err != nil {
					continue
				}
				discoveryMu.Lock()
				if _, exists := discoveredMetrics[name]; !exists {
					discoveredMetrics[name] = &metricMeta{name: name, help: help, mtype: normalizePrometheusType(mtype)}
				}
				discoveryMu.Unlock()
			}
		}(table)
	}
	wg.Wait()
	if firstErr != nil {
		return nil, nil, firstErr
	}

	if len(discoveredMetrics) == 0 {
		return nil, nil, nil
	}

	if len(requestedMetrics) > 0 {
		requestedSet := make(map[string]bool, len(requestedMetrics))
		for _, m := range requestedMetrics {
			requestedSet[m] = true
		}
		for name := range discoveredMetrics {
			if !requestedSet[name] {
				delete(discoveredMetrics, name)
			}
		}
	}

	if len(discoveredMetrics) == 0 {
		return nil, nil, nil
	}

	for _, meta := range discoveredMetrics {
		meta.measure = primaryMeasureForType(meta.mtype)
	}

	type metricAccumulator struct {
		mu   sync.Mutex
		data map[time.Time]float64
	}
	type histAcc struct {
		sum   *metricAccumulator
		count *metricAccumulator
	}

	gaugeAccs := map[string]*metricAccumulator{}
	counterAccs := map[string]*metricAccumulator{}
	histAccs := map[string]*histAcc{}

	for name, meta := range discoveredMetrics {
		switch meta.mtype {
		case "gauge":
			gaugeAccs[name] = &metricAccumulator{data: map[time.Time]float64{}}
		case "counter":
			counterAccs[name] = &metricAccumulator{data: map[time.Time]float64{}}
		case "histogram", "summary":
			histAccs[name] = &histAcc{
				sum:   &metricAccumulator{data: map[time.Time]float64{}},
				count: &metricAccumulator{data: map[time.Time]float64{}},
			}
		}
	}

	accumulate := func(localMap map[time.Time]float64, table, name, measure string) error {
		if useAggregates {
			if err := accumulateFromAggregates(dbConn, table, name, measure, resolution, cutoff, localMap); err != nil {
				return err
			}
			// Fallback to raw data if aggregates are empty (not yet populated)
			if len(localMap) == 0 {
				return accumulateMetric(dbConn, table, name, measure, cutoff, localMap)
			}
			return nil
		}
		return accumulateMetric(dbConn, table, name, measure, cutoff, localMap)
	}

	// Limit concurrency to match SQLite MaxOpenConns (4)
	maxWorkers := len(podTables)
	if maxWorkers > 4 {
		maxWorkers = 4
	}
	sem := make(chan struct{}, maxWorkers)

	for _, table := range podTables {
		wg.Add(1)
		sem <- struct{}{} // Acquire semaphore slot
		go func(table string) {
			defer wg.Done()
			defer func() { <-sem }() // Release semaphore slot
			for name, meta := range discoveredMetrics {
				switch meta.mtype {
				case "gauge":
					acc := gaugeAccs[name]
					localMap := map[time.Time]float64{}
					if err := accumulate(localMap, table, name, "current_value"); err != nil {
						errOnce.Do(func() { firstErr = err })
						return
					}
					acc.mu.Lock()
					for t, v := range localMap {
						acc.data[t] += v
					}
					acc.mu.Unlock()

				case "counter":
					acc := counterAccs[name]
					localMap := map[time.Time]float64{}
					if err := accumulate(localMap, table, name, "total"); err != nil {
						errOnce.Do(func() { firstErr = err })
						return
					}
					acc.mu.Lock()
					for t, v := range localMap {
						acc.data[t] += v
					}
					acc.mu.Unlock()

				case "histogram", "summary":
					ha := histAccs[name]
					localSum := map[time.Time]float64{}
					localCount := map[time.Time]float64{}
					if err := accumulate(localSum, table, name, "sum"); err != nil {
						errOnce.Do(func() { firstErr = err })
						return
					}
					if err := accumulate(localCount, table, name, "count"); err != nil {
						errOnce.Do(func() { firstErr = err })
						return
					}
					ha.sum.mu.Lock()
					for t, v := range localSum {
						ha.sum.data[t] += v
					}
					ha.sum.mu.Unlock()
					ha.count.mu.Lock()
					for t, v := range localCount {
						ha.count.data[t] += v
					}
					ha.count.mu.Unlock()
				}
			}
		}(table)
	}
	wg.Wait()
	if firstErr != nil {
		return nil, nil, firstErr
	}

	result := map[string][]Point{}
	for name := range gaugeAccs {
		points := mapToPoints(gaugeAccs[name].data)
		if len(points) > 0 {
			result[name] = points
		}
	}
	for name := range counterAccs {
		points := counterRate(mapToPoints(counterAccs[name].data))
		if len(points) > 0 {
			result[name] = points
		}
	}
	for name := range histAccs {
		ha := histAccs[name]
		points := histogramAverage(mapToPoints(ha.sum.data), mapToPoints(ha.count.data))
		if len(points) > 0 {
			result[name] = points
		}
	}

	catalog := buildMetricsCatalog(discoveredMetrics, result)
	return result, catalog, nil
}

func normalizePrometheusType(mtype string) string {
	mtype = strings.ToLower(strings.TrimSpace(mtype))
	switch mtype {
	case "gauge", "counter", "histogram", "summary":
		return mtype
	case "untyped":
		return "gauge"
	default:
		return "gauge"
	}
}

func primaryMeasureForType(mtype string) string {
	switch mtype {
	case "gauge":
		return "current_value"
	case "counter":
		return "total"
	case "histogram", "summary":
		return "sum"
	default:
		return "current_value"
	}
}

func suggestedChartForType(mtype string, metricName string) string {
	switch mtype {
	case "gauge":
		if strings.Contains(metricName, "_bytes") || strings.Contains(metricName, "memory") {
			return "area"
		}
		return "gauge"
	case "counter":
		return "line"
	case "histogram":
		return "bar"
	case "summary":
		return "line"
	default:
		return "line"
	}
}

func extractMetricGroup(name string) string {
	// Extract the first meaningful prefix (e.g. "workqueue" from "workqueue_depth")
	parts := strings.Split(name, "_")
	if len(parts) >= 2 {
		// Use first two parts for common prefixes
		prefix := parts[0]
		// Known multi-word prefixes
		multiWordPrefixes := []string{"go", "process", "rest", "workqueue", "leader", "scheduler", "controller"}
		for _, mp := range multiWordPrefixes {
			if prefix == mp {
				return mp
			}
		}
		if len(parts) >= 3 {
			return parts[0] + "_" + parts[1]
		}
		return prefix
	}
	return name
}

func buildMetricsCatalog(metrics map[string]*metricMeta, series map[string][]Point) []MetricCatalogItem {
	catalog := make([]MetricCatalogItem, 0, len(metrics))
	for name, meta := range metrics {
		if _, hasSeries := series[name]; !hasSeries {
			continue
		}
		catalog = append(catalog, MetricCatalogItem{
			Name:           name,
			Help:           meta.help,
			PrometheusType: meta.mtype,
			SuggestedChart: suggestedChartForType(meta.mtype, name),
			Group:          extractMetricGroup(name),
		})
	}
	sort.Slice(catalog, func(i, j int) bool {
		if catalog[i].PrometheusType != catalog[j].PrometheusType {
			return catalog[i].PrometheusType < catalog[j].PrometheusType
		}
		if catalog[i].Group != catalog[j].Group {
			return catalog[i].Group < catalog[j].Group
		}
		return catalog[i].Name < catalog[j].Name
	})
	return catalog
}

func accumulateMetric(dbConn *sql.DB, podTable, metricName, measure string, cutoff time.Time, aggregate map[time.Time]float64) error {
	query := fmt.Sprintf(`
		SELECT m.currentTime, SUM(v.value)
		FROM %s m
		INNER JOIN %s_values v ON m.id = v.metric_id
		WHERE m.name = ? AND v.measure = ? AND m.currentTime >= ?
		GROUP BY m.currentTime
		ORDER BY m.currentTime ASC
	`, podTable, podTable)

	rows, err := dbConn.Query(query, metricName, measure, cutoff.Format(time.RFC3339))
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var currentTimeRaw string
		var total float64
		if scanErr := rows.Scan(&currentTimeRaw, &total); scanErr != nil {
			return scanErr
		}

		currentTime, parseErr := parseCurrentTime(currentTimeRaw)
		if parseErr != nil {
			continue
		}

		normalized := currentTime.UTC().Truncate(time.Second)
		aggregate[normalized] += total
	}

	return rows.Err()
}

func accumulateFromAggregates(dbConn *sql.DB, podTable, metricName, measure, resolution string, cutoff time.Time, aggregate map[time.Time]float64) error {
	query := fmt.Sprintf(`
		SELECT bucket_time, avg_value
		FROM %s_aggregates
		WHERE name = ? AND measure = ? AND resolution = ? AND bucket_time >= ?
		ORDER BY bucket_time ASC
	`, podTable)

	rows, err := dbConn.Query(query, metricName, measure, resolution, cutoff.Format(time.RFC3339))
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil
		}
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var bucketTimeRaw string
		var avg float64
		if err := rows.Scan(&bucketTimeRaw, &avg); err != nil {
			return err
		}
		t, err := parseCurrentTime(bucketTimeRaw)
		if err != nil {
			continue
		}
		normalized := t.UTC().Truncate(time.Second)
		aggregate[normalized] += avg
	}
	return rows.Err()
}

func parseCurrentTime(raw string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05-07:00",
		"2006-01-02 15:04:05",
	}
	for _, layout := range layouts {
		if ts, err := time.Parse(layout, raw); err == nil {
			return ts, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid time format: %s", raw)
}

func mapToPoints(values map[time.Time]float64) []Point {
	if len(values) == 0 {
		return nil
	}

	timestamps := make([]time.Time, 0, len(values))
	for ts := range values {
		timestamps = append(timestamps, ts)
	}
	sort.Slice(timestamps, func(i, j int) bool {
		return timestamps[i].Before(timestamps[j])
	})

	points := make([]Point, 0, len(timestamps))
	for _, ts := range timestamps {
		value := values[ts]
		if math.IsNaN(value) || math.IsInf(value, 0) {
			continue
		}
		points = append(points, Point{
			Timestamp: ts.Format(time.RFC3339),
			Value:     value,
		})
	}
	return points
}

func counterRate(cumulative []Point) []Point {
	if len(cumulative) == 0 {
		return nil
	}

	rates := make([]Point, 0, len(cumulative))
	rates = append(rates, Point{Timestamp: cumulative[0].Timestamp, Value: 0})
	for i := 1; i < len(cumulative); i++ {
		now, nowErr := time.Parse(time.RFC3339, cumulative[i].Timestamp)
		prev, prevErr := time.Parse(time.RFC3339, cumulative[i-1].Timestamp)
		if nowErr != nil || prevErr != nil {
			rates = append(rates, Point{Timestamp: cumulative[i].Timestamp, Value: 0})
			continue
		}

		deltaSeconds := now.Sub(prev).Seconds()
		if deltaSeconds <= 0 {
			rates = append(rates, Point{Timestamp: cumulative[i].Timestamp, Value: 0})
			continue
		}

		delta := cumulative[i].Value - cumulative[i-1].Value
		if delta < 0 {
			delta = 0
		}

		rates = append(rates, Point{
			Timestamp: cumulative[i].Timestamp,
			Value:     delta / deltaSeconds,
		})
	}
	return rates
}

func histogramAverage(sumSeries, countSeries []Point) []Point {
	if len(sumSeries) == 0 || len(countSeries) == 0 {
		return nil
	}

	sumMap := make(map[string]float64, len(sumSeries))
	countMap := make(map[string]float64, len(countSeries))
	for _, p := range sumSeries {
		sumMap[p.Timestamp] = p.Value
	}
	for _, p := range countSeries {
		countMap[p.Timestamp] = p.Value
	}

	var timestamps []string
	for ts := range sumMap {
		if _, ok := countMap[ts]; ok {
			timestamps = append(timestamps, ts)
		}
	}
	sort.Strings(timestamps)
	if len(timestamps) == 0 {
		return nil
	}

	result := make([]Point, 0, len(timestamps))
	result = append(result, Point{Timestamp: timestamps[0], Value: 0})
	for i := 1; i < len(timestamps); i++ {
		prev := timestamps[i-1]
		curr := timestamps[i]
		sumDelta := sumMap[curr] - sumMap[prev]
		countDelta := countMap[curr] - countMap[prev]
		avg := 0.0
		if sumDelta >= 0 && countDelta > 0 {
			avg = sumDelta / countDelta
		}
		result = append(result, Point{Timestamp: curr, Value: avg})
	}

	return result
}

func hasAnySeriesData(timeseries map[string][]Point) bool {
	for _, points := range timeseries {
		if len(points) > 0 {
			return true
		}
	}
	return false
}

func detectSampleInterval(timeseries map[string][]Point) int {
	for _, points := range timeseries {
		if len(points) < 2 {
			continue
		}

		prev, err := time.Parse(time.RFC3339, points[0].Timestamp)
		if err != nil {
			continue
		}
		for i := 1; i < len(points); i++ {
			curr, parseErr := time.Parse(time.RFC3339, points[i].Timestamp)
			if parseErr != nil {
				continue
			}
			interval := int(curr.Sub(prev).Seconds())
			if interval > 0 {
				return interval
			}
			prev = curr
		}
	}

	return 0
}

func desanitizePods(tables []string) []string {
	pods := make([]string, 0, len(tables))
	for _, table := range tables {
		pods = append(pods, strings.ReplaceAll(table, "_", "-"))
	}
	return pods
}
