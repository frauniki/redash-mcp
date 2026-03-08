import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { RedashClient } from "../../src/client.js";
import { registerDashboardTools } from "../../src/tools/dashboards.js";
import { registerDataSourceTools } from "../../src/tools/data-sources.js";
import { registerExecuteTools } from "../../src/tools/execute.js";
import { registerQueryTools } from "../../src/tools/queries.js";
import { registerVisualizationTools } from "../../src/tools/visualizations.js";
import { createMockRedashServer } from "../helpers/mock-server.js";

describe("MCP Server E2E", () => {
  const mock = createMockRedashServer();
  let mcpClient: Client;
  let mcpServer: McpServer;

  beforeAll(async () => {
    // Start mock Redash server
    await new Promise<void>((resolve) => {
      mock.server.listen(0, () => resolve());
    });
    const baseUrl = mock.getAddress();
    const redashClient = new RedashClient(baseUrl, "test-api-key");

    // Create MCP server and register tools
    mcpServer = new McpServer({ name: "redash-mcp-test", version: "1.0.0" });
    registerDataSourceTools(mcpServer, redashClient);
    registerQueryTools(mcpServer, redashClient);
    registerExecuteTools(mcpServer, redashClient);
    registerVisualizationTools(mcpServer, redashClient);
    registerDashboardTools(mcpServer, redashClient);

    // Connect via in-memory transport
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcpClient = new Client({ name: "test-client", version: "1.0.0" });
    await mcpServer.connect(serverTransport);
    await mcpClient.connect(clientTransport);
  });

  afterAll(async () => {
    await mcpClient.close();
    await mcpServer.close();
    await new Promise<void>((resolve) => {
      mock.server.close(() => resolve());
    });
  });

  beforeEach(() => {
    mock.state.jobPollCount = 0;
    mock.state.simulateAuthError = false;
    mock.state.simulateJobFailure = false;
  });

  it("should list all tools", async () => {
    const result = await mcpClient.listTools();
    const toolNames = result.tools.map((t) => t.name).sort();
    expect(toolNames).toEqual([
      "add_widget",
      "archive_dashboard",
      "archive_query",
      "create_dashboard",
      "create_query",
      "create_visualization",
      "delete_visualization",
      "delete_widget",
      "execute_query",
      "get_dashboard",
      "get_query",
      "get_query_result",
      "list_data_sources",
      "list_queries",
      "publish_dashboard",
      "update_dashboard",
      "update_query",
      "update_visualization",
      "update_widget",
    ]);
  });

  describe("list_data_sources", () => {
    it("should return data sources", async () => {
      const result = await mcpClient.callTool({ name: "list_data_sources" });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("PostgreSQL");
      expect(text).toContain("MySQL");
    });
  });

  describe("list_queries", () => {
    it("should list all queries", async () => {
      const result = await mcpClient.callTool({
        name: "list_queries",
        arguments: {},
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("User Count");
      expect(text).toContain("Active Users");
    });

    it("should filter queries", async () => {
      const result = await mcpClient.callTool({
        name: "list_queries",
        arguments: { search: "Active" },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Active Users");
      expect(text).not.toContain("User Count");
    });
  });

  describe("get_query_result", () => {
    it("should return query result", async () => {
      const result = await mcpClient.callTool({
        name: "get_query_result",
        arguments: { query_id: 1 },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("count");
      expect(text).toContain("42");
    });
  });

  describe("create_query", () => {
    it("should create a query", async () => {
      const result = await mcpClient.callTool({
        name: "create_query",
        arguments: {
          name: "New Query",
          query: "SELECT 1",
          data_source_id: 1,
          description: "Test",
        },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Query created successfully");
      expect(text).toContain("ID: 10");
    });
  });

  describe("get_query", () => {
    it("should return query with visualizations", async () => {
      const result = await mcpClient.callTool({
        name: "get_query",
        arguments: { query_id: 1 },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("User Count");
      expect(text).toContain("SELECT count(*)");
      expect(text).toContain("Table");
    });
  });

  describe("update_query", () => {
    it("should update a query", async () => {
      const result = await mcpClient.callTool({
        name: "update_query",
        arguments: { query_id: 1, name: "Updated Query" },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Query updated successfully");
      expect(text).toContain("Updated Query");
    });
  });

  describe("archive_query", () => {
    it("should archive a query", async () => {
      const result = await mcpClient.callTool({
        name: "archive_query",
        arguments: { query_id: 1 },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("archived successfully");
    });
  });

  describe("execute_query", () => {
    it("should execute query with job polling", async () => {
      const result = await mcpClient.callTool({
        name: "execute_query",
        arguments: { data_source_id: 1, query: "SELECT count(*) FROM users" },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("count");
      expect(text).toContain("42");
      expect(result.isError).toBeFalsy();
    });

    it("should handle job failure", async () => {
      mock.state.simulateJobFailure = true;
      const result = await mcpClient.callTool({
        name: "execute_query",
        arguments: { data_source_id: 1, query: "INVALID SQL" },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("syntax error");
      expect(result.isError).toBe(true);
    });
  });

  describe("create_visualization", () => {
    it("should create a visualization", async () => {
      const result = await mcpClient.callTool({
        name: "create_visualization",
        arguments: {
          query_id: 1,
          type: "CHART",
          name: "User Count Chart",
        },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Visualization created successfully");
      expect(text).toContain("ID: 5");
    });
  });

  describe("update_visualization", () => {
    it("should update a visualization", async () => {
      const result = await mcpClient.callTool({
        name: "update_visualization",
        arguments: { visualization_id: 5, name: "Updated Chart" },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Visualization updated successfully");
      expect(text).toContain("Updated Chart");
    });
  });

  describe("delete_visualization", () => {
    it("should delete a visualization", async () => {
      const result = await mcpClient.callTool({
        name: "delete_visualization",
        arguments: { visualization_id: 5 },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("deleted successfully");
    });
  });

  describe("create_dashboard", () => {
    it("should create a dashboard", async () => {
      const result = await mcpClient.callTool({
        name: "create_dashboard",
        arguments: { name: "Test Dashboard" },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Dashboard created successfully");
      expect(text).toContain("ID: 3");
    });
  });

  describe("add_widget", () => {
    it("should add a widget to dashboard", async () => {
      const result = await mcpClient.callTool({
        name: "add_widget",
        arguments: {
          dashboard_id: 3,
          visualization_id: 5,
          width: 1,
        },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Widget added successfully");
      expect(text).toContain("ID: 7");
    });

    it("should add a text widget", async () => {
      const result = await mcpClient.callTool({
        name: "add_widget",
        arguments: {
          dashboard_id: 3,
          text: "## Summary",
          width: 1,
        },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Widget added successfully");
    });
  });

  describe("get_dashboard", () => {
    it("should return dashboard with widgets", async () => {
      const result = await mcpClient.callTool({
        name: "get_dashboard",
        arguments: { dashboard_id: 3 },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Test Dashboard");
      expect(text).toContain("Results Table");
    });
  });

  describe("update_dashboard", () => {
    it("should update dashboard name", async () => {
      const result = await mcpClient.callTool({
        name: "update_dashboard",
        arguments: { dashboard_id: 3, name: "Updated Dashboard" },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Dashboard updated successfully");
      expect(text).toContain("Updated Dashboard");
    });
  });

  describe("publish_dashboard", () => {
    it("should publish a dashboard", async () => {
      const result = await mcpClient.callTool({
        name: "publish_dashboard",
        arguments: { dashboard_id: 3 },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Dashboard published successfully");
      expect(text).toContain("Draft: false");
    });
  });

  describe("archive_dashboard", () => {
    it("should archive a dashboard", async () => {
      const result = await mcpClient.callTool({
        name: "archive_dashboard",
        arguments: { dashboard_id: 3 },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Dashboard archived successfully");
    });
  });

  describe("update_widget", () => {
    it("should update a widget", async () => {
      const result = await mcpClient.callTool({
        name: "update_widget",
        arguments: { widget_id: 7, text: "Updated text" },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Widget updated successfully");
    });
  });

  describe("delete_widget", () => {
    it("should delete a widget", async () => {
      const result = await mcpClient.callTool({
        name: "delete_widget",
        arguments: { widget_id: 7 },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("deleted successfully");
    });
  });

  describe("end-to-end flow", () => {
    it("should complete full dashboard creation workflow", async () => {
      // 1. List data sources
      const ds = await mcpClient.callTool({ name: "list_data_sources" });
      expect(ds.isError).toBeFalsy();

      // 2. Create a query
      const query = await mcpClient.callTool({
        name: "create_query",
        arguments: {
          name: "E2E Query",
          query: "SELECT count(*) FROM users",
          data_source_id: 1,
        },
      });
      expect(query.isError).toBeFalsy();

      // 3. Execute the query
      const exec = await mcpClient.callTool({
        name: "execute_query",
        arguments: { data_source_id: 1, query: "SELECT count(*) FROM users" },
      });
      expect(exec.isError).toBeFalsy();

      // 4. Create visualization
      const viz = await mcpClient.callTool({
        name: "create_visualization",
        arguments: { query_id: 10, type: "TABLE", name: "Results Table" },
      });
      expect(viz.isError).toBeFalsy();

      // 5. Create dashboard
      const dash = await mcpClient.callTool({
        name: "create_dashboard",
        arguments: { name: "E2E Dashboard" },
      });
      expect(dash.isError).toBeFalsy();

      // 6. Add widget
      const widget = await mcpClient.callTool({
        name: "add_widget",
        arguments: { dashboard_id: 3, visualization_id: 5, width: 1 },
      });
      expect(widget.isError).toBeFalsy();

      // 7. Publish dashboard
      const pub = await mcpClient.callTool({
        name: "publish_dashboard",
        arguments: { dashboard_id: 3 },
      });
      expect(pub.isError).toBeFalsy();
      const pubText = (pub.content as Array<{ type: string; text: string }>)[0].text;
      expect(pubText).toContain("Draft: false");
    });
  });

  describe("error handling", () => {
    it("should handle auth errors", async () => {
      mock.state.simulateAuthError = true;
      const result = await mcpClient.callTool({ name: "list_data_sources" });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain("Authentication failed");
    });
  });
});
