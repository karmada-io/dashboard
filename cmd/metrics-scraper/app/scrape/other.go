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
	"encoding/json"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/glebarez/sqlite" // Import the SQLite driver
	"github.com/prometheus/common/expfmt"
	"github.com/prometheus/common/model"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/db"
)

var (
	dbMutexMap      = make(map[string]*sync.Mutex)
	dbMutexLock     sync.Mutex
	scrapeCounter   uint64
	scrapeCounterMu sync.Mutex
)

func getDBMutex(appName string) *sync.Mutex {
	dbMutexLock.Lock()
	defer dbMutexLock.Unlock()

	if mu, ok := dbMutexMap[appName]; ok {
		return mu
	}

	mu := &sync.Mutex{}
	dbMutexMap[appName] = mu
	return mu
}

func saveToDBWithConnection(db *sql.DB, appName, podName string, data *db.ParsedData) (err error) {
	sanitizedPodName := strings.ReplaceAll(podName, "-", "_")
	log.Printf("Saving data for app '%s', pod '%s' (sanitized: '%s')", appName, podName, sanitizedPodName)

	mu := getDBMutex(appName)
	mu.Lock()
	defer mu.Unlock()

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			log.Printf("Recovered from panic: %v", p)
			err = fmt.Errorf("panic occurred: %v", p)
		} else if err != nil {
			_ = tx.Rollback()
			log.Printf("Transaction rolled back due to error: %v", err)
		} else {
			_ = tx.Commit()
		}
	}()

	// Create tables
	if _, err = tx.Exec(fmt.Sprintf(createMainTableSQL, sanitizedPodName)); err != nil {
		log.Printf("Error creating main table: %v", err)
		return err
	}

	if _, err = tx.Exec(fmt.Sprintf(createMetadataTableSQL, sanitizedPodName)); err != nil {
		log.Printf("Error creating metadata table: %v", err)
		return err
	}

	if _, err = tx.Exec(fmt.Sprintf(createValuesTableSQL, sanitizedPodName, sanitizedPodName)); err != nil {
		log.Printf("Error creating values table: %v", err)
		return err
	}

	if _, err = tx.Exec(fmt.Sprintf(createLabelStringsTableSQL, sanitizedPodName)); err != nil {
		log.Printf("Error creating label_strings table: %v", err)
		return err
	}

	if _, err = tx.Exec(fmt.Sprintf(createLabelsTableSQL, sanitizedPodName, sanitizedPodName, sanitizedPodName)); err != nil {
		log.Printf("Error creating labels table: %v", err)
		return err
	}

	// Create indexes for query performance
	if _, err = tx.Exec(fmt.Sprintf(createMainIndexSQL, sanitizedPodName, sanitizedPodName)); err != nil {
		log.Printf("Error creating main index: %v", err)
		return err
	}
	if _, err = tx.Exec(fmt.Sprintf(createValuesIndexSQL, sanitizedPodName, sanitizedPodName)); err != nil {
		log.Printf("Error creating values index: %v", err)
		return err
	}
	if _, err = tx.Exec(fmt.Sprintf(createLabelsIndexSQL, sanitizedPodName, sanitizedPodName)); err != nil {
		log.Printf("Error creating labels index: %v", err)
		return err
	}
	if _, err = tx.Exec(fmt.Sprintf(createLabelStringsIndexSQL, sanitizedPodName, sanitizedPodName)); err != nil {
		log.Printf("Error creating label_strings index: %v", err)
		return err
	}

	timeLoadTableName := fmt.Sprintf("%s_time_load", sanitizedPodName)
	if _, err = tx.Exec(fmt.Sprintf(createTimeLoadTableSQL, timeLoadTableName)); err != nil {
		log.Printf("Error creating %s table: %v", timeLoadTableName, err)
		return err
	}

	// Use data.CurrentTime and data.Metrics directly
	if _, err = tx.Exec(fmt.Sprintf(insertTimeLoadSQL, timeLoadTableName), data.CurrentTime); err != nil {
		log.Printf("Error inserting time entry: %v", err)
		return err
	}

	// Get oldest time and delete old data
	if err = cleanupOldData(tx, timeLoadTableName, sanitizedPodName); err != nil {
		return err
	}

	// Insert metrics and values
	if err = insertMetricsData(tx, data, sanitizedPodName); err != nil {
		return err
	}

	log.Println("Data inserted successfully")
	return nil
}

