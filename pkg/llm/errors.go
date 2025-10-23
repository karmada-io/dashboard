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

import "errors"

// Sentinel errors for LLM package.
// These errors can be used with errors.Is() for error type checking.
var (
	// ErrLLMNotInitialized is returned when LLM configuration has not been initialized.
	ErrLLMNotInitialized = errors.New("LLM not initialized")

	// ErrLLMAPIKeyNotConfigured is returned when LLM API key is not set.
	ErrLLMAPIKeyNotConfigured = errors.New("LLM API key not configured")

	// ErrInvalidEndpoint is returned when the LLM endpoint URL is invalid.
	ErrInvalidEndpoint = errors.New("invalid LLM endpoint URL")

	// ErrConnectionFailed is returned when LLM connection validation fails.
	ErrConnectionFailed = errors.New("LLM connection validation failed")
)
