# @karmada/chatui

A floating chat UI component with MCP (Model Context Protocol) integration for Karmada.

## Installation

```bash
npm install @karmada/chatui
# or
pnpm add @karmada/chatui
# or
yarn add @karmada/chatui
```

## Usage

```tsx
import React from "react";
import { FloatingChat } from "@karmada/chatui";

function App() {
  return (
    <div>
      <h1>My App</h1>
      <FloatingChat
        apiConfig={{
          chatEndpoint: "/api/v1/chat",
          toolsEndpoint: "/api/v1/chat/tools",
          headers: {
            Authorization: "Bearer your-token",
          },
        }}
        theme="light"
        position="bottom-right"
        enableMCP={true}
        title="Karmada Assistant"
        width={400}
        height={600}
      />
    </div>
  );
}

export default App;
```

## Props

### FloatingChat Props

| Prop           | Type                                                           | Default               | Description                             |
| -------------- | -------------------------------------------------------------- | --------------------- | --------------------------------------- |
| `apiConfig`    | `ApiConfig`                                                    | **Required**          | API configuration for chat endpoints    |
| `theme`        | `'light' \| 'dark'`                                            | `'light'`             | Theme of the chat UI                    |
| `position`     | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'`      | Position of the floating chat ball      |
| `avatar`       | `string`                                                       | `'/favicon.ico'`      | Avatar image URL for assistant messages |
| `quickReplies` | `QuickReply[]`                                                 | Default replies       | Quick reply buttons                     |
| `enableMCP`    | `boolean`                                                      | `false`               | Enable MCP integration                  |
| `className`    | `string`                                                       | `''`                  | Additional CSS class                    |
| `width`        | `number`                                                       | `400`                 | Chat window width in pixels             |
| `height`       | `number`                                                       | `600`                 | Chat window height in pixels            |
| `title`        | `string`                                                       | `'Karmada Assistant'` | Chat window title                       |

### ApiConfig

```tsx
interface ApiConfig {
  chatEndpoint: string; // Main chat API endpoint
  toolsEndpoint: string; // MCP tools API endpoint
  headers?: Record<string, string>; // Optional HTTP headers
}
```

### QuickReply

```tsx
interface QuickReply {
  icon?: string; // Optional icon
  name: string; // Display text and sent message
  isHighlight?: boolean; // Whether to highlight this reply
}
```

## API Integration

The component expects your backend to provide two endpoints:

### Chat Endpoint (`chatEndpoint`)

**POST** request with the following payload:

```json
{
  "message": "user message",
  "history": [],
  "enableMcp": true
}
```

**Response**: Server-sent events (SSE) stream with:

```
data: {"type": "content", "content": "response text"}
data: {"type": "tool_call", "toolCall": {"toolName": "...", "args": {...}, "result": "..."}}
data: {"type": "completion", "content": null}
```

### Tools Endpoint (`toolsEndpoint`)

**GET** request returning:

```json
{
  "enabled": true,
  "tools": [...]
}
```

## Styling

The component comes with built-in styles, but you can customize it by:

1. Using the `theme` prop for built-in light/dark themes
2. Adding custom CSS classes via the `className` prop
3. Overriding CSS custom properties in your global styles

## TypeScript

Full TypeScript support is included. Import types as needed:

```tsx
import { ChatUIProps, ApiConfig, QuickReply } from "@karmada/chatui";
```

## License

Apache-2.0

Copyright 2024 The Karmada Authors.
