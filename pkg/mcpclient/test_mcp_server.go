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
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// TestMCPServer represents a test MCP server using the official mcp-go framework
type TestMCPServer struct {
	Addr      string
	MCPServer *server.MCPServer
	SSEServer *server.SSEServer
}

// NewTestSSEServer creates a new test MCP server with sse mode
func NewTestSSEServer(addr string) *TestMCPServer {
	s := server.NewMCPServer("Test MCP Server", "1.0.0")
	ConfigMCPServer(s)

	sseServer := server.NewSSEServer(
		s,
		server.WithBaseURL(fmt.Sprintf("http://%s", addr)),
	)
	return &TestMCPServer{
		MCPServer: s,
		Addr:      addr,
		SSEServer: sseServer,
	}
}

// NewTestStdioServer creates a new test MCP server with stdio mode
func NewTestStdioServer() *TestMCPServer {
	s := server.NewMCPServer("Test MCP Server", "1.0.0")
	ConfigMCPServer(s)
	return &TestMCPServer{
		MCPServer: s,
	}
}

// ConfigMCPServer configures the MCP server with test tools and resources
// for integration testing purposes.
func ConfigMCPServer(s *server.MCPServer) {
	// Add test tools
	s.AddTool(
		mcp.Tool{
			Name:        "test_echo",
			Description: "Echoes a message with optional prefix",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"message": map[string]interface{}{"type": "string"},
					"prefix":  map[string]interface{}{"type": "string"},
				},
				Required: []string{"message"},
			},
		},
		testEchoHandler,
	)

	s.AddTool(
		mcp.Tool{
			Name:        "test_calculate",
			Description: "Performs basic arithmetic operations",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"a":         map[string]interface{}{"type": "number"},
					"b":         map[string]interface{}{"type": "number"},
					"operation": map[string]interface{}{"type": "string", "enum": []string{"add", "subtract", "multiply", "divide"}},
				},
				Required: []string{"a", "b", "operation"},
			},
		},
		testCalculateHandler,
	)

	s.AddTool(
		mcp.Tool{
			Name:        "test_delay",
			Description: "Introduces a delay for testing timeouts",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"milliseconds": map[string]interface{}{"type": "number", "minimum": 0},
				},
				Required: []string{"milliseconds"},
			},
		},
		testDelayHandler,
	)

	// Add test resources
	s.AddResource(
		mcp.Resource{
			URI:         "test://resource1",
			Name:        "Test Resource 1",
			Description: "First test resource",
			MIMEType:    "text/plain",
		},
		func(_ context.Context, _ mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			return []mcp.ResourceContents{
				mcp.TextResourceContents{
					URI:      "test://resource1",
					MIMEType: "text/plain",
					Text:     "Test resource content 1",
				},
			}, nil
		},
	)

	s.AddResource(
		mcp.Resource{
			URI:         "test://resource2",
			Name:        "Test Resource 2",
			Description: "Second test resource",
			MIMEType:    "application/json",
		},
		func(_ context.Context, _ mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			data := map[string]interface{}{
				"name":  "Test Resource 2",
				"value": 42,
				"items": []string{"item1", "item2", "item3"},
			}
			jsonData, _ := json.Marshal(data)
			return []mcp.ResourceContents{
				mcp.TextResourceContents{
					URI:      "test://resource2",
					MIMEType: "application/json",
					Text:     string(jsonData),
				},
			}, nil
		},
	)
}

// GetTestTools returns a list of test tools for validation in integration tests.
func GetTestTools() []mcp.Tool {
	return []mcp.Tool{
		{
			Name:        "test_echo",
			Description: "Echoes a message with optional prefix",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"message": map[string]interface{}{"type": "string"},
					"prefix":  map[string]interface{}{"type": "string"},
				},
				Required: []string{"message"},
			},
		},
		{
			Name:        "test_calculate",
			Description: "Performs basic arithmetic operations",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"a":         map[string]interface{}{"type": "number"},
					"b":         map[string]interface{}{"type": "number"},
					"operation": map[string]interface{}{"type": "string", "enum": []string{"add", "subtract", "multiply", "divide"}},
				},
				Required: []string{"a", "b", "operation"},
			},
		},
		{
			Name:        "test_delay",
			Description: "Introduces a delay for testing timeouts",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"milliseconds": map[string]interface{}{"type": "number", "minimum": 0},
				},
				Required: []string{"milliseconds"},
			},
		},
	}
}

// GetTestResources returns a list of test resources for validation in integration tests.
func GetTestResources() []mcp.Resource {
	return []mcp.Resource{
		{
			URI:         "test://resource1",
			Name:        "Test Resource 1",
			Description: "First test resource",
			MIMEType:    "text/plain",
		},
		{
			URI:         "test://resource2",
			Name:        "Test Resource 2",
			Description: "Second test resource",
			MIMEType:    "application/json",
		},
	}
}

// StartSSEServer starts the test server in SSE mode for testing
func (ts *TestMCPServer) StartSSEServer() error {
	httpServer := &http.Server{
		Addr:              ts.Addr,
		Handler:           ts.SSEServer,
		ReadHeaderTimeout: 10 * time.Second, // Prevent Slowloris attacks
	}

	return httpServer.ListenAndServe()
}

// CompleteSseEndpoint returns the complete SSE endpoint URL for client connections.
func (ts *TestMCPServer) CompleteSseEndpoint() string {
	endpoint, _ := ts.SSEServer.CompleteSseEndpoint()
	return endpoint
}

// StartStdioServer starts the test server in stdio mode for integration testing.
func (ts *TestMCPServer) StartStdioServer() error {
	// Start the stdio server
	if err := server.ServeStdio(ts.MCPServer); err != nil {
		return err
	}
	return nil
}

// Tool handlers for testing
func testEchoHandler(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	message, err := request.RequireString("message")
	if err != nil {
		return nil, fmt.Errorf("message parameter is required and must be a string")
	}

	prefix := request.GetString("prefix", "")

	result := prefix + message

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{Type: "text", Text: result},
		},
	}, nil
}

func testCalculateHandler(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	a, err := request.RequireFloat("a")
	if err != nil {
		return nil, fmt.Errorf("a parameter is required and must be a number")
	}

	b, err := request.RequireFloat("b")
	if err != nil {
		return nil, fmt.Errorf("b parameter is required and must be a number")
	}

	operation, err := request.RequireString("operation")
	if err != nil {
		return nil, fmt.Errorf("operation parameter is required and must be a string")
	}

	var result float64
	switch operation {
	case "add":
		result = a + b
	case "subtract":
		result = a - b
	case "multiply":
		result = a * b
	case "divide":
		if b == 0 {
			return nil, fmt.Errorf("division by zero")
		}
		result = a / b
	default:
		return nil, fmt.Errorf("unsupported operation: %s", operation)
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{Type: "text", Text: fmt.Sprintf("%.2f", result)},
		},
	}, nil
}

func testDelayHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	milliseconds, err := request.RequireFloat("milliseconds")
	if err != nil {
		return nil, fmt.Errorf("milliseconds parameter is required and must be a number")
	}

	if milliseconds < 0 {
		return nil, fmt.Errorf("milliseconds must be a positive number")
	}

	select {
	case <-time.After(time.Duration(milliseconds) * time.Millisecond):
		return &mcp.CallToolResult{
			Content: []mcp.Content{
				mcp.TextContent{Type: "text", Text: fmt.Sprintf("Delayed for %.0f milliseconds", milliseconds)},
			},
		}, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}
