import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RedashClient } from "../client.js";

export function registerVisualizationTools(server: McpServer, client: RedashClient): void {
  server.tool(
    "create_visualization",
    "Create a visualization for a Redash query",
    {
      query_id: z.number().describe("ID of the query to visualize"),
      type: z.string().describe('Visualization type (e.g., "CHART", "TABLE", "PIVOT", "COHORT")'),
      name: z.string().describe("Name of the visualization"),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Visualization options (chart type, axes, etc.)"),
    },
    async ({ query_id, type, name, options }) => {
      try {
        const result = await client.createVisualization({
          query_id,
          type,
          name,
          options: options ?? {},
        });
        return {
          content: [
            {
              type: "text",
              text: `Visualization created successfully.\nID: ${result.id}\nName: ${result.name}\nType: ${result.type}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    },
  );
}
