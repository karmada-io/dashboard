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

package mcpclient

import (
	"testing"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
)

func TestMCPClient_GetTools(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		serverInfo: &mcp.InitializeResult{
			Capabilities: mcp.ServerCapabilities{
				Tools: &struct {
					ListChanged bool `json:"listChanged,omitempty"`
				}{},
			},
		},
		availableTools: []mcp.Tool{
			{
				Name:        "test-tool-1",
				Description: "Test tool 1",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"param1": map[string]interface{}{"type": "string"},
					},
				},
			},
			{
				Name:        "test-tool-2",
				Description: "Test tool 2",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"param2": map[string]interface{}{"type": "number"},
					},
				},
			},
		},
	}

	tools := client.GetTools()

	if len(tools) != 2 {
		t.Errorf("GetTools() returned %d tools, want 2", len(tools))
	}

	if tools[0].Name != "test-tool-1" {
		t.Errorf("First tool name = %v, want %v", tools[0].Name, "test-tool-1")
	}

	if tools[1].Name != "test-tool-2" {
		t.Errorf("Second tool name = %v, want %v", tools[1].Name, "test-tool-2")
	}
}

func TestMCPClient_GetTools_NoServerSupport(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		serverInfo: &mcp.InitializeResult{
			Capabilities: mcp.ServerCapabilities{}, // No tools capability
		},
	}

	tools := client.GetTools()

	if len(tools) != 0 {
		t.Errorf("GetTools() returned %d tools for server without tool support, want 0", len(tools))
	}
}

func TestMCPClient_GetTools_ClosedClient(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		closed: true,
	}

	tools := client.GetTools()

	if tools != nil {
		t.Errorf("GetTools() returned %v for closed client, want nil", tools)
	}
}

func TestMCPClient_HasToolsSupport(t *testing.T) {
	tests := []struct {
		name     string
		client   *MCPClient
		expected bool
	}{
		{
			name: "server with tools support",
			client: &MCPClient{
				serverInfo: &mcp.InitializeResult{
					Capabilities: mcp.ServerCapabilities{
						Tools: &struct {
							ListChanged bool `json:"listChanged,omitempty"`
						}{},
					},
				},
			},
			expected: true,
		},
		{
			name: "server without tools support",
			client: &MCPClient{
				serverInfo: &mcp.InitializeResult{
					Capabilities: mcp.ServerCapabilities{},
				},
			},
			expected: false,
		},
		{
			name:     "no server info",
			client:   &MCPClient{},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.client.HasToolsSupport()
			if result != tt.expected {
				t.Errorf("HasToolsSupport() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestMCPClient_CallTool_ClosedClient(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		closed: true,
	}

	_, err := client.CallTool("test-tool", map[string]interface{}{})

	if err == nil {
		t.Errorf("CallTool() expected error for closed client, got nil")
	}

	if err.Error() != "MCP client is closed" {
		t.Errorf("CallTool() error = %v, want %v", err.Error(), "MCP client is closed")
	}
}

func TestMCPClient_ListResources(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		serverInfo: &mcp.InitializeResult{
			Capabilities: mcp.ServerCapabilities{
				Resources: &struct {
					Subscribe   bool `json:"subscribe,omitempty"`
					ListChanged bool `json:"listChanged,omitempty"`
				}{},
			},
		},
		availableResources: []mcp.Resource{
			{
				URI:         "test://resource1",
				Name:        "Test Resource 1",
				Description: "First test resource",
			},
			{
				URI:         "test://resource2",
				Name:        "Test Resource 2",
				Description: "Second test resource",
			},
		},
	}

	// Test GetResources (cached resources)
	resources := client.GetResources()

	if len(resources) != 2 {
		t.Errorf("GetResources() returned %d resources, want 2", len(resources))
	}

	if resources[0].URI != "test://resource1" {
		t.Errorf("First resource URI = %v, want %v", resources[0].URI, "test://resource1")
	}

	if resources[1].URI != "test://resource2" {
		t.Errorf("Second resource URI = %v, want %v", resources[1].URI, "test://resource2")
	}
}

func TestMCPClient_ListResources_ClosedClient(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		closed: true,
	}

	_, err := client.ListResources()

	if err == nil {
		t.Errorf("ListResources() expected error for closed client, got nil")
	}

	if err.Error() != "MCP client is closed" {
		t.Errorf("ListResources() error = %v, want %v", err.Error(), "MCP client is closed")
	}
}

func TestMCPClient_ListResources_NoServerSupport(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		serverInfo: &mcp.InitializeResult{
			Capabilities: mcp.ServerCapabilities{}, // No resources capability
		},
	}

	_, err := client.ListResources()

	if err == nil {
		t.Errorf("ListResources() expected error for server without resource support, got nil")
	}

	if err.Error() != "server does not support resources" {
		t.Errorf("ListResources() error = %v, want %v", err.Error(), "server does not support resources")
	}
}

