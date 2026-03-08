# redash-mcp

MCP Server for [Redash](https://redash.io/) — execute queries, create visualizations, and build dashboards from Claude Code or any MCP client.

## Tools

| Tool                   | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `list_data_sources`    | List all available data sources                   |
| `list_queries`         | Search and list saved queries                     |
| `get_query_result`     | Get the latest result of a saved query            |
| `create_query`         | Create a new query                                |
| `execute_query`        | Execute SQL and return results (with job polling) |
| `create_visualization` | Create a visualization for a query                |
| `create_dashboard`     | Create a new dashboard                            |
| `add_widget`           | Add a widget to a dashboard                       |
| `publish_dashboard`    | Publish a draft dashboard                         |

## Setup

### Prerequisites

- Node.js >= 18
- pnpm
- A Redash instance with an API key

### Usage with npx

```bash
REDASH_URL=https://redash.example.com REDASH_API_KEY=your-api-key npx @frauniki/redash-mcp
```

### Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "redash": {
      "command": "npx",
      "args": ["redash-mcp"],
      "env": {
        "REDASH_URL": "https://redash.example.com",
        "REDASH_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Environment Variables

| Variable         | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `REDASH_URL`     | Base URL of your Redash instance (e.g., `https://redash.example.com`) |
| `REDASH_API_KEY` | Your Redash API key                                                   |

### Install from source

```bash
pnpm install
pnpm build
```

## Development

```bash
pnpm test          # Run tests
pnpm test:watch    # Run tests in watch mode
pnpm lint          # Lint
pnpm lint:fix      # Lint and fix
pnpm format        # Format with Prettier
pnpm format:check  # Check formatting
pnpm build         # Build
```

## License

ISC
