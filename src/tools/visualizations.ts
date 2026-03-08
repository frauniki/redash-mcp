import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { RedashClient, getErrorMessage } from "../client.js";

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
          content: [{ type: "text", text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "update_visualization",
    "Update a Redash visualization",
    {
      visualization_id: z.number().describe("ID of the visualization"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      type: z.string().optional().describe("New visualization type"),
      options: z.record(z.string(), z.unknown()).optional().describe("New visualization options"),
    },
    async ({ visualization_id, ...params }) => {
      try {
        const result = await client.updateVisualization(visualization_id, params);
        return {
          content: [
            {
              type: "text",
              text: `Visualization updated successfully.\nID: ${result.id}\nName: ${result.name}\nType: ${result.type}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "delete_visualization",
    "Delete a Redash visualization",
    {
      visualization_id: z.number().describe("ID of the visualization to delete"),
    },
    async ({ visualization_id }) => {
      try {
        await client.deleteVisualization(visualization_id);
        return {
          content: [
            { type: "text", text: `Visualization ${visualization_id} deleted successfully.` },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        };
      }
    },
  );
}
