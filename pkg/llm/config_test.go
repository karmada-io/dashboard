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

package llm

import (
	"errors"
	"testing"
	"time"

	"github.com/sashabaranov/go-openai"
)

func TestNewConfig(t *testing.T) {
	config := NewConfig()

	if config == nil {
		t.Fatal("NewConfig() returned nil")
	}

	if config.LLMModel != openai.GPT3Dot5Turbo {
		t.Errorf("Expected default model %s, got %s", openai.GPT3Dot5Turbo, config.LLMModel)
	}

	if config.LLMEndpoint != "https://api.openai.com/v1" {
		t.Errorf("Expected default endpoint https://api.openai.com/v1, got %s", config.LLMEndpoint)
	}

	if config.Timeout != 30*time.Second {
		t.Errorf("Expected default timeout 30s, got %v", config.Timeout)
	}

	if config.LLMAPIKey != "" {
		t.Errorf("Expected empty API key, got %s", config.LLMAPIKey)
	}
}

func TestConfigCustomization(t *testing.T) {
	config := NewConfig()

	config.LLMAPIKey = "test-api-key"
	config.LLMModel = "gpt-4"
	config.LLMEndpoint = "https://custom.endpoint.com/v1"
	config.Timeout = 60 * time.Second

	if config.LLMAPIKey != "test-api-key" {
		t.Errorf("Expected API key test-api-key, got %s", config.LLMAPIKey)
	}

	if config.LLMModel != "gpt-4" {
		t.Errorf("Expected model gpt-4, got %s", config.LLMModel)
	}

	if config.LLMEndpoint != "https://custom.endpoint.com/v1" {
		t.Errorf("Expected endpoint https://custom.endpoint.com/v1, got %s", config.LLMEndpoint)
	}

	if config.Timeout != 60*time.Second {
		t.Errorf("Expected timeout 60s, got %v", config.Timeout)
	}
}

func TestConfigValidate(t *testing.T) {
	tests := []struct {
		name        string
		config      *Config
		wantErr     bool
		expectedErr error
	}{
		{
			name: "valid config with all fields",
			config: &Config{
				LLMAPIKey:   "test-api-key",
				LLMModel:    "gpt-4",
				LLMEndpoint: "https://api.openai.com/v1",
				Timeout:     30 * time.Second,
			},
			wantErr: false,
		},
		{
			name: "valid config with empty endpoint",
			config: &Config{
				LLMAPIKey: "test-api-key",
				LLMModel:  "gpt-4",
				Timeout:   30 * time.Second,
			},
			wantErr: false,
		},
		{
			name: "missing API key",
			config: &Config{
				LLMModel:    "gpt-4",
				LLMEndpoint: "https://api.openai.com/v1",
				Timeout:     30 * time.Second,
			},
			wantErr:     true,
			expectedErr: ErrLLMAPIKeyNotConfigured,
		},
		{
			name: "invalid endpoint URL",
			config: &Config{
				LLMAPIKey:   "test-api-key",
				LLMModel:    "gpt-4",
				LLMEndpoint: "://invalid-url",
				Timeout:     30 * time.Second,
			},
			wantErr:     true,
			expectedErr: ErrInvalidEndpoint,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()

			if tt.wantErr && err == nil {
				t.Errorf("Validate() expected error but got nil")
			}

			if !tt.wantErr && err != nil {
				t.Errorf("Validate() unexpected error: %v", err)
			}

			if tt.wantErr && tt.expectedErr != nil {
				if !errors.Is(err, tt.expectedErr) {
					t.Errorf("Validate() error = %v, expected to contain %v", err, tt.expectedErr)
				}
			}
		})
	}
}
