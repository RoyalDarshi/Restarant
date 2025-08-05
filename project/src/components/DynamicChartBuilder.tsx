import React, { useState, useEffect, useCallback, useRef } from "react";
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
import html2canvas from "html2canvas";
import {
  DatabaseColumn,
  apiService,
  AggregationRequest,
  DatabaseTableSchema,
  AggregationColumn, // Import AggregationColumn
} from "../services/api";
import ChartDropZone from "./ChartDropZone";
import ChartDataTable from "./ChartDataTable";
import SqlQueryDisplay from "./SqlQueryDisplay";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  RefreshCw,
  Layers,
  Download,
  ChevronDown,
  ChevronUp,
  Settings,
  Database,
  LayoutGrid,
  Table,
  Terminal,
  Check,
} from "lucide-react";


interface DynamicChartBuilderProps {
  tableName: string; // Primary table name
  columns: DatabaseColumn[]; // Columns for the primary table
  secondaryTableName?: string; // Optional secondary table name
  secondaryColumns?: DatabaseColumn[]; // Optional columns for the secondary table
  allTableSchemas: DatabaseTableSchema[]; // All table schemas for join logic
}

const DynamicChartBuilder: React.FC<DynamicChartBuilderProps> = ({
  tableName,
  columns,
  secondaryTableName,
  secondaryColumns,
  allTableSchemas,
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
  const [stacked, setStacked] = useState(true);
  const [generatedQuery, setGeneratedQuery] = useState<string>("");
  const [activeView, setActiveView] = useState<"graph" | "table" | "query">(
    "graph"
  );
  const [showChartOptions, setShowChartOptions] = useState(false);
  const [showAggregationOptions, setShowAggregationOptions] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartOptionsRef = useRef<HTMLDivElement>(null);
  const aggregationOptionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chartOptionsRef.current &&
        !chartOptionsRef.current.contains(event.target as Node)
      ) {
        setShowChartOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [chartOptionsRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        aggregationOptionsRef.current &&
        !aggregationOptionsRef.current.contains(event.target as Node)
      ) {
        setShowAggregationOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [aggregationOptionsRef]);

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

  const constructSqlQuery = useCallback(() => {
    const primaryTable = tableName;
    const secondaryTable = secondaryTableName;

    if (!xAxisColumn || yAxisColumns.length === 0) {
      return "";
    }

    const selectParts: string[] = [];
    const groupByParts: string[] = [];
    let fromClause = `"${primaryTable}" AS t1`;
    let joinClause = "";
    let joinColumnKey: string | undefined;

    const usesSecondaryTable =
      secondaryTable &&
      (xAxisColumn.tableName === secondaryTable ||
        yAxisColumns.some((col) => col.tableName === secondaryTable) ||
        groupByColumn?.tableName === secondaryTable);

    if (usesSecondaryTable && secondaryTable) {
      const primarySchema = allTableSchemas.find(
        (schema) => schema.tableName === primaryTable
      );
      const secondarySchema = allTableSchemas.find(
        (schema) => schema.tableName === secondaryTable
      );

      if (primarySchema && secondarySchema) {
        for (const pCol of primarySchema.columns) {
          for (const sCol of secondarySchema.columns) {
            if (pCol.key === sCol.key && pCol.type === sCol.type) {
              joinColumnKey = pCol.key;
              break;
            }
          }
          if (joinColumnKey) break;
        }
      }

      if (joinColumnKey) {
        joinClause = ` INNER JOIN "${secondaryTable}" AS t2 ON t1."${joinColumnKey}" = t2."${joinColumnKey}"`;
      } else {
        console.warn(
          "No common column found for join between tables. Generating query without join."
        );
        joinClause = "";
      }
    }

    const getQualifiedColumn = (column: DatabaseColumn) => {
      if (usesSecondaryTable && column.tableName === secondaryTable) {
        return `t2."${column.key}"`;
      }
      return `t1."${column.key}"`;
    };

    selectParts.push(`${getQualifiedColumn(xAxisColumn)} AS name`);
    groupByParts.push(getQualifiedColumn(xAxisColumn));

    if (groupByColumn && groupByColumn.key !== xAxisColumn.key) {
      selectParts.push(getQualifiedColumn(groupByColumn));
      groupByParts.push(getQualifiedColumn(groupByColumn));
    }

    yAxisColumns.forEach((col) => {
      const colType = normalizeType(col.type);
      const agg = colType === "string" ? "COUNT" : aggregationType;
      selectParts.push(`${agg}(${getQualifiedColumn(col)}) AS "${col.key}"`);
    });

    let query = `SELECT ${selectParts.join(
      ", "
    )} FROM ${fromClause}${joinClause}`;

    if (groupByParts.length > 0) {
      query += ` GROUP BY ${groupByParts.join(", ")}`;
    }
    query += ` ORDER BY ${groupByParts.join(", ")}`;

    return query;
  }, [
    tableName,
    xAxisColumn,
    yAxisColumns,
    groupByColumn,
    aggregationType,
    secondaryTableName,
    allTableSchemas,
  ]);

  useEffect(() => {
    if (!xAxisColumn || yAxisColumns.length === 0) {
      setChartData([]);
      setGeneratedQuery("");
      return;
    }

    setLoading(true);
    setError(null);

    // --- Start Debug Logging (Frontend - useEffect) ---
    console.log(
      "DynamicChartBuilder (useEffect): Current xAxisColumn state:",
      xAxisColumn
    );
    console.log("DynamicChartBuilder (useEffect): Current yAxisColumns state:");
    yAxisColumns.forEach((col) =>
      console.log(`  - Key: ${col.key}, TableName: ${col.tableName}`)
    );
    console.log(
      "DynamicChartBuilder (useEffect): Current groupByColumn state:",
      groupByColumn
    );
    // --- End Debug Logging (Frontend - useEffect) ---

    const sqlQuery = constructSqlQuery();
    setGeneratedQuery(sqlQuery);

    const aggregationTypesForRequest = yAxisColumns.map((col) => {
      const colType = normalizeType(col.type);
      return colType === "string" ? "COUNT" : aggregationType;
    });

    let joinColumnKey: string | undefined;
    let secondaryTableForRequest: string | undefined;

    const usesSecondaryTable =
      secondaryTableName &&
      (xAxisColumn.tableName === secondaryTableName ||
        yAxisColumns.some((col) => col.tableName === secondaryTableName) ||
        groupByColumn?.tableName === secondaryTableName);

    if (usesSecondaryTable && secondaryTableName) {
      const primarySchema = allTableSchemas.find(
        (schema) => schema.tableName === tableName
      );
      const secondarySchema = allTableSchemas.find(
        (schema) => schema.tableName === secondaryTableName
      );

      if (primarySchema && secondarySchema) {
        for (const pCol of primarySchema.columns) {
          for (const sCol of secondarySchema.columns) {
            if (pCol.key === sCol.key && pCol.type === sCol.type) {
              joinColumnKey = pCol.key;
              secondaryTableForRequest = secondaryTableName;
              break;
            }
          }
          if (joinColumnKey) break;
        }
      }
    }

    // Map DatabaseColumn to AggregationColumn for the request.
    // tableName is now guaranteed to be present on DatabaseColumn.
    const xAxisForRequest: AggregationColumn = {
      key: xAxisColumn.key,
      tableName: xAxisColumn.tableName,
    };

    const yAxesForRequest: AggregationColumn[] = yAxisColumns
      .filter((col) => col && col.key) // Filter out any invalid columns (though tableName is now required)
      .map((col) => ({ key: col.key, tableName: col.tableName }));

    const groupByForRequest: AggregationColumn | undefined =
      groupByColumn && groupByColumn.key
        ? { key: groupByColumn.key, tableName: groupByColumn.tableName }
        : undefined;

    // If critical columns are missing, set error and return early
    if (!xAxisForRequest || yAxesForRequest.length === 0) {
      setError("X-Axis or Y-Axis columns are not properly defined.");
      setLoading(false);
      return;
    }

    const request: AggregationRequest = {
      tableName: tableName,
      xAxis: xAxisForRequest,
      yAxes: yAxesForRequest,
      groupBy: groupByForRequest,
      aggregationTypes: aggregationTypesForRequest,
      secondaryTableName: secondaryTableForRequest,
      joinColumn: joinColumnKey,
    };

    console.log("Sending Aggregation Request from frontend:", request);

    apiService
      .getAggregatedData(request)
      .then((response) => {
        if (response.success) {
          setChartData(response.data);
        } else {
          setError(response.error || "Failed to fetch chart data");
        }
      })
      .catch((err) => {
        setError("Failed to generate chart data: " + err.message);
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
    secondaryTableName,
    secondaryColumns,
    allTableSchemas,
  ]);

  const handleChartTypeClick = (
    type: "bar" | "line" | "pie" | "area" | "composed"
  ) => {
    setChartType(type);
    setShowChartOptions(false);
  };

  const handleDrop = (column: DatabaseColumn, axis: "x" | "y" | "group") => {
    // --- Start Debug Logging (Frontend - handleDrop) ---
    console.log(`handleDrop: Dropped column for ${axis} axis:`, column);
    // --- End Debug Logging (Frontend - handleDrop) ---

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
    setActiveView("graph");
    setChartType("bar");
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

  const formatNumericValue = (value: any) => {
    const num = parseFloat(value);
    return !isNaN(num) ? num.toFixed(2) : value;
  };

  const handleDownloadGraph = () => {
    if (chartContainerRef.current) {
      html2canvas(chartContainerRef.current, {
        useCORS: true,
        scale: 2,
      }).then((canvas) => {
        const link = document.createElement("a");
        link.download = `${tableName}_${chartType}_chart.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    }
  };

  const handleDownloadTable = () => {
    if (chartData.length === 0) return;

    const headers = [
      xAxisColumn?.label || xAxisColumn?.key || "X-Axis",
      ...(groupByColumn ? [groupByColumn.label || groupByColumn.key] : []),
      ...yAxisColumns.map((col) => {
        const colType = normalizeType(col.type);
        const agg = colType === "string" ? "COUNT" : aggregationType;
        return `${agg} of ${col.label || col.key}`;
      }),
    ];

    const csvRows = [
      headers.join(","),
      ...chartData.map((row) => {
        const values = [
          row.name,
          ...(groupByColumn ? [row[groupByColumn.key]] : []),
          ...yAxisColumns.map((col) => formatNumericValue(row[col.key])),
        ];
        return values.join(",");
      }),
    ];

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${tableName}_data_table.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const renderChartContent = () => {
    if (loading) {
      return (
        <div className="h-96 flex flex-col items-center justify-center">
          <div className="relative">
            <RefreshCw className="h-10 w-10 animate-spin text-blue-500" />
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
          </div>
          <span className="mt-4 text-slate-600 text-sm font-medium">
            Generating visualization...
          </span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-96 flex flex-col items-center justify-center bg-red-50 rounded-lg">
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="font-medium text-red-700">Chart generation failed</p>
          <p className="text-sm mt-1 text-red-600 max-w-md text-center">
            {error}
          </p>
        </div>
      );
    }

    if (!xAxisColumn || yAxisColumns.length === 0 || chartData.length === 0) {
      return (
        <div className="h-96 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-dashed border-blue-200">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-full">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-center text-slate-800">
              Build Your Visualization
            </h3>
            <p className="text-slate-600 text-center mt-2 max-w-md">
              Configure chart settings by dragging columns to the X and Y axes
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm flex items-center">
                <Database className="h-4 w-4 mr-2" />
                <span>X-Axis: {xAxisColumn ? "Selected" : "Required"}</span>
              </div>
              <div className="bg-indigo-100 text-indigo-800 px-3 py-2 rounded-lg text-sm flex items-center">
                <Layers className="h-4 w-4 mr-2" />
                <span>
                  Y-Axis: {yAxisColumns.length > 0 ? "Selected" : "Required"}
                </span>
              </div>
            </div>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis tickFormatter={formatNumericValue} stroke="#6b7280" />
              <Tooltip
                formatter={(value: any) => formatNumericValue(value)}
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              {yAxisColumns.map((column, index) => (
                <Bar
                  key={column.key}
                  dataKey={column.key}
                  fill={COLORS[index % COLORS.length]}
                  name={
                    normalizeType(column.type) === "string"
                      ? `Count of ${column.label || column.key}`
                      : `${aggregationType} of ${column.label || column.key}`
                  }
                  stackId={stacked ? "a" : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis tickFormatter={formatNumericValue} stroke="#6b7280" />
              <Tooltip
                formatter={(value: any) => formatNumericValue(value)}
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              {yAxisColumns.map((column, index) => (
                <Line
                  key={column.key}
                  type="monotone"
                  dataKey={column.key}
                  stroke={COLORS[index % COLORS.length]}
                  name={
                    normalizeType(column.type) === "string"
                      ? `Count of ${column.label || column.key}`
                      : `${aggregationType} of ${column.label || column.key}`
                  }
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
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
              <Tooltip formatter={(value: any) => formatNumericValue(value)} />
              <Legend />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis tickFormatter={formatNumericValue} stroke="#6b7280" />
              <Tooltip formatter={(value: any) => formatNumericValue(value)} />
              <Legend />
              {yAxisColumns.map((column, index) => (
                <Area
                  key={column.key}
                  type="monotone"
                  dataKey={column.key}
                  stroke={COLORS[index % COLORS.length]}
                  fillOpacity={0.8}
                  fill={`url(#color${index})`}
                  name={
                    normalizeType(column.type) === "string"
                      ? `Count of ${column.label || column.key}`
                      : `${aggregationType} of ${column.label || column.key}`
                  }
                  stackId={stacked ? "a" : undefined}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case "composed":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis tickFormatter={formatNumericValue} stroke="#6b7280" />
              <Tooltip formatter={(value: any) => formatNumericValue(value)} />
              <Legend />
              {yAxisColumns.map((column, index) => {
                const isLine = index % 2 === 0;
                const chartComponent = isLine ? Line : Bar;
                return React.createElement(chartComponent, {
                  key: column.key,
                  dataKey: column.key,
                  name: column.label || column.key,
                  fill: COLORS[index % COLORS.length],
                  stroke: isLine ? COLORS[index % COLORS.length] : undefined,
                  type: isLine ? "monotone" : undefined,
                  stackId: !isLine ? "a" : undefined,
                });
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const chartTypeOptions = [
    { type: "bar" as const, label: "Bar", icon: BarChart3 },
    {
      type: "line" as const,
      label: "Line",
      label: "Line",
      icon: LineChartIcon,
    },
    { type: "area" as const, label: "Area", icon: Activity },
    { type: "composed" as const, label: "Mixed", icon: Layers },
    { type: "pie" as const, label: "Pie", icon: PieChartIcon },
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

  const viewOptions = [
    { type: "graph" as const, label: "Graph", icon: LayoutGrid },
    { type: "table" as const, label: "Table", icon: Table },
    { type: "query" as const, label: "SQL", icon: Terminal },
  ];

  const displayedTableName =
    xAxisColumn?.tableName || yAxisColumns[0]?.tableName || tableName;

  if (!tableName) {
    return (
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center text-slate-500">
          <div className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-full mb-4">
            <Database className="h-8 w-8 text-white" />
          </div>
          <p className="text-lg font-medium">
            Select a table to start building charts
          </p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Connect your data source and choose a table to visualize your data
          </p>
        </div>
      </div>
    );
  }

  const CurrentChartIcon =
    chartTypeOptions.find((option) => option.type === chartType)?.icon ||
    BarChart3;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg mr-3">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Chart Builder
            </h2>
            <p className="text-sm text-slate-600 flex items-center">
              <Database className="h-3 w-3 mr-1" />
              <span className="text-blue-600 font-medium">
                {displayedTableName}
              </span>
              {secondaryTableName && (
                <span className="ml-1 text-slate-500">
                  {" "}
                  +{" "}
                  <span className="text-purple-600 font-medium">
                    {secondaryTableName}
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reset</span>
        </button>
      </div>

      <div className="p-4 pb-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
              <span className="bg-blue-500 w-2 h-2 rounded-full mr-2"></span>
              X-Axis (Categories)
            </label>
            <ChartDropZone
              onDrop={handleDrop}
              onRemove={handleRemove}
              axis="x"
              selectedColumns={xAxisColumn ? [xAxisColumn] : []}
              label="Drag column for categories"
            />
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
              <span className="bg-indigo-500 w-2 h-2 rounded-full mr-2"></span>
              Y-Axis (Values)
              <span className="ml-auto text-xs text-slate-500">
                Multiple Supported
              </span>
            </label>
            <ChartDropZone
              onDrop={handleDrop}
              onRemove={handleRemove}
              axis="y"
              selectedColumns={yAxisColumns}
              label="Drag columns for values"
              allowMultiple={true}
            />
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
              <span className="bg-purple-500 w-2 h-2 rounded-full mr-2"></span>
              Group By (Optional)
            </label>
            <ChartDropZone
              onDrop={handleDrop}
              onRemove={handleRemove}
              axis="group"
              selectedColumns={groupByColumn ? [groupByColumn] : []}
              label="Drag column to group"
            />
          </div>
        </div>

        <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            {activeView === "graph" && (
              <div className="relative">
                <button
                  onClick={() => setShowChartOptions(!showChartOptions)}
                  className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2 text-blue-500" />
                  <span>Chart Options</span>
                  {showChartOptions ? (
                    <ChevronUp className="h-4 w-4 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-2" />
                  )}
                </button>
                {showChartOptions && (
                  <div
                    ref={chartOptionsRef}
                    className="absolute z-10 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-4 w-64"
                  >
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Chart Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {chartTypeOptions.map(({ type, label, icon: Icon }) => (
                          <button
                            key={type}
                            onClick={() => handleChartTypeClick(type)}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors ${
                              chartType === type
                                ? "bg-blue-100 text-blue-700 border border-blue-300"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            <Icon className="h-5 w-5 mb-1" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {chartType === "bar" &&
                      yAxisColumns.length >= 2 &&
                      xAxisColumn && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Bar Style
                          </label>
                          <div className="flex items-center">
                            <button
                              onClick={() => setStacked(false)}
                              className={`flex-1 py-2 rounded-l-lg text-sm font-medium transition-colors ${
                                !stacked
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              }`}
                            >
                              Side-by-side
                            </button>
                            <button
                              onClick={() => setStacked(true)}
                              className={`flex-1 py-2 rounded-r-lg text-sm font-medium transition-colors ${
                                stacked
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              }`}
                            >
                              Stacked
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
            <div className="relative">
              <button
                onClick={() =>
                  setShowAggregationOptions(!showAggregationOptions)
                }
                className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Layers className="h-4 w-4 mr-2 text-indigo-500" />
                <span>Aggregation: {aggregationType}</span>
                {showAggregationOptions ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </button>
              {showAggregationOptions && (
                <div
                  ref={aggregationOptionsRef}
                  className="absolute z-30 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-48 max-h-60 overflow-y-auto"
                >
                  {aggregationOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setAggregationType(value);
                        setShowAggregationOptions(false);
                      }}
                      className={`flex items-center w-full px-4 py-2 text-sm text-left rounded-md ${
                        aggregationType === value
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {aggregationType === value && (
                        <Check className="h-4 w-4 mr-2 text-blue-500" />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <div className="flex bg-slate-100 rounded-lg p-1">
              {viewOptions.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setActiveView(type)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === type
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-700 hover:text-blue-600"
                  }`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {chartData.length > 0 && (
              <>
                {activeView === "graph" && (
                  <button
                    onClick={handleDownloadGraph}
                    className="flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                    <span>Graph</span>
                  </button>
                )}
                {activeView === "table" && (
                  <button
                    onClick={handleDownloadTable}
                    className="flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                    <span>Table</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {activeView === "graph" && (
          <div
            ref={chartContainerRef}
            className="bg-gradient-to-b from-white to-slate-50 rounded-xl border border-slate-200 p-1"
          >
            {renderChartContent()}
          </div>
        )}

        {activeView === "table" && (
          <div className="bg-gradient-to-b from-white to-slate-50 rounded-xl border border-slate-200 p-1">
            <ChartDataTable
              chartData={chartData}
              xAxisColumn={xAxisColumn}
              yAxisColumns={yAxisColumns}
              groupByColumn={groupByColumn}
              aggregationType={aggregationType}
              valueFormatter={formatNumericValue}
            />
          </div>
        )}

        {activeView === "query" && (
          <div className="bg-gradient-to-b from-white to-slate-50 rounded-xl border border-slate-200 p-1">
            <SqlQueryDisplay generatedQuery={generatedQuery} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicChartBuilder;
