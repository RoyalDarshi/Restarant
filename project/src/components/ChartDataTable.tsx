import React, { useState, useMemo } from "react";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import { DatabaseColumn } from "../services/api";

interface ChartDataTableProps {
  chartData: any[];
  xAxisColumn: DatabaseColumn | null;
  yAxisColumns: DatabaseColumn[];
  groupByColumn: DatabaseColumn | null;
  aggregationType: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";
  valueFormatter?: (value: any) => string | number;
}

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface ColumnVisibility {
  [key: string]: boolean;
}

const ChartDataTable: React.FC<ChartDataTableProps> = ({
  chartData,
  xAxisColumn,
  yAxisColumns,
  groupByColumn,
  aggregationType,
  valueFormatter,
}) => {
  // State management
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    {}
  );
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Normalize column type
  const normalizeType = (type: string): "string" | "number" => {
    const lower = type.toLowerCase();
    if (lower.includes("char") || lower === "text") return "string";
    if (
      lower.includes("int") ||
      lower === "float" ||
      lower === "double" ||
      lower === "decimal" ||
      lower === "number"
    )
      return "number";
    return "string";
  };

  // Color schemes for different column types
  const getColumnColor = (type: string, index: number) => {
    const colors = [
      {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-700",
      },
      { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
      { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
      {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
      },
      { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700" },
      {
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-700",
      },
    ];

    if (type === "category") return colors[0];
    if (type === "group") return colors[1];
    return colors[(index + 2) % colors.length];
  };

  // Table columns configuration
  const tableColumns = useMemo(() => {
    const columns: {
      key: string;
      label: string;
      isNumeric: boolean;
      type: string;
      colorScheme: any;
    }[] = [];

    let colorIndex = 0;

    if (xAxisColumn) {
      columns.push({
        key: "name",
        label: xAxisColumn.label,
        isNumeric: false,
        type: "category",
        colorScheme: getColumnColor("category", colorIndex++),
      });
    }

    if (groupByColumn) {
      columns.push({
        key: groupByColumn.key,
        label: groupByColumn.label,
        isNumeric: false,
        type: "group",
        colorScheme: getColumnColor("group", colorIndex++),
      });
    }

    yAxisColumns.forEach((col) => {
      const isNumeric = normalizeType(col.type) === "number";
      columns.push({
        key: col.key,
        label: `${col.label} (${
          isNumeric && aggregationType !== "COUNT"
            ? aggregationType
            : normalizeType(col.type) === "string"
            ? "COUNT"
            : ""
        })`,
        isNumeric: isNumeric,
        type: "metric",
        colorScheme: getColumnColor("metric", colorIndex++),
      });
    });

    return columns;
  }, [xAxisColumn, yAxisColumns, groupByColumn, aggregationType]);

  // Initialize column visibility
  React.useEffect(() => {
    const initialVisibility: ColumnVisibility = {};
    tableColumns.forEach((col) => {
      initialVisibility[col.key] = true;
    });
    setColumnVisibility(initialVisibility);
  }, [tableColumns]);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = chartData.filter((row) =>
      Object.values(row).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [chartData, searchTerm, sortConfig]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Handlers
  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleColumnVisibility = (key: string) => {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Enhanced cell styling with colors
  // This function is now empty to remove all inline color styles
  const getCellStyle = (value: any, column: any) => {
    return {};
  };

  if (chartData.length === 0 && !xAxisColumn && yAxisColumns.length === 0) {
    return (
      <div className="mt-4 p-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl border-2 border-dashed border-indigo-200">
        <div className="text-center">
          <ChartBarIcon className="mx-auto h-16 w-16 text-indigo-400" />
          <h3 className="mt-4 text-xl font-semibold text-indigo-900">
            Ready for Data Analysis
          </h3>
          <p className="mt-2 text-indigo-600">
            Drag and drop columns to generate your colorful data table and start
            exploring insights.
          </p>
        </div>
      </div>
    );
  }

  const visibleColumns = tableColumns.filter(
    (col) => columnVisibility[col.key]
  );
  const totalPages = Math.ceil(processedData.length / pageSize);

  return (
    <div className="mt-4 bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Controls */}
      {/* The requested gradient is applied here only */}
      {/* Updated with the new class as requested by the user */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg mr-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
            {/* Updated padding for the input field */}
            <input
              type="text"
              placeholder="Search your data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
            />
          </div>

          {/* Page Size */}
          {/* Updated padding for the select field */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all"
          >
            <option value={5} className="text-gray-800">
              5 rows
            </option>
            <option value={10} className="text-gray-800">
              10 rows
            </option>
            <option value={25} className="text-gray-800">
              25 rows
            </option>
            <option value={50} className="text-gray-800">
              50 rows
            </option>
          </select>

          {/* Column Visibility */}
          <div className="relative">
            {/* Updated padding for the select field */}
            <select
              onChange={(e) => toggleColumnVisibility(e.target.value)}
              className="px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all"
              value=""
            >
              <option value="" className="text-gray-800">
                Show/Hide Columns
              </option>
              {tableColumns.map((col) => (
                <option key={col.key} value={col.key} className="text-gray-800">
                  {columnVisibility[col.key] ? "✓" : "○"} {col.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10">
              {/* Table header with a simple gray background */}
              <tr className="bg-gray-100">
                {/* Serial Number Header */}
                <th className="px-4 py-4 border-r border-gray-200 bg-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      S.No
                    </span>
                  </div>
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    // Styling for the column headers, no gradient here
                    className={`px-6 py-4 text-left text-sm font-bold uppercase tracking-wider cursor-pointer transition-all hover:bg-gray-200 border-r border-white/50 text-gray-700`}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center space-x-2">
                      {/* Removed the color dot */}
                      <span className="truncate font-semibold text-gray-700">
                        {col.label}
                      </span>
                      <div className="flex flex-col ml-auto text-gray-400">
                        {sortConfig?.key === col.key ? (
                          sortConfig.direction === "asc" ? (
                            <ChevronUpIcon className="h-4 w-4 text-current" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-current" />
                          )
                        ) : (
                          <ArrowsUpDownIcon className="h-4 w-4 text-current opacity-50" />
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="transition-all hover:shadow-md hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50"
                >
                  {/* Serial Number Cell */}
                  <td className="px-4 py-4 border-r border-gray-100 bg-slate-50">
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-600 bg-slate-200 px-3 py-1 rounded-full min-w-[2rem] text-center">
                        {(currentPage - 1) * pageSize + rowIndex + 1}
                      </span>
                    </div>
                  </td>
                  {visibleColumns.map((col) => (
                    <td
                      key={`${rowIndex}-${col.key}`}
                      className={`px-6 py-4 text-sm border-r border-white/30 text-gray-900`}
                      style={getCellStyle(row[col.key], col)}
                    >
                      <div className="flex items-center space-x-2">
                        {/* Removed the color dot from here as well */}
                        <span
                          className={`${
                            col.isNumeric ? "font-bold" : "font-medium"
                          }`}
                        >
                          {col.isNumeric && valueFormatter
                            ? valueFormatter(row[col.key])
                            : row[col.key]}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer with Pagination */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-100 to-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">
            Showing{" "}
            <span className="text-indigo-600 font-bold">
              {(currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="text-indigo-600 font-bold">
              {Math.min(currentPage * pageSize, processedData.length)}
            </span>{" "}
            of{" "}
            <span className="text-blue-600 font-bold">
              {processedData.length}
            </span>{" "}
            results
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium bg-white border-2 border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Previous
            </button>

            <span className="px-4 py-2 text-sm font-bold text-gray-700 bg-white rounded-xl shadow-sm border border-gray-200">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium bg-white border-2 border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartDataTable;
