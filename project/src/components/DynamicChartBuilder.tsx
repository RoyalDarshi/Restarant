import React, { useState, useEffect } from "react";
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
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  RefreshCw,
  Layers,
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
  >("bar");
  const [aggregationType, setAggregationType] = useState<
    "SUM" | "AVG" | "COUNT" | "MIN" | "MAX"
  >("SUM");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stacked, setStacked] = useState(true); // State for stacked bar chart

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

  useEffect(() => {
    if (!tableName || !xAxisColumn || yAxisColumns.length === 0) {
      setChartData([]);
      return;
    }

    setLoading(true);
    setError(null);

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
  }, [tableName, xAxisColumn, yAxisColumns, groupByColumn, aggregationType]);

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
    setStacked(false); // Reset stacked state on reset
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

  const renderChart = () => {
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
                  // Apply stackId if 'stacked' is true
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

  const chartTypes = [
    { type: "bar" as const, icon: BarChart3, label: "Bar Chart" },
    { type: "line" as const, icon: LineChartIcon, label: "Line Chart" },
    { type: "area" as const, icon: Activity, label: "Area Chart" },
    { type: "composed" as const, icon: Layers, label: "Mixed Chart" },
    { type: "pie" as const, icon: PieChartIcon, label: "Pie Chart" },
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

  // Determine if the stacked toggle should be disabled
  const isStackedToggleDisabled =
    chartType !== "bar" || yAxisColumns.length < 2;

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

        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Chart Type
            </label>
            <div className="flex flex-wrap gap-2">
              {chartTypes.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    chartType === type
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
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
            <div className="flex items-center mt-2">
              <label
                htmlFor="stacked-bar-toggle"
                className={`relative inline-flex items-center cursor-pointer ${
                  isStackedToggleDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <input
                  type="checkbox"
                  id="stacked-bar-toggle"
                  className="sr-only peer"
                  checked={stacked}
                  disabled={isStackedToggleDisabled}
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
              {isStackedToggleDisabled && (
                <span className="ml-2 text-xs text-slate-400">
                  (Select Bar chart and 2+ Y columns)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 pt-4 pb-4">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default DynamicChartBuilder;