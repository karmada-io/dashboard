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

package router

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	kubeclient "k8s.io/client-go/kubernetes"

	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
)

const (
	karmadaClientContextKey = "karmadaClient"
	kubeClientContextKey    = "kubeClient"
)

// EnsureMemberClusterMiddleware ensures that the member cluster exists.
func EnsureMemberClusterMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		karmadaClient := client.InClusterKarmadaClient()
		_, err := karmadaClient.ClusterV1alpha1().Clusters().Get(context.TODO(), c.Param("clustername"), metav1.GetOptions{})
		if err != nil {
			c.AbortWithStatusJSON(http.StatusOK, common.BaseResponse{
				Code: 500,
				Msg:  err.Error(),
			})
			return
		}
		c.Next()
	}
}

// AuthMiddleware checks if the request has an Authorization header.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Header.Get("Authorization") == "" && c.Query("Authorization") == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, common.BaseResponse{
				Code: http.StatusUnauthorized,
				Msg:  "Forbidden",
			})
			return
		}
		if c.Request.Header.Get("Authorization") == "" && c.Query("Authorization") != "" {
			c.Request.Header.Set("Authorization", c.Query("Authorization"))
		}
		c.Next()
	}
}

// ClientMiddleware fetches Karmada and Kubernetes clients and stores them in the context.
func ClientMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		karmadaClient, err := client.GetKarmadaClientFromRequest(c.Request)
		if err != nil {
			common.Fail(c, err)
			c.Abort()
			return
		}
		c.Set(karmadaClientContextKey, karmadaClient)

		kubeClient, err := client.GetKarmadaClientFromRequestForKarmadaAPIServer(c.Request)
		if err != nil {
			common.Fail(c, err)
			c.Abort()
			return
		}
		c.Set(kubeClientContextKey, kubeClient)

		c.Next()
	}
}

// GetKarmadaClientFromContext retrieves the Karmada client from the Gin context.
func GetKarmadaClientFromContext(c *gin.Context) (karmadaclientset.Interface, error) {
	val, exists := c.Get(karmadaClientContextKey)
	if !exists {
		return nil, fmt.Errorf("karmada client not found in context")
	}
	kClient, ok := val.(karmadaclientset.Interface)
	if !ok {
		return nil, fmt.Errorf("karmada client type assertion failed")
	}
	return kClient, nil
}

// GetKubeClientFromContext retrieves the Kubernetes client for Karmada APIServer from the Gin context.
func GetKubeClientFromContext(c *gin.Context) (kubeclient.Interface, error) {
	val, exists := c.Get(kubeClientContextKey)
	if !exists {
		return nil, fmt.Errorf("kubernetes client not found in context")
	}
	kClient, ok := val.(kubeclient.Interface)
	if !ok {
		return nil, fmt.Errorf("kubernetes client type assertion failed")
	}
	return kClient, nil
}
