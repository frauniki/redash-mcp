import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { RedashClient, getErrorMessage } from "../client.js";

export function registerDataSourceTools(server: McpServer, client: RedashClient): void {
  server.tool("list_data_sources", "List all available Redash data sources", async () => {
    try {
      const dataSources = await client.listDataSources();
      const result = dataSources.map((ds) => `- [${ds.id}] ${ds.name} (${ds.type})`).join("\n");
      return {
        content: [{ type: "text", text: result || "No data sources found." }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${getErrorMessage(error)}` }],
        isError: true,
      };
    }
  });
}
