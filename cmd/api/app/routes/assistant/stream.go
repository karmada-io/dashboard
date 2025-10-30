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

package assistant

import (
	"errors"
	"io"

	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/pkg/llm"
	"github.com/karmada-io/dashboard/pkg/mcpclient"
)

// streamResponse streams the LLM response and accumulates tool calls
func streamResponse(c *gin.Context, resp *openai.ChatCompletionStream, toolCallBuffer map[int]*openai.ToolCall, enableMCP bool, mcpClient *mcpclient.MCPClient) error {
	for {
		// Check if context is cancelled
		select {
		case <-c.Request.Context().Done():
			klog.Infof("Client disconnected during streaming")
			return c.Request.Context().Err()
		default:
		}

		response, err := resp.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			klog.Errorf("Error receiving stream response: %v", err)
			return err
		}

		if len(response.Choices) > 0 {
			choice := response.Choices[0]

			// Handle regular content
			if choice.Delta.Content != "" {
				msg := ChatResponse{
					Type:    "content",
					Content: choice.Delta.Content,
				}
				if err := sendSSEEvent(c, msg); err != nil {
					return err
				}
			}

			// Handle tool calls - accumulate them
			if enableMCP && mcpClient != nil && choice.Delta.ToolCalls != nil {
				accumulateToolCalls(choice.Delta.ToolCalls, toolCallBuffer)
			}
		}
	}
	return nil
}

// makeFinalCall makes a final LLM call with tool results and streams the response
func makeFinalCall(c *gin.Context, client *openai.Client, messages []openai.ChatCompletionMessage, assistantMessage openai.ChatCompletionMessage, toolResponses []openai.ChatCompletionMessage) error {
	messages = append(messages, assistantMessage)
	messages = append(messages, toolResponses...)

	finalChatReq := openai.ChatCompletionRequest{
		Model:    llm.GetLLMModel(),
		Messages: messages,
		Stream:   true,
	}

	finalResp, err := client.CreateChatCompletionStream(c.Request.Context(), finalChatReq)
	if err != nil {
		klog.Errorf("Failed to create final chat completion stream: %v", err)
		sendErrorEvent(c, "Failed to generate response after tool execution")
		return err
	}
	defer finalResp.Close()

	for {
		// Check if context is cancelled
		select {
		case <-c.Request.Context().Done():
			klog.Infof("Client disconnected during final streaming")
			return c.Request.Context().Err()
		default:
		}

		response, err := finalResp.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			klog.Errorf("Error receiving final stream response: %v", err)
			return err
		}

		if len(response.Choices) > 0 && response.Choices[0].Delta.Content != "" {
			msg := ChatResponse{Type: "content", Content: response.Choices[0].Delta.Content}
			if err := sendSSEEvent(c, msg); err != nil {
				return err
			}
		}
	}

	return nil
}
