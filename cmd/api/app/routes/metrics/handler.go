package metrics

import (
 
	"net/http"
	 
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
 
)
 
var requests = make(chan scrape.SaveRequest)

func getMetrics(c *gin.Context) {
	appName := c.Param("app_name")
	queryType := c.Query("type")

	if queryType == "sync_on" || queryType == "sync_off" {
		syncValue := 0
		if queryType == "sync_on" {
			syncValue = 1
		}
		scrape.HandleSyncOperation(c, appName, syncValue, queryType)
		return
	}

	if queryType == "metricsdetails" {
		queryMetrics(c)
		return
	}

	if queryType == "sync_status" {
		scrape.CheckAppStatus(c)
		return
	}

	allMetrics, errors, err := scrape.FetchMetrics(c.Request.Context(), appName, requests)
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
 
func init() {
	go scrape.InitDatabase()
	// Initialize the router with modified endpoints
	r := router.V1()
	r.GET("/metrics", getMetrics)
	r.GET("/metrics/:app_name", getMetrics)
	r.GET("/metrics/:app_name/:pod_name", queryMetrics)
}

// http://localhost:8000/api/v1/metrics/karmada-scheduler  //from terminal

// http://localhost:8000/api/v1/metrics/karmada-scheduler?type=metricsdetails  //from sqlite details bar

// http://localhost:8000/api/v1/metrics/karmada-scheduler/karmada-scheduler-7bd4659f9f-hh44f?type=details&mname=workqueue_queue_duration_seconds

// http://localhost:8000/api/v1/metrics?type=sync_off // to skip all metrics

// http://localhost:8000/api/v1/metrics/karmada-scheduler?type=sync_off // to skip specific metrics

