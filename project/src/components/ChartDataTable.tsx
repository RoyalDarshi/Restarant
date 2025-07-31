import React from 'react';
import { DatabaseColumn } from "../services/api";
import { Table, Activity } from "lucide-react";

interface ChartDataTableProps {
  chartData: any[];
  xAxisColumn: DatabaseColumn | null;
  yAxisColumns: DatabaseColumn[];
  groupByColumn: DatabaseColumn | null;
  aggregationType: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";
  valueFormatter?: (value: any) => string | number;
}

const ChartDataTable: React.FC<ChartDataTableProps> = ({
  chartData,
  xAxisColumn,
  yAxisColumns,
  groupByColumn,
  aggregationType,
  valueFormatter,
}) => {
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

  if (chartData.length === 0 && !xAxisColumn && yAxisColumns.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center h-96">
        <div className="bg-white p-5 rounded-full mb-4 shadow-sm">
          <Activity className="h-10 w-10 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">
          No Data Available
        </h3>
        <p className="text-slate-600 text-center max-w-md mt-2">
          Drag and drop columns to generate data for the table
        </p>
      </div>
    );
  }

  const tableColumns: { key: string; label: string; isNumeric: boolean }[] = [];

  if (xAxisColumn) {
    tableColumns.push({
      key: "name",
      label: xAxisColumn.label,
      isNumeric: false,
    });
  }

  if (groupByColumn) {
    tableColumns.push({
      key: groupByColumn.key,
      label: groupByColumn.label,
      isNumeric: false,
    });
  }

  yAxisColumns.forEach((col) => {
    const isNumeric = normalizeType(col.type) === "number";
    tableColumns.push({
      key: col.key,
      label: `${col.label} (${
        isNumeric && aggregationType !== "COUNT"
          ? aggregationType
          : normalizeType(col.type) === "string"
          ? "COUNT"
          : ""
      })`,
      isNumeric: isNumeric,
    });
  });

  return (
    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 overflow-x-auto max-h-96 overflow-y-auto shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center">
          <Table className="h-5 w-5 mr-2 text-blue-500" />
          Chart Data Table
        </h3>
        <div className="text-sm text-slate-500">{chartData.length} rows</div>
      </div>

      {chartData.length > 0 ? (
        <div className="relative overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <tr>
                {tableColumns.map((col, index) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider ${
                      index === 0 ? "pl-6" : ""
                    }`}
                  >
                    <div className="flex items-center">
                      <span>{col.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {chartData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={
                    rowIndex % 2 === 0
                      ? "bg-white hover:bg-blue-50"
                      : "bg-slate-50 hover:bg-blue-50"
                  }
                >
                  {tableColumns.map((col, colIndex) => (
                    <td
                      key={`${rowIndex}-${col.key}`}
                      className={`px-4 py-3 text-sm ${
                        col.isNumeric
                          ? "text-right font-medium text-slate-900"
                          : "text-slate-700"
                      } ${colIndex === 0 ? "pl-6 font-medium" : ""}`}
                    >
                      {col.isNumeric && valueFormatter
                        ? valueFormatter(row[col.key])
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-dashed border-slate-300">
          <div className="bg-white p-3 rounded-full mb-3">
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">
            No Data Available
          </h3>
          <p className="text-slate-600 text-sm mt-1">
            Configure your chart axes to display data
          </p>
        </div>
      )}
    </div>
  );
};

export default ChartDataTable;