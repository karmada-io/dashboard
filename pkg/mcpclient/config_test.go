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
)

func TestDefaultMCPConfig(t *testing.T) {
	config := DefaultMCPConfig()

	if config.TransportMode != TransportModeStdio {
		t.Errorf("Default transport mode = %v, want %v", config.TransportMode, TransportModeStdio)
	}

	if config.ConnectTimeout != 45*time.Second {
		t.Errorf("Default connect timeout = %v, want %v", config.ConnectTimeout, 45*time.Second)
	}

	if config.RequestTimeout != 60*time.Second {
		t.Errorf("Default request timeout = %v, want %v", config.RequestTimeout, 60*time.Second)
	}

	if config.MaxRetries != 3 {
		t.Errorf("Default max retries = %v, want %v", config.MaxRetries, 3)
	}
}

func TestNewMCPConfig(t *testing.T) {
	opts := []MCPConfigOption{
		WithSSEMode("http://localhost:8080/sse"),
		WithConnectTimeout(30 * time.Second),
		WithRequestTimeout(90 * time.Second),
		WithMaxRetries(5),
		WithStdioMode("/usr/bin/mcp-server"),
	}

	config := NewMCPConfig(opts...)

	// Last transport mode option should win (stdio)
	if config.TransportMode != TransportModeStdio {
		t.Errorf("Transport mode = %v, want %v", config.TransportMode, TransportModeStdio)
	}

	if config.ServerPath != "/usr/bin/mcp-server" {
		t.Errorf("Server path = %v, want %v", config.ServerPath, "/usr/bin/mcp-server")
	}

	if config.ConnectTimeout != 30*time.Second {
		t.Errorf("Connect timeout = %v, want %v", config.ConnectTimeout, 30*time.Second)
	}

	if config.RequestTimeout != 90*time.Second {
		t.Errorf("Request timeout = %v, want %v", config.RequestTimeout, 90*time.Second)
	}

	if config.MaxRetries != 5 {
		t.Errorf("Max retries = %v, want %v", config.MaxRetries, 5)
	}
}

func TestMCPConfig_Validate(t *testing.T) {
	tests := []struct {
		name    string
		config  *MCPConfig
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid stdio config",
			config: &MCPConfig{
				TransportMode:  TransportModeStdio,
				ServerPath:     "/usr/bin/mcp-server",
				ConnectTimeout: 30 * time.Second,
				RequestTimeout: 60 * time.Second,
			},
			wantErr: false,
		},
		{
			name: "valid SSE config",
			config: &MCPConfig{
				TransportMode:  TransportModeSSE,
				SSEEndpoint:    "http://localhost:8080/sse",
				ConnectTimeout: 30 * time.Second,
				RequestTimeout: 60 * time.Second,
			},
			wantErr: false,
		},
		{
			name: "stdio config missing server path",
			config: &MCPConfig{
				TransportMode: TransportModeStdio,
				ServerPath:    "",
			},
			wantErr: true,
			errMsg:  "server path is required for stdio transport mode",
		},
		{
			name: "SSE config missing endpoint",
			config: &MCPConfig{
				TransportMode: TransportModeSSE,
				SSEEndpoint:   "",
			},
			wantErr: true,
			errMsg:  "SSE endpoint is required for SSE transport mode",
		},
		{
			name: "unsupported transport mode",
			config: &MCPConfig{
				TransportMode: TransportMode("invalid"),
			},
			wantErr: true,
			errMsg:  "unsupported transport mode: invalid",
		},
		{
			name: "stdio config with non-existent path",
			config: &MCPConfig{
				TransportMode: TransportModeStdio,
				ServerPath:    "/non/existent/path",
			},
			wantErr: false, // Should not error, just warn
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil && tt.errMsg != "" && err.Error() != tt.errMsg {
				t.Errorf("Validate() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}

func TestMCPConfigOption_Individual(t *testing.T) {
	t.Run("WithSSEMode", func(t *testing.T) {
		config := &MCPConfig{}
		WithSSEMode("http://localhost:8080/sse")(config)

		if config.TransportMode != TransportModeSSE {
			t.Errorf("Transport mode = %v, want %v", config.TransportMode, TransportModeSSE)
		}

		if config.SSEEndpoint != "http://localhost:8080/sse" {
			t.Errorf("SSE endpoint = %v, want %v", config.SSEEndpoint, "http://localhost:8080/sse")
		}
	})

	t.Run("WithStdioMode", func(t *testing.T) {
		config := &MCPConfig{}
		WithStdioMode("/usr/bin/mcp-server")(config)

		if config.TransportMode != TransportModeStdio {
			t.Errorf("Transport mode = %v, want %v", config.TransportMode, TransportModeStdio)
		}

		if config.ServerPath != "/usr/bin/mcp-server" {
			t.Errorf("Server path = %v, want %v", config.ServerPath, "/usr/bin/mcp-server")
		}
	})

	t.Run("WithConnectTimeout", func(t *testing.T) {
		config := &MCPConfig{}
		timeout := 45 * time.Second
		WithConnectTimeout(timeout)(config)

		if config.ConnectTimeout != timeout {
			t.Errorf("Connect timeout = %v, want %v", config.ConnectTimeout, timeout)
		}
	})

	t.Run("WithRequestTimeout", func(t *testing.T) {
		config := &MCPConfig{}
		timeout := 120 * time.Second
		WithRequestTimeout(timeout)(config)

		if config.RequestTimeout != timeout {
			t.Errorf("Request timeout = %v, want %v", config.RequestTimeout, timeout)
		}
	})

	t.Run("WithMaxRetries", func(t *testing.T) {
		config := &MCPConfig{}
		retries := 10
		WithMaxRetries(retries)(config)

		if config.MaxRetries != retries {
			t.Errorf("Max retries = %v, want %v", config.MaxRetries, retries)
		}
	})
}
