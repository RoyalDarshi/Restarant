const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Table {
  name: string;
}

export interface DatabaseColumn {
  key: string;
  label: string;
  type: "string" | "number" | "date";
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  tableName: string; // Made tableName required
}

export interface TableData {
  tableName: string;
  data: any[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface DatabaseTableSchema {
  tableName: string;
  columns: DatabaseColumn[];
}

// New interface for columns in aggregation request to include their table name
export interface AggregationColumn {
  key: string;
  tableName: string;
}

export interface AggregationRequest {
  tableName: string; // Primary table name
  xAxis: AggregationColumn; // Now includes tableName
  yAxes: AggregationColumn[]; // Now includes tableName
  groupBy?: AggregationColumn; // Now includes tableName
  aggregationTypes: Array<"SUM" | "AVG" | "COUNT" | "MIN" | "MAX">;
  filters?: Array<{
    column: string;
    operator: string;
    value: any;
  }>;
  secondaryTableName?: string;
  joinColumn?: string;
}

class ApiService {
  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API request failed");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getTables(): Promise<ApiResponse<string[]>> {
    const response = await this.fetchApi<{ tables: string[] }>(
      "/database/tables"
    );
    if (response.success) {
      return {
        success: true,
        data: response.tables,
      };
    }
    return response as ApiResponse<string[]>;
  }

  async getTableColumns(
    tableName: string
  ): Promise<ApiResponse<{ success: boolean; columns: DatabaseColumn[] }>> {
    const response = await this.fetchApi<{ columns: DatabaseColumn[] }>(
      `/database/tables/${tableName}/columns`
    );
    if (response.success) {
      return {
        success: true,
        data: response,
      };
    }
    return response as ApiResponse<{
      success: boolean;
      columns: DatabaseColumn[];
    }>;
  }

  async getTableData(
    tableName: string,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: "ASC" | "DESC";
    } = {}
  ): Promise<ApiResponse<TableData>> {
    const params = new URLSearchParams();
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.offset) params.append("offset", options.offset.toString());
    if (options.orderBy) params.append("orderBy", options.orderBy);
    if (options.orderDirection)
      params.append("orderDirection", options.orderDirection);

    const queryString = params.toString();
    const endpoint = `/database/tables/${tableName}/data${
      queryString ? `?${queryString}` : ""
    }`;

    return this.fetchApi<TableData>(endpoint);
  }

  async getAggregatedData(
    request: AggregationRequest
  ): Promise<ApiResponse<any[]>> {
    const response = await this.fetchApi<{ data: any[] }>(
      "/analytics/aggregate",
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
    console.log("Aggregated data response:", response);
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
      };
    }
    return response as ApiResponse<any[]>;
  }

  async getTableStats(tableName: string): Promise<ApiResponse<any>> {
    return this.fetchApi<any>(`/analytics/tables/${tableName}/stats`);
  }

  async executeQuery(
    query: string,
    params: any[] = []
  ): Promise<ApiResponse<any[]>> {
    const response = await this.fetchApi<{ data: any[] }>("/database/query", {
      method: "POST",
      body: JSON.stringify({ query, params }),
    });

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.data,
      };
    }
    return response as ApiResponse<any[]>;
  }

  async healthCheck(): Promise<
    ApiResponse<{ message: string; timestamp: string }>
  > {
    return this.fetchApi<{ message: string; timestamp: string }>("/health");
  }
}

export const apiService = new ApiService();
