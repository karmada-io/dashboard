package scrape

import (
	_ "github.com/glebarez/sqlite"
	"database/sql"
	"fmt"
	"strings"
	"log"
	"net/http"
	"github.com/gin-gonic/gin"
)

// Mname retrieves distinct metric names from the database.
func Mname(db *sql.DB, sanitizedPodName string) ([]string, error) {
	rows, err := db.Query(fmt.Sprintf("SELECT DISTINCT name FROM %s", sanitizedPodName))
	if err != nil {
		return nil, fmt.Errorf("error querying metric names: %w", err)
	}
	defer rows.Close()

	var metricNames []string
	for rows.Next() {
		var metricName string
		if err := rows.Scan(&metricName); err != nil {
			return nil, fmt.Errorf("error scanning metric name: %w", err)
		}
		metricNames = append(metricNames, metricName)
	}
	return metricNames, nil
}

// Details retrieves detailed information about a specific metric.
func Details(db *sql.DB, sanitizedPodName, metricName string) (map[string]interface{}, error) {
	if metricName == "" {
		return nil, fmt.Errorf("metric name required for details")
	}
	query := fmt.Sprintf(`
		SELECT 
			m.currentTime, 
			m.name, 
			v.value, 
			v.measure, 
			v.id
		FROM %s m
		INNER JOIN %s_values v ON m.id = v.metric_id
		WHERE m.name = ?
	`, sanitizedPodName, sanitizedPodName)
	rows, err := db.Query(query, metricName)
	if err != nil {
		return nil, fmt.Errorf("error querying metric details: %w", err)
	}
	defer rows.Close()

	details := make(map[string]interface{})
	for rows.Next() {
		var currentTime, name, value, measure string
		var id int
		if err := rows.Scan(&currentTime, &name, &value, &measure, &id); err != nil {
			return nil, fmt.Errorf("error scanning metric detail: %w", err)
		}
		details[name] = map[string]interface{}{
			"value":   value,
			"measure": measure,
			"id":      id,
		}
	}
	return details, nil
}

// MetricsDetails retrieves all metrics details for a given app name.
func MetricsDetails(appName string) (map[string]map[string]interface{}, error) {
	db, err := sql.Open("sqlite", strings.ReplaceAll(appName, "-", "_")+".db")
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
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
		return nil, fmt.Errorf("error querying tables: %w", err)
	}
	defer rows.Close()

	result := make(map[string]map[string]interface{})

	// Process each table (pod)
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, fmt.Errorf("error scanning table name: %w", err)
		}

		// Get metrics for this pod
		metricRows, err := db.Query(fmt.Sprintf(`
			SELECT DISTINCT name, help, type 
			FROM %s 
			GROUP BY name
		`, tableName))
		if err != nil {
			return nil, fmt.Errorf("error querying metrics for table %s: %w", tableName, err)
		}
		defer metricRows.Close()

		podMetrics := make(map[string]interface{})

		// Process each metric
		for metricRows.Next() {
			var name, help, metricType string
			if err := metricRows.Scan(&name, &help, &metricType); err != nil {
				return nil, fmt.Errorf("error scanning metric info: %w", err)
			}

			podMetrics[name] = map[string]interface{}{
				"help": help,
				"type": metricType,
			}
		}

		result[tableName] = podMetrics
	}

	return result, nil
}
 

func QueryMetrics(c *gin.Context) {
	appName := c.Param("app_name")
	podName := c.Param("pod_name")
	queryType := c.Query("type")  // Use a query parameter to determine the action
	metricName := c.Query("mname")  // Optional: only needed for details

	sanitizedAppName := strings.ReplaceAll(appName, "-", "_")
	sanitizedPodName := strings.ReplaceAll(podName, "-", "_")

	db, err := GetDB(sanitizedAppName)
	if err != nil {
		log.Printf("Error getting database connection: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open database"})
		return
	}
	defer db.Close()

	switch queryType {
	case "mname":
		metricNames, err := Mname(db, sanitizedPodName)
		if err != nil {
			log.Printf("Error retrieving metric names: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve metric names"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"metricNames": metricNames})

	case "details":
		if metricName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Metric name required for details"})
			return
		}
		details, err := Details(db, sanitizedPodName, metricName)
		if err != nil {
			log.Printf("Error retrieving metric details: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve metric details"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"details": details})

	case "metricsdetails":
		result, err := MetricsDetails(sanitizedAppName)
		if err != nil {
			log.Printf("Error retrieving metrics details: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve metrics details"})
			return
		}
		c.JSON(http.StatusOK, result)
		return
	}
}

func GetMetrics(c *gin.Context) {
	appName := c.Param("app_name")
	queryType := c.Query("type")

	if queryType == "sync_on" || queryType == "sync_off" {
		syncValue := 0
		if queryType == "sync_on" {
			syncValue = 1
		}
		HandleSyncOperation(c, appName, syncValue, queryType)
		return
	}

	if queryType == "metricsdetails" {
		QueryMetrics(c)
		return
	}

	if queryType == "sync_status" {
		CheckAppStatus(c)
		return
	}

	allMetrics, errors, err := FetchMetrics(c.Request.Context(), appName, requests)
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
 
