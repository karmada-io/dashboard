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

package openai

import (
	"errors"
	"sync"

	"github.com/sashabaranov/go-openai"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/options"
)

var (
	globalOpenAIOptions *options.Options
	openAIInitialized   bool
	openAIMutex         sync.RWMutex
)

// InitOpenAIConfig initializes OpenAI configuration from Options.
func InitOpenAIConfig(opts *options.Options) {
	openAIMutex.Lock()
	defer openAIMutex.Unlock()

	globalOpenAIOptions = opts
	openAIInitialized = true

	klog.InfoS("OpenAI configuration initialized",
		"hasAPIKey", opts.OpenAIAPIKey != "",
		"model", opts.OpenAIModel,
		"endpoint", opts.OpenAIEndpoint)
}

// GetOpenAIClient returns a configured OpenAI client.
func GetOpenAIClient() (*openai.Client, error) {
	openAIMutex.RLock()
	defer openAIMutex.RUnlock()

	if !openAIInitialized || globalOpenAIOptions == nil {
		return nil, errors.New("OpenAI not initialized, call InitOpenAIConfig first")
	}

	if globalOpenAIOptions.OpenAIAPIKey == "" {
		return nil, errors.New("OpenAI API key not configured")
	}

	config := openai.DefaultConfig(globalOpenAIOptions.OpenAIAPIKey)
	if globalOpenAIOptions.OpenAIEndpoint != "" {
		config.BaseURL = globalOpenAIOptions.OpenAIEndpoint
	}

	return openai.NewClientWithConfig(config), nil
}

// GetOpenAIModel returns the configured OpenAI model.
func GetOpenAIModel() string {
	openAIMutex.RLock()
	defer openAIMutex.RUnlock()

	if !openAIInitialized || globalOpenAIOptions == nil || globalOpenAIOptions.OpenAIModel == "" {
		return openai.GPT3Dot5Turbo // default value
	}
	return globalOpenAIOptions.OpenAIModel
}

// IsOpenAIConfigured returns true if OpenAI is properly configured.
func IsOpenAIConfigured() bool {
	openAIMutex.RLock()
	defer openAIMutex.RUnlock()

	return openAIInitialized && globalOpenAIOptions != nil && globalOpenAIOptions.OpenAIAPIKey != ""
}
