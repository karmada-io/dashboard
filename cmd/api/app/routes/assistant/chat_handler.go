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

package assistant

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
	"k8s.io/klog/v2"
)

// ChatRequest represents the request payload for chat endpoint
type ChatRequest struct {
	Message   string        `json:"message"`
	History   []ChatMessage `json:"history,omitempty"`
	EnableMCP bool          `json:"enableMcp,omitempty"`
}

// ChatMessage represents a message in the conversation
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResponse represents the response for chat endpoint
type ChatResponse struct {
	Type     string        `json:"type"`
	Content  interface{}   `json:"content"`
	ToolCall *ToolCallInfo `json:"toolCall,omitempty"`
}

// ToolCallInfo represents information about a tool call
type ToolCallInfo struct {
	ToolName string                 `json:"toolName"`
	Args     map[string]interface{} `json:"args"`
	Result   string                 `json:"result"`
}

// Global variables for error tracking
var (
	openAIErrorShown bool
	openAIErrorMutex sync.Mutex
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

	// Check if MCP is enabled via environment or request
	enableMCP := request.EnableMCP || os.Getenv("ENABLE_MCP") == "true"

	var mcpClient *MCPClient

	if enableMCP {
		var err error
		mcpClient, err = GetMCPClient()
		if err != nil {
			klog.Warningf("Failed to initialize MCP client: %v. Continuing without MCP.", err)
			enableMCP = false
		} else {
			klog.Infof("MCP client initialized successfully")
		}
	}

	// Prepare OpenAI client
	client, err := prepareOpenAIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Prepare messages
	messages := prepareMessages(request, enableMCP)

	// Set up SSE headers
	setupSSEHeaders(c.Writer)

	// Create chat completion request
	chatReq := openai.ChatCompletionRequest{
		Model:    getOpenAIModel(),
		Messages: messages,
		Stream:   true,
	}

	// Add functions/tools if MCP is enabled
	if enableMCP && mcpClient != nil {
		addMCPToolsToRequest(&chatReq, mcpClient)
	}

	// Handle chat completion
	handleChatCompletion(c, client, chatReq, enableMCP, mcpClient)
}

func addMCPToolsToRequest(chatReq *openai.ChatCompletionRequest, mcpClient *MCPClient) {
	tools := mcpClient.FormatToolsForOpenAI()
	if len(tools) > 0 {
		chatReq.Tools = tools
	}
}

func handleChatCompletion(c *gin.Context, client *openai.Client, chatReq openai.ChatCompletionRequest, enableMCP bool, mcpClient *MCPClient) {
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
	streamResponse(c, resp, toolCallBuffer, enableMCP, mcpClient)

	// Process completed tool calls
	if enableMCP && mcpClient != nil && len(toolCallBuffer) > 0 {
		processToolCalls(c, client, chatReq.Messages, toolCallBuffer, mcpClient)
	}

	// Send completion signal
	sendCompletionSignal(c)
}

func streamResponse(c *gin.Context, resp *openai.ChatCompletionStream, toolCallBuffer map[int]*openai.ToolCall, enableMCP bool, mcpClient *MCPClient) {
	for {
		response, err := resp.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			klog.Errorf("Error receiving stream response: %v", err)
			break
		}

		if len(response.Choices) > 0 {
			choice := response.Choices[0]

			// Handle regular content
			if choice.Delta.Content != "" {
				msg := ChatResponse{
					Type:    "content",
					Content: choice.Delta.Content,
				}
				if data, err := json.Marshal(msg); err == nil {
					fmt.Fprintf(c.Writer, "data: %s\n\n", data)
					c.Writer.Flush()
				}
			}

			// Handle tool calls - accumulate them
			if enableMCP && mcpClient != nil && choice.Delta.ToolCalls != nil {
				accumulateToolCalls(choice.Delta.ToolCalls, toolCallBuffer)
			}
		}
	}
}

