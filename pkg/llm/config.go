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
	"net/url"
	"time"

	"github.com/sashabaranov/go-openai"
)

// Config holds LLM configuration.
// This package assumes LLM endpoints are compatible with OpenAI API format.
type Config struct {
	LLMAPIKey   string        // API key for the LLM service
	LLMModel    string        // Model name (e.g., "gpt-3.5-turbo", "gpt-4")
	LLMEndpoint string        // API endpoint URL (must be OpenAI-compatible)
	Timeout     time.Duration // HTTP request timeout
}

// Validate verifies that the configuration contains valid values.
// It checks for required fields and validates the endpoint URL format.
func (c *Config) Validate() error {
	// Validate API key
	if c.LLMAPIKey == "" {
		return ErrLLMAPIKeyNotConfigured
	}

	// Validate endpoint URL if provided
	if c.LLMEndpoint != "" {
		if _, err := url.Parse(c.LLMEndpoint); err != nil {
			return errors.Join(ErrInvalidEndpoint, err)
		}
	}

	return nil
}

// NewConfig creates a new LLM config with default values.
func NewConfig() *Config {
	return &Config{
		LLMModel:    openai.GPT3Dot5Turbo,
		LLMEndpoint: "https://api.openai.com/v1",
		Timeout:     30 * time.Second,
	}
}
