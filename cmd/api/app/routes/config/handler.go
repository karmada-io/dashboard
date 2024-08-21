package config

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
 
)

func handleGetRunningapps(c *gin.Context) {
	podLabels, err := GetRunningapps()
	if err != nil {
		common.Fail(c, err)
		return
	}
	c.JSON(200, gin.H{"appLabels": podLabels})
}

func handleGetMetaData(c *gin.Context) {
	appLabel := c.Param("appLabel")
	podMetadataList, err := GetMetaData(appLabel)
	if err != nil {
		common.Fail(c, err)
		return
	}
	c.JSON(200, gin.H{"pods": podMetadataList})
}

func handleCheckDeploymentStatus(c *gin.Context) {
	podName := c.Param("podName") 

	status, err := GetDeploymentStatus(podName)
	if err != nil {
		common.Fail(c, err)
		return
	}
	c.JSON(200, gin.H{"status": status})
}

func handleRestartDeployment(c *gin.Context) {
	deploymentName := c.Param("podName")
	status, err := RestartDeployment(deploymentName)
	if err != nil {
		common.Fail(c, err)
		return
	}
	c.JSON(200, gin.H{"status": status})
}

func handleReinstallPod(c *gin.Context) {
	podName := c.Param("podName")
	status, err := DeletePod(podName)
	if err != nil {
		common.Fail(c, err)
		return
	}
	c.JSON(200, gin.H{"status": status})
}

func handleGetPodLogs(c *gin.Context) {
	podName := c.Param("podName")
	logs, err := GetPodLogs(podName)
	if err != nil {
		common.Fail(c, err)
		return
	}
	c.JSON(200, gin.H{"logs": logs})
}

func handlegetpodinfo(c *gin.Context) {
	podName := c.Param("Name")

	yamlData, err := GetPodYAML(podName)
	if err != nil {
		common.Fail(c, err)
		return
	}
	c.String(200, yamlData)
}


func hadlleputpodinfo(c *gin.Context) {
    podName := c.Param("Name")
    var requestBody struct {
        YamlContent string `json:"yamlContent"`
    }
    if err := c.ShouldBindJSON(&requestBody); err != nil {
        common.Fail(c, err)
        return
    }

    status, err := UpdatePodYAML(podName, requestBody.YamlContent)
    if err != nil {
        common.Fail(c, err)
        return
    }
    c.JSON(200, gin.H{"code": 200,"message":status})
 
}

func init() {
	r := router.V1()
	r.GET("/config/running-apps", handleGetRunningapps)
	r.GET("/config/apps/:appLabel", handleGetMetaData)
	r.GET("/config/status/:podName", handleCheckDeploymentStatus)
	r.GET("/config/restart/:podName", handleRestartDeployment)
	r.DELETE("/config/reinstall/:podName", handleReinstallPod) 
	r.GET("/config/log/:podName", handleGetPodLogs)
	r.GET("/config/podinfo/:Name", handlegetpodinfo)
	r.PUT("/config/podinfo/:Name", hadlleputpodinfo)
}

