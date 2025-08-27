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

import { fetchEventSource } from '@microsoft/fetch-event-source';

interface StreamResponse {
  type: string;
  content: any; // match the interface{} type in the backend
}

interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  enableMcp?: boolean;
}

interface ChatResponse {
  type: string;
  content: any;
  toolCall?: ToolCall;
}

export interface ToolCall {
  toolName: string;
  args: Record<string, any>;
  result: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any; // Or a more specific type if possible
}

interface MCPToolsResponse {
  tools: MCPTool[];
  enabled: boolean;
}

export const getAssistantStream = (
  message: string,
  onMessage: (data: string) => void,
  onError: (error: any) => void,
  onClose: () => void,
  signal?: AbortSignal, // Add optional abort signal parameter
) => {
  console.log('Sending message to assistant:', message); // debug log
  
  fetchEventSource('/api/v1/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: message }),
    signal, // Use the passed signal instead of creating a new one
    onmessage(ev: { data: string }) {
      console.log('Received message:', ev.data); // debug log
      try {
        const response: StreamResponse = JSON.parse(ev.data);
        if (response.type === 'text' && typeof response.content === 'string') {
          onMessage(response.content);
        }
        // ignore completion type messages
      } catch (error) {
        console.error('Failed to parse stream response:', error);
        // if parsing fails, use the original data (backward compatible)
        onMessage(ev.data);
      }
    },
    onerror(err: any) {
      console.error('Stream error:', err);
      onError(err);
    },
    onclose() {
      console.log('Stream closed');
      onClose();
    },
  });
};

// new: get MCP tool list
export const getMCPTools = async (): Promise<MCPToolsResponse> => {
  try {
    const response = await fetch('/api/v1/chat/tools');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to get MCP tools:', error);
    return { tools: [], enabled: false };
  }
};

// new: support MCP chat stream
export const getChatStream = (
  message: string,
  history: ChatMessage[] = [],
  enableMCP: boolean = false,
  onMessage: (data: string) => void,
  onToolCall: (toolCall: ToolCall) => void,
  onError: (error: any) => void,
  onClose: () => void,
  signal?: AbortSignal, // Add optional abort signal parameter
) => {
  console.log('Sending message to chat with MCP:', { message, enableMCP, historyLength: history.length });
  
  fetchEventSource('/api/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      history,
      enableMcp: enableMCP,
    }),
    signal, // Use the passed signal instead of creating a new one
    onmessage(ev: { data: string }) {
      console.log('Received chat message:', ev.data);
      try {
        const response: ChatResponse = JSON.parse(ev.data);
        
        switch (response.type) {
          case 'content':
            if (typeof response.content === 'string') {
              onMessage(response.content);
            }
            break;
          case 'tool_call':
            if (response.toolCall) {
              onToolCall(response.toolCall);
            }
            break;
          case 'tool_call_start':
            // Tool execution started - we can ignore this or handle if needed
            console.log('Tool execution started:', response.toolCall?.toolName);
            break;
          case 'tool_processing':
            // Tool processing notification - we can ignore this
            console.log('Tool processing:', response.content);
            break;
          case 'tool_processing_complete':
            // Tool processing completed - we can ignore this
            console.log('Tool processing complete:', response.content);
            break;
          case 'completion':
            // ignore completion signal
            break;
          default:
            console.warn('Unknown response type:', response.type);
        }
      } catch (error) {
        console.error('Failed to parse chat stream response:', error);
        // if parsing fails, use the original data (backward compatible)
        onMessage(ev.data);
      }
    },
    onerror(err: any) {
      console.error('Chat stream error:', err);
      onError(err);
    },
    onclose() {
      console.log('Chat stream closed');
      onClose();
    },
  });
};