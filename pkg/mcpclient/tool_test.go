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

	"github.com/mark3labs/mcp-go/mcp"
)

func TestFromStandardTool(t *testing.T) {
	tests := []struct {
		name     string
		tool     mcp.Tool
		expected MCPTool
	}{
		{
			name: "basic tool conversion",
			tool: mcp.Tool{
				Name:        "test-tool",
				Description: "A test tool",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"param1": map[string]interface{}{"type": "string"},
						"param2": map[string]interface{}{"type": "number"},
					},
					Required: []string{"param1"},
				},
			},
			expected: MCPTool{
				Name:        "test-tool",
				Description: "A test tool",
				InputSchema: struct {
					Type       string                 `json:"type"`
					Properties map[string]interface{} `json:"properties"`
					Required   []string               `json:"required,omitempty"`
				}{
					Type: "object",
					Properties: map[string]interface{}{
						"param1": map[string]interface{}{"type": "string"},
						"param2": map[string]interface{}{"type": "number"},
					},
					Required: []string{"param1"},
				},
			},
		},
		{
			name: "tool without required fields",
			tool: mcp.Tool{
				Name:        "simple-tool",
				Description: "A simple tool",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"optional": map[string]interface{}{"type": "boolean"},
					},
					Required: []string{},
				},
			},
			expected: MCPTool{
				Name:        "simple-tool",
				Description: "A simple tool",
				InputSchema: struct {
					Type       string                 `json:"type"`
					Properties map[string]interface{} `json:"properties"`
					Required   []string               `json:"required,omitempty"`
				}{
					Type: "object",
					Properties: map[string]interface{}{
						"optional": map[string]interface{}{"type": "boolean"},
					},
					Required: []string{},
				},
			},
		},
		{
			name: "tool with nil properties",
			tool: mcp.Tool{
				Name:        "empty-tool",
				Description: "An empty tool",
				InputSchema: mcp.ToolInputSchema{
					Type:       "object",
					Properties: nil,
					Required:   nil,
				},
			},
			expected: MCPTool{
				Name:        "empty-tool",
				Description: "An empty tool",
				InputSchema: struct {
					Type       string                 `json:"type"`
					Properties map[string]interface{} `json:"properties"`
					Required   []string               `json:"required,omitempty"`
				}{
					Type:       "object",
					Properties: nil,
					Required:   nil,
				},
			},
		},
		{
			name: "tool with complex schema",
			tool: mcp.Tool{
				Name:        "complex-tool",
				Description: "A complex tool with nested properties",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"config": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								"key1": map[string]interface{}{"type": "string"},
								"key2": map[string]interface{}{"type": "number"},
							},
						},
						"items": map[string]interface{}{
							"type":  "array",
							"items": map[string]interface{}{"type": "string"},
						},
					},
					Required: []string{"config"},
				},
			},
			expected: MCPTool{
				Name:        "complex-tool",
				Description: "A complex tool with nested properties",
				InputSchema: struct {
					Type       string                 `json:"type"`
					Properties map[string]interface{} `json:"properties"`
					Required   []string               `json:"required,omitempty"`
				}{
					Type: "object",
					Properties: map[string]interface{}{
						"config": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								"key1": map[string]interface{}{"type": "string"},
								"key2": map[string]interface{}{"type": "number"},
							},
						},
						"items": map[string]interface{}{
							"type":  "array",
							"items": map[string]interface{}{"type": "string"},
						},
					},
					Required: []string{"config"},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FromStandardTool(tt.tool)

			if result.Name != tt.expected.Name {
				t.Errorf("Name = %v, want %v", result.Name, tt.expected.Name)
			}

			if result.Description != tt.expected.Description {
				t.Errorf("Description = %v, want %v", result.Description, tt.expected.Description)
			}

			if result.InputSchema.Type != tt.expected.InputSchema.Type {
				t.Errorf("InputSchema.Type = %v, want %v", result.InputSchema.Type, tt.expected.InputSchema.Type)
			}

			// Compare properties
			if len(result.InputSchema.Properties) != len(tt.expected.InputSchema.Properties) {
				t.Errorf("InputSchema.Properties length = %v, want %v", len(result.InputSchema.Properties), len(tt.expected.InputSchema.Properties))
			}

			// Compare required fields
			if len(result.InputSchema.Required) != len(tt.expected.InputSchema.Required) {
				t.Errorf("InputSchema.Required length = %v, want %v", len(result.InputSchema.Required), len(tt.expected.InputSchema.Required))
			}

			for i, req := range result.InputSchema.Required {
				if i < len(tt.expected.InputSchema.Required) && req != tt.expected.InputSchema.Required[i] {
					t.Errorf("InputSchema.Required[%d] = %v, want %v", i, req, tt.expected.InputSchema.Required[i])
				}
			}
		})
	}
}

func TestMCPTool_Structure(t *testing.T) {
	tool := MCPTool{
		Name:        "test-tool",
		Description: "Test tool description",
		InputSchema: struct {
			Type       string                 `json:"type"`
			Properties map[string]interface{} `json:"properties"`
			Required   []string               `json:"required,omitempty"`
		}{
			Type: "object",
			Properties: map[string]interface{}{
				"param1": map[string]interface{}{"type": "string"},
			},
			Required: []string{"param1"},
		},
	}

	// Test JSON serialization
	if tool.Name != "test-tool" {
		t.Errorf("Tool name = %v, want %v", tool.Name, "test-tool")
	}

	if tool.Description != "Test tool description" {
		t.Errorf("Tool description = %v, want %v", tool.Description, "Test tool description")
	}

	if tool.InputSchema.Type != "object" {
		t.Errorf("Input schema type = %v, want %v", tool.InputSchema.Type, "object")
	}

	if len(tool.InputSchema.Properties) != 1 {
		t.Errorf("Input schema properties count = %v, want %v", len(tool.InputSchema.Properties), 1)
	}

	if len(tool.InputSchema.Required) != 1 {
		t.Errorf("Input schema required count = %v, want %v", len(tool.InputSchema.Required), 1)
	}
}
