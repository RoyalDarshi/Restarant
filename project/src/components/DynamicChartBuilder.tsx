import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import html2canvas from "html2canvas";
import { v4 as uuidv4 } from "uuid";
import {
  DatabaseColumn,
  apiService,
  AggregationRequest,
  DatabaseTableSchema,
  AggregationColumn,
} from "../services/api";
import ChartDropZone from "./ChartDropZone";
import ChartDataTable from "./ChartDataTable";
import SqlQueryDisplay from "./SqlQueryDisplay";
import ChartControls from "./ChartControls";
import ChartDisplay from "./ChartDisplay";
import { Download, Database } from "lucide-react";
import { AggregationType, ChartType } from "./types";
import { formatNumericValue } from "./utils";
import { useDashboard } from "./DashboardContext";

interface DynamicChartBuilderProps {
  tableName: string;
  columns: DatabaseColumn[];
  secondaryTableName?: string;
  secondaryColumns?: DatabaseColumn[];
  allTableSchemas: DatabaseTableSchema[];
}

const DynamicChartBuilder: React.FC<DynamicChartBuilderProps> = ({
  tableName,
  columns,
  secondaryTableName,
  secondaryColumns,
  allTableSchemas,
}) => {
  // ─────── State ──────────────────────────────────────────────────────────────
  const [xAxisColumn, setXAxisColumn] = useState(null);
  const [yAxisColumns, setYAxisColumns] = useState([]);
  const [groupByColumn, setGroupByColumn] = useState(null);
  const [chartType, setChartType] = useState("bar");
  const [aggregationType, setAggregationType] = useState("SUM");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stacked, setStacked] = useState(true);
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [activeView, setActiveView] = useState("graph");
  const [uniqueGroupKeys, setUniqueGroupKeys] = useState([]);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");

  // Reset ALL selections and chart data whenever primary or secondary table changes
  useEffect(() => {
    setXAxisColumn(null);
    setYAxisColumns([]);
    setGroupByColumn(null);
    setChartData([]);
    setGeneratedQuery("");
    setUniqueGroupKeys([]);
    setActiveView("graph");
    setError(null);
  }, [tableName, secondaryTableName]);
  const chartContainerRef = useRef(null);

  // Dashboard context
  const {
    dashboards,
    addChartToDashboard,
    createDashboard,
    setCurrentDashboardId,
  } = useDashboard();
  const [successMessage, setSuccessMessage] = useState(null);

  // ─────── Helpers ────────────────────────────────────────────────────────────

  const normalizeType = (type) => {
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

  const effectiveGroupByColumn = useMemo(() => {
    if (!groupByColumn || !xAxisColumn) return null;
    return groupByColumn.key === xAxisColumn.key ? null : groupByColumn;
  }, [groupByColumn, xAxisColumn]);
  const inferredJoinColumn = useMemo(() => {
    if (!secondaryTableName) return undefined;
    const pSchema = allTableSchemas.find((s) => s.tableName === tableName);
    const sSchema = allTableSchemas.find(
      (s) => s.tableName === secondaryTableName
    );
    if (!pSchema || !sSchema) return undefined;
    for (const pCol of pSchema.columns) {
      for (const sCol of sSchema.columns) {
        if (pCol.key === sCol.key && pCol.type === sCol.type) {
          return pCol.key;
        }
      }
    }
    return undefined;
  }, [tableName, secondaryTableName, allTableSchemas]);
  const constructSqlQuery = useCallback(() => {
    if (!xAxisColumn || yAxisColumns.length === 0) return "";

    const pAlias = "t1";
    const sAlias = "t2";
    const sel = [];
    const grp = [];

    const usesSecondary =
      secondaryTableName &&
      inferredJoinColumn &&
      (xAxisColumn.tableName === secondaryTableName ||
        yAxisColumns.some((c) => c.tableName === secondaryTableName) ||
        effectiveGroupByColumn?.tableName === secondaryTableName);

    const qual = (col) =>
      usesSecondary && col.tableName === secondaryTableName
        ? `${sAlias}."${col.key}"`
        : `${pAlias}."${col.key}"`;

    sel.push(`${qual(xAxisColumn)} AS name`);
    grp.push(qual(xAxisColumn));

    if (effectiveGroupByColumn) {
      sel.push(`${qual(effectiveGroupByColumn)}`);
      grp.push(qual(effectiveGroupByColumn));
    }

    yAxisColumns.forEach((col) => {
      const agg =
        normalizeType(col.type) === "string" ? "COUNT" : aggregationType;
      sel.push(`${agg}(${qual(col)}) AS "${col.key}"`);
    });

    let sql = `SELECT ${sel.join(", ")}\nFROM "${tableName}" AS ${pAlias}`;
    if (usesSecondary && secondaryTableName && inferredJoinColumn) {
      sql +=
        `\nINNER JOIN "${secondaryTableName}" AS ${sAlias}` +
        `\n  ON ${pAlias}."${inferredJoinColumn}"` +
        ` = ${sAlias}."${inferredJoinColumn}"`;
    }

    if (grp.length) {
      sql += `\nGROUP BY ${grp.join(", ")}`;
      sql += `\nORDER BY ${grp.join(", ")}`;
    }

    return sql;
  }, [
    tableName,
    xAxisColumn,
    yAxisColumns,
    effectiveGroupByColumn,
    aggregationType,
    secondaryTableName,
    inferredJoinColumn,
  ]);
  useEffect(() => {
    if (!xAxisColumn || yAxisColumns.length === 0) {
      setChartData([]);
      setGeneratedQuery("");
      return;
    }

    setLoading(true);
    setError(null);

    const sqlPreview = constructSqlQuery();
    setGeneratedQuery(sqlPreview);

    if (effectiveGroupByColumn && chartType === "bar") {
      setStacked(true);
    } else {
      setStacked(yAxisColumns.length > 1);
    }

    const aggTypes = yAxisColumns.map((col) =>
      normalizeType(col.type) === "string" ? "COUNT" : aggregationType
    );
    const xReq = {
      key: xAxisColumn.key,
      tableName: xAxisColumn.tableName,
    };
    const yReqs = yAxisColumns.map((col) => ({
      key: col.key,
      tableName: col.tableName,
    }));
    const gReq = effectiveGroupByColumn
      ? {
          key: effectiveGroupByColumn.key,
          tableName: effectiveGroupByColumn.tableName,
        }
      : undefined;

    const request = {
      tableName,
      xAxis: xReq,
      yAxes: yReqs,
      groupBy: gReq,
      aggregationTypes: aggTypes,
      secondaryTableName,
      joinColumn: inferredJoinColumn,
    };
    apiService
      .getAggregatedData(request)
      .then((resp) => {
        if (resp.success && resp.data) {
          let processed = resp.data;

          // 🔥 Filter out rows where x-axis or y values are null/undefined
          processed = processed.filter((row) => {
            if (!row.name) return false; // x-axis is null/empty
            return yAxisColumns.every(
              (col) => row[col.key] !== null && row[col.key] !== undefined
            );
          });

          if (effectiveGroupByColumn && processed.length) {
            const pivot: any[] = [];
            resp.data.forEach((row) => {
              if (!row.name || row[effectiveGroupByColumn.key] == null) return; // skip invalid
              const x = row.name;
              const g = row[effectiveGroupByColumn.key];
              const y = row[yAxisColumns[0].key];
              let entry = pivot.find((e) => e.name === x);
              if (!entry) {
                entry = { name: x };
                pivot.push(entry);
              }
              entry[g] = y;
            });
            processed = pivot;

            const groupKeys = Array.from(
              new Set(resp.data.map((r) => r[effectiveGroupByColumn.key]))
            );
            setUniqueGroupKeys(groupKeys);

            processed = processed.sort((a, b) => {
              const sumA = groupKeys.reduce((acc, g) => acc + (a[g] || 0), 0);
              const sumB = groupKeys.reduce((acc, g) => acc + (b[g] || 0), 0);
              return sumB - sumA;
            });
          } else {
            setUniqueGroupKeys([]);
            if (processed.length > 0 && yAxisColumns.length > 0) {
              const yKey = yAxisColumns[0].key;
              processed = processed.sort((a, b) => {
                const aVal = Number(a[yKey]) || 0;
                const bVal = Number(b[yKey]) || 0;
                return bVal - aVal;
              });
            }
          }

          setChartData(processed);
        } else {
          setError(resp.error || "Failed to fetch chart data");
          setChartData([]);
          setUniqueGroupKeys([]);
        }
      })
      .catch((err) => {
        setError("Error generating chart data: " + err.message);
        setChartData([]);
        setUniqueGroupKeys([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    tableName,
    xAxisColumn,
    yAxisColumns,
    effectiveGroupByColumn,
    aggregationType,
    constructSqlQuery,
    secondaryTableName,
    inferredJoinColumn,
    chartType,
  ]);
  const handleDrop = (col, axis) => {
    if (axis === "x") setXAxisColumn(col);
    if (axis === "y")
      setYAxisColumns((prev) =>
        prev.some((c) => c.key === col.key) ? prev : [...prev, col]
      );
    if (axis === "group") setGroupByColumn(col);
  };
  const handleRemove = (col, axis) => {
    if (axis === "x") setXAxisColumn(null);
    if (axis === "y")
      setYAxisColumns((prev) => prev.filter((c) => c.key !== col.key));
    if (axis === "group") setGroupByColumn(null);
  };
  const handleDownloadGraph = () => {
    if (!chartContainerRef.current) return;
    html2canvas(chartContainerRef.current, { useCORS: true, scale: 2 }).then(
      (canvas) => {
        const link = document.createElement("a");
        link.download = `${tableName}_${chartType}_chart.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    );
  };
  const handleDownloadTable = () => {
    if (!chartData.length) return;
    const headers = [
      xAxisColumn?.label || xAxisColumn?.key || "X-Axis",
      ...(effectiveGroupByColumn
        ? [effectiveGroupByColumn.label || effectiveGroupByColumn.key]
        : []),
      ...yAxisColumns.map((col) => {
        const agg =
          normalizeType(col.type) === "string" ? "COUNT" : aggregationType;
        return `${agg} of ${col.label || col.key}`;
      }),
    ];
    const rows = [
      headers.join(","),
      ...chartData.map((row) => {
        const vals = [
          row.name,
          ...(effectiveGroupByColumn ? [row[effectiveGroupByColumn.key]] : []),
          ...yAxisColumns.map((col) => formatNumericValue(row[col.key])),
        ];
        return vals.join(",");
      }),
    ];
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${tableName}_data_table.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleAddToDashboard = () => {
    // This function no longer checks if dashboards exist and always opens the modal.
    const chart = {
      id: uuidv4(),
      chartType,
      chartData,
      xAxisColumn,
      yAxisColumns,
      groupByColumn: effectiveGroupByColumn,
      uniqueGroupKeys,
      aggregationType,
      stacked,
    };
    // The chart object is stored in state for the modal to access
    setChartToAdd(chart);
    setShowDashboardModal(true);
  };

  // State to hold the chart to be added before the modal is shown
  const [chartToAdd, setChartToAdd] = useState(null);

  const handleCreateAndAdd = () => {
    if (!newDashboardName || !chartToAdd) return;
    const newId = createDashboard(newDashboardName);
    addChartToDashboard(newId, chartToAdd);
    setShowDashboardModal(false);
    setNewDashboardName("");
    setChartToAdd(null);
    setXAxisColumn(null);
    setYAxisColumns([]);
    setGroupByColumn(null);
    setChartData([]);
    setGeneratedQuery("");
    setActiveView("graph");
    setError(null);
    setSuccessMessage(`Added successfully to ${newDashboardName}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  const handleAddToExisting = (dashboardId, dashboardName) => {
    if (!chartToAdd) return;
    addChartToDashboard(dashboardId, chartToAdd);
    setShowDashboardModal(false);
    setChartToAdd(null);
    setXAxisColumn(null);
    setYAxisColumns([]);
    setGroupByColumn(null);
    setChartData([]);
    setGeneratedQuery("");
    setActiveView("graph");
    setError(null);
    setSuccessMessage(`Added successfully to ${dashboardName}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  // ─────── Render ──────────────────────────────────────────────────────────────
  if (!tableName) {
    return (
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center text-slate-500">
          <div className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-full mb-4">
            <Database className="h-8 w-8 text-white" />
          </div>
          <p className="text-lg font-medium">Select a table to start</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Connect your data source and choose a table to visualize.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-2 pb-1">
        {/* Drop zones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-1">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border p-2">
            <label className="flex items-center mb-2 text-sm font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full mr-2 bg-blue-500" />
              X-Axis
            </label>
            <ChartDropZone
              axis="x"
              onDrop={handleDrop}
              onRemove={handleRemove}
              selectedColumns={xAxisColumn ? [xAxisColumn] : []}
              label="Drag column for categories"
            />
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border p-2">
            <label className="flex items-center mb-2 text-sm font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full mr-2 bg-indigo-500" />
              Y-Axis
            </label>
            <ChartDropZone
              axis="y"
              onDrop={handleDrop}
              onRemove={handleRemove}
              selectedColumns={yAxisColumns}
              allowMultiple
              label="Drag columns for values"
            />
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border p-2">
            <label className="flex items-center mb-2 text-sm font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full mr-2 bg-purple-500" />
              Group By (Optional)
            </label>
            <ChartDropZone
              axis="group"
              onDrop={handleDrop}
              onRemove={handleRemove}
              selectedColumns={
                effectiveGroupByColumn ? [effectiveGroupByColumn] : []
              }
              label="Drag column to group"
            />
          </div>
        </div>

        {/* Controls */}
        <ChartControls
          chartType={chartType}
          setChartType={setChartType}
          aggregationType={aggregationType}
          setAggregationType={setAggregationType}
          stacked={stacked}
          setStacked={setStacked}
          activeView={activeView}
          setActiveView={setActiveView}
          yAxisCount={yAxisColumns.length}
          groupByColumn={effectiveGroupByColumn}
        />

        {/* Download */}
        {chartData.length > 0 && (
          <div className="flex items-center space-x-2 ml-auto mb-2">
            {activeView === "graph" && (
              <button
                onClick={handleDownloadGraph}
                className="flex items-center space-x-1 px-4 py-2 bg-green-500 text-white rounded-lg"
              >
                <Download className="h-4 w-4" />
                <span>Graph</span>
              </button>
            )}
            {activeView === "table" && (
              <button
                onClick={handleDownloadTable}
                className="flex items-center space-x-1 px-4 py-2 bg-green-500 text-white rounded-lg"
              >
                <Download className="h-4 w-4" />
                <span>Table</span>
              </button>
            )}
          </div>
        )}
        {/* Success message */}
        {successMessage && (
          <div className="mb-2 px-4 py-2 bg-green-100 text-green-800 rounded">
            {successMessage}
          </div>
        )}
        {/* Add to Dashboard Button */}
        {activeView === "graph" && chartData.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleAddToDashboard}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow"
            >
              <span>Add to Dashboard</span>
            </button>
          </div>
        )}

        {/* Views */}
        {activeView === "graph" && (
          <ChartDisplay
            chartContainerRef={chartContainerRef}
            chartType={chartType}
            chartData={chartData}
            xAxisColumn={xAxisColumn}
            yAxisColumns={yAxisColumns}
            groupByColumn={effectiveGroupByColumn}
            uniqueGroupKeys={uniqueGroupKeys}
            aggregationType={aggregationType}
            loading={loading}
            error={error}
            stacked={stacked}
          />
        )}
        {activeView === "table" && (
          <div className="bg-gradient-to-b from-white to-slate-50 rounded-xl border p-1">
            <ChartDataTable
              chartData={chartData}
              xAxisColumn={xAxisColumn}
              yAxisColumns={yAxisColumns}
              groupByColumn={effectiveGroupByColumn}
              aggregationType={aggregationType}
              valueFormatter={formatNumericValue}
            />
          </div>
        )}
        {activeView === "query" && (
          <div className="bg-gradient-to-b from-white to-slate-50 rounded-xl border p-1">
            <SqlQueryDisplay generatedQuery={generatedQuery} />
          </div>
        )}
      </div>

      {/* Dashboard Selection Modal */}
      {showDashboardModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-medium mb-4">Choose Dashboard</h2>
            <div className="space-y-2 mb-4">
              {dashboards.length > 0 ? (
                dashboards.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleAddToExisting(d.id, d.name)}
                    className="w-full text-left px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    {d.name}
                  </button>
                ))
              ) : (
                <div className="text-center text-slate-500 py-4">
                  No dashboards exist. Please create one below.
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                placeholder="New dashboard name"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                className="flex-1 border p-2 rounded"
              />
              <button
                onClick={handleCreateAndAdd}
                className="bg-green-500 text-white p-2 rounded"
              >
                Create and Add
              </button>
            </div>
            <button
              onClick={() => setShowDashboardModal(false)}
              className="w-full px-4 py-2 bg-red-500 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicChartBuilder;