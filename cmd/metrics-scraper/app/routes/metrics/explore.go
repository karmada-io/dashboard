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
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const defaultExploreAggregation = "sum"

// LabelFilter defines a label matcher for metric exploration.
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

type exploreBucket struct {
	Sum      float64
	Count    int64
	Max      float64
	Min      float64
	HasValue bool
}

func (b *exploreBucket) merge(sum float64, count int64, max, min float64) {
	b.Sum += sum
	b.Count += count
	if !b.HasValue || max > b.Max {
		b.Max = max
	}
	if !b.HasValue || min < b.Min {
		b.Min = min
	}
	b.HasValue = true
}

// GetMetricExplore returns a single metric series with configurable aggregation and label filtering.
func GetMetricExplore(c *gin.Context) {
	appName := c.Param("app_name")
	metricName := strings.TrimSpace(c.Query("metric"))
	if metricName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "metric is required"})
		return
	}

	aggregation, err := parseExploreAggregation(c.Query("aggregation"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	labels, err := parseLabelFilters(c.Query("labels"))
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

	measure, err := determineExploreMeasure(dbConn, selectedTables, metricName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to resolve metric metadata: %v", err)})
		return
	}

	availableLabels, err := queryAvailableLabels(dbConn, selectedTables, metricName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to query metric labels: %v", err)})
		return
	}

	cutoff := time.Now().Add(-window)
	points, err := queryMetricExploreSeries(dbConn, selectedTables, metricName, measure, aggregation, labels, cutoff)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to query metric timeseries: %v", err)})
		return
	}
	if points == nil {
		points = []Point{}
	}

	c.JSON(http.StatusOK, ExploreResponse{
		Meta: ExploreMeta{
			Metric:      metricName,
			Aggregation: aggregation,
			Labels:      labels,
			Window:      window.String(),
			PodMode:     podMode,
			GeneratedAt: time.Now().Format(time.RFC3339),
		},
		Timeseries:      points,
		AvailableLabels: availableLabels,
	})
}

func parseExploreAggregation(raw string) (string, error) {
	if raw == "" {
		return defaultExploreAggregation, nil
	}

	value := strings.ToLower(strings.TrimSpace(raw))
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
		if strings.TrimSpace(filter.Key) == "" {
			return nil, fmt.Errorf("invalid labels, key must not be empty")
		}
	}
	return filters, nil
}

func determineExploreMeasure(dbConn *sql.DB, podTables []string, metricName string) (string, error) {
	for _, table := range podTables {
		metadataQuery := fmt.Sprintf(`
			SELECT COALESCE(type, '')
			FROM %s_metadata
			WHERE name = ?
			LIMIT 1
		`, table)

		var metricType string
		err := dbConn.QueryRow(metadataQuery, metricName).Scan(&metricType)
		switch {
		case err == nil:
			return primaryMeasureForType(normalizePrometheusType(metricType)), nil
		case err == sql.ErrNoRows:
			continue
		case strings.Contains(err.Error(), "no such table"):
			continue
		default:
			return "", err
		}
	}

	measurePriority := []string{"total", "current_value", "sum", "count"}
	measureSet := map[string]struct{}{}
	for _, table := range podTables {
		measureQuery := fmt.Sprintf(`
			SELECT DISTINCT v.measure
			FROM %s m
			INNER JOIN %s_values v ON m.id = v.metric_id
			WHERE m.name = ?
		`, table, table)
		rows, err := dbConn.Query(measureQuery, metricName)
		if err != nil {
			return "", err
		}
		for rows.Next() {
			var measure string
			if scanErr := rows.Scan(&measure); scanErr != nil {
				rows.Close()
				return "", scanErr
			}
			measureSet[measure] = struct{}{}
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return "", err
		}
		rows.Close()
	}

	for _, measure := range measurePriority {
		if _, ok := measureSet[measure]; ok {
			return measure, nil
		}
	}
	return primaryMeasureForType("gauge"), nil
}

