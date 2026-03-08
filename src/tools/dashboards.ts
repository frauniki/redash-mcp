import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RedashClient } from "../client.js";

export function registerDashboardTools(server: McpServer, client: RedashClient): void {
  server.tool(
    "create_dashboard",
    "Create a new Redash dashboard",
    {
      name: z.string().describe("Name of the dashboard"),
    },
    async ({ name }) => {
      try {
        const result = await client.createDashboard(name);
        return {
          content: [
            {
              type: "text",
              text: `Dashboard created successfully.\nID: ${result.id}\nSlug: ${result.slug}\nName: ${result.name}`,
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

  server.tool(
    "add_widget",
    "Add a widget to a Redash dashboard",
    {
      dashboard_id: z.number().describe("ID of the dashboard"),
      visualization_id: z.number().optional().describe("ID of the visualization to add"),
      text: z
        .string()
        .optional()
        .describe("Text content for a text widget (use instead of visualization_id)"),
      position: z
        .object({
          col: z.number().describe("Column position (0-based)"),
          row: z.number().describe("Row position (0-based)"),
          sizeX: z.number().describe("Width in grid units"),
          sizeY: z.number().describe("Height in grid units"),
        })
        .optional()
        .describe("Widget position on the dashboard grid"),
      width: z.number().default(1).describe("Widget width (1 = full width)"),
    },
    async ({ dashboard_id, visualization_id, text, position, width }) => {
      try {
        const options: Record<string, unknown> = {};
        if (position) {
          options.position = position;
        }
        const result = await client.addWidget({
          dashboard_id,
          visualization_id,
          text,
          options,
          width,
        });
        return {
          content: [
            {
              type: "text",
              text: `Widget added successfully.\nID: ${result.id}\nDashboard ID: ${result.dashboard_id}`,
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

  server.tool(
    "publish_dashboard",
    "Publish a Redash dashboard (set is_draft to false)",
    {
      dashboard_id: z.number().describe("ID of the dashboard to publish"),
    },
    async ({ dashboard_id }) => {
      try {
        const result = await client.publishDashboard(dashboard_id);
        return {
          content: [
            {
              type: "text",
              text: `Dashboard published successfully.\nID: ${result.id}\nName: ${result.name}\nDraft: ${result.is_draft}`,
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
