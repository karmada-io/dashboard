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

package assistant

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"k8s.io/klog/v2"
)

// setupSSEHeaders sets up Server-Sent Events headers
func setupSSEHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
}

// sendSSEEvent sends a ChatResponse as an SSE event
func sendSSEEvent(c *gin.Context, msg ChatResponse) error {
	data, err := json.Marshal(msg)
	if err != nil {
		klog.Errorf("Failed to marshal SSE message: %v", err)
		return fmt.Errorf("failed to marshal SSE message: %w", err)
	}

	fmt.Fprintf(c.Writer, "data: %s\n\n", data)
	c.Writer.Flush()
	return nil
}

// sendCompletionSignal sends a completion event to the client
func sendCompletionSignal(c *gin.Context) {
	completionMsg := ChatResponse{
		Type:    "completion",
		Content: nil,
	}
	if err := sendSSEEvent(c, completionMsg); err != nil {
		klog.Errorf("Failed to send completion signal: %v", err)
	}
}

// sendErrorEvent sends an error event to the client
func sendErrorEvent(c *gin.Context, errorMsg string) {
	msg := ChatResponse{
		Type:    "error",
		Content: errorMsg,
	}
	if err := sendSSEEvent(c, msg); err != nil {
		klog.Errorf("Failed to send error event: %v", err)
	}
}
