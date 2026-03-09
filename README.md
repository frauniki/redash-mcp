# redash-mcp

MCP Server for [Redash](https://redash.io/) — execute queries, create visualizations, and build dashboards from Claude Code or any MCP client.

## Tools

| Tool                   | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `list_data_sources`    | List all available data sources                   |
| `list_queries`         | Search and list saved queries                     |
| `get_query`            | Get a query with visualizations                   |
| `get_query_result`     | Get the latest result of a saved query            |
| `create_query`         | Create a new query                                |
| `update_query`         | Update an existing query                          |
| `archive_query`        | Archive (delete) a query                          |
| `execute_query`        | Execute SQL and return results (with job polling) |
| `create_visualization` | Create a visualization for a query                |
| `update_visualization` | Update a visualization                            |
| `delete_visualization` | Delete a visualization                            |
| `create_dashboard`     | Create a new dashboard                            |
| `get_dashboard`        | Get a dashboard with its widgets                  |
| `update_dashboard`     | Update a dashboard (name, tags, options, filters) |
| `publish_dashboard`    | Publish a draft dashboard                         |
| `archive_dashboard`    | Archive (delete) a dashboard                      |
| `add_widget`           | Add a widget to a dashboard                       |
| `update_widget`        | Update a widget (text or options)                 |
| `delete_widget`        | Delete a widget from a dashboard                  |

## Setup

### Prerequisites

- Node.js >= 20
- pnpm
- A Redash instance with an API key

### Usage with npx

```bash
REDASH_URL=https://redash.example.com REDASH_API_KEY=your-api-key npx @frauniki/redash-mcp
```

### Claude Code

```bash
claude mcp add redash -e REDASH_URL=https://redash.example.com -e REDASH_API_KEY=your-api-key -- npx @frauniki/redash-mcp
```

Or add to `~/.claude.json` manually:

```json
{
  "mcpServers": {
    "redash": {
      "command": "npx",
      "args": ["@frauniki/redash-mcp"],
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
