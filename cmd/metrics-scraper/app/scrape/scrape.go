package scrape

import(
	"time"
	"database/sql"
	"log"
	"sync"
	"context"
	  
	"fmt"
	"net/http"
 	"github.com/gin-gonic/gin"
	v1 "github.com/karmada-io/dashboard/cmd/metrics-scraper/app/db"	 
)

var (
    requests chan SaveRequest
    db       *sql.DB
    syncMap  sync.Map
    // Add contexts and cancel functions for each app
    appContexts     map[string]context.Context
    appCancelFuncs  map[string]context.CancelFunc
    contextMutex    sync.Mutex
)


func startAppMetricsFetcher(appName string) {
	ticker := time.NewTicker(1 * time.Second)
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
				return
			}

			go func(ctx context.Context) {
				_, errors, err := FetchMetrics(ctx, appName, requests)
				if err != nil {
					log.Printf("Error fetching metrics for %s: %v, errors: %v\n", appName, err, errors)
				}
			}(ctx)
		}
	}
}

func CheckAppStatus(c *gin.Context) {
	statusMap := make(map[string]bool)

	// Get status for all registered apps
	for _, app := range []string{
		v1.KarmadaScheduler,
		v1.KarmadaControllerManager,
		v1.KarmadaAgent,
		v1.KarmadaSchedulerEstimator + "-member1",
		v1.KarmadaSchedulerEstimator + "-member2",
		v1.KarmadaSchedulerEstimator + "-member3",
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

func HandleSyncOperation(c *gin.Context, appName string, syncValue int, queryType string) {
	if appName == "" {
		// Stop all apps
		_, err := db.Exec("UPDATE app_sync SET sync_trigger = ?", syncValue)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to update sync_trigger for all apps: %v", err)})
			return
		}

		// Cancel all existing contexts and create new ones if turning on
		contextMutex.Lock()
		for app := range appContexts {
			currentSyncValue, _ := syncMap.Load(app)
			if currentSyncValue == syncValue {
				continue // Skip if already in the desired state
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

		message := "Sync trigger updated successfully for all apps"
		if syncValue == 1 {
			message = "Sync turned on successfully for all apps"
		} else {
			message = "Sync turned off successfully for all apps"
		}
		c.JSON(http.StatusOK, gin.H{"message": message})
	} else {
		// Update specific app
		currentSyncValue, _ := syncMap.Load(appName)
		if currentSyncValue == syncValue {
			message := fmt.Sprintf("Sync is already %s for %s", queryType, appName)
			c.JSON(http.StatusOK, gin.H{"message": message})
			return
		}

		_, err := db.Exec("UPDATE app_sync SET sync_trigger = ? WHERE app_name = ?", syncValue, appName)
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


func InitDatabase(){
    // Initialize contexts and cancel functions
    appContexts = make(map[string]context.Context)
    appCancelFuncs = make(map[string]context.CancelFunc)
    
    appNames := []string{
        v1.KarmadaScheduler,
        v1.KarmadaControllerManager,
        v1.KarmadaAgent,
        v1.KarmadaSchedulerEstimator + "-member1",
        v1.KarmadaSchedulerEstimator + "-member2",
        v1.KarmadaSchedulerEstimator + "-member3",
    }

    // Create database connection
    var err error
    db, err = sql.Open("sqlite", "app_sync.db")
    if err != nil {
        log.Fatalf("Error opening app_sync database: %v", err)
    }

    // Create the app_sync table
    _, err = db.Exec(`
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

        _, err = db.Exec("INSERT OR IGNORE INTO app_sync (app_name) VALUES (?)", appName)
        if err != nil {
            log.Printf("Error inserting app name into app_sync table: %v", err)
            continue
        }
        
        syncMap.Store(appName, 1)
    }

    requests = make(chan SaveRequest, len(appNames))
    go startDatabaseWorker(requests)

    // Start metrics fetchers with context
    for _, app := range appNames {
        go startAppMetricsFetcher(app)
    }
}

