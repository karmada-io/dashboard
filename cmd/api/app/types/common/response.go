package common

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

type BaseResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"message"`
	Data interface{} `json:"data"`
}

// Success generate success response
func Success(c *gin.Context, obj interface{}) {
	Response(c, nil, obj)
}

// Fail generate fail response
func Fail(c *gin.Context, err error) {
	Response(c, err, nil)
}

func Response(c *gin.Context, err error, data interface{}) {
	code := 200          // biz status code
	message := "success" // biz status message
	if err != nil {
		code = 500
		message = err.Error()
	}
	c.JSON(http.StatusOK, BaseResponse{
		Code: code,
		Msg:  message,
		Data: data,
	})
}
