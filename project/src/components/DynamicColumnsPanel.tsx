import React from 'react';
import { DatabaseColumn } from '../services/api';
import DraggableColumn from './DraggableColumn';
import { Columns } from 'lucide-react';

interface DynamicColumnsPanelProps {
  tableName: string | null;
  columns: DatabaseColumn[];
  tables: string[];
  onTableChange: (tableName: string) => void;
}

const DynamicColumnsPanel: React.FC<DynamicColumnsPanelProps> = ({
  tableName,
  columns,
  tables,
  onTableChange,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">
          Available Columns
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Select a table and drag columns to build charts
        </p>

        <div className="mt-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Choose Table
          </label>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={tableName || ""}
            onChange={(e) => onTableChange(e.target.value)}
          >
            <option value="" disabled>
              Select a table
            </option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 overflow-y-auto max-h-[calc(100vh-150px)]">
        {columns.length > 0 ? (
          <div className="space-y-2">
            {columns.map((column) => (
              <DraggableColumn key={column.key} column={column} />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            <Columns className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>No columns available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicColumnsPanel;
