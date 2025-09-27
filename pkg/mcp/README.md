# Karmada Assistant

AI-powered chat functionality for Karmada dashboard with MCP (Model Context Protocol) tool integration.

## 📋 Overview

The Karmada Assistant provides intelligent chat capabilities that can interact with Karmada clusters through MCP tools. It supports both legacy chat (without tools) and modern chat (with real-time cluster tool integration), enabling users to manage and query their Karmada multi-cluster environments through natural language.

## 🚀 Quick Start

### Prerequisites

1. **Karmada Cluster**: A running Karmada control plane
2. **MCP Server**: Karmada MCP server binary
3. **OpenAI API Key**: For AI model access
4. **Kubeconfig**: Valid Karmada cluster configuration

## 💬 Usage Examples

### Basic Cluster Queries

**List all clusters:**
```
User: "Show me all clusters"
Assistant: [Executes list_clusters tool and displays cluster information]
```

**Get cluster status:**
```
User: "What's the status of my member clusters?"
Assistant: [Retrieves and displays cluster health and status information]
```

**Check resource distribution:**
```
User: "How are my workloads distributed across clusters?"
Assistant: [Shows workload distribution and resource allocation]
```

## ⚙️ Configuration

### Command Line Flags

The MCP and OpenAI integration is now configured via command line flags:

```bash
# Complete configuration example
./karmada-dashboard-api \
  --enable-mcp=true \
  --mcp-transport-mode=stdio \
  --mcp-server-path=/usr/local/bin/karmada-mcp-server \
  --karmada-kubeconfig=/path/to/karmada.config \
  --karmada-context=karmada-apiserver \
  --openai-api-key=sk-xxxx \
  --openai-model=gpt-4 \
  --openai-endpoint=https://api.openai.com/v1

# Minimal MCP configuration with stdio mode
./karmada-dashboard-api \
  --enable-mcp=true \
  --mcp-server-path=/usr/local/bin/karmada-mcp-server \
  --karmada-kubeconfig=/path/to/karmada.config \
  --openai-api-key=sk-xxxx

# MCP with SSE mode
./karmada-dashboard-api \
  --enable-mcp=true \
  --mcp-transport-mode=sse \
  --mcp-sse-endpoint=http://localhost:1234/mcp/sse \
  --karmada-kubeconfig=/path/to/karmada.config \
  --openai-api-key=sk-xxxx
```

#### Configuration Flags:

**MCP Configuration:**
- `--enable-mcp`: Enable MCP integration (default: false)
- `--mcp-transport-mode`: Transport mode - "stdio" or "sse" (default: "stdio")
- `--mcp-server-path`: Path to MCP server binary (required for stdio mode)
- `--mcp-sse-endpoint`: SSE endpoint URL (required for sse mode)

**OpenAI Configuration:**
- `--openai-api-key`: OpenAI API key (required for AI functionality)
- `--openai-model`: OpenAI model name (default: "gpt-3.5-turbo")
- `--openai-endpoint`: OpenAI API endpoint (default: "https://api.openai.com/v1")

**Karmada Configuration:**
- `--karmada-kubeconfig`: Path to Karmada kubeconfig (used by MCP)
- `--karmada-context`: Karmada context name (used by MCP, default: "karmada-apiserver")

### Migration from Environment Variables

❌ **Removed**: The following environment variables are no longer supported:

**MCP Related:**
- `ENABLE_MCP` → Use `--enable-mcp` flag
- `MCP_TRANSPORT_MODE` → Use `--mcp-transport-mode` flag  
- `KARMADA_MCP_SERVER_PATH` → Use `--mcp-server-path` flag
- `MCP_SSE_ENDPOINT` → Use `--mcp-sse-endpoint` flag
- `KUBECONFIG` → Use `--karmada-kubeconfig` flag
- `KARMADA_CONTEXT` → Use `--karmada-context` flag

**OpenAI Related:**
- `OPENAI_API_KEY` → Use `--openai-api-key` flag
- `OPENAI_MODEL` → Use `--openai-model` flag
- `OPENAI_ENDPOINT` → Use `--openai-endpoint` flag

### MCP Server Setup

The assistant requires a Karmada MCP server to provide cluster management tools:
> 📢 Note: The MCP server is currently under active development and not yet published via GitHub Releases. 
> You'll need to build it from source.

```bash
# Clone the MCP server repository
git clone https://github.com/warjiang/karmada-mcp-server.git
cd karmada-mcp-server

# Build the server
go build -o karmada-mcp-server ./cmd/karmada-mcp-server

# (Optional) Move it to a directory in your PATH
sudo mv karmada-mcp-server /usr/local/bin/

# Verify installation
karmada-mcp-server --help

# Test MCP server (optional)
./karmada-mcp-server stdio \
  --karmada-kubeconfig=/path/to/karmada.config \
  --karmada-context=karmada-apiserver
```
