import React, { useState, useRef, useEffect } from 'react';
import Chat, { Bubble, useMessages } from '@chatui/core';
import '@chatui/core/dist/index.css';
import './index.module.less';

interface FloatingChatProps {
  className?: string;
}

const initialMessages = [
  {
    type: 'system',
    content: { text: 'Karmada AI Assistant at your service' },
  },
  {
    type: 'text',
    content: { text: 'Hi, I am your dedicated AI assistant. Feel free to ask me anything!' },
    user: {
      avatar: '/favicon.ico',
      name: 'Assistant'
    },
  },
];

// Default quick replies
const defaultQuickReplies = [
  {
    icon: 'message',
    name: 'Help documentation',
    isHighlight: true,
  },
  {
    name: 'List all clusters',
  },
  {
    name: 'List all namespaces',
  },
  {
    name: 'Create deployment',
  },
];

// Tool name mapping - convert technical names to user-friendly display names (kept for potential future use but currently unused)
// const getToolDisplayName = (toolName: string): string => {
//   const toolNames: Record<string, string> = {
//     'list_clusters': 'Cluster List',
//     'list_namespace': 'Namespace List', 
//     'get_cluster_status': 'Cluster Status',
//     'list_deployments': 'Deployment List',
//     'get_pods': 'Pod List',
//     'get_resource_usage': 'Resource Usage',
//     'list_nodes': 'Node List',
//     'get_events': 'Event List',
//   };
//   return toolNames[toolName] || toolName;
// };

// Format tool call results into user-friendly text
const formatToolCallResult = (toolCall: any): string => {
  // Simple format: server : tool_name
  return `karmada-mcp-server : ${toolCall.toolName}`;
};