func cleanupOldData(tx *sql.Tx, timeLoadTableName, sanitizedPodName string) error {
	// Use time-based TTL: delete everything older than 5 minutes
	cutoffTime := time.Now().Add(-15 * time.Minute).Format(time.RFC3339)

	result, err := tx.Exec(fmt.Sprintf(deleteOldTimeSQL, timeLoadTableName), cutoffTime)
	if err != nil {
		log.Printf("Error deleting old time entries: %v", err)
		return err
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("Deleted %d old time entries from %s", rowsAffected, timeLoadTableName)

		// Delete labels first (depends on values which depends on metrics)
		result, err = tx.Exec(fmt.Sprintf(deleteAssociatedLabelsSQL, sanitizedPodName, sanitizedPodName, sanitizedPodName), cutoffTime)
		if err != nil {
			log.Printf("Error deleting associated labels: %v", err)
			return err
		}
		labelsAffected, _ := result.RowsAffected()
		log.Printf("Deleted %d associated labels from %s_labels", labelsAffected, sanitizedPodName)

		// Delete values (depends on metrics)
		result, err = tx.Exec(fmt.Sprintf(deleteAssociatedValuesSQL, sanitizedPodName, sanitizedPodName), cutoffTime)
		if err != nil {
			log.Printf("Error deleting associated values: %v", err)
			return err
		}
		valuesAffected, _ := result.RowsAffected()
		log.Printf("Deleted %d associated values from %s_values", valuesAffected, sanitizedPodName)

		// Delete metrics last
		result, err = tx.Exec(fmt.Sprintf(deleteAssociatedMetricsSQL, sanitizedPodName), cutoffTime)
		if err != nil {
			log.Printf("Error deleting associated metrics: %v", err)
			return err
		}
		metricsAffected, _ := result.RowsAffected()
		log.Printf("Deleted %d associated metrics from %s", metricsAffected, sanitizedPodName)
	}
	return nil
}

func insertMetricsData(tx *sql.Tx, data *db.ParsedData, sanitizedPodName string) error {
	scrapeCounterMu.Lock()
	scrapeCounter++
	currentScrape := scrapeCounter
	scrapeCounterMu.Unlock()

	for metricName, metricData := range data.Metrics {
		tier := db.GetMetricTier(metricName)

		// Skip low-tier metrics on non-sampled scrapes (keep every 3rd)
		if tier == db.TierLow && currentScrape%3 != 0 {
			continue
		}

		if _, err := tx.Exec(fmt.Sprintf(insertMetadataSQL, sanitizedPodName), metricName, metricData.Help, metricData.Type); err != nil {
			log.Printf("Error inserting metadata for metric %s: %v", metricName, err)
			return err
		}

		result, err := tx.Exec(fmt.Sprintf(insertMainSQL, sanitizedPodName), metricName, data.CurrentTime)
		if err != nil {
			log.Printf("Error inserting data for metric %s: %v", metricName, err)
			return err
		}

		metricID, err := result.LastInsertId()
		if err != nil {
			log.Printf("Error getting last insert ID for metric %s: %v", metricName, err)
			return err
		}

		for _, value := range metricData.Values {
			// Skip histogram bucket detail rows — keep only sum and count
			if value.Measure == "cumulative_count" {
				continue
			}

			numericValue, ok := parseFiniteMetricValue(value.Value)
			if !ok {
				continue
			}
			valueIDResult, err := tx.Exec(fmt.Sprintf("INSERT INTO %s_values (metric_id, value, measure) VALUES (?, ?, ?)", sanitizedPodName), metricID, numericValue, value.Measure)
			if err != nil {
				log.Printf("Error inserting value for metric %s: %v", metricName, err)
				return err
			}
			valueID, err := valueIDResult.LastInsertId()
			if err != nil {
				log.Printf("Error getting last insert ID for value of metric %s: %v", metricName, err)
				return err
			}

			for labelKey, labelValue := range value.Labels {
				_, err = tx.Exec(fmt.Sprintf("INSERT OR IGNORE INTO %s_label_strings (key, value) VALUES (?, ?)", sanitizedPodName), labelKey, labelValue)
				if err != nil {
					log.Printf("Error interning label for metric %s: %v", metricName, err)
					return err
				}

				var labelStringID int64
				err = tx.QueryRow(fmt.Sprintf("SELECT id FROM %s_label_strings WHERE key = ? AND value = ?", sanitizedPodName), labelKey, labelValue).Scan(&labelStringID)
				if err != nil {
					log.Printf("Error getting interned label ID for metric %s: %v", metricName, err)
					return err
				}

				_, err = tx.Exec(fmt.Sprintf("INSERT INTO %s_labels (value_id, label_string_id) VALUES (?, ?)", sanitizedPodName), valueID, labelStringID)
				if err != nil {
					log.Printf("Error inserting label ref for metric %s: %v", metricName, err)
					return err
				}
			}
		}
	}
	return nil
}

