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

package mcp

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/client/transport"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/sashabaranov/go-openai"
	"k8s.io/client-go/util/homedir"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/options"
)

// Global variables for singleton pattern
var (
	mcpClientInstance *MCPClient
	mcpClientMutex    sync.Mutex
	shutdownChan      chan os.Signal
	globalMCPOptions  *options.Options
	mcpInitialized    bool
)

// init sets up signal handling for graceful shutdown
func init() {
	shutdownChan = make(chan os.Signal, 1)
	signal.Notify(shutdownChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-shutdownChan
		klog.Infof("Received shutdown signal, closing MCP client...")
		ResetMCPClient()
	}()
}

// TransportMode defines the MCP transport mode
type TransportMode string

const (
	// TransportModeStdio represents the stdio transport mode for MCP communication
	TransportModeStdio TransportMode = "stdio"
	// TransportModeSSE represents the Server-Sent Events transport mode.
	TransportModeSSE TransportMode = "sse"
)

// MCPTool represents a tool available from the MCP server.
type MCPTool struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	InputSchema struct {
		Type       string                 `json:"type"`
		Properties map[string]interface{} `json:"properties"`
		Required   []string               `json:"required,omitempty"`
	} `json:"inputSchema"`
}

// MCPConfig holds configuration for initializing the MCP client.
type MCPConfig struct {
	// Transport configuration
	TransportMode TransportMode
	ServerPath    string
	SSEEndpoint   string

	// Kubernetes configuration
	KubeconfigPath string
	KarmadaContext string

	// Connection settings
	ConnectTimeout time.Duration
	RequestTimeout time.Duration
	MaxRetries     int

	// Feature flags
	EnableMCP bool
}

// MCPClient manages the lifecycle and communication with an MCP server.
type MCPClient struct {
	client             *client.Client
	config             *MCPConfig
	serverInfo         *mcp.InitializeResult
	availableTools     []mcp.Tool
	availableResources []mcp.Resource
	ctx                context.Context
	cancel             context.CancelFunc
	mu                 sync.RWMutex
	closed             bool
}

// DefaultMCPConfig returns default configuration
func DefaultMCPConfig() *MCPConfig {
	return &MCPConfig{
		TransportMode:  TransportModeStdio,
		KarmadaContext: "karmada-apiserver",
		ConnectTimeout: 45 * time.Second,
		RequestTimeout: 60 * time.Second,
		MaxRetries:     3,
		EnableMCP:      true,
	}
}

// loadMCPConfigFromOptions loads configuration from Options and validates them.
func loadMCPConfigFromOptions(opts *options.Options) (*MCPConfig, error) {
	config := DefaultMCPConfig()

	// Load configuration from Options instead of environment variables
	config.EnableMCP = opts.EnableMCP

	// Load transport mode
	switch strings.ToLower(opts.MCPTransportMode) {
	case "stdio":
		config.TransportMode = TransportModeStdio
	case "sse":
		config.TransportMode = TransportModeSSE
	default:
		return nil, fmt.Errorf("unsupported transport mode: %s", opts.MCPTransportMode)
	}

	// Load server path (required for stdio mode)
	if opts.MCPServerPath != "" {
		config.ServerPath = opts.MCPServerPath
	} else if config.TransportMode == TransportModeStdio {
		return nil, errors.New("--mcp-server-path flag required for stdio mode")
	}

	// Load SSE endpoint (required for SSE mode)
	if opts.MCPSSEEndpoint != "" {
		config.SSEEndpoint = opts.MCPSSEEndpoint
	} else if config.TransportMode == TransportModeSSE {
		return nil, errors.New("--mcp-sse-endpoint flag required for SSE mode")
	}

	// Use Options' existing Karmada configuration
	config.KubeconfigPath = opts.KarmadaKubeConfig
	config.KarmadaContext = opts.KarmadaContext

	// Set default kubeconfig path if not provided
	if config.KubeconfigPath == "" {
		config.KubeconfigPath = fmt.Sprintf("%s/.kube/karmada.config", homedir.HomeDir())
	}

	// Set default context if not provided
	if config.KarmadaContext == "" {
		config.KarmadaContext = "karmada-apiserver"
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid MCP configuration: %w", err)
	}

	klog.Infof("MCP configuration loaded: transport=%s, server=%s, kubeconfig=%s",
		config.TransportMode, config.ServerPath, config.KubeconfigPath)

	return config, nil
}

// InitMCPConfig initializes MCP configuration from Options.
func InitMCPConfig(opts *options.Options) {
	mcpClientMutex.Lock()
	defer mcpClientMutex.Unlock()

	globalMCPOptions = opts
	mcpInitialized = true

	klog.InfoS("MCP configuration initialized",
		"enabled", opts.EnableMCP,
		"transport", opts.MCPTransportMode,
		"serverPath", opts.MCPServerPath,
		"sseEndpoint", opts.MCPSSEEndpoint)
}

