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
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/sashabaranov/go-openai"
)

func resetGlobalState() {
	llmMutex.Lock()
	defer llmMutex.Unlock()
	globalLLMConfig = nil
	globalLLMClient = nil
	llmInitialized = false
}

func TestInitLLMConfig(t *testing.T) {
	resetGlobalState()

	config := &Config{
		LLMAPIKey:   "test-key",
		LLMModel:    "gpt-4",
		LLMEndpoint: "https://test.endpoint.com/v1",
		Timeout:     60 * time.Second,
	}

	InitLLMConfig(config)

	if !llmInitialized {
		t.Error("Expected llmInitialized to be true after InitLLMConfig")
	}

	if globalLLMConfig != config {
		t.Error("Expected globalLLMConfig to be set to the provided config")
	}

	if globalLLMClient != nil {
		t.Error("Expected globalLLMClient to be reset to nil")
	}
}

func TestGetLLMClientNotInitialized(t *testing.T) {
	resetGlobalState()

	_, err := GetLLMClient()
	if err == nil {
		t.Error("Expected error when LLM not initialized")
	}

	// Check if error contains the sentinel error
	if !errors.Is(err, ErrLLMNotInitialized) {
		t.Errorf("Expected error to be ErrLLMNotInitialized, got %v", err)
	}
}

func TestGetLLMClientNoAPIKey(t *testing.T) {
	resetGlobalState()

	config := &Config{
		LLMAPIKey:   "",
		LLMModel:    "gpt-4",
		LLMEndpoint: "https://test.endpoint.com/v1",
		Timeout:     60 * time.Second,
	}

	InitLLMConfig(config)

	_, err := GetLLMClient()
	if err == nil {
		t.Error("Expected error when API key is empty")
	}

	// Check if error contains the sentinel error
	if !errors.Is(err, ErrLLMAPIKeyNotConfigured) {
		t.Errorf("Expected error to be ErrLLMAPIKeyNotConfigured, got %v", err)
	}
}

func TestGetLLMClientSuccess(t *testing.T) {
	resetGlobalState()

	config := &Config{
		LLMAPIKey:   "test-api-key",
		LLMModel:    "gpt-4",
		LLMEndpoint: "https://test.endpoint.com/v1",
		Timeout:     60 * time.Second,
	}

	InitLLMConfig(config)

	client, err := GetLLMClient()
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if client == nil {
		t.Error("Expected client to be non-nil")
	}

	client2, err := GetLLMClient()
	if err != nil {
		t.Errorf("Expected no error on second call, got %v", err)
	}

	if client != client2 {
		t.Error("Expected same client instance (singleton pattern)")
	}
}

func TestGetLLMClientDefaultEndpoint(t *testing.T) {
	resetGlobalState()

	config := &Config{
		LLMAPIKey:   "test-api-key",
		LLMModel:    "gpt-4",
		LLMEndpoint: "",
		Timeout:     60 * time.Second,
	}

	InitLLMConfig(config)

	client, err := GetLLMClient()
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if client == nil {
		t.Error("Expected client to be non-nil")
	}
}

func TestGetLLMModel(t *testing.T) {
	resetGlobalState()

	model := GetLLMModel()
	if model != openai.GPT3Dot5Turbo {
		t.Errorf("Expected default model %s when not initialized, got %s", openai.GPT3Dot5Turbo, model)
	}

	config := &Config{
		LLMAPIKey:   "test-api-key",
		LLMModel:    "gpt-4",
		LLMEndpoint: "https://test.endpoint.com/v1",
		Timeout:     60 * time.Second,
	}

	InitLLMConfig(config)

	model = GetLLMModel()
	if model != "gpt-4" {
		t.Errorf("Expected model gpt-4, got %s", model)
	}

	config.LLMModel = ""
	InitLLMConfig(config)

	model = GetLLMModel()
	if model != openai.GPT3Dot5Turbo {
		t.Errorf("Expected default model %s when empty, got %s", openai.GPT3Dot5Turbo, model)
	}
}

func TestIsLLMConfigured(t *testing.T) {
	resetGlobalState()

	if IsLLMConfigured() {
		t.Error("Expected IsLLMConfigured to return false when not initialized")
	}

	config := &Config{
		LLMAPIKey:   "",
		LLMModel:    "gpt-4",
		LLMEndpoint: "https://test.endpoint.com/v1",
		Timeout:     60 * time.Second,
	}

	InitLLMConfig(config)

	if IsLLMConfigured() {
		t.Error("Expected IsLLMConfigured to return false when API key is empty")
	}

	config.LLMAPIKey = "test-api-key"
	InitLLMConfig(config)

	if !IsLLMConfigured() {
		t.Error("Expected IsLLMConfigured to return true when properly configured")
	}
}

