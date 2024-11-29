package scrape

import (
	_ "github.com/glebarez/sqlite"
	"database/sql"
	"fmt"
	"strings"
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
 
 