// Validate checks if the configuration is valid
func (c *MCPConfig) Validate() error {
	// Validate transport mode
	switch c.TransportMode {
	case TransportModeStdio:
		if c.ServerPath == "" {
			return errors.New("server path is required for stdio transport mode")
		}
		// Only check if file exists, don't fail if it doesn't (might be in PATH)
		if _, err := os.Stat(c.ServerPath); err != nil {
			klog.Warningf("MCP server not found at %s, assuming it's in PATH: %v", c.ServerPath, err)
		}
	case TransportModeSSE:
		if c.SSEEndpoint == "" {
			return errors.New("SSE endpoint is required for SSE transport mode")
		}
	default:
		return fmt.Errorf("unsupported transport mode: %s", c.TransportMode)
	}

	// Only warn about kubeconfig, don't fail
	if _, err := os.Stat(c.KubeconfigPath); err != nil {
		klog.Warningf("Kubeconfig not found at %s: %v", c.KubeconfigPath, err)
	}

	return nil
}

// GetMCPClient returns a singleton MCP client instance using global configuration.
func GetMCPClient() (*MCPClient, error) {
	mcpClientMutex.Lock()
	defer mcpClientMutex.Unlock()

	// Check if MCP is initialized
	if !mcpInitialized || globalMCPOptions == nil {
		return nil, errors.New("MCP not initialized, call InitMCPConfig first")
	}

	// Check if MCP is enabled
	if !globalMCPOptions.EnableMCP {
		return nil, errors.New("MCP is not enabled")
	}

	// If instance exists and is not closed, return it
	if mcpClientInstance != nil && !mcpClientInstance.closed {
		return mcpClientInstance, nil
	}

	// Create new instance
	klog.Infof("Creating new MCP client instance from global configuration...")
	client, err := NewMCPClientFromOptions(globalMCPOptions)
	if err != nil {
		return nil, err
	}

	mcpClientInstance = client
	return mcpClientInstance, nil
}

// ResetMCPClient resets the singleton instance (for testing or error recovery)
func ResetMCPClient() {
	mcpClientMutex.Lock()
	defer mcpClientMutex.Unlock()

	if mcpClientInstance != nil {
		mcpClientInstance.Close()
		mcpClientInstance = nil
	}
}

// NewMCPClientFromOptions creates and initializes a new MCP client using Options.
func NewMCPClientFromOptions(opts *options.Options) (*MCPClient, error) {
	cfg, err := loadMCPConfigFromOptions(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to load MCP config from options: %w", err)
	}

	client := &MCPClient{
		config: cfg,
	}

	if err := client.initialize(); err != nil {
		client.Close()
		return nil, err
	}

	return client, nil
}

// initialize sets up the MCP client based on the transport mode
func (c *MCPClient) initialize() error {
	var err error

	switch c.config.TransportMode {
	case TransportModeStdio:
		err = c.initializeStdioClient()
	case TransportModeSSE:
		err = c.initializeSSEClient()
	default:
		return fmt.Errorf("unsupported transport mode: %s", c.config.TransportMode)
	}

	if err != nil {
		return fmt.Errorf("failed to initialize MCP client: %w", err)
	}

	klog.Infof("MCP client initialized successfully")
	return nil
}

// initializeStdioClient sets up stdio transport
func (c *MCPClient) initializeStdioClient() error {
	klog.Infof("Initializing MCP stdio client with server: %s", c.config.ServerPath)

	// Create a long-lived context for the client's lifecycle
	c.ctx, c.cancel = context.WithCancel(context.Background())

	// Create stdio transport with proper environment and args
	stdioTransport := transport.NewStdio(
		c.config.ServerPath,
		nil,
		"stdio",
		"--karmada-kubeconfig="+c.config.KubeconfigPath,
		"--karmada-context="+c.config.KarmadaContext,
	)

	// Create client with the transport
	mcpClient := client.NewClient(stdioTransport)

	// Start the client with the long-lived context
	if err := mcpClient.Start(c.ctx); err != nil {
		c.cancel()
		klog.Errorf("Failed to start MCP client: %v", err)
		return fmt.Errorf("failed to start MCP client: %w", err)
	}

	c.client = mcpClient
	klog.Infof("MCP stdio client started successfully")

	// Initialize the client with a separate, short-lived context for the handshake
	initCtx, initCancel := context.WithTimeout(context.Background(), c.config.ConnectTimeout)
	defer initCancel()

	initRequest := mcp.InitializeRequest{}
	initRequest.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	initRequest.Params.ClientInfo = mcp.Implementation{
		Name:    "Karmada-Dashboard-MCP-Client",
		Version: "0.0.0-dev",
	}
	initRequest.Params.Capabilities = mcp.ClientCapabilities{}

	serverInfo, err := c.client.Initialize(initCtx, initRequest)
	if err != nil {
		c.cancel() // Cancel the main context if handshake fails
		klog.Errorf("Failed to initialize MCP client handshake: %v", err)
		return fmt.Errorf("failed to initialize MCP client: %w", err)
	}

	// Store server info for later use
	c.serverInfo = serverInfo

	klog.Infof("Connected to MCP server: %s (version %s)",
		serverInfo.ServerInfo.Name, serverInfo.ServerInfo.Version)

	klog.Infof("MCP stdio client connection established successfully")
	return nil
}

