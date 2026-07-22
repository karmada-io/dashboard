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
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/glebarez/sqlite"
)

func TestCounterRateHandlesReset(t *testing.T) {
	points := []Point{
		{Timestamp: "2026-01-01T00:00:00Z", Value: 10},
		{Timestamp: "2026-01-01T00:00:10Z", Value: 16},
		{Timestamp: "2026-01-01T00:00:20Z", Value: 3}, // counter reset
	}

	got := counterRate(points)
	if len(got) != 3 {
		t.Fatalf("expected 3 points, got %d", len(got))
	}
	if got[1].Value != 0.6 {
		t.Fatalf("expected second point rate 0.6, got %f", got[1].Value)
	}
	if got[2].Value != 0 {
		t.Fatalf("expected reset point rate 0, got %f", got[2].Value)
	}
}

func TestHistogramAverageUsesDelta(t *testing.T) {
	sum := []Point{
		{Timestamp: "2026-01-01T00:00:00Z", Value: 10},
		{Timestamp: "2026-01-01T00:00:10Z", Value: 16},
	}
	count := []Point{
		{Timestamp: "2026-01-01T00:00:00Z", Value: 2},
		{Timestamp: "2026-01-01T00:00:10Z", Value: 4},
	}

	got := histogramAverage(sum, count)
	if len(got) != 2 {
		t.Fatalf("expected 2 points, got %d", len(got))
	}
	if got[1].Value != 3 {
		t.Fatalf("expected delta average 3, got %f", got[1].Value)
	}
}

func TestGetSchedulerVisualizationInvalidApp(t *testing.T) {
	origGetDB := getDBFunc
	defer func() { getDBFunc = origGetDB }()
	dbConn := mustOpenSQLite(t)
	getDBFunc = func(_ string) (*sql.DB, error) {
		return dbConn, nil
	}

	c, w := newVisualizationContext("/api/v1/metrics/unknown-component/visualization")
	c.Params = gin.Params{{Key: "app_name", Value: "unknown-component"}}

	GetSchedulerVisualization(c)
	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", w.Code)
	}
}

func TestGetSchedulerVisualizationNoData(t *testing.T) {
	origGetDB := getDBFunc
	origTrigger := triggerScrapeNow
	defer func() {
		getDBFunc = origGetDB
		triggerScrapeNow = origTrigger
	}()

	dbConn := mustOpenSQLite(t)
	getDBFunc = func(_ string) (*sql.DB, error) { return dbConn, nil }
	triggerScrapeNow = func(_ context.Context, _ string) ([]string, error) { return nil, nil }

	c, w := newVisualizationContext("/api/v1/metrics/karmada-scheduler/visualization?window=15m")
	c.Params = gin.Params{{Key: "app_name", Value: "karmada-scheduler"}}

	GetSchedulerVisualization(c)
	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", w.Code)
	}
}

func TestGetSchedulerVisualizationSuccess(t *testing.T) {
	origGetDB := getDBFunc
	origTrigger := triggerScrapeNow
	defer func() {
		getDBFunc = origGetDB
		triggerScrapeNow = origTrigger
	}()

	dbConn := mustOpenSQLite(t)
	createTestMetricTables(t, dbConn, "karmada_scheduler_testpod")

	now := time.Now().Truncate(time.Second)
	t1 := now.Add(-20 * time.Second).Format(time.RFC3339)
	t2 := now.Add(-10 * time.Second).Format(time.RFC3339)
	insertMetricSample(t, dbConn, "karmada_scheduler_testpod", t1, "workqueue_depth", "current_value", 4)
	insertMetricSample(t, dbConn, "karmada_scheduler_testpod", t2, "workqueue_depth", "current_value", 6)
	insertMetricSample(t, dbConn, "karmada_scheduler_testpod", t1, "workqueue_adds_total", "total", 10)
	insertMetricSample(t, dbConn, "karmada_scheduler_testpod", t2, "workqueue_adds_total", "total", 30)

	getDBFunc = func(_ string) (*sql.DB, error) { return dbConn, nil }
	triggerScrapeNow = func(_ context.Context, _ string) ([]string, error) { return nil, nil }

	c, w := newVisualizationContext("/api/v1/metrics/karmada-scheduler/visualization?window=15m")
	c.Params = gin.Params{{Key: "app_name", Value: "karmada-scheduler"}}

	GetSchedulerVisualization(c)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}

	var resp SchedulerVisualizationResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response json: %v", err)
	}
	if len(resp.Timeseries["workqueue_depth"]) == 0 {
		t.Fatalf("expected workqueue_depth points")
	}
	if len(resp.Timeseries["workqueue_adds_total"]) == 0 {
		t.Fatalf("expected workqueue_adds_total points")
	}
}

func newVisualizationContext(url string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, url, nil)
	c.Request = req
	return c, w
}

func mustOpenSQLite(t *testing.T) *sql.DB {
	t.Helper()
	dbConn, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	dbConn.SetMaxOpenConns(1)
	t.Cleanup(func() {
		_ = dbConn.Close()
	})
	return dbConn
}

func createTestMetricTables(t *testing.T, dbConn *sql.DB, table string) {
	t.Helper()
	sqls := []string{
		"CREATE TABLE IF NOT EXISTS " + table + " (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, currentTime DATETIME)",
		"CREATE TABLE IF NOT EXISTS " + table + "_metadata (name TEXT PRIMARY KEY, help TEXT, type TEXT)",
		"CREATE TABLE IF NOT EXISTS " + table + "_values (id INTEGER PRIMARY KEY AUTOINCREMENT, metric_id INTEGER, value TEXT, measure TEXT)",
	}
	for _, stmt := range sqls {
		if _, err := dbConn.Exec(stmt); err != nil {
			t.Fatalf("failed to create test table: %v", err)
		}
	}
}

func insertMetricSample(t *testing.T, dbConn *sql.DB, table, ts, metric, measure string, value float64) {
	t.Helper()
	metricType := "GAUGE"
	if measure == "total" {
		metricType = "COUNTER"
	}
	if _, err := dbConn.Exec(
		"INSERT OR IGNORE INTO "+table+"_metadata (name, help, type) VALUES (?, ?, ?)",
		metric, "", metricType,
	); err != nil {
		t.Fatalf("failed to insert metric metadata: %v", err)
	}
	result, err := dbConn.Exec(
		"INSERT INTO "+table+" (name, currentTime) VALUES (?, ?)",
		metric, ts,
	)
	if err != nil {
		t.Fatalf("failed to insert metric row: %v", err)
	}
	metricID, err := result.LastInsertId()
	if err != nil {
		t.Fatalf("failed to get metric id: %v", err)
	}
	if _, err = dbConn.Exec(
		"INSERT INTO "+table+"_values (metric_id, value, measure) VALUES (?, ?, ?)",
		metricID, value, measure,
	); err != nil {
		t.Fatalf("failed to insert metric value: %v", err)
	}
}
