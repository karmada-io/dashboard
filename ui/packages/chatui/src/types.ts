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

export interface QuickReply {
  icon?: string;
  name: string;
  isHighlight?: boolean;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ToolCallInfo {
  toolName: string;
  args: Record<string, any>;
  result: string;
}

export interface ApiConfig {
  chatEndpoint: string;
  toolsEndpoint: string;
  headers?: Record<string, string>;
}

export interface ChatUIProps {
  apiConfig: ApiConfig;
  theme?: "light" | "dark";
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  avatar?: string;
  quickReplies?: QuickReply[];
  enableMCP?: boolean;
  className?: string;
  width?: number;
  height?: number;
  title?: string;
}

export interface StreamResponse {
  type: string;
  content: any;
  toolCall?: ToolCallInfo;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  enableMcp?: boolean;
}

export interface MCPToolsResponse {
  tools: any[];
  enabled: boolean;
}
