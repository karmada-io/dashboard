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
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
)

// validTableNameRe ensures a table name contains only safe identifier characters.
var validTableNameRe = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

// MetricInfo represents the information about a metric.
type MetricInfo struct {
	Help string `json:"help"`
	Type string `json:"type"`
}

// QueryMetrics handles the querying of metrics.
func QueryMetrics(c *gin.Context) {
	appName := c.Param("app_name")
	podName := c.Param("pod_name")
	queryType := c.Query("type")   // Use a query parameter to determine the action
	metricName := c.Query("mname") // Optional: only needed for details

	sanitizedAppName := strings.ReplaceAll(appName, "-", "_")
	sanitizedPodName := strings.ReplaceAll(podName, "-", "_")

	if !validTableNameRe.MatchString(sanitizedPodName) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pod_name"})
		return
	}

	db, err := scrape.GetDB(sanitizedAppName)
	if err != nil {
		log.Printf("Error getting database connection: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open database"})
		return
	}

	// Add transaction for consistent reads
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer func() {
		_ = tx.Rollback()
	}()

	switch queryType {
	case "mname":
		queryMetricNames(c, tx, sanitizedPodName)
	case "details":
		queryMetricDetailsByName(c, tx, sanitizedPodName, metricName)
	case "metricsdetails":
		queryMetricDetails(c, appName)
	}
}

type sqlQueryer interface {
	Query(query string, args ...any) (*sql.Rows, error)
}

func queryWithMetadataFallback(q sqlQueryer, metadataTableName, preferredQuery, fallbackQuery string, args ...any) (*sql.Rows, error) {
	rows, err := q.Query(preferredQuery, args...)
	if err != nil && strings.Contains(err.Error(), "no such table: "+metadataTableName) {
		return q.Query(fallbackQuery, args...)
	}
	return rows, err
}

func queryMetricNames(c *gin.Context, tx *sql.Tx, sanitizedPodName string) {
	rows, err := tx.Query(fmt.Sprintf("SELECT DISTINCT name FROM %s", sanitizedPodName))
	if err != nil {
		log.Printf("Error querying metric names: %v, SQL Error: %v", err, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query metric names"})
		return
	}
	defer rows.Close()

	var metricNames []string
	for rows.Next() {
		var metricName string
		if err := rows.Scan(&metricName); err != nil {
			log.Printf("Error scanning metric name: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan metric name"})
			return
		}
		metricNames = append(metricNames, metricName)
	}

	c.JSON(http.StatusOK, gin.H{"metricNames": metricNames})
}

func queryMetricDetailsByName(c *gin.Context, tx *sql.Tx, sanitizedPodName, metricName string) {
	if metricName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Metric name required for details"})
		return
	}
	// Single query with JOIN to avoid N+1 queries for labels
	query := fmt.Sprintf(`
            SELECT 
                m.currentTime, 
                m.name, 
                v.value, 
                v.measure, 
                v.id,
                COALESCE(ls.key, '') AS label_key,
                COALESCE(ls.value, '') AS label_value
            FROM %s m
            INNER JOIN %s_values v ON m.id = v.metric_id
            LEFT JOIN %s_labels l ON v.id = l.value_id
            LEFT JOIN %s_label_strings ls ON l.label_string_id = ls.id
            WHERE m.name = ?
            ORDER BY m.currentTime, v.id
        `, sanitizedPodName, sanitizedPodName, sanitizedPodName, sanitizedPodName)
	rows, err := tx.Query(query, metricName)
	if err != nil {
		log.Printf("Error querying metric details: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query metric details"})
		return
	}
	defer rows.Close()

	type MetricValue struct {
		Value   string            `json:"value"`
		Measure string            `json:"measure"`
		Labels  map[string]string `json:"labels"`
	}

	type MetricDetails struct {
		Name   string        `json:"name"`
		Values []MetricValue `json:"values"`
	}

	detailsMap := make(map[string]MetricDetails)
	// Track values by (timeKey, valueID) to accumulate labels
	type valueKey struct {
		timeKey string
		valueID int
	}
	valueLabels := make(map[valueKey]map[string]string)
	valueIndex := make(map[valueKey]*MetricValue)

	for rows.Next() {
		var currentTime time.Time
		var name, measure, labelKey, labelValue string
		var numericValue float64
		var valueID int
		if err := rows.Scan(&currentTime, &name, &numericValue, &measure, &valueID, &labelKey, &labelValue); err != nil {
			log.Printf("Error scanning metric details: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan metric details"})
			return
		}

		timeKey := currentTime.Format(time.RFC3339)
		vk := valueKey{timeKey: timeKey, valueID: valueID}

		if _, exists := valueIndex[vk]; !exists {
			detail, detailExists := detailsMap[timeKey]
			if !detailExists {
				detail = MetricDetails{
					Name:   name,
					Values: []MetricValue{},
				}
			}
			labels := make(map[string]string)
			mv := MetricValue{Value: strconv.FormatFloat(numericValue, 'f', -1, 64), Measure: measure, Labels: labels}
			detail.Values = append(detail.Values, mv)
			detailsMap[timeKey] = detail
			valueLabels[vk] = labels
			valueIndex[vk] = &detailsMap[timeKey].Values[len(detailsMap[timeKey].Values)-1]
		}

		if labelKey != "" {
			valueLabels[vk][labelKey] = labelValue
		}
	}

	c.JSON(http.StatusOK, gin.H{"details": detailsMap})
}

func queryMetricDetails(c *gin.Context, appName string) {
	// Handle metricsdetails query type
	sanitizedName := strings.ReplaceAll(appName, "-", "_")
	db, err := scrape.GetDB(sanitizedName)
	if err != nil {
		log.Printf("Error opening database: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open database"})
		return
	}

	// Get all relevant tables
	rows, err := db.Query(`
			SELECT name 
			FROM sqlite_master 
			WHERE type='table' 
			AND name NOT LIKE '%_values' 
			AND name NOT LIKE '%_labels' 
			AND name NOT LIKE '%_label_strings'
			AND name NOT LIKE '%_metadata'
			AND name NOT LIKE '%_time_load'
			AND name != 'sqlite_sequence'
		`)
	if err != nil {
		log.Printf("Error querying tables: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query tables"})
		return
	}
	defer rows.Close()

	result := make(map[string]map[string]MetricInfo)

	// Process each table (pod)
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			log.Printf("Error scanning table name: %v", err)
			continue
		}

		// Get metrics for this pod
		metadataQuery := fmt.Sprintf(`
				SELECT DISTINCT m.name, COALESCE(md.help, ''), COALESCE(md.type, '')
				FROM %s m
				LEFT JOIN %s_metadata md ON m.name = md.name
				GROUP BY m.name
			`, tableName, tableName)
		fallbackQuery := fmt.Sprintf(`
				SELECT DISTINCT name, help, type 
				FROM %s 
				GROUP BY name
			`, tableName)
		metricRows, err := queryWithMetadataFallback(db, fmt.Sprintf("%s_metadata", tableName), metadataQuery, fallbackQuery)
		if err != nil {
			log.Printf("Error querying metrics for table %s: %v", tableName, err)
			continue
		}

		podMetrics := make(map[string]MetricInfo)

		// Process each metric
		for metricRows.Next() {
			var name, help, metricType string
			if err := metricRows.Scan(&name, &help, &metricType); err != nil {
				log.Printf("Error scanning metric info: %v", err)
				continue
			}

			podMetrics[name] = MetricInfo{
				Help: help,
				Type: metricType,
			}
		}
		metricRows.Close()

		result[tableName] = podMetrics
	}

	c.JSON(http.StatusOK, result)
}
