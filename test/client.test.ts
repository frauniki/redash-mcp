import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { RedashClient, RedashClientError, formatQueryResult } from "../src/client.js";
import { createMockRedashServer } from "./helpers/mock-server.js";

describe("RedashClient", () => {
  const mock = createMockRedashServer();
  let client: RedashClient;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      mock.server.listen(0, () => resolve());
    });
    baseUrl = mock.getAddress();
    client = new RedashClient(baseUrl, "test-api-key");
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      mock.server.close(() => resolve());
    });
  });

  beforeEach(() => {
    mock.state.jobPollCount = 0;
    mock.state.simulateAuthError = false;
    mock.state.simulateJobFailure = false;
  });

  describe("listDataSources", () => {
    it("should return data sources", async () => {
      const result = await client.listDataSources();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("PostgreSQL");
      expect(result[1].name).toBe("MySQL");
    });
  });

  describe("listQueries", () => {
    it("should return all queries", async () => {
      const result = await client.listQueries();
      expect(result.count).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it("should filter queries by search term", async () => {
      const result = await client.listQueries("Active");
      expect(result.count).toBe(1);
      expect(result.results[0].name).toBe("Active Users");
    });
  });

  describe("getQueryResult", () => {
    it("should return query result", async () => {
      const result = await client.getQueryResult(1);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].count).toBe(42);
    });

    it("should throw 404 for unknown query", async () => {
      await expect(client.getQueryResult(999)).rejects.toThrow(RedashClientError);
    });
  });

  describe("createQuery", () => {
    it("should create a query", async () => {
      const result = await client.createQuery({
        name: "Test Query",
        query: "SELECT 1",
        data_source_id: 1,
        description: "A test query",
      });
      expect(result.id).toBe(10);
      expect(result.name).toBe("Test Query");
    });
  });

  describe("getQuery", () => {
    it("should return a query with visualizations", async () => {
      const result = await client.getQuery(1);
      expect(result.id).toBe(1);
      expect(result.name).toBe("User Count");
      expect(result.visualizations).toHaveLength(1);
    });
  });

  describe("updateQuery", () => {
    it("should update a query", async () => {
      const result = await client.updateQuery(1, { name: "Updated" });
      expect(result.id).toBe(1);
      expect(result.name).toBe("Updated");
    });
  });

  describe("archiveQuery", () => {
    it("should archive a query", async () => {
      await expect(client.archiveQuery(1)).resolves.toBeUndefined();
    });
  });

  describe("executeQuery", () => {
    it("should return a job", async () => {
      const result = await client.executeQuery(1, "SELECT 1");
      expect(result.job).toBeDefined();
      expect(result.job!.id).toBe("test-job-1");
    });
  });

  describe("getJobStatus", () => {
    it("should return pending then success", async () => {
      const job1 = await client.getJobStatus("test-job-1");
      expect(job1.status).toBe(1); // pending

      const job2 = await client.getJobStatus("test-job-1");
      expect(job2.status).toBe(3); // success
      expect(job2.query_result_id).toBe(1);
    });
  });

  describe("createVisualization", () => {
    it("should create a visualization", async () => {
      const result = await client.createVisualization({
        query_id: 1,
        type: "CHART",
        name: "Test Chart",
        options: { chartType: "line" },
      });
      expect(result.id).toBe(5);
      expect(result.type).toBe("CHART");
    });
  });

  describe("updateVisualization", () => {
    it("should update a visualization", async () => {
      const result = await client.updateVisualization(5, { name: "Updated" });
      expect(result.id).toBe(5);
      expect(result.name).toBe("Updated");
    });
  });

  describe("deleteVisualization", () => {
    it("should delete a visualization", async () => {
      await expect(client.deleteVisualization(5)).resolves.toBeUndefined();
    });
  });

  describe("createDashboard", () => {
    it("should create a dashboard", async () => {
      const result = await client.createDashboard("My Dashboard");
      expect(result.id).toBe(3);
      expect(result.slug).toBe("my-dashboard");
      expect(result.is_draft).toBe(true);
    });
  });

  describe("addWidget", () => {
    it("should add a widget", async () => {
      const result = await client.addWidget({
        dashboard_id: 3,
        visualization_id: 5,
        options: { position: { col: 0, row: 0, sizeX: 3, sizeY: 3 } },
        width: 1,
      });
      expect(result.id).toBe(7);
      expect(result.dashboard_id).toBe(3);
    });
  });

  describe("getDashboard", () => {
    it("should return dashboard with widgets", async () => {
      const result = await client.getDashboard(3);
      expect(result.id).toBe(3);
      expect(result.name).toBe("Test Dashboard");
      expect(result.widgets).toHaveLength(1);
    });
  });

  describe("updateDashboard", () => {
    it("should update dashboard", async () => {
      const result = await client.updateDashboard(3, { name: "Updated" });
      expect(result.name).toBe("Updated");
    });
  });

  describe("publishDashboard", () => {
    it("should publish a dashboard", async () => {
      const result = await client.publishDashboard(3);
      expect(result.is_draft).toBe(false);
    });
  });

  describe("archiveDashboard", () => {
    it("should archive a dashboard", async () => {
      const result = await client.archiveDashboard(3);
      expect(result.is_archived).toBe(true);
    });
  });

  describe("updateWidget", () => {
    it("should update a widget", async () => {
      const result = await client.updateWidget(7, { text: "Updated" });
      expect(result.id).toBe(7);
      expect(result.text).toBe("Updated");
    });
  });

  describe("deleteWidget", () => {
    it("should delete a widget", async () => {
      await expect(client.deleteWidget(7)).resolves.toBeUndefined();
    });
  });

  describe("authentication errors", () => {
    it("should throw on 401", async () => {
      mock.state.simulateAuthError = true;
      await expect(client.listDataSources()).rejects.toThrow("Authentication failed");
    });
  });

  describe("connection errors", () => {
    it("should throw on connection failure", async () => {
      const badClient = new RedashClient("http://localhost:1", "key");
      await expect(badClient.listDataSources()).rejects.toThrow("Failed to connect");
    });
  });
});

describe("formatQueryResult", () => {
  it("should format results as TSV", () => {
    const result = formatQueryResult({
      columns: [
        { name: "id", friendly_name: "id", type: "integer" },
        { name: "name", friendly_name: "name", type: "string" },
      ],
      rows: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ],
    });
    expect(result).toBe("id\tname\n1\tAlice\n2\tBob");
  });

  it("should truncate rows beyond 100", () => {
    const rows = Array.from({ length: 150 }, (_, i) => ({ id: i }));
    const result = formatQueryResult({
      columns: [{ name: "id", friendly_name: "id", type: "integer" }],
      rows,
    });
    expect(result).toContain("truncated");
    expect(result).toContain("showing 100 of 150 rows");
  });
});
