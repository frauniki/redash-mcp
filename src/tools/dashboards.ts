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
    "get_dashboard",
    "Get a Redash dashboard with its widgets",
    {
      dashboard_id: z.number().describe("ID of the dashboard"),
    },
    async ({ dashboard_id }) => {
      try {
        const result = await client.getDashboard(dashboard_id);
        const widgets = result.widgets
          .map((w) => {
            if (w.visualization) {
              return `  - [${w.id}] Visualization: ${w.visualization.name} (type: ${w.visualization.type})`;
            }
            return `  - [${w.id}] Text: ${w.text.slice(0, 50)}`;
          })
          .join("\n");
        const text = [
          `ID: ${result.id}`,
          `Name: ${result.name}`,
          `Slug: ${result.slug}`,
          `Draft: ${result.is_draft}`,
          `Archived: ${result.is_archived}`,
          `Widgets:\n${widgets || "  (none)"}`,
        ].join("\n");
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "update_dashboard",
    "Update a Redash dashboard (name, tags, options, filters)",
    {
      dashboard_id: z.number().describe("ID of the dashboard"),
      name: z.string().optional().describe("New name"),
      is_draft: z.boolean().optional().describe("Draft status"),
      tags: z.array(z.string()).optional().describe("Tags"),
      options: z.record(z.string(), z.unknown()).optional().describe("Dashboard options"),
      dashboard_filters_enabled: z.boolean().optional().describe("Enable dashboard-level filters"),
    },
    async ({ dashboard_id, ...params }) => {
      try {
        const result = await client.updateDashboard(dashboard_id, params);
        return {
          content: [
            {
              type: "text",
              text: `Dashboard updated successfully.\nID: ${result.id}\nName: ${result.name}\nDraft: ${result.is_draft}`,
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

  server.tool(
    "archive_dashboard",
    "Archive (delete) a Redash dashboard",
    {
      dashboard_id: z.number().describe("ID of the dashboard to archive"),
    },
    async ({ dashboard_id }) => {
      try {
        const result = await client.archiveDashboard(dashboard_id);
        return {
          content: [
            {
              type: "text",
              text: `Dashboard archived successfully.\nID: ${result.id}\nName: ${result.name}`,
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
    "update_widget",
    "Update a widget on a Redash dashboard (text or options only)",
    {
      widget_id: z.number().describe("ID of the widget"),
      text: z.string().optional().describe("New text content"),
      options: z.record(z.string(), z.unknown()).optional().describe("New widget options"),
    },
    async ({ widget_id, text, options }) => {
      try {
        const result = await client.updateWidget(widget_id, { text, options });
        return {
          content: [
            {
              type: "text",
              text: `Widget updated successfully.\nID: ${result.id}\nDashboard ID: ${result.dashboard_id}`,
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
    "delete_widget",
    "Delete a widget from a Redash dashboard",
    {
      widget_id: z.number().describe("ID of the widget to delete"),
    },
    async ({ widget_id }) => {
      try {
        await client.deleteWidget(widget_id);
        return {
          content: [{ type: "text", text: `Widget ${widget_id} deleted successfully.` }],
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
