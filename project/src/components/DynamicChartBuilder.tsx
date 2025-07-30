import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  DatabaseColumn,
  apiService,
  AggregationRequest,
} from "../services/api";
import ChartDropZone from "./ChartDropZone";
import {
  BarChart3,
  LineChart as LineChartIcon, // Renamed to avoid conflict with Recharts LineChart
  PieChart as PieChartIcon, // Renamed to avoid conflict with Recharts PieChart
  Activity, // Used for Area Chart
  RefreshCw,
  Layers, // Used for Composed Chart (Mixed Chart)
  Copy,
} from "lucide-react";

interface DynamicChartBuilderProps {
  tableName: string;
  columns: DatabaseColumn[];
}

const DynamicChartBuilder: React.FC<DynamicChartBuilderProps> = ({
  tableName,
  columns,
}) => {
  const [xAxisColumn, setXAxisColumn] = useState<DatabaseColumn | null>(null);
  const [yAxisColumns, setYAxisColumns] = useState<DatabaseColumn[]>([]);
  const [groupByColumn, setGroupByColumn] = useState<DatabaseColumn | null>(
    null
  );
  const [chartType, setChartType] = useState<
    "bar" | "line" | "pie" | "area" | "composed"
  >("bar"); // Default chart type
  const [aggregationType, setAggregationType] = useState<
    "SUM" | "AVG" | "COUNT" | "MIN" | "MAX"
  >("SUM");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stacked, setStacked] = useState(true);
  const [generatedQuery, setGeneratedQuery] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<string>("");
  const [activeView, setActiveView] = useState<"graph" | "table" | "query">(
    "graph"
  );

  // Normalize column type to simplify type checking for aggregation logic
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
    return "string"; // fallback for unknown types
  };

  // Function to construct the SQL query string
  const constructSqlQuery = useCallback(() => {
    if (!tableName || !xAxisColumn || yAxisColumns.length === 0) {
      return "";
    }

    const selectParts: string[] = [];
    const groupByParts: string[] = [];

    // X-axis column is always selected and grouped by, aliased as 'name' for chart compatibility
    selectParts.push(`${xAxisColumn.key} AS name`);
    groupByParts.push(xAxisColumn.key);

    // Add Group By column if selected, and include it in SELECT and GROUP BY
    if (groupByColumn) {
      selectParts.push(groupByColumn.key);
      groupByParts.push(groupByColumn.key);
    }

    // Add Y-axis columns with aggregation
    yAxisColumns.forEach((col) => {
      const colType = normalizeType(col.type);
      const agg = colType === "string" ? "COUNT" : aggregationType;
      selectParts.push(`${agg}(${col.key}) AS ${col.key}`); // Alias aggregated columns by their original key
    });

    let query = `SELECT ${selectParts.join(", ")} FROM ${tableName}`;

    if (groupByParts.length > 0) {
      query += ` GROUP BY ${groupByParts.join(", ")}`;
    }

    return query;
  }, [tableName, xAxisColumn, yAxisColumns, groupByColumn, aggregationType]);

  useEffect(() => {
    if (!tableName || !xAxisColumn || yAxisColumns.length === 0) {
      setChartData([]);
      setGeneratedQuery(""); // Clear query if criteria not met
      return;
    }

    setLoading(true);
    setError(null);

    // Update the generated query string
    setGeneratedQuery(constructSqlQuery());

    // Determine aggregation type for each Y-axis column
    const aggregationTypes = yAxisColumns.map((col) => {
      const colType = normalizeType(col.type);
      return colType === "string" ? "COUNT" : aggregationType;
    });

    const request: AggregationRequest = {
      tableName,
      xAxis: xAxisColumn.key,
      yAxes: yAxisColumns.map((col) => col.key),
      groupBy: groupByColumn?.key,
      aggregationTypes,
    };

    apiService
      .getAggregatedData(request)
      .then((response) => {
        if (response.success) {
          setChartData(response.data);
        } else {
          setError(response.error || "Failed to fetch chart data");
        }
      })
      .catch(() => {
        setError("Failed to generate chart data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    tableName,
    xAxisColumn,
    yAxisColumns,
    groupByColumn,
    aggregationType,
    constructSqlQuery,
  ]);

  const handleDrop = (column: DatabaseColumn, axis: "x" | "y" | "group") => {
    if (axis === "x") {
      setXAxisColumn(column);
    } else if (axis === "y") {
      setYAxisColumns((prev) => {
        if (prev.some((col) => col.key === column.key)) {
          return prev;
        }
        return [...prev, column];
      });
    } else if (axis === "group") {
      setGroupByColumn(column);
    }
  };

  const handleRemove = (column: DatabaseColumn, axis: "x" | "y" | "group") => {
    if (axis === "x") {
      setXAxisColumn(null);
    } else if (axis === "y") {
      setYAxisColumns((prev) => prev.filter((col) => col.key !== column.key));
    } else if (axis === "group") {
      setGroupByColumn(null);
    }
  };

  const handleReset = () => {
    setXAxisColumn(null);
    setYAxisColumns([]);
    setGroupByColumn(null);
    setChartData([]);
    setError(null);
    setAggregationType("SUM");
    setStacked(false);
    setGeneratedQuery("");
    setActiveView("graph"); // Reset view to graph on reset
    setChartType("bar"); // Reset chart type to default on reset
  };

  const handleCopyQuery = () => {
    const queryToCopy = generatedQuery.trim();
    if (queryToCopy) {
      const textArea = document.createElement("textarea");
      textArea.value = queryToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopySuccess("Copied!");
      } catch (err) {
        setCopySuccess("Failed to copy.");
        console.error("Failed to copy query: ", err);
      }
      document.body.removeChild(textArea);

      setTimeout(() => setCopySuccess(""), 2000);
    }
  };

  const COLORS = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
  ];

  const renderChartContent = () => {
    if (loading) {
      return (
        <div className="h-96 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-600">Generating chart...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="font-medium">Error generating chart</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      );
    }

    if (!xAxisColumn || yAxisColumns.length === 0 || chartData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>Configure chart settings above to generate visualization</p>
            <p className="text-sm mt-2">
              Select X-axis and Y-axis columns from your database
            </p>
          </div>
        </div>
      );
    }

    const commonProps = {
      width: 800,
      height: 400,
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((column, index) => (
                <Bar
                  key={column.key}
                  dataKey={column.key}
                  fill={COLORS[index % COLORS.length]}
                  name={column.label}
                  {...(stacked ? { stackId: "a" } : {})}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((column, index) => (
                <Line
                  key={column.key}
                  type="monotone"
                  dataKey={column.key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  name={column.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((column, index) => (
                <Area
                  key={column.key}
                  type="monotone"
                  dataKey={column.key}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.3}
                  name={column.label}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "composed":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((column, index) =>
                index % 2 === 0 ? (
                  <Bar
                    key={column.key}
                    dataKey={column.key}
                    fill={COLORS[index % COLORS.length]}
                    name={column.label}
                  />
                ) : (
                  <Line
                    key={column.key}
                    type="monotone"
                    dataKey={column.key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    name={column.label}
                  />
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case "pie":
        const pieData = chartData.map((item) => ({
          name: item.name,
          value: item[yAxisColumns[0]?.key] || 0,
        }));

        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const chartTypeOptions = [
    { type: "bar" as const, label: "Bar Chart", icon: BarChart3 },
    { type: "line" as const, label: "Line Chart", icon: LineChartIcon },
    { type: "area" as const, label: "Area Chart", icon: Activity },
    { type: "composed" as const, label: "Mixed Chart", icon: Layers },
    { type: "pie" as const, label: "Pie Chart", icon: PieChartIcon },
  ];

  const aggregationOptions: Array<{
    value: typeof aggregationType;
    label: string;
  }> = [
    { value: "SUM", label: "Sum" },
    { value: "AVG", label: "Average" },
    { value: "COUNT", label: "Count" },
    { value: "MIN", label: "Minimum" },
    { value: "MAX", label: "Maximum" },
  ];

  if (!tableName) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center text-slate-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a table to start building charts</p>
        </div>
      </div>
    );
  }

  // Get the current icon for the selected chart type
  const CurrentChartIcon =
    chartTypeOptions.find((option) => option.type === chartType)?.icon ||
    BarChart3; // Default to BarChart3 if not found

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Chart Builder - <span className="text-blue-600">{tableName}</span>
        </h2>
        <button
          onClick={handleReset}
          className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reset</span>
        </button>
      </div>

      <div className="p-4 sm:p-3 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              X-Axis (Categories)
            </label>
            <ChartDropZone
              onDrop={handleDrop}
              onRemove={handleRemove}
              axis="x"
              selectedColumns={xAxisColumn ? [xAxisColumn] : []}
              label="X-Axis column"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Y-Axis (Values) - Multiple Supported
            </label>
            <ChartDropZone
              onDrop={handleDrop}
              onRemove={handleRemove}
              axis="y"
              selectedColumns={yAxisColumns}
              label="Y-Axis columns"
              allowMultiple={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Group By (Optional)
            </label>
            <ChartDropZone
              onDrop={handleDrop}
              onRemove={handleRemove}
              axis="group"
              selectedColumns={groupByColumn ? [groupByColumn] : []}
              label="Group by column"
            />
          </div>
        </div>

        {/* Control row: Graph Type, Stacked Option, Aggregation Type (left) and View Buttons (right) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-1">
          {/* Left-aligned group: Graph Type, Stacked Option, Aggregation Type */}
          {activeView === "graph" && ( // Conditionally render this entire div
            <div className="flex flex-wrap items-center gap-4">
              {/* Graph Type Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center">
                  <CurrentChartIcon className="h-4 w-4 mr-2" />
                  Graph Type
                </label>
                <select
                  value={chartType}
                  onChange={(e) =>
                    setChartType(
                      e.target.value as
                        | "bar"
                        | "line"
                        | "pie"
                        | "area"
                        | "composed"
                    )
                  }
                  className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {chartTypeOptions.map(({ type, label }) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stacked Bar Toggle - only visible for Bar Chart with 2+ Y columns */}
              {chartType === "bar" && yAxisColumns.length >= 2 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Stacked Option
                  </label>
                  <label
                    htmlFor="stacked-bar-toggle"
                    className={`relative inline-flex items-center cursor-pointer`}
                  >
                    <input
                      type="checkbox"
                      id="stacked-bar-toggle"
                      className="sr-only peer"
                      checked={stacked}
                      onChange={() => setStacked(!stacked)}
                    />
                    <div
                      className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer ${
                        stacked ? "peer-checked:bg-blue-600" : ""
                      } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
                    ></div>
                    <span className="ml-3 text-sm font-medium text-slate-700">
                      Stacked Bar
                    </span>
                  </label>
                </div>
              )}

              {/* Aggregation Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Aggregation Type (for numeric columns)
                </label>
                <select
                  value={aggregationType}
                  onChange={(e) =>
                    setAggregationType(e.target.value as typeof aggregationType)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {aggregationOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Right-aligned group: View Selection Buttons */}
          <div className="flex space-x-2 ml-auto">
            {" "}
            {/* Added ml-auto here to push to the right */}
            <button
              onClick={() => setActiveView("graph")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === "graph"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Graph
            </button>
            <button
              onClick={() => setActiveView("table")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === "table"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setActiveView("query")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === "query"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Query
            </button>
          </div>
        </div>

        {/* Conditional Rendering based on activeView */}
        {activeView === "graph" && (
          <div className="bg-slate-50 rounded-lg p-6 pt-4 pb-4">
            {renderChartContent()}
          </div>
        )}

        {activeView === "table" && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 overflow-x-auto max-h-96 overflow-y-auto">
            <h3 className="text-md font-semibold mb-2 text-slate-900">
              Chart Data Table
            </h3>
            {chartData.length > 0 &&
            (xAxisColumn || yAxisColumns.length > 0) ? (
              <table className="min-w-full divide-y divide-slate-300">
                <thead className="bg-slate-50">
                  <tr>
                    {xAxisColumn && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {xAxisColumn.label}
                      </th>
                    )}
                    {groupByColumn && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {groupByColumn.label}
                      </th>
                    )}
                    {yAxisColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                      >
                        {col.label} (
                        {normalizeType(col.type) === "string"
                          ? "COUNT"
                          : aggregationType}
                        )
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {chartData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {xAxisColumn && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {row.name}{" "}
                          {/* 'name' is aliased from xAxisColumn.key */}
                        </td>
                      )}
                      {groupByColumn && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {row[groupByColumn.key]}
                        </td>
                      )}
                      {yAxisColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"
                        >
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-500 text-center py-8">
                Drag and drop columns to generate data for the table.
              </p>
            )}
          </div>
        )}

        {activeView === "query" && generatedQuery && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg text-white font-mono text-sm relative">
            <h3 className="text-md font-semibold mb-2 text-gray-200">
              Generated SQL Query
            </h3>
            <pre className="whitespace-pre-wrap break-all pr-10">
              {generatedQuery}
            </pre>
            <button
              onClick={handleCopyQuery}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </button>
            {copySuccess && (
              <span className="absolute top-4 right-14 text-xs text-green-400">
                {copySuccess}
              </span>
            )}
          </div>
        )}
        {activeView === "query" && !generatedQuery && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg text-white font-mono text-sm relative">
            <p className="text-gray-400 text-center py-8">
              Select X-axis and Y-axis columns to generate the SQL query.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicChartBuilder;
