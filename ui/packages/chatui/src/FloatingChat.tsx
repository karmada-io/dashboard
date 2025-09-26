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

import React, { useState, useRef, useEffect } from "react";
import Chat, { Bubble, useMessages } from "@chatui/core";
import "@chatui/core/dist/index.css";
import "./styles.css";
import { ChatAPI } from "./api";
import { ChatUIProps, QuickReply } from "./types";

// Constants
const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { icon: "message", name: "Help documentation", isHighlight: true },
  { name: "List all clusters" },
  { name: "List all namespaces" },
  { name: "Create deployment" },
];

const DEFAULT_MESSAGES = [
  { type: "system", content: { text: "Karmada AI Assistant at your service" } },
  {
    type: "text",
    content: {
      text: "Hi, I am your dedicated AI assistant. Feel free to ask me anything!",
    },
    user: { avatar: "/favicon.ico", name: "Assistant" },
  },
];

// Styles
const STYLES = {
  container: {
    backgroundColor: "#f8f9fa",
    borderRadius: "16px",
    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.2)",
    border: "1px solid #e8e8e8",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
  },
  controlBar: {
    padding: "12px 16px",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #e8e8e8",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    fontSize: "12px",
    flexShrink: 0,
  },
  toolCall: {
    background: "#f0f9ff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    marginBottom: "4px",
    padding: "12px",
  },
  button: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "none",
    boxShadow: "0 8px 24px rgba(24, 144, 255, 0.3)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    color: "white",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    outline: "none",
    position: "relative" as const,
  },
};

const formatToolCall = (toolCall: any) =>
  `karmada-mcp-server : ${toolCall.toolName}`;

