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
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/db"
)

var (
	requestsMap map[string]chan SaveRequest
	sqldb       *sql.DB
	syncMap     sync.Map
	// scrapeInterval controls how frequently each app fetcher triggers a scrape cycle.
	scrapeInterval = 10 * time.Second
	// Add contexts and cancel functions for each app
	appContexts    map[string]context.Context
	appCancelFuncs map[string]context.CancelFunc
	contextMutex   sync.Mutex
)

func getRequestsChannel(appName string) (chan SaveRequest, bool) {
	if requestsMap == nil {
		return nil, false
	}

	requests, ok := requestsMap[appName]
	return requests, ok
}

func startAppMetricsFetcher(appName string) {
	ticker := time.NewTicker(scrapeInterval)
	defer ticker.Stop()

	for {
		contextMutex.Lock()
		ctx, exists := appContexts[appName]
		contextMutex.Unlock()

		if !exists {
			log.Printf("Context not found for %s, stopping fetcher", appName)
			return
		}

		select {
		case <-ctx.Done():
			log.Printf("Stopping metrics fetcher for %s", appName)
			return
		case <-ticker.C:
			syncTriggerVal, ok := syncMap.Load(appName)
			if !ok {
				continue
			}

			syncTrigger, ok := syncTriggerVal.(int)
			if !ok || syncTrigger != 1 {
				continue
			}

			requests, ok := getRequestsChannel(appName)
			if !ok {
				log.Printf("Request channel not found for %s", appName)
				continue
			}

			_, errors, err := FetchMetrics(ctx, appName, requests)
			if err != nil {
				log.Printf("Error fetching metrics for %s: %v, errors: %v\n", appName, err, errors)
			}
		}
	}
}

// CheckAppStatus checks the status of all registered apps and returns a map of app names to their status.
func CheckAppStatus(c *gin.Context) {
	statusMap := make(map[string]bool)

	// Get status for all registered apps (same list as InitDatabase)
	for _, app := range []string{
		db.KarmadaScheduler,
		db.KarmadaControllerManager,
		db.KarmadaAgent,
		db.KarmadaSchedulerEstimator + "-member1",
		db.KarmadaSchedulerEstimator + "-member2",
		db.KarmadaSchedulerEstimator + "-member3",
		db.KarmadaAggregatedAPIServer,
		db.KarmadaAPIServer,
		db.KarmadaDescheduler,
		db.KarmadaKubeControllerManager,
		db.KarmadaMetricsAdapter,
		db.KarmadaSearch,
		db.KarmadaWebhook,
	} {
		syncValue, exists := syncMap.Load(app)
		if !exists {
			statusMap[app] = false
			continue
		}

		if value, ok := syncValue.(int); ok {
			statusMap[app] = value == 1
		} else {
			statusMap[app] = false
		}
	}

	c.JSON(http.StatusOK, statusMap)
}

// HandleSyncOperation handles the sync operation for a specific app
// if not specified, it handles the sync operation for all apps.
func HandleSyncOperation(c *gin.Context, appName string, syncValue int, queryType string) {
	if appName == "" {
		// Stop all apps
		_, err := sqldb.Exec("UPDATE app_sync SET sync_trigger = ?", syncValue)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to update sync_trigger for all apps: %v", err)})
			return
		}

		// Cancel all existing contexts and create new ones if turning on
		contextMutex.Lock()
		for app := range appContexts {
			currentSyncValue, ok := syncMap.Load(app)
			if ok {
				if val, isInt := currentSyncValue.(int); isInt && val == syncValue {
					continue // Skip if already in the desired state
				}
			}

			if cancel, exists := appCancelFuncs[app]; exists {
				cancel() // Cancel existing context
			}

			if syncValue == 1 {
				// Create new context if turning on
				ctx, cancel := context.WithCancel(context.Background())
				appContexts[app] = ctx
				appCancelFuncs[app] = cancel
				go startAppMetricsFetcher(app)
			}

			syncMap.Store(app, syncValue)
		}
		contextMutex.Unlock()

		message := "Sync turned off successfully for all apps"
		if syncValue == 1 {
			message = "Sync turned on successfully for all apps"
		}
		c.JSON(http.StatusOK, gin.H{"message": message})
	} else {
		// Update specific app
		currentSyncValue, ok := syncMap.Load(appName)
		if ok {
			if val, isInt := currentSyncValue.(int); isInt && val == syncValue {
				message := fmt.Sprintf("Sync is already %s for %s", queryType, appName)
				c.JSON(http.StatusOK, gin.H{"message": message})
				return
			}
		}

		_, err := sqldb.Exec("UPDATE app_sync SET sync_trigger = ? WHERE app_name = ?", syncValue, appName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to update sync_trigger: %v", err)})
			return
		}

		contextMutex.Lock()
		if cancel, exists := appCancelFuncs[appName]; exists {
			cancel() // Cancel existing context
		}

		if syncValue == 1 {
			// Create new context if turning on
			ctx, cancel := context.WithCancel(context.Background())
			appContexts[appName] = ctx
			appCancelFuncs[appName] = cancel
			go startAppMetricsFetcher(appName)
		}

		syncMap.Store(appName, syncValue)
		contextMutex.Unlock()

		var message string
		if syncValue == 1 {
			message = fmt.Sprintf("Sync turned on successfully for %s", appName)
		} else {
			message = fmt.Sprintf("Sync turned off successfully for %s", appName)
		}
		c.JSON(http.StatusOK, gin.H{"message": message})
	}
}

