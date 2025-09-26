/*
Copyright 2025 The Karmada Authors.

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

package llm

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/sashabaranov/go-openai"
	"k8s.io/klog/v2"
)

var (
	globalLLMConfig *Config
	globalLLMClient *openai.Client
	llmInitialized  bool
	llmMutex        sync.RWMutex
)

// InitLLMConfig initializes LLM configuration from Config.
func InitLLMConfig(config *Config) {
	llmMutex.Lock()
	defer llmMutex.Unlock()

	globalLLMConfig = config
	globalLLMClient = nil // Reset client to force recreation
	llmInitialized = true

	klog.InfoS("LLM configuration initialized",
		"hasAPIKey", config.LLMAPIKey != "",
		"model", config.LLMModel,
		"endpoint", config.LLMEndpoint,
		"timeout", config.Timeout)
}

// GetLLMClient returns a configured LLM client (singleton).
// Note: This assumes the configured endpoint supports OpenAI API format.
// For incompatible providers, consider using their native SDKs directly.
func GetLLMClient() (*openai.Client, error) {
	llmMutex.Lock()
	defer llmMutex.Unlock()

	// Return existing client if already created (singleton)
	if globalLLMClient != nil {
		return globalLLMClient, nil
	}

	if !llmInitialized || globalLLMConfig == nil {
		return nil, fmt.Errorf("%w: call InitLLMConfig first", ErrLLMNotInitialized)
	}

	// Validate configuration before creating client
	if err := globalLLMConfig.Validate(); err != nil {
		return nil, fmt.Errorf("invalid LLM configuration: %w", err)
	}

	// Create new client
	config := openai.DefaultConfig(globalLLMConfig.LLMAPIKey)
	if globalLLMConfig.LLMEndpoint != "" {
		config.BaseURL = globalLLMConfig.LLMEndpoint
	}

	// Configure HTTP client with timeout
	config.HTTPClient = &http.Client{
		Timeout: globalLLMConfig.Timeout,
	}

	globalLLMClient = openai.NewClientWithConfig(config)

	klog.InfoS("LLM client created successfully",
		"endpoint", config.BaseURL,
		"model", globalLLMConfig.LLMModel,
		"timeout", globalLLMConfig.Timeout)

	return globalLLMClient, nil
}

// GetLLMModel returns the configured LLM model.
func GetLLMModel() string {
	llmMutex.RLock()
	defer llmMutex.RUnlock()

	if !llmInitialized || globalLLMConfig == nil || globalLLMConfig.LLMModel == "" {
		return openai.GPT3Dot5Turbo // default value
	}
	return globalLLMConfig.LLMModel
}

// IsLLMConfigured returns true if LLM is properly configured.
func IsLLMConfigured() bool {
	llmMutex.RLock()
	defer llmMutex.RUnlock()

	return llmInitialized && globalLLMConfig != nil && globalLLMConfig.LLMAPIKey != ""
}

// ValidateLLMConnection performs a health check to validate the LLM connection.
// This function sends a simple API request to verify that the endpoint is reachable
// and compatible with the OpenAI API format.
func ValidateLLMConnection(ctx context.Context) error {
	client, err := GetLLMClient()
	if err != nil {
		return fmt.Errorf("%w: %v", ErrConnectionFailed, err)
	}

	// Create a context with timeout if none provided
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
	}

	// Send a simple models list request to validate connection
	// This is a lightweight operation that verifies API compatibility
	_, err = client.ListModels(ctx)
	if err != nil {
		klog.ErrorS(err, "LLM connection validation failed",
			"endpoint", globalLLMConfig.LLMEndpoint)
		return fmt.Errorf("%w: unable to communicate with LLM endpoint: %v",
			ErrConnectionFailed, err)
	}

	klog.InfoS("LLM connection validated successfully",
		"endpoint", globalLLMConfig.LLMEndpoint)
	return nil
}