export const FloatingChat: React.FC<ChatUIProps> = ({
  apiConfig,
  theme = "light",
  position = "bottom-right",
  avatar = "/favicon.ico",
  quickReplies = DEFAULT_QUICK_REPLIES,
  enableMCP: initialEnableMCP = false,
  className = "",
  width = 400,
  height = 600,
  title = "Karmada Assistant",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [enableMCP, setEnableMCP] = useState(initialEnableMCP);
  const [mcpAvailable, setMcpAvailable] = useState(false);
  const [mcpToolCount, setMcpToolCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLButtonElement>(null);
  const currentControllerRef = useRef<AbortController | null>(null);
  const apiRef = useRef<ChatAPI>(new ChatAPI(apiConfig));

  const { messages, appendMsg, updateMsg, deleteMsg } =
    useMessages(DEFAULT_MESSAGES);

  // Update API config when props change
  useEffect(() => {
    apiRef.current = new ChatAPI(apiConfig);
  }, [apiConfig]);

  // Check MCP availability
  useEffect(() => {
    const checkMCP = async () => {
      try {
        const data = await apiRef.current.checkMCPAvailability();
        const available =
          data.enabled === true && data.tools && data.tools.length > 0;
        setMcpAvailable(available);
        setMcpToolCount(data.tools?.length || 0);

        if (!available) {
          setEnableMCP(false);
        }
      } catch (error) {
        console.error("Failed to check MCP:", error);
        setMcpAvailable(false);
        setMcpToolCount(0);
        setEnableMCP(false);
      }
    };
    checkMCP();
  }, []);

  // Handle chat ball click
  const handleToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (ballRef.current && ballRef.current.contains(target)) {
        return;
      }

      if (chatRef.current && chatRef.current.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  // Cleanup controller on unmount
  useEffect(() => {
    return () => {
      if (currentControllerRef.current) {
        currentControllerRef.current.abort();
        currentControllerRef.current = null;
      }
    };
  }, []);

  // Unified stream handler
  const handleStream = async (val: string, shouldUseMCP: boolean) => {
    const controller = new AbortController();
    currentControllerRef.current = controller;
    let botMessageId: number | null = null; // Date.now()
    const botMessage = {
      type: "text",
      content: { text: "thinking" },
      position: "left" as const,
      user: { avatar, name: "Assistant" },
      _id: -1,
    };
    appendMsg(botMessage);
    let streamingText = "";

    const onData = (data: string) => {
      if (controller.signal.aborted) return;
      if (!botMessageId) {
        deleteMsg(-1);

        botMessageId = Date.now();
        appendMsg({
          ...botMessage,
          _id: botMessageId,
        });
      }

      streamingText += data;
      botMessageId &&
        updateMsg(botMessageId, {
          ...botMessage,
          _id: botMessageId,
          content: { text: streamingText },
        });
    };

    const onError = (error: any) => {
      if (controller.signal.aborted) return;
      const errorMessage =
        error instanceof Error ? error.message : "Problem processing request";
      const prefix = shouldUseMCP ? "MCP Error" : "API Error";

      if (botMessageId) {
        updateMsg(botMessageId, {
          type: "text",
          content: { text: `${prefix}: ${errorMessage}` },
          position: "left",
          user: { avatar: "❌", name: "Error" },
        });
      } else {
        // If no botMessageId exists, append a new error message
        appendMsg({
          type: "text",
          content: { text: `${prefix}: ${errorMessage}` },
          position: "left",
          user: { avatar: "❌", name: "Error" },
        });
      }
    };

    const onComplete = () => {
      botMessageId = null;
      if (controller.signal.aborted) return;
      if (currentControllerRef.current === controller) {
        currentControllerRef.current = null;
      }
    };

    try {
      if (shouldUseMCP) {
        await apiRef.current.getChatStream(
          { message: val, history: [], enableMcp: true },
          onData,
          (toolCall) => {
            if (controller.signal.aborted) return;
            deleteMsg(-1);
            appendMsg({
              type: "tool_call",
              content: { text: formatToolCall(toolCall), toolCall },
              position: "left",
              user: { avatar, name: "Assistant" },
            });
          },
          onError,
          onComplete,
          controller.signal,
        );
      } else {
        await apiRef.current.getLegacyChatStream(
          val,
          onData,
          onError,
          onComplete,
          controller.signal,
        );
      }
    } catch (error) {
      onError(error);
    }
  };

  const handleSend = async (type: string, val: string) => {
    if (type !== "text" || !val.trim()) return;

    // Abort previous request
    currentControllerRef.current?.abort();
    currentControllerRef.current = null;

    // Add user message
    appendMsg({
      type: "text",
      content: { text: val },
      position: "right",
    });

    const shouldUseMCP = enableMCP && mcpAvailable;
    await handleStream(val, shouldUseMCP);
  };

  const handleQuickReplyClick = (item: any) => {
    handleSend("text", item.name);
  };

  // Render message content
  const renderMessageContent = (msg: any) => {
    const { type, content } = msg;

    switch (type) {
      case "text":
        return <Bubble content={content.text} />;
      case "tool_call":
        return (
          <div style={STYLES.toolCall}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#1e40af",
                    fontWeight: "500",
                    fontSize: "13px",
                  }}
                >
                  {content.text}
                </div>
                {content.toolCall && (
                  <details style={{ marginTop: "8px" }}>
                    <summary
                      style={{
                        cursor: "pointer",
                        color: "#6b7280",
                        fontSize: "11px",
                        userSelect: "none",
                      }}
                    >
                      View Details
                    </summary>
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px",
                        background: "#f8fafc",
                        borderRadius: "4px",
                        fontSize: "11px",
                        color: "#4b5563",
                      }}
                    >
                      <div>
                        <strong>Tool:</strong> {content.toolCall.toolName}
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        <strong>Parameters:</strong>
                        <pre
                          style={{
                            margin: "4px 0",
                            padding: "4px",
                            background: "white",
                            borderRadius: "2px",
                            fontSize: "10px",
                            overflow: "auto",
                            maxHeight: "100px",
                          }}
                        >
                          {JSON.stringify(content.toolCall.args, null, 2)}
                        </pre>
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        <strong>Result:</strong>
                        <pre
                          style={{
                            margin: "4px 0",
                            padding: "8px",
                            background: "white",
                            borderRadius: "4px",
                            fontSize: "11px",
                            overflow: "auto",
                            maxHeight: "200px",
                            maxWidth: "100%",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            lineHeight: "1.4",
                          }}
                        >
                          {typeof content.toolCall.result === "string"
                            ? content.toolCall.result.length > 500
                              ? content.toolCall.result.substring(0, 500) +
                                "...\n\n[Content too long, truncated]"
                              : content.toolCall.result
                            : JSON.stringify(content.toolCall.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        );
      case "image":
        return (
          <Bubble type="image">
            <img src={content.picUrl} alt="" />
          </Bubble>
        );
      default:
        return null;
    }
  };

  // Calculate position styles
  const getPositionStyles = () => {
    const [vertical, horizontal] = position.split("-");
    return {
      position: "fixed" as const,
      [vertical]: "20px",
      [horizontal]: "20px",
      zIndex: 9999,
    };
  };

  const getChatPositionStyles = () => {
    const [vertical, horizontal] = position.split("-");
    return {
      position: "absolute" as const,
      [vertical === "bottom" ? "bottom" : "top"]: "70px",
      [horizontal]: "0",
    };
  };

  return (
    <div
      className={`karmada-floating-chat-wrapper ${className}`}
      style={{
        ...getPositionStyles(),
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Chat Container */}
      {isOpen && (
        <div
          ref={chatRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...getChatPositionStyles(),
            width: `${width}px`,
            height: `${height}px`,
            ...STYLES.container,
          }}
        >
          {/* MCP Control Bar */}
          <div style={STYLES.controlBar}>
            {/* Title row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ color: "#333", fontSize: "14px", fontWeight: "500" }}
              >
                {title}
              </span>

              {/* Toggle switch */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "11px", color: "#666" }}>
                  Enable MCP
                </span>
                <div
                  onClick={() => mcpAvailable && setEnableMCP(!enableMCP)}
                  style={{
                    width: "36px",
                    height: "20px",
                    borderRadius: "10px",
                    backgroundColor:
                      enableMCP && mcpAvailable ? "#52c41a" : "#d9d9d9",
                    position: "relative",
                    cursor: mcpAvailable ? "pointer" : "not-allowed",
                    opacity: mcpAvailable ? 1 : 0.5,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: "white",
                      position: "absolute",
                      top: "2px",
                      left: enableMCP && mcpAvailable ? "18px" : "2px",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Status row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* MCP status and tool count */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    color: enableMCP && mcpAvailable ? "#52c41a" : "#666",
                    fontSize: "11px",
                    fontWeight: "500",
                  }}
                >
                  {enableMCP && mcpAvailable
                    ? `MCP enabled, ${mcpToolCount} tools available`
                    : mcpAvailable
                      ? "MCP available"
                      : "MCP unavailable"}
                </span>
              </div>

              {/* Status indicator */}
              <div
                style={{
                  padding: "2px 6px",
                  borderRadius: "8px",
                  backgroundColor: mcpAvailable ? "#f6ffed" : "#fff2f0",
                  border: `1px solid ${mcpAvailable ? "#b7eb8f" : "#ffccc7"}`,
                  fontSize: "10px",
                  color: mcpAvailable ? "#52c41a" : "#ff4d4f",
                  fontWeight: "500",
                }}
              >
                {mcpAvailable ? "MCP available" : "MCP unavailable"}
              </div>
            </div>
          </div>

          {/* Chat Body */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Chat
              navbar={{ title: "" }}
              messages={messages}
              renderMessageContent={renderMessageContent}
              quickReplies={quickReplies}
              onQuickReplyClick={handleQuickReplyClick}
              onSend={handleSend}
              placeholder="Type a message..."
            />
          </div>
        </div>
      )}

      {/* Floating Chat Ball */}
      <button
        ref={ballRef}
        onClick={handleToggle}
        style={{
          ...STYLES.button,
          background: isOpen
            ? "linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%)"
            : "linear-gradient(135deg, #40a9ff 0%, #1890ff 100%)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05) translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 12px 32px rgba(24, 144, 255, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1) translateY(0px)";
          e.currentTarget.style.boxShadow =
            "0 8px 24px rgba(24, 144, 255, 0.3)";
        }}
        title="AI Assistant"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.8" />
          </svg>
        )}

        {/* Pulse animation */}
        {!isOpen && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "inherit",
              animation: "pulse 2s infinite",
              opacity: 0.6,
            }}
          />
        )}
      </button>

      {/* Pulse Animation Keyframes */}
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
