package unstructured

import (
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"io"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/util/retry"
	"k8s.io/klog/v2"
)

func handleDeleteResource(c *gin.Context) {
	verber, err := client.VerberClient(c.Request)
	if err != nil {
		klog.ErrorS(err, "Failed to init VerberClient")
		common.Fail(c, err)
		return
	}
	kind := c.Param("kind")
	namespace := c.Param("namespace")
	if namespace == "" {
		namespace = "default"
	}
	name := c.Param("name")
	deleteNow := c.Param("deleteNow") == "true"

	if err := verber.Delete(kind, namespace, name, deleteNow); err != nil {
		klog.ErrorS(err, "Failed to delete resource")
		common.Fail(c, err)
		return
	}
	err = retry.OnError(
		retry.DefaultRetry,
		func(err error) bool {
			return errors.IsNotFound(err)
		},
		func() error {
			_, getErr := verber.Get(kind, namespace, name)
			return getErr
		})
	if !errors.IsNotFound(err) {
		klog.ErrorS(err, "Wait for verber delete resource failed")
		common.Fail(c, err)
		return
	}

	common.Success(c, "ok")
}
func handleGetResource(c *gin.Context) {
	verber, err := client.VerberClient(c.Request)
	if err != nil {
		klog.ErrorS(err, "Failed to init VerberClient")
		common.Fail(c, err)
		return
	}
	kind := c.Param("kind")
	namespace := c.Param("namespace")
	name := c.Param("name")

	result, err := verber.Get(kind, namespace, name)
	if err != nil {
		klog.ErrorS(err, "Failed to get resource")
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}
func handlePutResource(c *gin.Context) {
	verber, err := client.VerberClient(c.Request)
	if err != nil {
		klog.ErrorS(err, "Failed to init VerberClient")
		common.Fail(c, err)
		return
	}

	raw := &unstructured.Unstructured{}
	bytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		klog.ErrorS(err, "Failed to read request body")
		common.Fail(c, err)
		return
	}
	err = raw.UnmarshalJSON(bytes)
	if err != nil {
		klog.ErrorS(err, "Failed to unmarshal request body")
		common.Fail(c, err)
		return
	}
	if err = verber.Update(raw); err != nil {
		klog.ErrorS(err, "Failed to update resource")
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}

func handleCreateResource(c *gin.Context) {
	// todo double-check existence of target resources, if exist return directly.
	verber, err := client.VerberClient(c.Request)
	if err != nil {
		klog.ErrorS(err, "Failed to init VerberClient")
		common.Fail(c, err)
		return
	}

	raw := &unstructured.Unstructured{}
	bytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		klog.ErrorS(err, "Failed to read request body")
		common.Fail(c, err)
		return
	}
	err = raw.UnmarshalJSON(bytes)
	if err != nil {
		klog.ErrorS(err, "Failed to unmarshal request body")
		common.Fail(c, err)
	}
	if _, err = verber.Create(raw); err != nil {
		klog.ErrorS(err, "Failed to create resource")
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}

func init() {
	r := router.V1()
	r.DELETE("/_raw/:kind/namespace/:namespace/name/:name", handleDeleteResource)
	r.GET("/_raw/:kind/namespace/:namespace/name/:name", handleGetResource)
	r.PUT("/_raw/:kind/namespace/:namespace/name/:name", handlePutResource)
	r.POST("/_raw/:kind/namespace/:namespace/name/:name", handleCreateResource)

	// Verber (non-namespaced)
	r.DELETE("/_raw/:kind/name/:name", handleDeleteResource)
	r.GET("/_raw/:kind/name/:name", handleGetResource)
	r.PUT("/_raw/:kind/name/:name", handlePutResource)
	r.POST("/_raw/:kind/name/:name", handleCreateResource)
}