func TestConcurrentAccess(t *testing.T) {
	resetGlobalState()

	config := &Config{
		LLMAPIKey:   "test-api-key",
		LLMModel:    "gpt-4",
		LLMEndpoint: "https://test.endpoint.com/v1",
		Timeout:     60 * time.Second,
	}

	InitLLMConfig(config)

	var wg sync.WaitGroup
	clientChan := make(chan *openai.Client, 10)

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			client, err := GetLLMClient()
			if err != nil {
				t.Errorf("Unexpected error in goroutine: %v", err)
				return
			}
			clientChan <- client
		}()
	}

	wg.Wait()
	close(clientChan)

	var firstClient *openai.Client
	count := 0
	for client := range clientChan {
		count++
		if firstClient == nil {
			firstClient = client
		} else if client != firstClient {
			t.Error("Expected all goroutines to get the same client instance")
		}
	}

	if count != 10 {
		t.Errorf("Expected 10 client instances, got %d", count)
	}
}

func TestLLMWithMockServer(t *testing.T) {
	resetGlobalState()

	mockResponse := `{
		"id": "chatcmpl-test",
		"object": "chat.completion",
		"created": 1677652288,
		"model": "gpt-3.5-turbo",
		"choices": [{
			"index": 0,
			"message": {
				"role": "assistant",
				"content": "Hello from mock server!"
			},
			"finish_reason": "stop"
		}],
		"usage": {
			"prompt_tokens": 9,
			"completion_tokens": 5,
			"total_tokens": 14
		}
	}`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("Expected path /chat/completions, got %s", r.URL.Path)
		}

		if r.Method != "POST" {
			t.Errorf("Expected POST method, got %s", r.Method)
		}

		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			t.Errorf("Expected Authorization header with Bearer token, got %s", authHeader)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, mockResponse)
	}))
	defer server.Close()

	config := &Config{
		LLMAPIKey:   "test-api-key",
		LLMModel:    "gpt-3.5-turbo",
		LLMEndpoint: server.URL,
		Timeout:     30 * time.Second,
	}

	InitLLMConfig(config)

	client, err := GetLLMClient()
	if err != nil {
		t.Fatalf("Failed to get LLM client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req := openai.ChatCompletionRequest{
		Model: "gpt-3.5-turbo",
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleUser,
				Content: "Test message",
			},
		},
		MaxTokens: 50,
	}

	resp, err := client.CreateChatCompletion(ctx, req)
	if err != nil {
		t.Fatalf("Failed to create chat completion: %v", err)
	}

	if len(resp.Choices) == 0 {
		t.Fatal("Expected at least one choice in response")
	}

	expectedContent := "Hello from mock server!"
	actualContent := resp.Choices[0].Message.Content
	if actualContent != expectedContent {
		t.Errorf("Expected content '%s', got '%s'", expectedContent, actualContent)
	}

	t.Logf("Mock server test passed. Response: %s", actualContent)
}

func TestValidateLLMConnection(t *testing.T) {
	resetGlobalState()

	// Mock server that responds to models list request
	mockModelsResponse := `{
		"data": [
			{"id": "gpt-3.5-turbo", "object": "model"},
			{"id": "gpt-4", "object": "model"}
		]
	}`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/models" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, mockModelsResponse)
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	config := &Config{
		LLMAPIKey:   "test-api-key",
		LLMModel:    "gpt-3.5-turbo",
		LLMEndpoint: server.URL,
		Timeout:     5 * time.Second,
	}

	InitLLMConfig(config)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := ValidateLLMConnection(ctx)
	if err != nil {
		t.Fatalf("Expected successful connection validation, got error: %v", err)
	}
}

func TestValidateLLMConnectionFailure(t *testing.T) {
	resetGlobalState()

	// Mock server that returns error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprint(w, `{"error": "invalid API key"}`)
	}))
	defer server.Close()

	config := &Config{
		LLMAPIKey:   "invalid-key",
		LLMModel:    "gpt-3.5-turbo",
		LLMEndpoint: server.URL,
		Timeout:     5 * time.Second,
	}

	InitLLMConfig(config)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := ValidateLLMConnection(ctx)
	if err == nil {
		t.Fatal("Expected connection validation to fail")
	}

	if !errors.Is(err, ErrConnectionFailed) {
		t.Errorf("Expected error to be ErrConnectionFailed, got %v", err)
	}
}
