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

import "github.com/mark3labs/mcp-go/mcp"

// MCPTool represents a tool available from the MCP server.
// MCPTool describes a tool exposed by an MCP server.
//
// The struct mirrors the relevant fields from the MCP protocol's Tool
// definition but keeps a simplified representation suitable for the
// dashboard. The `InputSchema` field contains a JSON Schema-like shape
// describing the expected input parameters for the tool.
type MCPTool struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	InputSchema struct {
		// Type contains the top-level JSON Schema type (for example "object").
		Type string `json:"type"`
		// Properties contains the JSON Schema properties map describing
		// each parameter's schema.
		Properties map[string]interface{} `json:"properties"`
		// Required lists the names of required properties, if any.
		Required []string `json:"required,omitempty"`
	} `json:"inputSchema"`
}

// FromStandardTool converts a protocol-level `mcp.Tool` into the
// dashboard-friendly `MCPTool` representation.
//
// This function performs a shallow copy of the input schema fields and
// is safe to call from goroutines (it does not mutate the source tool).
func FromStandardTool(tool mcp.Tool) MCPTool {
	mcpTool := MCPTool{
		Name:        tool.Name,
		Description: tool.Description,
	}

	// Convert input schema (shallow copy of maps/slices is fine here).
	mcpTool.InputSchema.Type = tool.InputSchema.Type
	mcpTool.InputSchema.Properties = tool.InputSchema.Properties
	mcpTool.InputSchema.Required = tool.InputSchema.Required

	return mcpTool
}
