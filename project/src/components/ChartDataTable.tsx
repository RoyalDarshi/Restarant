import React from 'react';
import { DatabaseColumn } from '../services/api'; // Assuming api.ts is in '../services'

interface ChartDataTableProps {
  chartData: any[];
  xAxisColumn: DatabaseColumn | null;
  yAxisColumns: DatabaseColumn[];
  groupByColumn: DatabaseColumn | null;
  aggregationType: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";
  valueFormatter?: (value: any) => string | number; // Add this new prop
}

const ChartDataTable: React.FC<ChartDataTableProps> = ({
  chartData,
  xAxisColumn,
  yAxisColumns,
  groupByColumn,
  aggregationType,
  valueFormatter, // Destructure the new prop
}) => {
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

  if (chartData.length === 0 && !xAxisColumn && yAxisColumns.length === 0) {
    return (
      <p className="text-slate-500 text-center py-8">
        Drag and drop columns to generate data for the table.
      </p>
    );
  }

  // Determine all columns to display in the table, including their numeric status
  const tableColumns: { key: string; label: string; isNumeric: boolean }[] = [];

  if (xAxisColumn) {
    tableColumns.push({
      key: "name", // 'name' is the alias used in the aggregation query for xAxis
      label: xAxisColumn.label,
      isNumeric: false, // X-axis is typically categorical
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
    // Determine if the column is numeric based on its normalized type
    const isNumeric = normalizeType(col.type) === "number";
    tableColumns.push({
      key: col.key,
      label: `${col.label} (${
        isNumeric && aggregationType !== "COUNT" // Don't show aggregation type if string column is counted.
          ? aggregationType
          : normalizeType(col.type) === "string"
          ? "COUNT"
          : ""
      })`,
      isNumeric: isNumeric,
    });
  });

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 overflow-x-auto max-h-96 overflow-y-auto">
      <h3 className="text-md font-semibold mb-2 text-slate-900">
        Chart Data Table
      </h3>
      {chartData.length > 0 ? (
        <table className="min-w-full divide-y divide-slate-300">
          <thead className="bg-slate-50">
            <tr>
              {tableColumns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {chartData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {tableColumns.map((col) => (
                  <td
                    key={`${rowIndex}-${col.key}`}
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"
                  >
                    {/* Apply formatter if it's a numeric column and formatter is provided */}
                    {col.isNumeric && valueFormatter
                      ? valueFormatter(row[col.key])
                      : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-slate-500 text-center py-8">
          No data to display. Configure your chart axes.
        </p>
      )}
    </div>
  );
};

export default ChartDataTable;