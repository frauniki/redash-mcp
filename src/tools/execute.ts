import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { RedashClient, formatQueryResult, getErrorMessage } from "../client.js";

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function registerExecuteTools(server: McpServer, client: RedashClient): void {
  server.tool(
    "execute_query",
    "Execute a SQL query against a Redash data source and return results",
    {
      data_source_id: z.number().describe("ID of the data source"),
      query: z.string().describe("SQL query to execute"),
      max_age: z
        .number()
        .optional()
        .describe("Max age in seconds for cached results (0 = no cache)"),
    },
    async ({ data_source_id, query, max_age }) => {
      try {
        const response = await client.executeQuery(data_source_id, query, max_age);

        // If result is immediately available (cached)
        if (response.query_result) {
          const text = formatQueryResult(response.query_result.data);
          return { content: [{ type: "text", text }] };
        }

        // Poll for job completion
        if (!response.job) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Unexpected response — no job or result returned.",
              },
            ],
            isError: true,
          };
        }

        const startTime = Date.now();
        const jobId = response.job.id;

        while (Date.now() - startTime < POLL_TIMEOUT_MS) {
          await sleep(POLL_INTERVAL_MS);
          const job = await client.getJobStatus(jobId);

          if (job.status === 3) {
            // Success
            if (!job.query_result_id) {
              return {
                content: [
                  {
                    type: "text",
                    text: "Error: Job completed but no query_result_id returned.",
                  },
                ],
                isError: true,
              };
            }
            const result = await client.getQueryResultById(job.query_result_id);
            const text = formatQueryResult(result.data);
            return { content: [{ type: "text", text }] };
          }

          if (job.status === 4) {
            // Failure
            return {
              content: [
                {
                  type: "text",
                  text: `Query execution failed: ${job.error || "Unknown error"}`,
                },
              ],
              isError: true,
            };
          }

          // status 1 (pending) or 2 (started) — continue polling
        }

        return {
          content: [
            {
              type: "text",
              text: "Error: Query execution timed out after 60 seconds.",
            },
          ],
          isError: true,
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
