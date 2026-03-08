import http from "node:http";

interface MockState {
  jobPollCount: number;
  simulateAuthError: boolean;
  simulateJobFailure: boolean;
}

export function createMockRedashServer(): {
  server: http.Server;
  getAddress: () => string;
  state: MockState;
} {
  const state: MockState = {
    jobPollCount: 0,
    simulateAuthError: false,
    simulateJobFailure: false,
  };

  const dataSources = [
    { id: 1, name: "PostgreSQL", type: "pg", syntax: "sql", paused: 0, pause_reason: null },
    { id: 2, name: "MySQL", type: "mysql", syntax: "sql", paused: 0, pause_reason: null },
  ];

  const queries = [
    {
      id: 1,
      name: "User Count",
      description: "Count all users",
      query: "SELECT count(*) FROM users",
      data_source_id: 1,
      is_archived: false,
      is_draft: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      name: "Active Users",
      description: "List active users",
      query: "SELECT * FROM users WHERE active = true",
      data_source_id: 1,
      is_archived: false,
      is_draft: false,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    },
  ];

  const queryResult = {
    id: 1,
    query_hash: "abc123",
    query: "SELECT count(*) FROM users",
    data: {
      columns: [{ name: "count", friendly_name: "count", type: "integer" }],
      rows: [{ count: 42 }],
    },
    data_source_id: 1,
    runtime: 0.5,
    retrieved_at: "2024-01-01T00:00:00Z",
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method!;

    // Check authorization
    const authHeader = req.headers.authorization;
    if (state.simulateAuthError || !authHeader || !authHeader.startsWith("Key ")) {
      if (state.simulateAuthError) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Unauthorized" }));
        return;
      }
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const parsedBody = body ? JSON.parse(body) : undefined;
      const respond = (status: number, data: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };

      // Routes
      if (method === "GET" && path === "/api/data_sources") {
        return respond(200, dataSources);
      }

      if (method === "GET" && path === "/api/queries") {
        const search = url.searchParams.get("q");
        const pageSize = parseInt(url.searchParams.get("page_size") || "25");
        let filtered = queries;
        if (search) {
          filtered = queries.filter(
            (q) =>
              q.name.toLowerCase().includes(search.toLowerCase()) ||
              q.description.toLowerCase().includes(search.toLowerCase()),
          );
        }
        return respond(200, {
          count: filtered.length,
          page: 1,
          page_size: pageSize,
          results: filtered.slice(0, pageSize),
        });
      }

      const queryResultMatch = path.match(/^\/api\/queries\/(\d+)\/results$/);
      if (method === "GET" && queryResultMatch) {
        const queryId = parseInt(queryResultMatch[1]);
        if (queryId > 100) {
          return respond(404, { message: "Query not found" });
        }
        return respond(200, { query_result: queryResult });
      }

      if (method === "POST" && path === "/api/query_results") {
        // Return a job that requires polling
        return respond(200, {
          job: {
            id: "test-job-1",
            status: 1,
            error: "",
            query_result_id: null,
            updated_at: Date.now() / 1000,
          },
        });
      }

      const jobMatch = path.match(/^\/api\/jobs\/(.+)$/);
      if (method === "GET" && jobMatch) {
        state.jobPollCount++;

        if (state.simulateJobFailure) {
          return respond(200, {
            job: {
              id: jobMatch[1],
              status: 4,
              error: "Query execution error: syntax error",
              query_result_id: null,
              updated_at: Date.now() / 1000,
            },
          });
        }

        // Simulate: first poll returns pending, second returns success
        if (state.jobPollCount >= 2) {
          return respond(200, {
            job: {
              id: jobMatch[1],
              status: 3,
              error: "",
              query_result_id: 1,
              updated_at: Date.now() / 1000,
            },
          });
        }

        return respond(200, {
          job: {
            id: jobMatch[1],
            status: 1,
            error: "",
            query_result_id: null,
            updated_at: Date.now() / 1000,
          },
        });
      }

      const queryResultByIdMatch = path.match(/^\/api\/query_results\/(\d+)$/);
      if (method === "GET" && queryResultByIdMatch) {
        return respond(200, { query_result: queryResult });
      }

      if (method === "POST" && path === "/api/queries") {
        return respond(200, {
          id: 10,
          name: parsedBody.name,
          description: parsedBody.description || "",
          query: parsedBody.query,
          data_source_id: parsedBody.data_source_id,
          is_archived: false,
          is_draft: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        });
      }

      if (method === "POST" && path === "/api/visualizations") {
        return respond(200, {
          id: 5,
          type: parsedBody.type,
          name: parsedBody.name,
          query_id: parsedBody.query_id,
          options: parsedBody.options,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        });
      }

      if (method === "POST" && path === "/api/dashboards") {
        return respond(200, {
          id: 3,
          slug: parsedBody.name.toLowerCase().replace(/\s+/g, "-"),
          name: parsedBody.name,
          is_archived: false,
          is_draft: true,
          widgets: [],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        });
      }

      if (method === "POST" && path === "/api/widgets") {
        return respond(200, {
          id: 7,
          dashboard_id: parsedBody.dashboard_id,
          visualization_id: parsedBody.visualization_id || null,
          text: parsedBody.text || "",
          width: parsedBody.width,
          options: parsedBody.options,
        });
      }

      const dashboardIdMatch = path.match(/^\/api\/dashboards\/(\d+)$/);
      if (dashboardIdMatch) {
        const id = parseInt(dashboardIdMatch[1]);
        if (method === "GET") {
          return respond(200, {
            id,
            slug: "test-dashboard",
            name: "Test Dashboard",
            is_archived: false,
            is_draft: true,
            widgets: [
              {
                id: 7,
                dashboard_id: id,
                visualization_id: 5,
                visualization: { id: 5, type: "TABLE", name: "Results Table" },
                text: "",
                width: 1,
                options: {},
              },
            ],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          });
        }
        if (method === "POST") {
          return respond(200, {
            id,
            slug: "test-dashboard",
            name: parsedBody.name ?? "Test Dashboard",
            is_archived: parsedBody.is_archived ?? false,
            is_draft: parsedBody.is_draft ?? false,
            tags: parsedBody.tags ?? [],
            widgets: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          });
        }
        if (method === "DELETE") {
          return respond(200, {
            id,
            slug: "test-dashboard",
            name: "Test Dashboard",
            is_archived: true,
            is_draft: false,
            widgets: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          });
        }
      }

      const widgetIdMatch = path.match(/^\/api\/widgets\/(\d+)$/);
      if (widgetIdMatch) {
        const id = parseInt(widgetIdMatch[1]);
        if (method === "POST") {
          return respond(200, {
            id,
            dashboard_id: 3,
            visualization_id: null,
            text: parsedBody.text ?? "",
            width: 1,
            options: parsedBody.options ?? {},
          });
        }
        if (method === "DELETE") {
          return respond(200, null);
        }
      }

      respond(404, { message: "Not found" });
    });
  });

  return {
    server,
    getAddress: () => {
      const addr = server.address() as { port: number };
      return `http://localhost:${addr.port}`;
    },
    state,
  };
}