// InitDatabase initializes the database and starts the metrics fetchers.
func InitDatabase(interval time.Duration) {
	if interval > 0 {
		scrapeInterval = interval
	}
	log.Printf("Metrics scrape interval set to %s", scrapeInterval)

	// Initialize contexts and cancel functions
	appContexts = make(map[string]context.Context)
	appCancelFuncs = make(map[string]context.CancelFunc)

	appNames := []string{
		db.KarmadaScheduler,
		db.KarmadaControllerManager,
		db.KarmadaAgent,
		db.KarmadaSchedulerEstimator + "-member1",
		db.KarmadaSchedulerEstimator + "-member2",
		db.KarmadaSchedulerEstimator + "-member3",
		db.KarmadaAggregatedAPIServer,
		db.KarmadaAPIServer,
		db.KarmadaDescheduler,
		db.KarmadaKubeControllerManager,
		db.KarmadaMetricsAdapter,
		db.KarmadaSearch,
		db.KarmadaWebhook,
	}

	// Create database connection
	var err error
	sqldb, err = sql.Open("sqlite", "app_sync.db")
	if err != nil {
		log.Fatalf("Error opening app_sync database: %v", err)
	}

	// Create the app_sync table
	_, err = sqldb.Exec(`
        CREATE TABLE IF NOT EXISTS app_sync (
            app_name TEXT PRIMARY KEY,
            sync_trigger INTEGER DEFAULT 1
        )
    `)
	if err != nil {
		log.Fatalf("Error creating app_sync table: %v", err)
	}

	// Initialize contexts for each app
	for _, appName := range appNames {
		ctx, cancel := context.WithCancel(context.Background())
		contextMutex.Lock()
		appContexts[appName] = ctx
		appCancelFuncs[appName] = cancel
		contextMutex.Unlock()

		_, err = sqldb.Exec("INSERT OR IGNORE INTO app_sync (app_name) VALUES (?)", appName)
		if err != nil {
			log.Printf("Error inserting app name into app_sync table: %v", err)
			continue
		}

		syncMap.Store(appName, 1)
	}

	requestsMap = make(map[string]chan SaveRequest, len(appNames))
	for _, appName := range appNames {
		requests := make(chan SaveRequest, len(appNames))
		requestsMap[appName] = requests
		go startDatabaseWorker(requests)
	}

	// Start metrics fetchers with context
	for _, app := range appNames {
		go startAppMetricsFetcher(app)
	}

	// Start periodic database maintenance (vacuum + WAL checkpoint)
	RunPeriodicMaintenance()

	// Start aggregation workers for downsampling
	StartAggregationWorkers()
}

// TriggerScrapeNow triggers an immediate scrape for a single app and stores the result.
func TriggerScrapeNow(ctx context.Context, appName string) ([]string, error) {
	requests, ok := getRequestsChannel(appName)
	if !ok {
		return nil, errors.New("metrics scraper is not initialized for app")
	}

	_, scrapeErrors, err := FetchMetrics(ctx, appName, requests)
	if err != nil {
		return scrapeErrors, err
	}

	return scrapeErrors, nil
}