const FloatingChat: React.FC<FloatingChatProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [enableMCP, setEnableMCP] = useState(false);
  const [mcpAvailable, setMcpAvailable] = useState(false);
  const [mcpToolCount, setMcpToolCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLButtonElement>(null);
  const currentControllerRef = useRef<AbortController | null>(null); // For interrupting streaming requests

  const { messages, appendMsg, updateMsg } = useMessages(initialMessages);

  // Check MCP availability
  useEffect(() => {
    const checkMCP = async () => {
      try {
        const response = await fetch('/api/v1/chat/tools');
        const data = await response.json();
        const available = data.enabled === true && data.tools && data.tools.length > 0;
        setMcpAvailable(available);
        setMcpToolCount(data.tools?.length || 0);
        console.log('MCP available:', data.enabled, 'Tools:', data.tools?.length || 0);
        
        if (!available) {
          setEnableMCP(false); // Force disable switch if MCP is unavailable
        }
      } catch (error) {
        console.error('Failed to check MCP:', error);
        setMcpAvailable(false);
        setMcpToolCount(0);
        setEnableMCP(false);
      }
    };
    checkMCP();
  }, []);

  // Handle chat ball click
  const handleToggle = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    setIsOpen(!isOpen);
  };

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // 如果点击的是悬浮球，不关闭（已经通过stopPropagation处理）
      if (ballRef.current && ballRef.current.contains(target)) {
        return;
      }
      
      // 如果点击的是聊天容器内部，不关闭
      if (chatRef.current && chatRef.current.contains(target)) {
        return;
      }
      
      // 其他情况都关闭聊天框
      setIsOpen(false);
    };

    if (isOpen) {
      // 延迟添加事件监听器，避免立即触发
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // 组件卸载时清理控制器
  useEffect(() => {
    return () => {
      if (currentControllerRef.current) {
        currentControllerRef.current.abort();
        currentControllerRef.current = null;
      }
    };
  }, []);

  // 发送消息并集成MCP - 支持流式更新和中断
  const handleSend = async (type: string, val: string) => {
    if (type === 'text' && val.trim()) {
      // 中断上一个正在进行的请求
      if (currentControllerRef.current) {
        currentControllerRef.current.abort();
        currentControllerRef.current = null;
      }

      // 添加用户消息
      appendMsg({
        type: 'text',
        content: { text: val },
        position: 'right',
      });

      // 添加空的助手消息用于流式更新
      const botMessageId = appendMsg({
        type: 'text',
        content: { text: '' },
        position: 'left',
        user: { avatar: '/favicon.ico' }
      });

      try {
        const shouldUseMCP = enableMCP && mcpAvailable;
        console.log('Chat decision:', { enableMCP, mcpAvailable, shouldUseMCP });

        if (shouldUseMCP) {
          // 使用MCP API
          const { getChatStream } = await import('@/services/assistant');
          let streamingText = '';
          
          // 创建新的控制器
          const controller = new AbortController();
          currentControllerRef.current = controller;
          
          getChatStream(
            val,
            [], // 暂时不保存历史记录
            true, // 启用MCP
            (data) => {
              // 检查请求是否已被中断
              if (controller.signal.aborted) return;
              
              // 实时更新消息内容
              streamingText += data;
              updateMsg(botMessageId, {
                type: 'text',
                content: { text: streamingText },
                position: 'left',
                user: { avatar: '/favicon.ico' }
              });
            },
            (toolCall) => {
              // 检查请求是否已被中断
              if (controller.signal.aborted) return;
              
              // 显示友好的工具调用消息
              appendMsg({
                type: 'tool_call',
                content: { 
                  text: formatToolCallResult(toolCall),
                  toolCall: toolCall // 保存原始数据供详情查看
                },
                position: 'left',
                user: { 
                  avatar: '/favicon.ico',
                  name: 'Assistant'
                }
              });
            },
            (error) => {
              // 如果是用户主动中断，不显示错误
              if (controller.signal.aborted) return;
              
              console.error('MCP Chat error:', error);
              updateMsg(botMessageId, {
                type: 'text',
                content: { text: `MCP Error: ${error.message || 'Problem processing request'}` },
                position: 'left',
                user: { avatar: '❌' }
              });
            },
            () => {
              // 检查请求是否已被中断
              if (controller.signal.aborted) return;
              
              console.log('MCP Chat stream finished, final text:', streamingText);
              // 清除控制器引用
              if (currentControllerRef.current === controller) {
                currentControllerRef.current = null;
              }
            },
            controller.signal // Pass the abort signal
          );
        } else {
          // 使用传统API
          console.log('Using traditional API');
          const { getAssistantStream } = await import('@/services/assistant');
          let streamingText = '';
          
          // 创建新的控制器
          const controller = new AbortController();
          currentControllerRef.current = controller;
          
          getAssistantStream(
            val,
            (data) => {
              // 检查请求是否已被中断
              if (controller.signal.aborted) return;
              
              // 实时更新消息内容
              streamingText += data;
              updateMsg(botMessageId, {
                type: 'text',
                content: { text: streamingText },
                position: 'left',
                user: { avatar: '/favicon.ico' }
              });
            },
            (error) => {
              // 如果是用户主动中断，不显示错误
              if (controller.signal.aborted) return;
              
              console.error('Assistant error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Problem processing request';
              updateMsg(botMessageId, {
                type: 'text',
                content: { text: `API Error: ${errorMessage}` },
                position: 'left',
                user: { avatar: '❌' }
              });
            },
            () => {
              // 检查请求是否已被中断
              if (controller.signal.aborted) return;
              
              console.log('Assistant stream finished, final text:', streamingText);
              // 清除控制器引用
              if (currentControllerRef.current === controller) {
                currentControllerRef.current = null;
              }
            },
            controller.signal // Pass the abort signal
          );
        }
      } catch (error) {
        console.error('Failed to process request:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unable to connect to server';
        updateMsg(botMessageId, {
          type: 'text',
          content: { text: `Network Error: ${errorMessage}` },
          position: 'left',
          user: { avatar: '❌' }
        });
      }
    }
  };

  // 快捷短语回调
  const handleQuickReplyClick = (item: any) => {
    handleSend('text', item.name);
  };

  // 渲染消息内容
  const renderMessageContent = (msg: any) => {
    const { type, content } = msg;

    switch (type) {
      case 'text':
        return <Bubble content={content.text} />;
      case 'tool_call':
        // 使用Card组件美化工具调用显示
        return (
          <div style={{ 
            background: '#f0f9ff', 
            border: '1px solid #bfdbfe', 
            borderRadius: '8px',
            marginBottom: '4px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  color: '#1e40af', 
                  fontWeight: '500',
                  fontSize: '13px'
                }}>
                  {content.text}
                </div>
                {content.toolCall && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ 
                      cursor: 'pointer', 
                      color: '#6b7280', 
                      fontSize: '11px',
                      userSelect: 'none'
                    }}>
                      View Details
                    </summary>
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px',
                      background: '#f8fafc',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#4b5563'
                    }}>
                      <div><strong>Tool:</strong> {content.toolCall.toolName}</div>
                      <div style={{ marginTop: '4px' }}>
                        <strong>Parameters:</strong>
                        <pre style={{ 
                          margin: '4px 0', 
                          padding: '4px',
                          background: 'white',
                          borderRadius: '2px',
                          fontSize: '10px',
                          overflow: 'auto',
                          maxHeight: '100px'
                        }}>
                          {JSON.stringify(content.toolCall.args, null, 2)}
                        </pre>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <strong>Result:</strong>
                        <pre style={{ 
                          margin: '4px 0', 
                          padding: '8px',
                          background: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          overflow: 'auto',
                          maxHeight: '200px',
                          maxWidth: '100%',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: '1.4'
                        }}>
                          {typeof content.toolCall.result === 'string' 
                            ? content.toolCall.result.length > 500 
                              ? content.toolCall.result.substring(0, 500) + '...\n\n[Content too long, truncated]'
                              : content.toolCall.result
                            : JSON.stringify(content.toolCall.result, null, 2)
                          }
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        );
      case 'image':
        return (
          <Bubble type="image">
            <img src={content.picUrl} alt="" />
          </Bubble>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="floating-chat-wrapper"
      style={{
        position: 'fixed',
        bottom: '20px', 
        right: '20px',
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >      
      {/* Chat Container */}
      {isOpen && (
        <div 
          ref={chatRef}
          onClick={(e) => e.stopPropagation()} // 防止点击聊天容器时事件冒泡
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '0',
            width: '400px',
            height: '600px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e8e8e8',
          }}
        >
          {/* MCP控制栏 - 增强版 */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '12px',
            flexShrink: 0,
          }}>
            {/* 标题行 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#333', fontSize: '14px', fontWeight: '500' }}>Karmada Assistant</span>
              
              {/* 切换开关 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>Enable MCP</span>
                <div
                  onClick={() => mcpAvailable && setEnableMCP(!enableMCP)}
                  style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    backgroundColor: enableMCP && mcpAvailable ? '#52c41a' : '#d9d9d9',
                    position: 'relative',
                    cursor: mcpAvailable ? 'pointer' : 'not-allowed',
                    opacity: mcpAvailable ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: enableMCP && mcpAvailable ? '18px' : '2px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* 状态行 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* MCP状态和工具数量 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  color: enableMCP && mcpAvailable ? '#52c41a' : '#666',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  {enableMCP && mcpAvailable 
                    ? `MCP enabled, ${mcpToolCount} tools available` 
                    : mcpAvailable 
                      ? 'MCP available' 
                      : 'MCP unavailable'
                  }
                </span>
              </div>
              
              {/* 状态指示器 */}
              <div style={{
                padding: '2px 6px',
                borderRadius: '8px',
                backgroundColor: mcpAvailable ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${mcpAvailable ? '#b7eb8f' : '#ffccc7'}`,
                fontSize: '10px',
                color: mcpAvailable ? '#52c41a' : '#ff4d4f',
                fontWeight: '500'
              }}>
                {mcpAvailable ? 'MCP available' : 'MCP unavailable'}
              </div>
            </div>
          </div>
          
          {/* Chat组件容器 - 固定输入框在底部 */}
          <div className="chat-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Chat
              navbar={{ title: '' }}
              messages={messages}
              renderMessageContent={renderMessageContent}
              quickReplies={defaultQuickReplies}
              onQuickReplyClick={handleQuickReplyClick}
              onSend={handleSend}
              placeholder="Type a message..."
            />
          </div>
        </div>
      )}

      {/* Floating Chat Ball - 更优雅的设计 */}
      <button 
        ref={ballRef}
        onClick={handleToggle}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isOpen 
            ? 'linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%)'
            : 'linear-gradient(135deg, #40a9ff 0%, #1890ff 100%)',
          border: 'none',
          boxShadow: '0 8px 24px rgba(24, 144, 255, 0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          color: 'white',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(24, 144, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(24, 144, 255, 0.3)';
        }}
        title="AI Assistant"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.8"/>
          </svg>
        )}
        
        {/* 脉冲动画效果 */}
        {!isOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'inherit',
              animation: 'pulse 2s infinite',
              opacity: 0.6,
            }}
          />
        )}
      </button>

      {/* 添加脉冲动画的样式 */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
          100% {
            transform: scale(1);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingChat;