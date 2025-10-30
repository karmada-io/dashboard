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
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/pkg/mcpclient"
)

// executeTool executes a single tool call and returns the result message
func executeTool(toolCall *openai.ToolCall, mcpClient *mcpclient.MCPClient, c *gin.Context) openai.ChatCompletionMessage {
	toolName := strings.TrimPrefix(toolCall.Function.Name, "mcp_")
	var args map[string]interface{}
	if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &args); err != nil {
		klog.Errorf("Failed to parse tool arguments: %v, args: %s", err, toolCall.Function.Arguments)

		// Return error message to LLM so it can handle the error
		errorMsg := fmt.Sprintf("Error parsing tool arguments: %v", err)
		return openai.ChatCompletionMessage{
			Role:       openai.ChatMessageRoleTool,
			Content:    errorMsg,
			Name:       toolCall.Function.Name,
			ToolCallID: toolCall.ID,
		}
	}

	// Send tool call start notification to the client
	toolStartInfo := ToolCallInfo{
		ToolName: toolName,
		Args:     args,
		Result:   "Executing...",
	}
	msg := ChatResponse{Type: "tool_call_start", ToolCall: &toolStartInfo}
	if err := sendSSEEvent(c, msg); err != nil {
		klog.Errorf("Failed to send tool call start event: %v", err)
	}

	result, err := mcpClient.CallTool(toolName, args)
	if err != nil {
		klog.Errorf("Failed to execute tool %s: %v", toolName, err)
		result = fmt.Sprintf("Error executing tool %s: %v", toolName, err)
	}

	// Send tool call completion info to the client for visibility
	toolInfo := ToolCallInfo{
		ToolName: toolName,
		Args:     args,
		Result:   result,
	}
	msg = ChatResponse{Type: "tool_call", ToolCall: &toolInfo}
	if err := sendSSEEvent(c, msg); err != nil {
		klog.Errorf("Failed to send tool call completion event: %v", err)
	}

	// Return tool result for the next AI call
	return openai.ChatCompletionMessage{
		Role:       openai.ChatMessageRoleTool,
		Content:    result,
		Name:       toolCall.Function.Name,
		ToolCallID: toolCall.ID,
	}
}

// accumulateToolCalls accumulates streamed tool call chunks into the buffer
func accumulateToolCalls(toolCalls []openai.ToolCall, toolCallBuffer map[int]*openai.ToolCall) {
	for _, toolCall := range toolCalls {
		if toolCall.Index == nil {
			continue
		}
		index := *toolCall.Index
		if toolCallBuffer[index] == nil {
			toolCallBuffer[index] = &openai.ToolCall{Index: &index}
		}
		if toolCall.ID != "" {
			toolCallBuffer[index].ID = toolCall.ID
		}
		if toolCall.Type != "" {
			toolCallBuffer[index].Type = toolCall.Type
		}
		if toolCall.Function.Name != "" {
			toolCallBuffer[index].Function.Name = toolCall.Function.Name
		}
		if toolCall.Function.Arguments != "" {
			toolCallBuffer[index].Function.Arguments += toolCall.Function.Arguments
		}
	}
}

// processToolCalls executes all accumulated tool calls and makes a final LLM call with results
func processToolCalls(c *gin.Context, client *openai.Client, messages []openai.ChatCompletionMessage, toolCallBuffer map[int]*openai.ToolCall, mcpClient *mcpclient.MCPClient) error {
	// Send notification that tool processing is starting
	processingMsg := ChatResponse{Type: "tool_processing", Content: "Processing tool calls..."}
	if err := sendSSEEvent(c, processingMsg); err != nil {
		return fmt.Errorf("failed to send tool processing notification: %w", err)
	}

	// Append the assistant's response (tool calls) to the message history
	assistantMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleAssistant,
		Content: "",
	}
	for _, toolCall := range toolCallBuffer {
		assistantMessage.ToolCalls = append(assistantMessage.ToolCalls, *toolCall)
	}

	// Execute tools and gather results
	var toolResponses []openai.ChatCompletionMessage
	for _, toolCall := range toolCallBuffer {
		if toolCall.Function.Name != "" && toolCall.Function.Arguments != "" {
			toolResponse := executeTool(toolCall, mcpClient, c)
			if toolResponse.Role != "" { // Only add valid responses
				toolResponses = append(toolResponses, toolResponse)
			}
		}
	}

	// Send notification that tool processing is complete
	completedMsg := ChatResponse{Type: "tool_processing_complete", Content: "Tool processing complete, generating response..."}
	if err := sendSSEEvent(c, completedMsg); err != nil {
		return fmt.Errorf("failed to send tool processing complete notification: %w", err)
	}

	// Make a second call to OpenAI with the tool results
	if len(toolResponses) > 0 {
		if err := makeFinalCall(c, client, messages, assistantMessage, toolResponses); err != nil {
			return fmt.Errorf("failed to make final call: %w", err)
		}
	}

	return nil
}
