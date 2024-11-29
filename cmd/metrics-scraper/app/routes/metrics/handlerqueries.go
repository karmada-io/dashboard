package metrics

import (
	"log"
	"net/http"
	"strings"
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
 
	"github.com/gin-gonic/gin"
)


func QueryMetrics(c *gin.Context) {
	appName := c.Param("app_name")
	podName := c.Param("pod_name")
	queryType := c.Query("type")  // Use a query parameter to determine the action
	metricName := c.Query("mname")  // Optional: only needed for details

	sanitizedAppName := strings.ReplaceAll(appName, "-", "_")
	sanitizedPodName := strings.ReplaceAll(podName, "-", "_")

	db, err := scrape.GetDB(sanitizedAppName)
	if err != nil {
		log.Printf("Error getting database connection: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open database"})
		return
	}
	defer db.Close()

	switch queryType {
	case "mname":
		metricNames, err := scrape.Mname(db, sanitizedPodName)
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
		details, err := scrape.Details(db, sanitizedPodName, metricName)
		if err != nil {
			log.Printf("Error retrieving metric details: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve metric details"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"details": details})

	case "metricsdetails":
		result, err := scrape.MetricsDetails(sanitizedAppName)
		if err != nil {
			log.Printf("Error retrieving metrics details: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve metrics details"})
			return
		}
		c.JSON(http.StatusOK, result)
		return
	}
}