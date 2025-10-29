//go:build integration

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

// Integration tests for LLM package.
//
// These tests interact with actual LLM API endpoints and are disabled by default.
// To run these tests, you need to:
//
// 1. Set required environment variables:
//    export LLM_API_KEY=your-api-key-here
//
// 2. (Optional) Configure custom endpoint:
//    export LLM_ENDPOINT=https://api.openai.com/v1  # default value
//
// 3. (Optional) Configure custom model:
//    export LLM_MODEL=gpt-3.5-turbo  # default value
//
// 4. Run the integration tests:
//    go test -v -tags=integration -run '^TestLLMIntegration' ./pkg/llm
//
// Example:
//    export LLM_API_KEY=sk-xxx
//    go test -v -tags=integration ./pkg/llm

package llm

import (
	"context"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/sashabaranov/go-openai"
)

func TestLLMIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	resetGlobalState()

	apiKey := os.Getenv("LLM_API_KEY")
	endpoint := os.Getenv("LLM_ENDPOINT")
	model := os.Getenv("LLM_MODEL")

	if apiKey == "" {
		t.Fatalf("LLM_API_KEY environment variable must be set to run integration tests")
	}

	if endpoint == "" {
		endpoint = "https://api.openai.com/v1"
	}
	if model == "" {
		model = "gpt-3.5-turbo"
	}

	config := &Config{
		LLMAPIKey:   apiKey,
		LLMModel:    model,
		LLMEndpoint: endpoint,
		Timeout:     30 * time.Second,
	}

	InitLLMConfig(config)

	if !IsLLMConfigured() {
		t.Fatalf("LLM configuration check failed after initialization")
	}

	client, err := GetLLMClient()
	if err != nil {
		t.Fatalf("Failed to get LLM client: %v", err)
	}

	t.Run("BasicQuestion", func(t *testing.T) {
		t.Parallel()
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		req := openai.ChatCompletionRequest{
			Model: GetLLMModel(),
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: "What is Kubernetes? Answer in one sentence.",
				},
			},
			MaxTokens: 50,
		}

		resp, err := client.CreateChatCompletion(ctx, req)
		if err != nil {
			t.Fatalf("CreateChatCompletion failed: %v", err)
		}

		if len(resp.Choices) == 0 {
			t.Fatalf("Received no choices in response from LLM API")
		}

		answer := resp.Choices[0].Message.Content
		if !strings.Contains(strings.ToLower(answer), "kubernetes") &&
			!strings.Contains(strings.ToLower(answer), "container") {
			t.Errorf("Expected answer to contain 'kubernetes' or 'container', but got: %s", answer)
		}
	})

	t.Run("KarmadaConcept", func(t *testing.T) {
		t.Parallel()
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		req := openai.ChatCompletionRequest{
			Model: GetLLMModel(),
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: "What is Karmada and how does it help with multi-cluster management? Answer briefly.",
				},
			},
			MaxTokens: 100,
		}

		resp, err := client.CreateChatCompletion(ctx, req)
		if err != nil {
			t.Fatalf("CreateChatCompletion for Karmada question failed: %v", err)
		}

		if len(resp.Choices) == 0 {
			t.Fatalf("Received no choices for Karmada question from LLM API")
		}

		answer := resp.Choices[0].Message.Content
		lowerAnswer := strings.ToLower(answer)
		if !strings.Contains(lowerAnswer, "karmada") &&
			!strings.Contains(lowerAnswer, "multi-cluster") &&
			!strings.Contains(lowerAnswer, "cluster") {
			t.Errorf("Expected answer to contain 'karmada' or 'multi-cluster', but got: %s", answer)
		}
	})

	t.Run("StreamingResponse", func(t *testing.T) {
		t.Parallel()
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		req := openai.ChatCompletionRequest{
			Model: GetLLMModel(),
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: "List 3 benefits of using Karmada for multi-cluster management.",
				},
			},
			MaxTokens: 150,
			Stream:    true,
		}

		stream, err := client.CreateChatCompletionStream(ctx, req)
		if err != nil {
			t.Fatalf("Failed to create chat completion stream: %v", err)
		}
		defer stream.Close()

		fullResponse := ""
		chunkCount := 0
		for {
			response, err := stream.Recv()
			if errors.Is(err, io.EOF) || errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				break
			}
			if err != nil {
				t.Fatalf("Failed while receiving stream response: %v", err)
			}

			if len(response.Choices) > 0 {
				chunk := response.Choices[0].Delta.Content
				fullResponse += chunk
				if chunk != "" {
					chunkCount++
				}
				// Key change: break on finish_reason
				if response.Choices[0].FinishReason == "stop" {
					break
				}
			}
		}

		if chunkCount < 3 || len(fullResponse) < 50 {
			t.Errorf("Streaming response seems abnormal: received %d chunks and %d characters", chunkCount, len(fullResponse))
		}
	})
}
