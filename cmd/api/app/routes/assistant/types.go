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
