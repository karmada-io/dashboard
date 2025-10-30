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

import {
  ApiConfig,
  ChatRequest,
  MCPToolsResponse,
  StreamResponse,
} from "./types";

export class ChatAPI {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  async checkMCPAvailability(): Promise<MCPToolsResponse> {
    try {
      const response = await fetch(this.config.toolsEndpoint, {
        headers: this.config.headers,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to check MCP:", error);
      return { tools: [], enabled: false };
    }
  }

  private async processStream(
    response: Response,
    onData: (content: string) => void,
    onToolCall?: (toolCall: any) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void,
    signal?: AbortSignal,
    isMCP = false,
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonStr = line.slice(6);
            if (jsonStr.trim() === "") continue;

            const data = JSON.parse(jsonStr);

            if (isMCP) {
              switch (data.type) {
                case "content":
                  if (typeof data.content === "string") onData(data.content);
                  break;
                case "tool_call":
                  if (onToolCall && data.toolCall) onToolCall(data.toolCall);
                  break;
                case "tool_call_start":
                  console.log("Tool call started:", data.toolCall?.toolName);
                  break;
                case "completion":
                  onComplete?.();
                  return;
                case "error":
                  onError?.(new Error(data.content));
                  return;
              }
            } else {
              if (data.type === "text" && data.content) {
                onData(data.content);
              } else if (data.type === "completion") {
                onComplete?.();
                return;
              }
            }
          } catch (parseError) {
            console.warn("Failed to parse SSE data:", parseError);
          }
        }
      }
    }

    onComplete?.();
  }

  async getChatStream(
    request: ChatRequest,
    onData: (content: string) => void,
    onToolCall?: (toolCall: any) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const response = await fetch(this.config.chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.config.headers },
        body: JSON.stringify(request),
        signal,
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      await this.processStream(
        response,
        onData,
        onToolCall,
        onError,
        onComplete,
        signal,
        true,
      );
    } catch (error) {
      if (signal?.aborted) return;
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getLegacyChatStream(
    message: string,
    onData: (content: string) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const response = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.config.headers },
        body: JSON.stringify({ prompt: message }),
        signal,
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      await this.processStream(
        response,
        onData,
        undefined,
        onError,
        onComplete,
        signal,
        false,
      );
    } catch (error) {
      if (signal?.aborted) return;
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
