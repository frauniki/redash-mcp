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
}
