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
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/pkg/llm"
	"github.com/karmada-io/dashboard/pkg/mcpclient"
)

// ChatHandler handles chat requests with MCP integration
func ChatHandler(c *gin.Context) {
	var request ChatRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		klog.Errorf("Failed to bind request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userMessage := strings.TrimSpace(request.Message)
	if userMessage == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message cannot be empty"})
		return
	}

	// Get LLM client (global singleton)
	llmClient, err := llm.GetLLMClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "LLM not configured"})
		return
	}

	// Get MCP client from context (factory-created instance)
	var mcpClient *mcpclient.MCPClient
	enableMCP := request.EnableMCP

	if enableMCP {
		if mcpVal, exists := c.Get("mcpClient"); exists {
			if mcp, ok := mcpVal.(*mcpclient.MCPClient); ok {
				mcpClient = mcp
				klog.Infof("MCP client obtained from context")
			} else {
				klog.Warningf("MCP client in context has wrong type")
				enableMCP = false
			}
		} else {
			klog.Warningf("MCP requested but not available in context")
			enableMCP = false
		}
	}

	// Prepare messages
	messages := prepareMessages(request, enableMCP)

	// Set up SSE headers
	setupSSEHeaders(c.Writer)

	// Create chat completion request
	chatReq := openai.ChatCompletionRequest{
		Model:    llm.GetLLMModel(),
		Messages: messages,
		Stream:   true,
	}

	// Add functions/tools if MCP is enabled
	if enableMCP && mcpClient != nil {
		addMCPToolsToRequest(&chatReq, mcpClient)
	}

	// Handle chat completion
	handleChatCompletion(c, llmClient, chatReq, enableMCP, mcpClient)
}

// addMCPToolsToRequest adds MCP tools to the chat completion request
func addMCPToolsToRequest(chatReq *openai.ChatCompletionRequest, mcpClient *mcpclient.MCPClient) {
	tools := mcpClient.FormatToolsForOpenAI()
	if len(tools) > 0 {
		chatReq.Tools = tools
	}
}

// handleChatCompletion handles the chat completion stream with error handling
func handleChatCompletion(c *gin.Context, client *openai.Client, chatReq openai.ChatCompletionRequest, enableMCP bool, mcpClient *mcpclient.MCPClient) {
	resp, err := client.CreateChatCompletionStream(c.Request.Context(), chatReq)
	if err != nil {
		klog.Errorf("Failed to create chat completion stream: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get response from LLM"})
		return
	}
	defer resp.Close()

	// Track tool calls for accumulation
	toolCallBuffer := make(map[int]*openai.ToolCall)

	// Stream the response
	if err := streamResponse(c, resp, toolCallBuffer, enableMCP, mcpClient); err != nil {
		klog.Errorf("Error during streaming: %v", err)
		sendErrorEvent(c, "An error occurred while streaming the response")
		return
	}

	// Process completed tool calls
	if enableMCP && mcpClient != nil && len(toolCallBuffer) > 0 {
		if err := processToolCalls(c, client, chatReq.Messages, toolCallBuffer, mcpClient); err != nil {
			klog.Errorf("Error processing tool calls: %v", err)
			sendErrorEvent(c, "An error occurred while processing tool calls")
			return
		}
	}

	// Send completion signal
	sendCompletionSignal(c)
}

// prepareMessages prepares the message array for the LLM request
func prepareMessages(request ChatRequest, enableMCP bool) []openai.ChatCompletionMessage {
	var messages []openai.ChatCompletionMessage

	// System message
	systemContent := `You are a helpful assistant for Karmada cluster management.

You can provide guidance about Karmada concepts, best practices, and configuration help.
You can help with topics like:
- Cluster management and federation
- Resource propagation policies
- Scheduling and placement
- Multi-cluster applications
- Karmada installation and configuration

Please provide clear and practical advice based on your knowledge of Karmada and Kubernetes.`

	if enableMCP {
		systemContent += `

You have access to Karmada cluster management tools through function calls. When users ask about cluster resources, deployments, namespaces, or other Karmada objects, use the available tools to retrieve real-time information from the cluster.

IMPORTANT: Use the function calling mechanism provided by the system. Do NOT output raw XML tags or tool syntax in your responses. Simply call the appropriate functions when needed, and then provide a natural language summary of the results to the user.

Available tools will be provided automatically. Use them when relevant to give accurate, up-to-date information about the Karmada cluster.`
	}

	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleSystem,
		Content: systemContent,
	})

	// Add conversation history
	for _, msg := range request.History {
		// skip empty content messages
		if strings.TrimSpace(msg.Content) == "" {
			continue
		}

		role := openai.ChatMessageRoleUser
		if msg.Role == "assistant" {
			role = openai.ChatMessageRoleAssistant
		}
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    role,
			Content: strings.TrimSpace(msg.Content),
		})
	}

	// Add current user message
	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: request.Message,
	})

	return messages
}

// GetMCPToolsHandler returns available MCP tools
func GetMCPToolsHandler(c *gin.Context) {
	// Get MCP client from context
	mcpVal, exists := c.Get("mcpClient")
	if !exists {
		c.JSON(http.StatusOK, gin.H{"tools": []interface{}{}, "enabled": false})
		return
	}

	mcpClient, ok := mcpVal.(*mcpclient.MCPClient)
	if !ok {
		c.JSON(http.StatusOK, gin.H{"tools": []interface{}{}, "enabled": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tools":   mcpClient.GetTools(),
		"enabled": true,
	})
}
