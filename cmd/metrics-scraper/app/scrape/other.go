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
	"strings"
	"sync"
	"time"

	_ "github.com/glebarez/sqlite"
	"github.com/prometheus/common/expfmt"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/db"
)

var dbMutex sync.Mutex

func saveToDBWithConnection(db *sql.DB, appName, podName string, data *db.ParsedData) (err error) {
	sanitizedPodName := strings.ReplaceAll(podName, "-", "_")
	log.Printf("Saving data for app '%s', pod '%s' (sanitized: '%s')", appName, podName, sanitizedPodName)

	dbMutex.Lock()
	defer dbMutex.Unlock()

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			log.Printf("Recovered from panic: %v", p)
			err = fmt.Errorf("panic occurred: %v", p)
		} else if err != nil {
			tx.Rollback()
			log.Printf("Transaction rolled back due to error: %v", err)
		} else {
			tx.Commit()
		}
	}()

	// Create tables
	if _, err = tx.Exec(fmt.Sprintf(createMainTableSQL, sanitizedPodName)); err != nil {
		log.Printf("Error creating main table: %v", err)
		return err
	}

	if _, err = tx.Exec(fmt.Sprintf(createValuesTableSQL, sanitizedPodName, sanitizedPodName)); err != nil {
		log.Printf("Error creating values table: %v", err)
		return err
	}

	if _, err = tx.Exec(fmt.Sprintf(createLabelsTableSQL, sanitizedPodName, sanitizedPodName)); err != nil {
		log.Printf("Error creating labels table: %v", err)
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
	var oldestTime string
	err = tx.QueryRow(fmt.Sprintf(getOldestTimeSQL, timeLoadTableName)).Scan(&oldestTime)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("Error getting oldest time entry: %v", err)
		return err
	}

	if oldestTime != "" {
		result, err := tx.Exec(fmt.Sprintf(deleteOldTimeSQL, timeLoadTableName), oldestTime)
		if err != nil {
			log.Printf("Error deleting old time entries: %v", err)
			return err
		}
		rowsAffected, _ := result.RowsAffected()
		log.Printf("Deleted %d old time entries from %s", rowsAffected, timeLoadTableName)

		result, err = tx.Exec(fmt.Sprintf(deleteAssociatedMetricsSQL, sanitizedPodName), oldestTime)
		if err != nil {
			log.Printf("Error deleting associated metrics: %v", err)
			return err
		}
		rowsAffected, _ = result.RowsAffected()
		log.Printf("Deleted %d associated metrics from %s", rowsAffected, sanitizedPodName)

		result, err = tx.Exec(fmt.Sprintf(deleteAssociatedValuesSQL, sanitizedPodName, sanitizedPodName))
		if err != nil {
			log.Printf("Error deleting associated values: %v", err)
			return err
		}
		rowsAffected, _ = result.RowsAffected()
		log.Printf("Deleted %d associated values from %s_values", rowsAffected, sanitizedPodName)
	}

	// Insert metrics and values
	for metricName, metricData := range data.Metrics {

		result, err := tx.Exec(fmt.Sprintf(insertMainSQL, sanitizedPodName), metricName, metricData.Help, metricData.Type, data.CurrentTime)
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
			valueIDResult, err := tx.Exec(fmt.Sprintf("INSERT INTO %s_values (metric_id, value, measure) VALUES (?, ?, ?)", sanitizedPodName), metricID, value.Value, value.Measure)
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
				_, err = tx.Exec(fmt.Sprintf("INSERT INTO %s_labels (value_id, key, value) VALUES (?, ?, ?)", sanitizedPodName), valueID, labelKey, labelValue)
				if err != nil {
					log.Printf("Error inserting label for value of metric %s: %v", metricName, err)
					return err
				}
			}
		}
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		return err
	}

	log.Println("Data inserted successfully")
	return nil
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
	var parser expfmt.TextParser
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
