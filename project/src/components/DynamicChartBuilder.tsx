import React, { useState, useEffect, useCallback, useRef } from "react";
import { ResponsiveContainer } from "recharts";
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
  const [uniqueGroupKeys, setUniqueGroupKeys] = useState<string[]>([]); // New state for unique group keys

  const chartContainerRef = useRef<HTMLDivElement>(null);

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

    const sqlQuery = constructSqlQuery();
    setGeneratedQuery(sqlQuery);

    // If a groupBy column is selected, force stacked bar chart
    if (groupByColumn && chartType === "bar") {
      setStacked(true);
    } else {
      setStacked(yAxisColumns.length > 1);
    }

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

    const xAxisForRequest: AggregationColumn = {
      key: xAxisColumn.key,
      tableName: xAxisColumn.tableName,
    };

    const yAxesForRequest: AggregationColumn[] = yAxisColumns
      .filter((col) => col && col.key)
      .map((col) => ({ key: col.key, tableName: col.tableName }));

    const groupByForRequest: AggregationColumn | undefined =
      groupByColumn && groupByColumn.key
        ? { key: groupByColumn.key, tableName: groupByColumn.tableName }
        : undefined;

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

    apiService
      .getAggregatedData(request)
      .then((response) => {
        if (response.success && response.data) {
          let processedData = response.data;

          if (groupByColumn && processedData.length > 0) {
            const pivotedData = processedData.reduce((acc, current) => {
              const xKey = current.name;
              const groupByKey = groupByColumn.key;
              const yKey = yAxisColumns[0].key;

              let existingEntry = acc.find((item) => item.name === xKey);
              if (!existingEntry) {
                existingEntry = { name: xKey };
                acc.push(existingEntry);
              }
              // Set the value for the specific group key
              existingEntry[current[groupByKey]] = current[yKey];
              return acc;
            }, []);
            processedData = pivotedData;

            // Get unique group keys for the legend and bars
            const uniqueKeys = Array.from(
              new Set(response.data.map((item) => item[groupByColumn.key]))
            );
            setUniqueGroupKeys(uniqueKeys);
          } else {
            setUniqueGroupKeys([]);
          }

          setChartData(processedData);
        } else {
          setError(response.error || "Failed to fetch chart data");
          setChartData([]);
          setUniqueGroupKeys([]);
        }
      })
      .catch((err) => {
        setError("Failed to generate chart data: " + err.message);
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
    groupByColumn,
    aggregationType,
    constructSqlQuery,
    secondaryTableName,
    allTableSchemas,
    chartType,
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-1">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-slate-200 p-2">
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
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-slate-200 p-2">
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
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-slate-200 p-2">
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
          groupByColumn={groupByColumn}
        />

        {chartData.length > 0 && (
          <div className="flex items-center space-x-2 ml-auto mb-2">
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
          </div>
        )}

        {activeView === "graph" && (
          <ChartDisplay
            chartType={chartType}
            chartData={chartData}
            xAxisColumn={xAxisColumn}
            yAxisColumns={yAxisColumns}
            groupByColumn={groupByColumn}
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
