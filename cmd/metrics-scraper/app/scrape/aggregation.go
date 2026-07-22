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

package scrape

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

// StartAggregationWorkers starts background goroutines that periodically
// downsample raw metrics into 1-min and 5-min aggregate buckets.
func StartAggregationWorkers() {
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			runAggregation("1m", 1*time.Minute)
		}
	}()

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			runAggregation("5m", 5*time.Minute)
		}
	}()
}

func runAggregation(resolution string, bucketDuration time.Duration) {
	dbMapLock.RLock()
	dbs := make(map[string]*sql.DB, len(dbMap))
	for name, d := range dbMap {
		dbs[name] = d
	}
	dbMapLock.RUnlock()

	for appName, db := range dbs {
		tables, err := getTablesForApp(db)
		if err != nil {
			log.Printf("Aggregation: error getting tables for %s: %v", appName, err)
			continue
		}
		for _, table := range tables {
			if err := aggregateTable(db, table, resolution, bucketDuration); err != nil {
				log.Printf("Aggregation: error for table %s resolution %s: %v", table, resolution, err)
			}
		}
	}
}

func getTablesForApp(db *sql.DB) ([]string, error) {
	rows, err := db.Query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%_values' AND name NOT LIKE '%_labels' AND name NOT LIKE '%_label_strings' AND name NOT LIKE '%_time_load' AND name NOT LIKE '%_metadata' AND name NOT LIKE '%_aggregates' AND name != 'app_sync' AND name != 'sqlite_sequence'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		tables = append(tables, name)
	}
	return tables, rows.Err()
}

func aggregateTable(db *sql.DB, table, resolution string, bucketDuration time.Duration) error {
	now := time.Now().UTC()
	bucketEnd := now.Truncate(bucketDuration)
	bucketStart := bucketEnd.Add(-bucketDuration)

	query := fmt.Sprintf(`
		SELECT m.name, v.measure, AVG(v.value), MAX(v.value), MIN(v.value), COUNT(v.value)
		FROM %s m
		INNER JOIN %s_values v ON m.id = v.metric_id
		WHERE m.currentTime >= ? AND m.currentTime < ?
		  AND v.measure IN ('current_value', 'total', 'sum', 'count')
		GROUP BY m.name, v.measure
	`, table, table)

	rows, err := db.Query(query, bucketStart.Format(time.RFC3339), bucketEnd.Format(time.RFC3339))
	if err != nil {
		return err
	}
	defer rows.Close()

	if _, err := db.Exec(fmt.Sprintf(createAggregatesTableSQL, table)); err != nil {
		return err
	}
	if _, err := db.Exec(fmt.Sprintf(createAggregatesIndexSQL, table, table)); err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	bucketTimeStr := bucketStart.Format(time.RFC3339)
	for rows.Next() {
		var name, measure string
		var avg, max, min float64
		var count int
		if err := rows.Scan(&name, &measure, &avg, &max, &min, &count); err != nil {
			continue
		}
		if _, err = tx.Exec(fmt.Sprintf(insertAggregateSQL, table), name, measure, bucketTimeStr, resolution, avg, max, min, count); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	var retentionCutoff time.Time
	switch resolution {
	case "1m":
		retentionCutoff = now.Add(-1 * time.Hour)
	case "5m":
		retentionCutoff = now.Add(-6 * time.Hour)
	default:
		retentionCutoff = now
	}
	if _, err = tx.Exec(fmt.Sprintf(deleteOldAggregatesSQL, table), resolution, retentionCutoff.Format(time.RFC3339)); err != nil {
		return err
	}

	return tx.Commit()
}
