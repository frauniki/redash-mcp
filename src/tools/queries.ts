import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RedashClient, formatQueryResult } from "../client.js";

export function registerQueryTools(server: McpServer, client: RedashClient): void {
  server.tool(
    "list_queries",
    "Search and list Redash queries",
    {
      search: z.string().optional().describe("Search term to filter queries"),
      page_size: z.number().optional().describe("Number of results per page (default: 25)"),
    },
    async ({ search, page_size }) => {
      try {
        const result = await client.listQueries(search, page_size);
        const lines = result.results.map(
          (q) => `- [${q.id}] ${q.name}${q.description ? ` — ${q.description}` : ""}`,
        );
        const text =
          lines.length > 0
            ? `Found ${result.count} queries:\n${lines.join("\n")}`
            : "No queries found.";
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
    "get_query",
    "Get a Redash query by ID (with visualizations)",
    {
      query_id: z.number().describe("The ID of the query"),
    },
    async ({ query_id }) => {
      try {
        const result = await client.getQuery(query_id);
        const vizList = (result.visualizations ?? [])
          .map((v) => `  - [${v.id}] ${v.name} (${v.type})`)
          .join("\n");
        const text = [
          `ID: ${result.id}`,
          `Name: ${result.name}`,
          `Description: ${result.description || "(none)"}`,
          `Data Source ID: ${result.data_source_id}`,
          `Draft: ${result.is_draft}`,
          `Archived: ${result.is_archived}`,
          `Query:\n${result.query}`,
          `Visualizations:\n${vizList || "  (none)"}`,
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
    "get_query_result",
    "Get the latest result for a saved Redash query",
    {
      query_id: z.number().describe("The ID of the query"),
    },
    async ({ query_id }) => {
      try {
        const result = await client.getQueryResult(query_id);
        const text = formatQueryResult(result.data);
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
    "create_query",
    "Create a new Redash query",
    {
      name: z.string().describe("Name of the query"),
      query: z.string().describe("SQL query string"),
      data_source_id: z.number().describe("ID of the data source to use"),
      description: z.string().optional().describe("Description of the query"),
    },
    async ({ name, query, data_source_id, description }) => {
      try {
        const result = await client.createQuery({
          name,
          query,
          data_source_id,
          description,
        });
        return {
          content: [
            {
              type: "text",
              text: `Query created successfully.\nID: ${result.id}\nName: ${result.name}`,
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
    "update_query",
    "Update an existing Redash query",
    {
      query_id: z.number().describe("ID of the query to update"),
      name: z.string().optional().describe("New name"),
      query: z.string().optional().describe("New SQL query string"),
      description: z.string().optional().describe("New description"),
      data_source_id: z.number().optional().describe("New data source ID"),
      tags: z.array(z.string()).optional().describe("Tags"),
      options: z.record(z.string(), z.unknown()).optional().describe("Query options"),
    },
    async ({ query_id, ...params }) => {
      try {
        const result = await client.updateQuery(query_id, params);
        return {
          content: [
            {
              type: "text",
              text: `Query updated successfully.\nID: ${result.id}\nName: ${result.name}`,
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
    "archive_query",
    "Archive (delete) a Redash query",
    {
      query_id: z.number().describe("ID of the query to archive"),
    },
    async ({ query_id }) => {
      try {
        await client.archiveQuery(query_id);
        return {
          content: [{ type: "text", text: `Query ${query_id} archived successfully.` }],
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
