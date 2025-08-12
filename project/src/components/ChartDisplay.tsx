import React from 'react';
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
import { BarChart3, RefreshCw, Database, Layers } from "lucide-react";
import { DatabaseColumn, AggregationType } from "../services/api";
import { formatNumericValue } from "./utils";

interface ChartDisplayProps {
  chartType: "bar" | "line" | "pie" | "area" | "composed";
  chartData: any[];
  xAxisColumn: DatabaseColumn | null;
  yAxisColumns: DatabaseColumn[];
  groupByColumn: DatabaseColumn | null;
  uniqueGroupKeys?: string[]; // Added this prop for stacked charts
  aggregationType: AggregationType;
  loading: boolean;
  error: string | null;
  stacked: boolean;
  chartContainerRef: React.RefObject<HTMLDivElement>;
}

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

const ChartDisplay: React.FC<ChartDisplayProps> = ({
  chartType,
  chartData,
  xAxisColumn,
  yAxisColumns,
  groupByColumn,
  uniqueGroupKeys,
  aggregationType,
  loading,
  error,
  stacked,
  chartContainerRef,
}) => {
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
    data: chartData,
    margin: { top: 20, right: 30, left: 20, bottom: 5 },
  };

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        // Logic for stacked bar chart when a groupByColumn is present
        if (groupByColumn && uniqueGroupKeys) {
          return (
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" interval="preserveStartEnd" />
              <YAxis tickFormatter={formatNumericValue} stroke="#6b7280" />
              <Tooltip
                formatter={(value) => formatNumericValue(value)}
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              {uniqueGroupKeys.map((groupKey, index) => (
                <Bar
                  key={groupKey}
                  dataKey={groupKey}
                  fill={COLORS[index % COLORS.length]}
                  name={groupKey} // Display the group key in the legend
                  stackId="a" // All bars will stack on the same stackId
                />
              ))}
            </BarChart>
          );
        }

        // Existing logic for regular bar charts
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#6b7280" interval="preserveStartEnd" />
            <YAxis tickFormatter={formatNumericValue} stroke="#6b7280" />
            <Tooltip
              formatter={(value) => formatNumericValue(value)}
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
        );
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis tickFormatter={formatNumericValue} stroke="#6b7280" />
            <Tooltip
              formatter={(value) => formatNumericValue(value)}
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
        );
      case "pie":
        const pieData = chartData.map((item) => ({
          name: item.name,
          value: item[yAxisColumns[0]?.key] || 0,
        }));
        return (
          <PieChart>
            <Tooltip formatter={(value) => formatNumericValue(value)} />
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
        );
      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis tickFormatter={formatNumericValue} stroke="#6b7280" />
            <Tooltip formatter={(value) => formatNumericValue(value)} />
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
        );
      case "composed":
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis tickFormatter={formatNumericValue} stroke="#6b7280" />
            <Tooltip formatter={(value) => formatNumericValue(value)} />
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
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={chartContainerRef}
      className="bg-gradient-to-b from-white to-slate-50 rounded-xl border border-slate-200 p-1"
    >
      <ResponsiveContainer width="100%" height={400}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartDisplay;
