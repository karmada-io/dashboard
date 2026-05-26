/*
Copyright 2026 The Karmada Authors.

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

package auth

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"k8s.io/klog/v2"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	oidcpkg "github.com/karmada-io/dashboard/pkg/oidc"
)

var oidcProvider *oidcpkg.Provider

// InitOIDCProvider initializes the OIDC provider
func InitOIDCProvider(ctx context.Context, cfg *oidcpkg.Config) error {
	provider, err := oidcpkg.NewProvider(ctx, cfg)
	if err != nil {
		return err
	}
	oidcProvider = provider
	klog.InfoS("OIDC provider initialized successfully", "issuer", cfg.IssuerURL)
	return nil
}

// handleOIDCLogin initiates the OIDC login flow
func handleOIDCLogin(c *gin.Context) {
	if oidcProvider == nil {
		klog.Warning("OIDC login requested but OIDC is not configured")
		c.JSON(http.StatusNotImplemented, gin.H{
			"code":    http.StatusNotImplemented,
			"message": "OIDC authentication is not configured on this server",
		})
		return
	}

	authURL, state, err := oidcProvider.GenerateAuthURL()
	if err != nil {
		klog.ErrorS(err, "Failed to generate OIDC auth URL")
		common.Fail(c, err)
		return
	}

	response := &v1.OIDCLoginResponse{
		AuthURL: authURL,
		State:   state,
	}

	common.Success(c, response)
}

// handleOIDCEnabled returns whether OIDC is enabled on this server.
func handleOIDCEnabled(c *gin.Context) {
	response := &v1.OIDCEnabledResponse{
		Enabled: oidcProvider != nil,
	}
	common.Success(c, response)
}

// handleOIDCCallback handles the OIDC callback
func handleOIDCCallback(c *gin.Context) {
	if oidcProvider == nil {
		klog.Warning("OIDC callback received but OIDC is not configured")
		c.JSON(http.StatusNotImplemented, gin.H{
			"code":    http.StatusNotImplemented,
			"message": "OIDC authentication is not configured on this server",
		})
		return
	}

	var req v1.OIDCCallbackRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		klog.ErrorS(err, "Failed to bind OIDC callback request")
		common.Fail(c, err)
		return
	}

	// Validate state parameter
	if err := oidcProvider.ValidateState(req.State); err != nil {
		klog.ErrorS(err, "Invalid state parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    http.StatusBadRequest,
			"message": "Invalid or expired state parameter",
		})
		return
	}

	// Exchange authorization code for tokens
	ctx := c.Request.Context()
	token, err := oidcProvider.ExchangeToken(ctx, req.Code)
	if err != nil {
		klog.ErrorS(err, "Failed to exchange authorization code")
		common.Fail(c, err)
		return
	}

	// Extract ID token
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		klog.Error("No id_token in token response")
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    http.StatusInternalServerError,
			"message": "No id_token in token response",
		})
		return
	}

	// Verify ID token
	_, err = oidcProvider.VerifyIDToken(ctx, rawIDToken)
	if err != nil {
		klog.ErrorS(err, "Failed to verify ID token")
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    http.StatusUnauthorized,
			"message": "Failed to verify ID token",
		})
		return
	}

	// Return the ID token to the client
	response := &v1.OIDCCallbackResponse{
		Token: rawIDToken,
	}

	common.Success(c, response)
}