func parseFiniteMetricValue(raw string) (float64, bool) {
	value, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil || math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, false
	}
	return value, true
}

func isJSON(data []byte) bool {
	var js json.RawMessage
	return json.Unmarshal(data, &js) == nil
}

// Start the database worker
func startDatabaseWorker(requests chan SaveRequest) {
	for req := range requests {
		db, err := GetDB(req.appName)
		if err != nil {
			log.Printf("Error opening database: %v", err)
			if req.result != nil {
				req.result <- err
			}
			continue
		}

		err = saveToDBWithConnection(db, req.appName, req.podName, req.data)
		if req.result != nil {
			req.result <- err
		} else if err != nil {
			log.Printf("Error saving to DB: %v", err)
		}
	}
}

func parseMetricsToJSON(metricsOutput string) (*db.ParsedData, error) {
	parser := expfmt.NewTextParser(model.UTF8Validation)
	metricFamilies, err := parser.TextToMetricFamilies(strings.NewReader(metricsOutput))
	if err != nil {
		return nil, fmt.Errorf("error parsing metrics: %w", err)
	}

	metrics := make(map[string]*db.Metric)

	for name, mf := range metricFamilies {
		m := &db.Metric{
			Name:   name,
			Help:   mf.GetHelp(),
			Type:   mf.GetType().String(),
			Values: []db.MetricValue{},
		}

		for _, metric := range mf.Metric {
			labels := make(map[string]string)
			for _, labelPair := range metric.Label {
				labels[labelPair.GetName()] = labelPair.GetValue()
			}

			if metric.Histogram != nil {
				for _, bucket := range metric.Histogram.Bucket {
					bucketValue := fmt.Sprintf("%d", bucket.GetCumulativeCount())
					bucketLabels := make(map[string]string)
					for k, v := range labels {
						bucketLabels[k] = v
					}
					bucketLabels["le"] = fmt.Sprintf("%f", bucket.GetUpperBound())
					m.Values = append(m.Values, db.MetricValue{
						Labels:  bucketLabels,
						Value:   bucketValue,
						Measure: "cumulative_count",
					})
				}
				m.Values = append(m.Values, db.MetricValue{
					Labels:  labels,
					Value:   fmt.Sprintf("%f", metric.Histogram.GetSampleSum()),
					Measure: "sum",
				})
				m.Values = append(m.Values, db.MetricValue{
					Labels:  labels,
					Value:   fmt.Sprintf("%d", metric.Histogram.GetSampleCount()),
					Measure: "count",
				})
			} else if metric.Counter != nil {
				value := fmt.Sprintf("%f", metric.Counter.GetValue())
				m.Values = append(m.Values, db.MetricValue{
					Labels:  labels,
					Value:   value,
					Measure: "total",
				})
			} else if metric.Gauge != nil {
				value := fmt.Sprintf("%f", metric.Gauge.GetValue())
				m.Values = append(m.Values, db.MetricValue{
					Labels:  labels,
					Value:   value,
					Measure: "current_value",
				})
			} else {
				m.Values = append(m.Values, db.MetricValue{
					Labels:  labels,
					Value:   "",
					Measure: "unhandled_metric_type",
				})
			}
		}

		metrics[name] = m
	}

	currentTime := time.Now().Format(time.RFC3339)

	parsedData := &db.ParsedData{
		CurrentTime: currentTime,
		Metrics:     metrics,
	}
	return parsedData, nil
}
