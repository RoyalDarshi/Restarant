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
  secondaryTableNames?: string[]; // ✅ multiple tables
  secondaryColumns?: DatabaseColumn[];
  allTableSchemas: DatabaseTableSchema[];
}

const DynamicChartBuilder: React.FC<DynamicChartBuilderProps> = ({
  tableName,
  columns,
  secondaryTableNames = [],
  secondaryColumns,
  allTableSchemas,
}) => {
  // ───── State ─────
  const [xAxisColumn, setXAxisColumn] = useState<DatabaseColumn | null>(null);
  const [yAxisColumns, setYAxisColumns] = useState<DatabaseColumn[]>([]);
  const [groupByColumn, setGroupByColumn] = useState<DatabaseColumn | null>(
    null
  );
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [aggregationType, setAggregationType] =
    useState<AggregationType>("SUM");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stacked, setStacked] = useState(true);
  const [generatedQuery, setGeneratedQuery] = useState<string>("");
  const [activeView, setActiveView] = useState<"graph" | "table" | "query">(
    "graph"
  );
  const [uniqueGroupKeys, setUniqueGroupKeys] = useState<string[]>([]);

  // Reset when table selections change
  useEffect(() => {
    setXAxisColumn(null);
    setYAxisColumns([]);
    setGroupByColumn(null);
    setChartData([]);
    setGeneratedQuery("");
    setUniqueGroupKeys([]);
    setActiveView("graph");
    setError(null);
  }, [tableName, secondaryTableNames]);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Dashboard
  const { addChart } = useDashboard();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ───── Helpers ─────
  const normalizeType = (type: string): "string" | "number" => {
    const lower = type.toLowerCase();
    if (lower.includes("char") || lower === "text") return "string";
    if (
      lower.includes("int") ||
      lower.includes("float") ||
      lower.includes("double") ||
      lower.includes("decimal") ||
      lower.includes("numeric") ||
      lower.includes("real") ||
      lower === "number"
    )
      return "number";
    return "string";
  };

  // Avoid duplicating groupBy if it's same as xAxis
  const effectiveGroupByColumn = useMemo<DatabaseColumn | null>(() => {
    if (!groupByColumn || !xAxisColumn) return null;
    return groupByColumn.key === xAxisColumn.key ? null : groupByColumn;
  }, [groupByColumn, xAxisColumn]);

  // ✅ Infer join columns for all secondary tables
  const inferredJoinColumns = useMemo<
    Record<string, string | undefined>
  >(() => {
    if (!secondaryTableNames.length) return {};
    const result: Record<string, string | undefined> = {};
    const pSchema = allTableSchemas.find((s) => s.tableName === tableName);
    if (!pSchema) return result;

    secondaryTableNames.forEach((sTable) => {
      const sSchema = allTableSchemas.find((s) => s.tableName === sTable);
      if (!sSchema) return;
      for (const pCol of pSchema.columns) {
        for (const sCol of sSchema.columns) {
          if (pCol.key === sCol.key && pCol.type === sCol.type) {
            result[sTable] = pCol.key;
            return;
          }
        }
      }
    });

    return result;
  }, [tableName, secondaryTableNames, allTableSchemas]);

  // ✅ Build SQL preview string
  const constructSqlQuery = useCallback(() => {
    if (!xAxisColumn || yAxisColumns.length === 0) return "";

    const pAlias = "t1";
    let aliasCounter = 2;
    const tableAliases: Record<string, string> = {};
    secondaryTableNames.forEach((t) => {
      tableAliases[t] = `t${aliasCounter++}`;
    });

    const usesSecondary = secondaryTableNames.length > 0;

    const qual = (col: DatabaseColumn) => {
      if (usesSecondary && col.tableName !== tableName) {
        const alias = tableAliases[col.tableName];
        return `${alias}."${col.key}"`;
      }
      return `${pAlias}."${col.key}"`;
    };

    const sel: string[] = [];
    const grp: string[] = [];

    // X-axis
    sel.push(`${qual(xAxisColumn)} AS name`);
    grp.push(qual(xAxisColumn));

    // Group By
    if (effectiveGroupByColumn) {
      sel.push(`${qual(effectiveGroupByColumn)}`);
      grp.push(qual(effectiveGroupByColumn));
    }

    // Y axes
    yAxisColumns.forEach((col) => {
      const agg =
        normalizeType(col.type) === "string" ? "COUNT" : aggregationType;
      sel.push(`${agg}(${qual(col)}) AS "${col.key}"`);
    });

    // Base
    let sql = `SELECT ${sel.join(", ")}\nFROM "${tableName}" AS ${pAlias}`;

    // Add joins
    secondaryTableNames.forEach((t) => {
      const alias = tableAliases[t];
      const joinCol = inferredJoinColumns[t];
      if (joinCol) {
        sql += `\nINNER JOIN "${t}" AS ${alias} ON ${pAlias}."${joinCol}" = ${alias}."${joinCol}"`;
      }
    });

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
    secondaryTableNames,
    inferredJoinColumns,
  ]);

  // ───── Fetch Data when config changes ─────
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

    const xReq: AggregationColumn = {
      key: xAxisColumn.key,
      tableName: xAxisColumn.tableName,
    };
    const yReqs: AggregationColumn[] = yAxisColumns.map((col) => ({
      key: col.key,
      tableName: col.tableName,
    }));
    const gReq = effectiveGroupByColumn
      ? {
          key: effectiveGroupByColumn.key,
          tableName: effectiveGroupByColumn.tableName,
        }
      : undefined;

    const request: AggregationRequest = {
      tableName,
      xAxis: xReq,
      yAxes: yReqs,
      groupBy: gReq,
      aggregationTypes: aggTypes,
      secondaryTableNames, // ✅ send array
      joinColumns: inferredJoinColumns, // ✅ map { tableName: joinCol }
    };

    apiService
      .getAggregatedData(request)
      .then((resp) => {
        if (resp.success && resp.data) {
          let processed = resp.data;

          if (effectiveGroupByColumn && processed.length) {
            const pivot: any[] = [];
            resp.data.forEach((row) => {
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
    secondaryTableNames,
    inferredJoinColumns,
    chartType,
  ]);

  // ───── Handlers ─────
  const handleDrop = (col: DatabaseColumn, axis: "x" | "y" | "group") => {
    if (axis === "x") setXAxisColumn(col);
    if (axis === "y")
      setYAxisColumns((prev) =>
        prev.some((c) => c.key === col.key) ? prev : [...prev, col]
      );
    if (axis === "group") setGroupByColumn(col);
  };

  const handleRemove = (col: DatabaseColumn, axis: "x" | "y" | "group") => {
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

  // ───── Render ─────
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

        {/* Downloads */}
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

        {/* Add to Dashboard */}
        {activeView === "graph" && chartData.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => {
                addChart({
                  id: uuidv4(),
                  chartType,
                  chartData,
                  xAxisColumn,
                  yAxisColumns,
                  groupByColumn: effectiveGroupByColumn,
                  uniqueGroupKeys,
                  aggregationType,
                  stacked,
                });
                setXAxisColumn(null);
                setYAxisColumns([]);
                setGroupByColumn(null);
                setChartData([]);
                setGeneratedQuery("");
                setActiveView("graph");
                setError(null);
                setSuccessMessage("Added successfully to dashboard");
                setTimeout(() => setSuccessMessage(null), 3000);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow"
            >
              <span>Add to Dashboard</span>
            </button>
          </div>
        )}

        {/* Views */}
        {activeView === "graph" && (
          <ChartDisplay
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
            chartContainerRef={chartContainerRef}
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
    </div>
  );
};

export default DynamicChartBuilder;