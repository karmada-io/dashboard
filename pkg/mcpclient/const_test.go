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
)

func TestConstants(t *testing.T) {
	tests := []struct {
		name     string
		actual   interface{}
		expected interface{}
	}{
		{
			name:     "McpClientName",
			actual:   McpClientName,
			expected: "Karmada-Dashboard-MCP-Client",
		},
		{
			name:     "McpClientVersion",
			actual:   McpClientVersion,
			expected: "0.0.0-dev",
		},
		{
			name:     "TransportModeStdio",
			actual:   TransportModeStdio,
			expected: TransportMode("stdio"),
		},
		{
			name:     "TransportModeSSE",
			actual:   TransportModeSSE,
			expected: TransportMode("sse"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.actual != tt.expected {
				t.Errorf("%s = %v, want %v", tt.name, tt.actual, tt.expected)
			}
		})
	}
}

func TestTransportMode_String(t *testing.T) {
	tests := []struct {
		name     string
		mode     TransportMode
		expected string
	}{
		{
			name:     "stdio mode",
			mode:     TransportModeStdio,
			expected: "stdio",
		},
		{
			name:     "sse mode",
			mode:     TransportModeSSE,
			expected: "sse",
		},
		{
			name:     "custom mode",
			mode:     TransportMode("custom"),
			expected: "custom",
		},
		{
			name:     "empty mode",
			mode:     TransportMode(""),
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.mode) != tt.expected {
				t.Errorf("TransportMode(%v) = %v, want %v", tt.mode, string(tt.mode), tt.expected)
			}
		})
	}
}

func TestTransportMode_Equality(t *testing.T) {
	tests := []struct {
		name  string
		mode1 TransportMode
		mode2 TransportMode
		equal bool
	}{
		{
			name:  "stdio modes equal",
			mode1: TransportModeStdio,
			mode2: TransportMode("stdio"),
			equal: true,
		},
		{
			name:  "sse modes equal",
			mode1: TransportModeSSE,
			mode2: TransportMode("sse"),
			equal: true,
		},
		{
			name:  "different modes not equal",
			mode1: TransportModeStdio,
			mode2: TransportModeSSE,
			equal: false,
		},
		{
			name:  "stdio not equal to custom",
			mode1: TransportModeStdio,
			mode2: TransportMode("custom"),
			equal: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.mode1 == tt.mode2
			if result != tt.equal {
				t.Errorf("TransportMode equality: %v == %v = %v, want %v", tt.mode1, tt.mode2, result, tt.equal)
			}
		})
	}
}
