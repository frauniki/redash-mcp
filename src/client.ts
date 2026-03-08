import type {
  RedashDataSource,
  RedashQuery,
  RedashQueryResult,
  RedashJob,
  RedashVisualization,
  RedashDashboard,
  RedashWidget,
  RedashListResponse,
  RedashQueryResultData,
} from "./types.js";

export class RedashClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "RedashClientError";
  }
}

export class RedashClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Key ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new RedashClientError(
        `Failed to connect to Redash at ${this.baseUrl}. Please check REDASH_URL.`,
      );
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new RedashClientError(
          "Authentication failed. Please check your REDASH_API_KEY.",
          401,
        );
      }
      if (response.status === 404) {
        throw new RedashClientError(`Resource not found: ${method} ${path}`, 404);
      }
      const text = await response.text().catch(() => "");
      throw new RedashClientError(
        `Redash API error (${response.status}): ${text}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  async listDataSources(): Promise<RedashDataSource[]> {
    return this.request<RedashDataSource[]>("GET", "/api/data_sources");
  }

  async listQueries(search?: string, pageSize?: number): Promise<RedashListResponse<RedashQuery>> {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (pageSize) params.set("page_size", String(pageSize));
    const qs = params.toString();
    return this.request<RedashListResponse<RedashQuery>>(
      "GET",
      `/api/queries${qs ? `?${qs}` : ""}`,
    );
  }

  async getQueryResult(queryId: number): Promise<RedashQueryResult> {
    const response = await this.request<{ query_result: RedashQueryResult }>(
      "GET",
      `/api/queries/${queryId}/results`,
    );
    return response.query_result;
  }

  async getQuery(queryId: number): Promise<RedashQuery> {
    return this.request<RedashQuery>("GET", `/api/queries/${queryId}`);
  }

  async createQuery(params: {
    name: string;
    query: string;
    data_source_id: number;
    description?: string;
  }): Promise<RedashQuery> {
    return this.request<RedashQuery>("POST", "/api/queries", params);
  }

  async updateQuery(
    queryId: number,
    params: {
      name?: string;
      query?: string;
      description?: string;
      data_source_id?: number;
      schedule?: Record<string, unknown> | null;
      tags?: string[];
      options?: Record<string, unknown>;
    },
  ): Promise<RedashQuery> {
    return this.request<RedashQuery>("POST", `/api/queries/${queryId}`, params);
  }

  async archiveQuery(queryId: number): Promise<void> {
    await this.request<void>("DELETE", `/api/queries/${queryId}`);
  }

  async executeQuery(
    dataSourceId: number,
    query: string,
    maxAge?: number,
  ): Promise<{ job?: RedashJob; query_result?: RedashQueryResult }> {
    return this.request<{
      job?: RedashJob;
      query_result?: RedashQueryResult;
    }>("POST", "/api/query_results", {
      data_source_id: dataSourceId,
      query,
      max_age: maxAge ?? 0,
    });
  }

  async getJobStatus(jobId: string): Promise<RedashJob> {
    const response = await this.request<{ job: RedashJob }>("GET", `/api/jobs/${jobId}`);
    return response.job;
  }

  async getQueryResultById(resultId: number): Promise<RedashQueryResult> {
    const response = await this.request<{ query_result: RedashQueryResult }>(
      "GET",
      `/api/query_results/${resultId}`,
    );
    return response.query_result;
  }

  async createVisualization(params: {
    query_id: number;
    type: string;
    name: string;
    options: Record<string, unknown>;
  }): Promise<RedashVisualization> {
    return this.request<RedashVisualization>("POST", "/api/visualizations", params);
  }

  async updateVisualization(
    visualizationId: number,
    params: {
      name?: string;
      description?: string;
      type?: string;
      options?: Record<string, unknown>;
    },
  ): Promise<RedashVisualization> {
    return this.request<RedashVisualization>(
      "POST",
      `/api/visualizations/${visualizationId}`,
      params,
    );
  }

  async deleteVisualization(visualizationId: number): Promise<void> {
    await this.request<void>("DELETE", `/api/visualizations/${visualizationId}`);
  }

  async createDashboard(name: string): Promise<RedashDashboard> {
    return this.request<RedashDashboard>("POST", "/api/dashboards", { name });
  }

  async addWidget(params: {
    dashboard_id: number;
    visualization_id?: number;
    text?: string;
    options: Record<string, unknown>;
    width: number;
  }): Promise<RedashWidget> {
    return this.request<RedashWidget>("POST", "/api/widgets", params);
  }

  async getDashboard(dashboardId: number): Promise<RedashDashboard> {
    return this.request<RedashDashboard>("GET", `/api/dashboards/${dashboardId}`);
  }

  async updateDashboard(
    dashboardId: number,
    params: {
      name?: string;
      is_draft?: boolean;
      is_archived?: boolean;
      tags?: string[];
      options?: Record<string, unknown>;
      dashboard_filters_enabled?: boolean;
    },
  ): Promise<RedashDashboard> {
    return this.request<RedashDashboard>("POST", `/api/dashboards/${dashboardId}`, params);
  }

  async publishDashboard(dashboardId: number): Promise<RedashDashboard> {
    return this.updateDashboard(dashboardId, { is_draft: false });
  }

  async archiveDashboard(dashboardId: number): Promise<RedashDashboard> {
    return this.request<RedashDashboard>("DELETE", `/api/dashboards/${dashboardId}`);
  }

  async updateWidget(
    widgetId: number,
    params: { text?: string; options?: Record<string, unknown> },
  ): Promise<RedashWidget> {
    return this.request<RedashWidget>("POST", `/api/widgets/${widgetId}`, params);
  }

  async deleteWidget(widgetId: number): Promise<void> {
    await this.request<void>("DELETE", `/api/widgets/${widgetId}`);
  }
}

const MAX_ROWS = 100;

export function formatQueryResult(data: RedashQueryResultData): string {
  const { columns, rows } = data;
  const colNames = columns.map((c) => c.name);
  const header = colNames.join("\t");

  const truncated = rows.length > MAX_ROWS;
  const displayRows = truncated ? rows.slice(0, MAX_ROWS) : rows;

  const lines = displayRows.map((row) => colNames.map((col) => String(row[col] ?? "")).join("\t"));

  let result = [header, ...lines].join("\n");
  if (truncated) {
    result += `\n\n... truncated (showing ${MAX_ROWS} of ${rows.length} rows)`;
  }
  return result;
}
