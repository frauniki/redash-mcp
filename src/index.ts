#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RedashClient } from "./client.js";
import { registerDataSourceTools } from "./tools/data-sources.js";
import { registerQueryTools } from "./tools/queries.js";
import { registerExecuteTools } from "./tools/execute.js";
import { registerVisualizationTools } from "./tools/visualizations.js";
import { registerDashboardTools } from "./tools/dashboards.js";

function main(): void {
  const redashUrl = process.env.REDASH_URL;
  const redashApiKey = process.env.REDASH_API_KEY;

  if (!redashUrl) {
    console.error("Error: REDASH_URL environment variable is required.");
    process.exit(1);
  }

  if (!redashApiKey) {
    console.error("Error: REDASH_API_KEY environment variable is required.");
    process.exit(1);
  }

  const client = new RedashClient(redashUrl, redashApiKey);

  const server = new McpServer({
    name: "redash-mcp",
    version: "1.0.0",
  });

  registerDataSourceTools(server, client);
  registerQueryTools(server, client);
  registerExecuteTools(server, client);
  registerVisualizationTools(server, client);
  registerDashboardTools(server, client);

  const transport = new StdioServerTransport();
  server.connect(transport).catch((error) => {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  });
}

main();
