import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import html2canvas from "html2canvas";
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
import { Download, Database, Layers } from "lucide-react";
import { AggregationType, ChartType } from "./types";
import { formatNumericValue } from "./utils";

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

  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Normalize SQL types to string|number
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

  // ─── Ignore grouping if it's the same column as X ────────────────
  const effectiveGroupByColumn = useMemo<DatabaseColumn | null>(() => {
    if (!groupByColumn || !xAxisColumn) return null;
    return groupByColumn.key === xAxisColumn.key ? null : groupByColumn;
  }, [groupByColumn, xAxisColumn]);
  // ────────────────────────────────────────────────────────────────

  const constructSqlQuery = useCallback(() => {
    if (!xAxisColumn || yAxisColumns.length === 0) return "";

    const primaryTable = tableName;
    const secondaryTable = secondaryTableName;
    const selectParts: string[] = [];
    const groupByParts: string[] = [];
    let fromClause = `"${primaryTable}" AS t1`;
    let joinClause = "";
    let joinColumnKey: string | undefined;

    // Determine if we need a join
    const usesSecondaryTable =
      secondaryTable &&
      (xAxisColumn.tableName === secondaryTable ||
        yAxisColumns.some((col) => col.tableName === secondaryTable) ||
        effectiveGroupByColumn?.tableName === secondaryTable);

    if (usesSecondaryTable && secondaryTable) {
      const primarySchema = allTableSchemas.find(
        (s) => s.tableName === primaryTable
      );
      const secondarySchema = allTableSchemas.find(
        (s) => s.tableName === secondaryTable
      );
      if (primarySchema && secondarySchema) {
        for (const p of primarySchema.columns) {
          for (const s of secondarySchema.columns) {
            if (p.key === s.key && p.type === s.type) {
              joinColumnKey = p.key;
              break;
            }
          }
          if (joinColumnKey) break;
        }
      }
      if (joinColumnKey) {
        joinClause = ` INNER JOIN "${secondaryTable}" AS t2 ON t1."${joinColumnKey}" = t2."${joinColumnKey}"`;
      }
    }

    const qual = (col: DatabaseColumn) =>
      usesSecondaryTable && col.tableName === secondaryTable
        ? `t2."${col.key}"`
        : `t1."${col.key}"`;

    // X-axis
    selectParts.push(`${qual(xAxisColumn)} AS name`);
    groupByParts.push(qual(xAxisColumn));

    // Group-by only if effective
    if (effectiveGroupByColumn) {
      selectParts.push(qual(effectiveGroupByColumn));
      groupByParts.push(qual(effectiveGroupByColumn));
    }

    // Y-axes
    yAxisColumns.forEach((col) => {
      const colType = normalizeType(col.type);
      const agg = colType === "string" ? "COUNT" : aggregationType;
      selectParts.push(`${agg}(${qual(col)}) AS "${col.key}"`);
    });

    let q = `SELECT ${selectParts.join(", ")} FROM ${fromClause}${joinClause}`;
    if (groupByParts.length) {
      q += ` GROUP BY ${groupByParts.join(", ")}`;
      q += ` ORDER BY ${groupByParts.join(", ")}`;
    }
    return q;
  }, [
    tableName,
    xAxisColumn,
    yAxisColumns,
    effectiveGroupByColumn,
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

    const sqlQuery = constructSqlQuery();
    setGeneratedQuery(sqlQuery);

    // Only force stacked when we have a valid group
    if (effectiveGroupByColumn && chartType === "bar") {
      setStacked(true);
    } else {
      setStacked(yAxisColumns.length > 1);
    }

    // Build request payload
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
      secondaryTableName,
      joinColumn: undefined, // service infers from SQL
    };

    apiService
      .getAggregatedData(request)
      .then((resp) => {
        if (resp.success && resp.data) {
          let processed = resp.data;

          // Pivot only if effective grouping
          if (effectiveGroupByColumn && processed.length > 0) {
            const pivot: any[] = [];
            processed.forEach((row) => {
              const x = row.name;
              const g = row[effectiveGroupByColumn.key];
              const y = row[yAxisColumns[0].key];
              let e = pivot.find((e) => e.name === x);
              if (!e) {
                e = { name: x };
                pivot.push(e);
              }
              e[g] = y;
            });
            processed = pivot;

            // collect unique group keys
            const keys = Array.from(
              new Set(resp.data.map((r) => r[effectiveGroupByColumn.key]))
            );
            setUniqueGroupKeys(keys);
          } else {
            setUniqueGroupKeys([]);
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
    allTableSchemas,
    chartType,
  ]);

  const handleDrop = (column: DatabaseColumn, axis: "x" | "y" | "group") => {
    if (axis === "x") setXAxisColumn(column);
    if (axis === "y")
      setYAxisColumns((prev) =>
        prev.some((c) => c.key === column.key) ? prev : [...prev, column]
      );
    if (axis === "group") setGroupByColumn(column);
  };

  const handleRemove = (column: DatabaseColumn, axis: "x" | "y" | "group") => {
    if (axis === "x") setXAxisColumn(null);
    if (axis === "y")
      setYAxisColumns((prev) => prev.filter((c) => c.key !== column.key));
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
    if (chartData.length === 0) return;
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-2 pb-1">
        {/* Drop zones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-1">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-slate-200 p-2">
            <label className="flex items-center mb-2 text-sm font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full mr-2 bg-blue-500" />
              X-Axis (Categories)
            </label>
            <ChartDropZone
              axis="x"
              onDrop={handleDrop}
              onRemove={handleRemove}
              selectedColumns={xAxisColumn ? [xAxisColumn] : []}
              label="Drag column for categories"
            />
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-slate-200 p-2">
            <label className="flex items-center mb-2 text-sm font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full mr-2 bg-indigo-500" />
              Y-Axis (Values){" "}
              <span className="ml-auto text-xs text-slate-500">
                Multiple Supported
              </span>
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
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-slate-200 p-2">
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

        {/* Download buttons */}
        {chartData.length > 0 && (
          <div className="flex items-center space-x-2 ml-auto mb-2">
            {activeView === "graph" && (
              <button
                onClick={handleDownloadGraph}
                className="flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                <span>Graph</span>
              </button>
            )}
            {activeView === "table" && (
              <button
                onClick={handleDownloadTable}
                className="flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                <span>Table</span>
              </button>
            )}
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
          <div className="bg-gradient-to-b from-white to-slate-50 rounded-xl border border-slate-200 p-1">
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
          <div className="bg-gradient-to-b from-white to-slate-50 rounded-xl border border-slate-200 p-1">
            <SqlQueryDisplay generatedQuery={generatedQuery} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicChartBuilder;
