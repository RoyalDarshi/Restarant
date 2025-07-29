import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { apiService, DatabaseColumn } from '../services/api';

interface DynamicDataTableProps {
  tableName: string;
  columns: DatabaseColumn[];
}

const DynamicDataTable: React.FC<DynamicDataTableProps> = ({ tableName, columns }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 100,
    offset: 0,
    hasMore: false
  });

  const fetchData = async (
    offset = 0,
    orderBy?: string,
    orderDirection?: "ASC" | "DESC"
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getTableData(tableName, {
        limit: pagination.limit,
        offset,
        orderBy,
        orderDirection,
      });
      if (response.success) {
        setData(response.data);
        setPagination(response.pagination);
      } else {
        setError(response.error || "Failed to fetch data");
      }
    } catch (err) {
      setError("Failed to fetch table data");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((item) =>
      Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const handleSort = (key: string) => {
    const direction =
      sortConfig?.key === key && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    setSortConfig({ key, direction });
    fetchData(0, key, direction.toUpperCase() as "ASC" | "DESC");
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const formatValue = (value: any, column: DatabaseColumn) => {
    if (value === null || value === undefined) return "-";

    if (column.type === "number") {
      return typeof value === "number" ? value.toLocaleString() : value;
    }
    if (column.type === "date") {
      return new Date(value).toLocaleDateString();
    }
    return value.toString();
  };

  useEffect(() => {
    if (tableName && columns.length > 0) {
      fetchData();
    }
  }, [tableName, columns]);

  if (!tableName) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center text-slate-500">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a table to view data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-h-[calc(100vh-20px)] overflow-scroll">
      <div className="p-2 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {tableName} ({pagination.total} records)
          </h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    <span className="text-xs text-slate-400">
                      ({column.type})
                    </span>
                    {getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  <p className="mt-2 text-slate-600">Loading data...</p>
                </td>
              </tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap text-sm text-slate-900"
                    >
                      {formatValue(row[column.key], column)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
        <p className="text-sm text-slate-700">
          Showing {filteredData.length} of {pagination.total} records
          {searchTerm && ` (filtered by "${searchTerm}")`}
        </p>
      </div>
    </div>
  );
};

export default DynamicDataTable;