func TestMCPClient_GetResources_ClosedClient(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		closed: true,
	}

	resources := client.GetResources()

	if resources != nil {
		t.Errorf("GetResources() returned %v for closed client, want nil", resources)
	}
}

func TestMCPClient_FormatToolsForOpenAI(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		availableTools: []mcp.Tool{
			{
				Name:        "test-tool",
				Description: "A test tool",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"param1": map[string]interface{}{"type": "string"},
					},
				},
			},
		},
	}

	tools := client.FormatToolsForOpenAI()

	if len(tools) != 1 {
		t.Errorf("FormatToolsForOpenAI() returned %d tools, want 1", len(tools))
	}

	if tools[0].Type != "function" {
		t.Errorf("Tool type = %v, want %v", tools[0].Type, "function")
	}

	if tools[0].Function.Name != "mcp_test-tool" {
		t.Errorf("Function name = %v, want %v", tools[0].Function.Name, "mcp_test-tool")
	}

	if tools[0].Function.Description != "A test tool" {
		t.Errorf("Function description = %v, want %v", tools[0].Function.Description, "A test tool")
	}
}

func TestMCPClient_FormatToolsForOpenAI_ClosedClient(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		closed: true,
	}

	tools := client.FormatToolsForOpenAI()

	if tools != nil {
		t.Errorf("FormatToolsForOpenAI() returned %v for closed client, want nil", tools)
	}
}

func TestMCPClient_ResetToolsState(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		availableTools: []mcp.Tool{
			{
				Name: "test-tool",
			},
		},
	}

	client.ResetToolsState()

	if client.availableTools != nil {
		t.Errorf("ResetToolsState() did not reset availableTools to nil")
	}
}

func TestMCPClient_Close(t *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		closed: false,
	}

	// First close should work
	client.Close()

	if !client.closed {
		t.Errorf("Close() did not set closed flag")
	}

	// Second close should be safe (no-op)
	client.Close() // Should not panic or cause issues
}

func TestMCPClient_Close_AlreadyClosed(_ *testing.T) {
	client := &MCPClient{
		config: DefaultMCPConfig(),
		closed: true,
	}

	// Should be safe to call Close on already closed client
	client.Close() // Should not panic or cause issues
}

func TestMCPClient_Initialize(t *testing.T) {
	tests := []struct {
		name    string
		config  *MCPConfig
		wantErr bool
	}{
		{
			name: "valid stdio config",
			config: &MCPConfig{
				TransportMode:  TransportModeStdio,
				ServerPath:     "/usr/bin/mcp-server",
				ConnectTimeout: 30 * time.Second,
				RequestTimeout: 60 * time.Second,
			},
			wantErr: true, // Will fail because we can't actually start the server
		},
		{
			name: "invalid transport mode",
			config: &MCPConfig{
				TransportMode: TransportMode("invalid"),
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := &MCPClient{config: tt.config}
			err := client.initialize()
			if (err != nil) != tt.wantErr {
				t.Errorf("initialize() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
