import React, { useState, useMemo } from 'react';
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
import { Column, DataRow } from '../types';
import ChartDropZone from './ChartDropZone';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  RefreshCw,
  Layers,
} from "lucide-react";

interface ChartBuilderProps {
  data: DataRow[];
}

const ChartBuilder: React.FC<ChartBuilderProps> = ({ data }) => {
  const [xAxisColumn, setXAxisColumn] = useState<Column | null>(null);
  const [yAxisColumns, setYAxisColumns] = useState<Column[]>([]);
  const [groupByColumn, setGroupByColumn] = useState<Column | null>(null);
  const [chartType, setChartType] = useState<
    "bar" | "line" | "pie" | "area" | "composed"
  >("bar");
  const [stacked, setStacked] = useState(false);

  // 1) Only treat groupByColumn as “effective” if it’s different from xAxisColumn
  const effectiveGroupByColumn = useMemo<Column | null>(() => {
    if (!groupByColumn) return null;
    if (xAxisColumn && groupByColumn.key === xAxisColumn.key) {
      return null;
    }
    return groupByColumn;
  }, [groupByColumn, xAxisColumn]);

  // 2) Unique keys for stacking come from the effective group
  const uniqueGroupKeys = useMemo<string[]>(() => {
    if (!effectiveGroupByColumn || data.length === 0) return [];
    return Array.from(
      new Set(data.map((item) => String(item[effectiveGroupByColumn.key])))
    );
  }, [data, effectiveGroupByColumn]);

  // 3) Build chartData either pivoted by effectiveGroupByColumn or simple
  const chartData = useMemo<any[]>(() => {
    if (!xAxisColumn || yAxisColumns.length === 0) return [];

    // Pivoted case
    if (effectiveGroupByColumn) {
      const pivoted = new Map<string, any>();
      const yKey = yAxisColumns[0].key;

      data.forEach((item) => {
        const xVal = String(item[xAxisColumn.key]);
        const gVal = String(item[effectiveGroupByColumn.key]);
        const yVal = item[yKey];

        if (!pivoted.has(xVal)) {
          pivoted.set(xVal, { name: xVal });
        }
        const row = pivoted.get(xVal);
        // counting occurrences
        row[gVal] = (row[gVal] || 0) + 1;
      });

      return Array.from(pivoted.values());
    }

    // Simple sum‐up case
    const grouped: Record<string, any> = {};
    data.forEach((item) => {
      const xVal = String(item[xAxisColumn.key]);
      if (!grouped[xVal]) {
        grouped[xVal] = { name: xVal };
        yAxisColumns.forEach((c) => {
          grouped[xVal][c.label] = 0;
        });
      }
      yAxisColumns.forEach((c) => {
        const v = item[c.key];
        if (typeof v === "number") {
          grouped[xVal][c.label] += v;
        }
      });
    });
    return Object.values(grouped);
  }, [data, xAxisColumn, yAxisColumns, effectiveGroupByColumn]);

  // Pie uses only xAxis + yAxis
  const pieChartData = useMemo(() => {
    if (!xAxisColumn || yAxisColumns.length === 0) return [];
    const firstY = yAxisColumns[0];
    const acc: Record<string, number> = {};

    data.forEach((item) => {
      const xVal = String(item[xAxisColumn.key]);
      const yVal = item[firstY.key];
      if (typeof yVal === "number") {
        acc[xVal] = (acc[xVal] || 0) + yVal;
      }
    });

    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [data, xAxisColumn, yAxisColumns]);

  const handleDrop = (column: Column, axis: "x" | "y" | "group") => {
    if (axis === "x") setXAxisColumn(column);
    if (axis === "y" && !yAxisColumns.find((c) => c.key === column.key))
      setYAxisColumns((prev) => [...prev, column]);
    if (axis === "group") setGroupByColumn(column);
  };

  const handleRemove = (column: Column, axis: "x" | "y" | "group") => {
    if (axis === "x") setXAxisColumn(null);
    if (axis === "y")
      setYAxisColumns((prev) => prev.filter((c) => c.key !== column.key));
    if (axis === "group") setGroupByColumn(null);
  };

  const handleReset = () => {
    setXAxisColumn(null);
    setYAxisColumns([]);
    setGroupByColumn(null);
    setStacked(false);
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
    if (!xAxisColumn || yAxisColumns.length === 0 || chartData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>Drop columns above to generate a chart</p>
            <p className="text-sm mt-2">
              You can add multiple Y-axis columns for comparison
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
              {effectiveGroupByColumn && uniqueGroupKeys.length > 0
                ? uniqueGroupKeys.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))
                : yAxisColumns.map((col, i) => (
                    <Bar
                      key={col.key}
                      dataKey={col.label}
                      fill={COLORS[i % COLORS.length]}
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((col, i) => (
                <Line
                  key={col.key}
                  type="monotone"
                  dataKey={col.label}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
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
              {yAxisColumns.map((col, i) => (
                <Area
                  key={col.key}
                  type="monotone"
                  dataKey={col.label}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.3}
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((col, i) =>
                i % 2 === 0 ? (
                  <Bar
                    key={col.key}
                    dataKey={col.label}
                    fill={COLORS[i % COLORS.length]}
                  />
                ) : (
                  <Line
                    key={col.key}
                    type="monotone"
                    dataKey={col.label}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                  />
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieChartData}
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
                {pieChartData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Chart Builder
          </h2>
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
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

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Chart Type
          </label>
          <div className="flex space-x-2">
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

          {chartType === "bar" &&
            yAxisColumns.length > 1 &&
            !effectiveGroupByColumn && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bar Style
                </label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  <button
                    onClick={() => setStacked(false)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      !stacked
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Side-by-side
                  </button>
                  <button
                    onClick={() => setStacked(true)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      stacked
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Stacked
                  </button>
                </div>
              </div>
            )}
        </div>

        <div className="bg-slate-50 rounded-lg p-6">
          {(xAxisColumn || yAxisColumns.length > 0 || groupByColumn) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">
                Chart Configuration:
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                {xAxisColumn && <p>• X-Axis: {xAxisColumn.label}</p>}
                {yAxisColumns.length > 0 && (
                  <p>
                    • Y-Axis: {yAxisColumns.map((col) => col.label).join(", ")}
                  </p>
                )}
                {groupByColumn && <p>• Grouped by: {groupByColumn.label}</p>}
                {chartType === "bar" && (
                  <p>
                    • Bar Style:{" "}
                    {effectiveGroupByColumn
                      ? "Stacked"
                      : stacked
                      ? "Stacked"
                      : "Side-by-side"}
                  </p>
                )}
              </div>
            </div>
          )}
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default ChartBuilder;