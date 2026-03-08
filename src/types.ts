export interface RedashDataSource {
  id: number;
  name: string;
  type: string;
  syntax: string;
  paused: number;
  pause_reason: string | null;
}

export interface RedashQuery {
  id: number;
  name: string;
  description: string;
  query: string;
  data_source_id: number;
  is_archived: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  visualizations?: RedashVisualization[];
}

export interface RedashQueryResultColumn {
  name: string;
  friendly_name: string;
  type: string;
}

export interface RedashQueryResultData {
  columns: RedashQueryResultColumn[];
  rows: Record<string, unknown>[];
}

export interface RedashQueryResult {
  id: number;
  query_hash: string;
  query: string;
  data: RedashQueryResultData;
  data_source_id: number;
  runtime: number;
  retrieved_at: string;
}

export interface RedashJob {
  id: string;
  status: number; // 1=pending, 2=started, 3=success, 4=failure
  error: string;
  query_result_id: number | null;
  updated_at: number;
}

export interface RedashVisualization {
  id: number;
  type: string;
  name: string;
  query_id: number;
  options: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RedashDashboard {
  id: number;
  slug: string;
  name: string;
  is_archived: boolean;
  is_draft: boolean;
  widgets: RedashWidget[];
  created_at: string;
  updated_at: string;
  public_url?: string;
}

export interface RedashWidget {
  id: number;
  dashboard_id: number;
  visualization_id: number | null;
  visualization?: RedashVisualization;
  text: string;
  width: number;
  options: {
    position?: {
      col: number;
      row: number;
      sizeX: number;
      sizeY: number;
    };
    [key: string]: unknown;
  };
}

export interface RedashListResponse<T> {
  count: number;
  page: number;
  page_size: number;
  results: T[];
}