// initializeSSEClient sets up SSE transport
func (c *MCPClient) initializeSSEClient() error {
	klog.Infof("Initializing MCP SSE client with endpoint: %s", c.config.SSEEndpoint)

	// Create SSE client using the dedicated constructor
	mcpClient, err := client.NewSSEMCPClient(c.config.SSEEndpoint)
	if err != nil {
		return fmt.Errorf("failed to create SSE MCP client: %w", err)
	}

	// Set up notification handler to react to server-sent events
	mcpClient.OnNotification(func(notification mcp.JSONRPCNotification) {
		klog.Infof("Received notification: %s", notification.Method)
		// Handle specific notifications, e.g., when the tool list changes
		if notification.Method == "tools/listChanged" {
			c.ResetToolsState()
			go c.loadToolsOnDemand()
		}
	})

	// Use a background context for the long-running client connection
	c.ctx, c.cancel = context.WithCancel(context.Background())

	klog.Infof("Starting MCP SSE client connection...")
	if err := mcpClient.Start(c.ctx); err != nil {
		c.cancel() // Cancel the client's main context if start fails
		return fmt.Errorf("failed to start MCP client: %w", err)
	}

	c.client = mcpClient
	klog.Infof("MCP SSE client started successfully")

	// Initialize the client with a separate, short-lived context for the handshake
	klog.Infof("Initializing MCP handshake...")
	initCtx, initCancel := context.WithTimeout(context.Background(), c.config.ConnectTimeout)
	defer initCancel()

	initRequest := mcp.InitializeRequest{}
	initRequest.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	initRequest.Params.ClientInfo = mcp.Implementation{
		Name:    "Karmada-Dashboard-MCP-Client",
		Version: "0.0.0-dev",
	}
	initRequest.Params.Capabilities = mcp.ClientCapabilities{}

	serverInfo, err := c.client.Initialize(initCtx, initRequest)
	if err != nil {
		klog.Errorf("MCP handshake failed: %v", err)
		// Don't cancel the main context, just return the error
		return fmt.Errorf("failed to initialize MCP client: %w", err)
	}

	// Store server capabilities for later use
	c.serverInfo = serverInfo

	klog.Infof("Connected to MCP server: %s (version %s)",
		serverInfo.ServerInfo.Name, serverInfo.ServerInfo.Version)

	klog.Infof("MCP SSE client connection established successfully")
	return nil
}

// loadToolsOnDemand attempts to load tools if they haven't been loaded yet
func (c *MCPClient) loadToolsOnDemand() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.loadToolsWithoutLock()
}

// loadToolsWithoutLock does the actual tool loading without acquiring locks
// Caller must hold the appropriate lock
func (c *MCPClient) loadToolsWithoutLock() {
	if c.closed {
		return
	}

	// Check if server supports tools
	if c.serverInfo == nil || c.serverInfo.Capabilities.Tools == nil {
		klog.V(2).Infof("MCP server does not support tools")
		return
	}

	// Try to load tools with a reasonable timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	klog.V(2).Infof("Loading MCP tools on-demand...")

	if c.client == nil {
		klog.Warningf("Cannot load tools: MCP client is nil")
		return
	}

	request := mcp.ListToolsRequest{}
	tools, err := c.client.ListTools(ctx, request)
	if err != nil {
		klog.Warningf("Failed to load tools on-demand: %v", err)
		return
	}

	if tools == nil {
		klog.Warningf("Cannot load tools: received nil tools response")
		return
	}

	// Successfully loaded tools
	c.availableTools = make([]mcp.Tool, 0, len(tools.Tools))
	c.availableTools = append(c.availableTools, tools.Tools...)

	klog.Infof("Successfully loaded %d MCP tools on-demand", len(c.availableTools))
}

