import React from 'react';
import { DatabaseColumn } from '../services/api'; // Assuming api.ts is in '../services'

interface ChartDataTableProps {
  chartData: any[];
  xAxisColumn: DatabaseColumn | null;
  yAxisColumns: DatabaseColumn[];
  groupByColumn: DatabaseColumn | null;
  aggregationType: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";
}

const ChartDataTable: React.FC<ChartDataTableProps> = ({
  chartData,
  xAxisColumn,
  yAxisColumns,
  groupByColumn,
  aggregationType,
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

  if (chartData.length === 0 && (!xAxisColumn && yAxisColumns.length === 0)) {
    return (
      <p className="text-slate-500 text-center py-8">
        Drag and drop columns to generate data for the table.
      </p>
    );
  }

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 overflow-x-auto max-h-96 overflow-y-auto">
      <h3 className="text-md font-semibold mb-2 text-slate-900">
        Chart Data Table
      </h3>
      {chartData.length > 0 ? (
        <table className="min-w-full divide-y divide-slate-300">
          <thead className="bg-slate-50">
            <tr>
              {xAxisColumn && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {xAxisColumn.label}
                </th>
              )}
              {groupByColumn && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {groupByColumn.label}
                </th>
              )}
              {yAxisColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  {col.label} (
                  {normalizeType(col.type) === "string"
                    ? "COUNT"
                    : aggregationType}
                  )
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {chartData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {xAxisColumn && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {row.name}{" "}
                    {/* 'name' is aliased from xAxisColumn.key */}
                  </td>
                )}
                {groupByColumn && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {row[groupByColumn.key]}
                  </td>
                )}
                {yAxisColumns.map((col) => (
                  <td
                    key={col.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"
                  >
                    {row[col.key]}
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
