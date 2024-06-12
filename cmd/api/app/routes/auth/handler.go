package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"k8s.io/klog/v2"
)

func handleLogin(c *gin.Context) {
	loginRequest := new(v1.LoginRequest)
	if err := c.Bind(loginRequest); err != nil {
		klog.ErrorS(err, "Could not read login request")
		common.Fail(c, err)
		return
	}
	response, _, err := login(loginRequest, c.Request)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, response)
}

func handleMe(c *gin.Context) {
	response, _, err := me(c.Request)
	if err != nil {
		klog.ErrorS(err, "Could not get user")
		common.Fail(c, err)
		return
	}

	common.Success(c, response)
}

func init() {
	router.V1().POST("/login", handleLogin)
	router.V1().GET("/me", handleMe)
}
