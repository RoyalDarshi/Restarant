import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Table, Columns } from 'lucide-react';
import { apiService, DatabaseColumn } from '../services/api';

interface DatabaseSelectorProps {
  onTableSelect: (tableName: string, columns: DatabaseColumn[]) => void;
  selectedTable: string | null;
}

const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({ onTableSelect, selectedTable }) => {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getTables();
      if (response.success) {
        setTables(response.data);
      } else {
        setError(response.error || "Failed to fetch tables");
      }
    } catch (err) {
      setError("Failed to connect to database");
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = async (tableName: string) => {
    try {
      const response = await apiService.getTableColumns(tableName);
      console.log(
        "Fetched columns:",
        response.data.tableName,
        response.data.columns
      );
      if (response.data.success) {
        onTableSelect(response.data.tableName, response.data.columns);
      } else {
        setError(response.error || "Failed to fetch table columns");
      }
    } catch (err) {
      setError("Failed to fetch table columns");
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-2 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">
              Database Tables
            </h2>
          </div>
          <button
            onClick={fetchTables}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="p-2 overflow-y-auto max-h-[calc(100vh-150px)]">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading tables...</span>
          </div>
        ) : tables.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {tables.map((tableName) => (
              <button
                key={tableName}
                onClick={() => handleTableSelect(tableName)}
                className={`flex items-center space-x-2 p-2 border rounded-lg text-left transition-all hover:border-blue-300 hover:shadow-sm ${
                  selectedTable === tableName
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <Table className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="font-medium text-slate-900">{tableName}</div>
                  <div className="text-sm text-slate-500">
                    Click to load columns
                  </div>
                </div>
                {selectedTable === tableName && (
                  <Columns className="h-4 w-4 text-blue-500 ml-auto" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No tables found</p>
            <p className="text-sm mt-2">Make sure your database is connected</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseSelector;