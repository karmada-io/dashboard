package metrics

import (
	"net/http"
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
	"github.com/gin-gonic/gin"
)
 
var requests = make(chan scrape.SaveRequest)

func GetMetrics(c *gin.Context) {
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
		QueryMetrics(c)
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
