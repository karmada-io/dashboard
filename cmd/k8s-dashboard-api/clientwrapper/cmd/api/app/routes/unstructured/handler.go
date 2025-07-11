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

package unstructured

import (
	"io"

	"github.com/gin-gonic/gin"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/util/retry"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
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
