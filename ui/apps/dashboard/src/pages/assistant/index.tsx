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

import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, List, Switch, Card, Tag, Tooltip, App } from 'antd';
import { Icons } from '@/components/icons';
import { getAssistantStream, getChatStream, getMCPTools } from '@/services/assistant';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  toolCalls?: ToolCall[];
}

interface ToolCall {
  toolName: string;
  args: any;
  result: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [enableMCP, setEnableMCP] = useState(false);
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const botMessageRef = useRef<Message | null>(null);
  const currentControllerRef = useRef<AbortController | null>(null);

  const { message } = App.useApp();

  // load MCP tool list
  useEffect(() => {
    const loadMCPTools = async () => {
      try {
        const response = await getMCPTools();
        setAvailableTools(response.tools);
        setMcpEnabled(response.enabled);
        if (response.enabled) {
          message.success(`MCP enabled, found ${response.tools.length} available tools`);
        } else {
          message.info('MCP not enabled or not available');
        }
      } catch (error) {
        console.error('Failed to load MCP tools:', error);
        message.error('Failed to load MCP tools');
      }
    };

    loadMCPTools();
  }, []);

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;

    // abort previous connection
    if (currentControllerRef.current) {
      currentControllerRef.current.abort();
    }

    const userMessage: Message = { text: inputValue, sender: 'user' };
    const messageToSend = inputValue;
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');

    const botMessage: Message = { text: '', sender: 'bot', toolCalls: [] };
    setMessages((prevMessages) => [...prevMessages, botMessage]);
    botMessageRef.current = botMessage;

    // update chat history
    const newHistory = [...chatHistory, { role: 'user', content: messageToSend }];
    setChatHistory(newHistory);

    // use different API based on whether MCP is enabled
    if (enableMCP && mcpEnabled) {
      const controller = getChatStream(
        messageToSend,
        newHistory,
        true,
        (data) => {
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.sender === 'bot') {
              lastMessage.text += data;
            }
            return newMessages;
          });
        },
        (toolCall) => {
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.sender === 'bot') {
              if (!lastMessage.toolCalls) {
                lastMessage.toolCalls = [];
              }
              // check if the toolCall already exists
              const exists = lastMessage.toolCalls.some(
                (call) =>
                  call.toolName === toolCall.toolName &&
                  JSON.stringify(call.args) === JSON.stringify(toolCall.args) &&
                  call.result === toolCall.result
              );
              if (!exists) {
                lastMessage.toolCalls.push(toolCall);
              }
            }
            return newMessages;
          });
        },
        (error) => {
          console.error('Chat stream error:', error);
          message.error('Chat request failed');
        },
        () => {
          const assistantContent = botMessageRef.current?.text || '';
          botMessageRef.current = null;
          currentControllerRef.current = null;
          // update chat history - only add when the message content is not empty
          if (assistantContent.trim()) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: assistantContent }]);
          }
        }
      );
      currentControllerRef.current = controller;
    } else {
      // use the original assistant interface
      const controller = getAssistantStream(
        messageToSend,
        (data) => {
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.sender === 'bot') {
              lastMessage.text += data;
            }
            return newMessages;
          });
        },
        (error) => {
          console.error('Stream error:', error);
          message.error('Request failed');
        },
        () => {
          botMessageRef.current = null;
          currentControllerRef.current = null;
        }
      );
      currentControllerRef.current = controller;
    }
  };

  const renderToolCalls = (toolCalls: ToolCall[]) => {
    return toolCalls.map((toolCall, index) => (
      <Card 
        key={index} 
        size="small" 
        style={{ marginTop: '8px', backgroundColor: '#f5f5f5' }}
        title={
          <span>
            <Tag color="blue">Tool call</Tag>
            {toolCall.toolName}
          </span>
        }
      >
        <div style={{ fontSize: '12px' }}>
          <div><strong>Parameters:</strong> {JSON.stringify(toolCall.args, null, 2)}</div>
          <div style={{ marginTop: '8px' }}>
            <strong>Result:</strong>
            <pre style={{ 
              backgroundColor: '#fff', 
              padding: '8px', 
              borderRadius: '4px',
              fontSize: '11px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {toolCall.result}
            </pre>
          </div>
        </div>
      </Card>
    ));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto' }}>
      {/* MCP control panel */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0 }}>Karmada Assistant</h3>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              {mcpEnabled ? `MCP enabled, ${availableTools.length} tools available` : 'MCP not enabled'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Switch
              checked={enableMCP}
              onChange={setEnableMCP}
              disabled={!mcpEnabled}
            />
            <span>Enable MCP</span>
            {mcpEnabled && (
              <Tooltip title={`Available tools: ${availableTools.map(t => t.name).join(', ')}`}>
                <Tag color="green">MCP available</Tag>
              </Tooltip>
            )}
          </div>
        </div>
      </Card>

      {/* message list */}
      <List
        dataSource={messages}
        renderItem={(item) => (
          <List.Item style={{ textAlign: item.sender === 'user' ? 'right' : 'left' }}>
            <List.Item.Meta
              avatar={item.sender === 'bot' ? <Icons.bot /> : <Icons.user />}
              title={item.sender === 'user' ? 'User' : 'Assistant'}
              description={
                <div>
                  <div>{item.text}</div>
                  {item.toolCalls && item.toolCalls.length > 0 && renderToolCalls(item.toolCalls)}
                </div>
              }
            />
          </List.Item>
        )}
      />
      
      {/* input area */}
      <div style={{ display: 'flex', marginTop: '20px', gap: '10px' }}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handleSendMessage}
          placeholder={enableMCP ? "Enter your question, MCP will help query cluster information..." : "Enter your question..."}
          style={{ flex: 1 }}
        />
        <Button 
          onClick={handleSendMessage} 
          type="primary"
          disabled={!inputValue.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default AssistantPage;