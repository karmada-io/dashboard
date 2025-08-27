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

### MCP Server Setup

The assistant requires a Karmada MCP server to provide cluster management tools:
> 📢 Note: The MCP server is currently under active development and not yet published via GitHub Releases. 
> You’ll need to build it from source.
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

### Environment Variables

```bash
# === OpenAI Configuration ===
export OPENAI_API_KEY="sk-xxxx"
export OPENAI_MODEL="gpt-4" # Optional, defaults to gpt-3.5-turbo 
export OPENAI_ENDPOINT="https://api.openai.com/v1" # Optional

# === Karmada Cluster Config ===
export KUBECONFIG="$HOME/.kube/karmada.config"
export KARMADA_CONTEXT="karmada-apiserver"

# === MCP Integration ===
export ENABLE_MCP=true
export MCP_TRANSPORT_MODE="sse" # Optional, defaults to stdio 
export KARMADA_MCP_SERVER_PATH="/usr/local/bin/karmada-mcp-server" # Required in STDIO mode 
export MCP_SSE_ENDPOINT="http://localhost:1234/mcp/sse" # Required in SSE mode
```


## 🔧 Development

### Local Development Setup

1. **Clone and Setup**:
```bash
git clone https://github.com/warjiang/karmada-mcp-server
cd karmada-mcp-server
go run ./cmd/karmada-mcp-server/main.go
```

2. **Setup Environment Variables**
3. 
4. **Run Development Server**
