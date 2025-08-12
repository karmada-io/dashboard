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

package assistant

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
)

func init() {
	// Register routes
	router.V1().POST("/assistant", Answering)
	router.V1().POST("/chat", ChatHandler)
	router.V1().GET("/chat/tools", GetMCPToolsHandler)
}

// AnsweringRequest represents the request payload for the legacy assistant endpoint.
type AnsweringRequest struct {
	Prompt  string `json:"prompt"`
	Message string `json:"message"`
}

// StreamResponse is used for the legacy SSE stream response.
type StreamResponse struct {
	Type    string      `json:"type"`
	Content interface{} `json:"content"`
}

// getOpenAIModel returns the appropriate model based on environment configuration.
func getOpenAIModel() string {
	if model := os.Getenv("OPENAI_MODEL"); model != "" {
		return model
	}
	return openai.GPT3Dot5Turbo // Default fallback
}

// Answering is a handler for the legacy, non-MCP chat endpoint.
func Answering(c *gin.Context) {
	session, err := newAnsweringSession(c)
	if err != nil {
		klog.Errorf("Failed to create answering session: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := session.run(); err != nil {
		klog.Errorf("Answering session run failed: %v", err)
	}
}

// answeringSession manages the state for a legacy chat request.
type answeringSession struct {
	ctx          context.Context
	writer       http.ResponseWriter
	flusher      http.Flusher
	userInput    string
	openAIClient *openai.Client
}

// newAnsweringSession creates a new session for the legacy Answering handler.
func newAnsweringSession(c *gin.Context) (*answeringSession, error) {
	var request AnsweringRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		return nil, fmt.Errorf("invalid request body: %w", err)
	}

	userInput := strings.TrimSpace(request.Prompt)
	if userInput == "" {
		userInput = strings.TrimSpace(request.Message)
	}
	if userInput == "" {
		return nil, errors.New("prompt cannot be empty")
	}

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		return nil, errors.New("streaming unsupported")
	}

	client, err := prepareOpenAIClient()
	if err != nil {
		return nil, err
	}

	return &answeringSession{
		ctx:          c.Request.Context(),
		writer:       c.Writer,
		flusher:      flusher,
		userInput:    userInput,
		openAIClient: client,
	}, nil
}

// run executes the chat flow for the legacy Answering handler.
func (s *answeringSession) run() error {
	setupSSEHeaders(s.writer)

	systemMessage := "You are a helpful assistant for Karmada cluster management." +
		"You can provide guidance about Karmada concepts, best practices, and configuration help."

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: systemMessage},
		{Role: openai.ChatMessageRoleUser, Content: s.userInput},
	}

	req := openai.ChatCompletionRequest{
		Model:    getOpenAIModel(),
		Messages: messages,
		Stream:   true,
	}

	stream, err := s.openAIClient.CreateChatCompletionStream(s.ctx, req)
	if err != nil {
		return fmt.Errorf("could not create chat completion stream: %w", err)
	}
	defer stream.Close()

	for {
		response, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("stream reception error: %w", err)
		}

		if len(response.Choices) > 0 && response.Choices[0].Delta.Content != "" {
			s.sendStreamEvent("text", response.Choices[0].Delta.Content)
		}
	}

	s.sendStreamEvent("completion", nil)
	return nil
}

// sendStreamEvent marshals and sends a StreamResponse to the client.
func (s *answeringSession) sendStreamEvent(eventType string, content interface{}) {
	msg := StreamResponse{Type: eventType, Content: content}
	data, err := json.Marshal(msg)
	if err != nil {
		klog.Errorf("Failed to marshal stream event: %v", err)
		return
	}
	fmt.Fprintf(s.writer, "data: %s\n\n", data)
	s.flusher.Flush()
}