func queryAvailableLabels(dbConn *sql.DB, podTables []string, metricName string) (map[string][]string, error) {
	labelSet := make(map[string]map[string]struct{})
	var mu sync.Mutex
	var wg sync.WaitGroup
	var firstErr error
	var errOnce sync.Once

	for _, table := range podTables {
		wg.Add(1)
		go func(table string) {
			defer wg.Done()

			query := fmt.Sprintf(`
				SELECT DISTINCT ls.key, ls.value
				FROM %s m
				INNER JOIN %s_values v ON m.id = v.metric_id
				INNER JOIN %s_labels l ON v.id = l.value_id
				INNER JOIN %s_label_strings ls ON l.label_string_id = ls.id
				WHERE m.name = ?
			`, table, table, table, table)
			rows, err := dbConn.Query(query, metricName)
			if err != nil {
				if strings.Contains(err.Error(), "no such table") {
					return
				}
				errOnce.Do(func() { firstErr = err })
				return
			}
			defer rows.Close()

			local := make(map[string]map[string]struct{})
			for rows.Next() {
				var key, value string
				if scanErr := rows.Scan(&key, &value); scanErr != nil {
					errOnce.Do(func() { firstErr = scanErr })
					return
				}
				if _, ok := local[key]; !ok {
					local[key] = make(map[string]struct{})
				}
				local[key][value] = struct{}{}
			}
			if err := rows.Err(); err != nil {
				errOnce.Do(func() { firstErr = err })
				return
			}

			mu.Lock()
			for key, values := range local {
				if _, ok := labelSet[key]; !ok {
					labelSet[key] = make(map[string]struct{})
				}
				for value := range values {
					labelSet[key][value] = struct{}{}
				}
			}
			mu.Unlock()
		}(table)
	}
	wg.Wait()

	if firstErr != nil {
		return nil, firstErr
	}

	result := make(map[string][]string, len(labelSet))
	for key, values := range labelSet {
		result[key] = mapKeys(values)
	}
	return result, nil
}

func queryMetricExploreSeries(dbConn *sql.DB, podTables []string, metricName, measure, aggregation string, labels []LabelFilter, cutoff time.Time) ([]Point, error) {
	buckets := make(map[time.Time]*exploreBucket)
	var mu sync.Mutex
	var wg sync.WaitGroup
	var firstErr error
	var errOnce sync.Once

	for _, table := range podTables {
		wg.Add(1)
		go func(table string) {
			defer wg.Done()

			query, args := buildExploreSeriesQuery(table, metricName, measure, labels, cutoff)
			rows, err := dbConn.Query(query, args...)
			if err != nil {
				errOnce.Do(func() { firstErr = err })
				return
			}
			defer rows.Close()

			localBuckets := make(map[time.Time]*exploreBucket)
			for rows.Next() {
				var currentTimeRaw string
				var sum, max, min float64
				var count int64
				if scanErr := rows.Scan(&currentTimeRaw, &sum, &count, &max, &min); scanErr != nil {
					errOnce.Do(func() { firstErr = scanErr })
					return
				}

				currentTime, parseErr := parseCurrentTime(currentTimeRaw)
				if parseErr != nil {
					continue
				}
				normalized := currentTime.UTC().Truncate(time.Second)
				bucket, ok := localBuckets[normalized]
				if !ok {
					bucket = &exploreBucket{}
					localBuckets[normalized] = bucket
				}
				bucket.merge(sum, count, max, min)
			}
			if err := rows.Err(); err != nil {
				errOnce.Do(func() { firstErr = err })
				return
			}

			mu.Lock()
			for ts, localBucket := range localBuckets {
				bucket, ok := buckets[ts]
				if !ok {
					bucket = &exploreBucket{}
					buckets[ts] = bucket
				}
				bucket.merge(localBucket.Sum, localBucket.Count, localBucket.Max, localBucket.Min)
			}
			mu.Unlock()
		}(table)
	}
	wg.Wait()

	if firstErr != nil {
		return nil, firstErr
	}

	values := make(map[time.Time]float64, len(buckets))
	for ts, bucket := range buckets {
		if !bucket.HasValue {
			continue
		}
		switch aggregation {
		case "avg":
			if bucket.Count > 0 {
				values[ts] = bucket.Sum / float64(bucket.Count)
			}
		case "max":
			values[ts] = bucket.Max
		case "min":
			values[ts] = bucket.Min
		default:
			values[ts] = bucket.Sum
		}
	}

	points := mapToPoints(values)
	if aggregation == "rate" {
		return counterRate(points), nil
	}
	return points, nil
}

func buildExploreSeriesQuery(table, metricName, measure string, labels []LabelFilter, cutoff time.Time) (string, []any) {
	query := fmt.Sprintf(`
		SELECT m.currentTime, SUM(v.value), COUNT(v.value), MAX(v.value), MIN(v.value)
		FROM %s m
		INNER JOIN %s_values v ON m.id = v.metric_id
		WHERE m.name = ? AND v.measure = ? AND m.currentTime >= ?
	`, table, table)
	args := []any{metricName, measure, cutoff.Format(time.RFC3339)}

	for _, filter := range labels {
		query += fmt.Sprintf(`
			AND EXISTS (
				SELECT 1
				FROM %s_labels l
				INNER JOIN %s_label_strings ls ON l.label_string_id = ls.id
				WHERE l.value_id = v.id AND ls.key = ? AND ls.value = ?
			)
		`, table, table)
		args = append(args, filter.Key, filter.Value)
	}

	query += `
		GROUP BY m.currentTime
		ORDER BY m.currentTime ASC
	`
	return query, args
}

func mapKeys(values map[string]struct{}) []string {
	result := make([]string, 0, len(values))
	for value := range values {
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}