// GetTools returns the available MCP tools.
func (c *MCPClient) GetTools() []MCPTool {
	c.mu.Lock() // Use write lock to avoid deadlock with loadToolsWithoutLock
	defer c.mu.Unlock()

	if c.closed {
		return nil
	}

	// Check if server supports tools
	if c.serverInfo == nil || c.serverInfo.Capabilities.Tools == nil {
		klog.V(2).Infof("MCP server does not support tools")
		return []MCPTool{}
	}

	// If tools are not loaded yet, try to load them
	if len(c.availableTools) == 0 {
		c.loadToolsWithoutLock() // Call lock-free version to avoid deadlock
	}

	// Convert and return tools
	tools := make([]MCPTool, 0, len(c.availableTools))
	for _, tool := range c.availableTools {
		mcpTool := MCPTool{
			Name:        tool.Name,
			Description: tool.Description,
		}

		// Convert input schema
		mcpTool.InputSchema.Type = tool.InputSchema.Type
		mcpTool.InputSchema.Properties = tool.InputSchema.Properties
		mcpTool.InputSchema.Required = tool.InputSchema.Required

		tools = append(tools, mcpTool)
	}
	return tools
}

// HasToolsSupport returns true if the server supports tools
func (c *MCPClient) HasToolsSupport() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return c.serverInfo != nil && c.serverInfo.Capabilities.Tools != nil
}

// CallTool executes a tool on the MCP server.
func (c *MCPClient) CallTool(toolName string, parameters map[string]interface{}) (string, error) {
	// Check if client is closed
	c.mu.RLock()
	closed := c.closed
	c.mu.RUnlock()

	if closed {
		return "", errors.New("MCP client is closed")
	}

	ctx, cancel := context.WithTimeout(context.Background(), c.config.RequestTimeout)
	defer cancel()

	// Create tool call request
	request := mcp.CallToolRequest{}
	request.Params.Name = toolName
	request.Params.Arguments = parameters

	// Execute tool call
	result, err := c.client.CallTool(ctx, request)
	if err != nil {
		return "", fmt.Errorf("failed to call tool %s: %w", toolName, err)
	}

	// Extract text content from result
	var content strings.Builder
	for _, item := range result.Content {
		if textContent, ok := mcp.AsTextContent(item); ok && textContent.Text != "" {
			content.WriteString(textContent.Text)
		}
	}

	klog.Infof("Tool call %s completed successfully", toolName)
	return content.String(), nil
}

// Close terminates the MCP client and cleans up resources.
func (c *MCPClient) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		return
	}

	klog.Infof("Closing MCP client...")
	c.closed = true

	// Cancel context first
	if c.cancel != nil {
		c.cancel()
	}

	// Close MCP client with timeout
	if c.client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		done := make(chan error, 1)
		go func() {
			done <- c.client.Close()
		}()

		select {
		case err := <-done:
			if err != nil {
				klog.Warningf("Failed to close MCP client: %v", err)
			} else {
				klog.Infof("MCP client closed successfully")
			}
		case <-ctx.Done():
			klog.Warningf("MCP client close timed out")
		}
	}

	// Clear tools and resources
	c.availableTools = nil
	c.availableResources = nil
}

// ResetToolsState resets the tool loading state to allow retry
func (c *MCPClient) ResetToolsState() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.availableTools = nil
	klog.V(2).Infof("MCP tools state reset")
}

// FormatToolsForOpenAI converts MCP tools into the format expected by OpenAI.
func (c *MCPClient) FormatToolsForOpenAI() []openai.Tool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil
	}

	tools := make([]openai.Tool, 0, len(c.availableTools))
	for _, tool := range c.availableTools {
		tools = append(tools, openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "mcp_" + tool.Name,
				Description: tool.Description,
				Parameters:  tool.InputSchema,
			},
		})
	}
	return tools
}

// ListResources fetches and returns all available resources from the MCP server
func (c *MCPClient) ListResources() ([]mcp.Resource, error) {
	// Check if client is closed and server supports resources (use short-lived lock)
	c.mu.RLock()
	closed := c.closed
	supportsResources := c.serverInfo != nil && c.serverInfo.Capabilities.Resources != nil
	c.mu.RUnlock()

	if closed {
		return nil, errors.New("MCP client is closed")
	}

	if !supportsResources {
		return nil, fmt.Errorf("server does not support resources")
	}

	ctx, cancel := context.WithTimeout(context.Background(), c.config.RequestTimeout)
	defer cancel()

	resourcesRequest := mcp.ListResourcesRequest{}
	resourcesResult, err := c.client.ListResources(ctx, resourcesRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to list resources: %w", err)
	}

	// Cache the resources
	func() {
		c.mu.Lock()
		defer c.mu.Unlock()
		c.availableResources = resourcesResult.Resources
	}()

	return resourcesResult.Resources, nil
}

// GetResources returns the cached list of resources (call ListResources first)
func (c *MCPClient) GetResources() []mcp.Resource {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil
	}

	resources := make([]mcp.Resource, len(c.availableResources))
	copy(resources, c.availableResources)
	return resources
}