func processToolCalls(c *gin.Context, client *openai.Client, messages []openai.ChatCompletionMessage, toolCallBuffer map[int]*openai.ToolCall, mcpClient *MCPClient) {
	// Send notification that tool processing is starting
	processingMsg := ChatResponse{Type: "tool_processing", Content: "Processing tool calls..."}
	if data, err := json.Marshal(processingMsg); err == nil {
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		c.Writer.Flush()
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
	if data, err := json.Marshal(completedMsg); err == nil {
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		c.Writer.Flush()
	}

	// Make a second call to OpenAI with the tool results
	if len(toolResponses) > 0 {
		makeFinalCall(c, client, messages, assistantMessage, toolResponses)
	}
}

func executeTool(toolCall *openai.ToolCall, mcpClient *MCPClient, c *gin.Context) openai.ChatCompletionMessage {
	toolName := strings.TrimPrefix(toolCall.Function.Name, "mcp_")
	var args map[string]interface{}
	if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &args); err != nil {
		klog.Errorf("Failed to parse tool arguments: %v, args: %s", err, toolCall.Function.Arguments)
		return openai.ChatCompletionMessage{}
	}

	// Send tool call start notification to the client
	toolStartInfo := ToolCallInfo{
		ToolName: toolName,
		Args:     args,
		Result:   "Executing...",
	}
	msg := ChatResponse{Type: "tool_call_start", ToolCall: &toolStartInfo}
	if data, err := json.Marshal(msg); err == nil {
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		c.Writer.Flush()
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
	if data, err := json.Marshal(msg); err == nil {
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		c.Writer.Flush()
	}

	// Return tool result for the next AI call
	return openai.ChatCompletionMessage{
		Role:       openai.ChatMessageRoleTool,
		Content:    result,
		Name:       toolCall.Function.Name,
		ToolCallID: toolCall.ID,
	}
}

func makeFinalCall(c *gin.Context, client *openai.Client, messages []openai.ChatCompletionMessage, assistantMessage openai.ChatCompletionMessage, toolResponses []openai.ChatCompletionMessage) {
	messages = append(messages, assistantMessage)
	messages = append(messages, toolResponses...)

	finalChatReq := openai.ChatCompletionRequest{
		Model:    getOpenAIModel(),
		Messages: messages,
		Stream:   true,
	}

	finalResp, err := client.CreateChatCompletionStream(c.Request.Context(), finalChatReq)
	if err != nil {
		klog.Errorf("Failed to create final chat completion stream: %v", err)
		return
	}
	defer finalResp.Close()

	for {
		response, err := finalResp.Recv()
		if err != nil {
			break // EOF or error
		}
		if len(response.Choices) > 0 && response.Choices[0].Delta.Content != "" {
			msg := ChatResponse{Type: "content", Content: response.Choices[0].Delta.Content}
			if data, err := json.Marshal(msg); err == nil {
				fmt.Fprintf(c.Writer, "data: %s\n\n", data)
				c.Writer.Flush()
			}
		}
	}
}

func sendCompletionSignal(c *gin.Context) {
	completionMsg := ChatResponse{
		Type:    "completion",
		Content: nil,
	}
	if data, err := json.Marshal(completionMsg); err == nil {
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		c.Writer.Flush()
	}
}

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

func prepareOpenAIClient() (*openai.Client, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		// Only log the error once
		openAIErrorMutex.Lock()
		if !openAIErrorShown {
			klog.Errorf("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.")
			openAIErrorShown = true
		}
		openAIErrorMutex.Unlock()
		return nil, errors.New("OpenAI API key not configured")
	}
	config := openai.DefaultConfig(apiKey)
	if endpoint := os.Getenv("OPENAI_ENDPOINT"); endpoint != "" {
		config.BaseURL = endpoint
	}
	return openai.NewClientWithConfig(config), nil
}

func setupSSEHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
}

// GetMCPToolsHandler returns available MCP tools
func GetMCPToolsHandler(c *gin.Context) {
	enableMCP := os.Getenv("ENABLE_MCP") == "true"
	if !enableMCP {
		c.JSON(http.StatusOK, gin.H{"tools": []interface{}{}, "enabled": false})
		return
	}

	mcpClient, err := GetMCPClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tools":   mcpClient.GetTools(),
		"enabled": true,
	})
}
