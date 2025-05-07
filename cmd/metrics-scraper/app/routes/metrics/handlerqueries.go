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
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
)

// MetricInfo 表示指标信息。
type MetricInfo struct {
	Help string `json:"help"`
	Type string `json:"type"`
}

// QueryMetrics 处理指标查询。
func QueryMetrics(c *gin.Context) {
	appName := c.Param("app_name")
	podName := c.Param("pod_name")
	queryType := c.Query("type") // 使用查询参数来确定操作
	metricName := c.Query("mname") // 可选：仅在需要时需要

	sanitizedAppName := strings.ReplaceAll(appName, "-", "_")
	sanitizedPodName := strings.ReplaceAll(podName, "-", "_")

	db, err := scrape.GetDB(sanitizedAppName)
	if err != nil {
		log.Printf("Error getting database connection: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open database"})
		return
	}

	// 添加事务以确保一致的读取
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

// queryMetricNames 查询指标名称
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

// queryMetricDetailsByName 查询指标详细信息
func queryMetricDetailsByName(c *gin.Context, tx *sql.Tx, sanitizedPodName, metricName string) {
	if metricName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Metric name required for details"})
		return
	}
	query := `
            SELECT 
                m.currentTime, 
                m.name, 
                v.value, 
                v.measure, 
                v.id
            FROM ? m
            INNER JOIN ? v ON m.id = v.metric_id
            WHERE m.name = ?
        `
	rows, err := tx.Query(query, sanitizedPodName, fmt.Sprintf("%s_values", sanitizedPodName), metricName)
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

	for rows.Next() {
		var currentTime time.Time
		var name, value, measure string
		var valueID int
		if err := rows.Scan(&currentTime, &name, &value, &measure, &valueID); err != nil {
			log.Printf("Error scanning metric details: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan metric details"})
			return
		}

		labelsQuery := "SELECT key, value FROM ? WHERE value_id = ?"
		labelsRows, err := tx.Query(labelsQuery, fmt.Sprintf("%s_labels", sanitizedPodName), valueID)
		if err != nil {
			log.Printf("Error querying labels: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query labels"})
			return
		}
		defer labelsRows.Close()

		labels := make(map[string]string)
		for labelsRows.Next() {
			var labelKey, labelValue string
			if err := labelsRows.Scan(&labelKey, &labelValue); err != nil {
				log.Printf("Error scanning labels: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan labels"})
				return
			}
			labels[labelKey] = labelValue
		}

		timeKey := currentTime.Format(time.RFC3339)

		detail, exists := detailsMap[timeKey]
		if !exists {
			detail = MetricDetails{
				Name:   name,
				Values: []MetricValue{},
			}
		}

		detail.Values = append(detail.Values, MetricValue{
			Value:   value,
			Measure: measure,
			Labels:  labels,
		})

		detailsMap[timeKey] = detail
	}

	c.JSON(http.StatusOK, gin.H{"details": detailsMap})
}

// queryMetricDetails 查询指标详细信息
func queryMetricDetails(c *gin.Context, appName string) {
	// Handle metricsdetails query type
	db, err := sql.Open("sqlite", strings.ReplaceAll(appName, "-", "_")+".db")
	if err != nil {
		log.Printf("Error opening database: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open database"})
		return
	}
	defer db.Close()

	// Get all relevant tables
	rows, err := db.Query(`
			SELECT name 
			FROM sqlite_master 
			WHERE type='table' 
			AND name NOT LIKE '%_values' 
			AND name NOT LIKE '%_labels' 
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
		metricRows, err := db.Query(fmt.Sprintf(`
				SELECT DISTINCT name, help, type 
				FROM %s 
				GROUP BY name
			`, tableName))
		if err != nil {
			log.Printf("Error querying metrics for table %s: %v", tableName, err)
			continue
		}
		defer metricRows.Close()

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

		result[tableName] = podMetrics
	}

	c.JSON(http.StatusOK, result)
}
