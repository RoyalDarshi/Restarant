import React from 'react';
import { DatabaseColumn } from '../services/api';
import DraggableColumn from './DraggableColumn';
import { Columns } from 'lucide-react';

interface DynamicColumnsPanelProps {
  tableName: string | null;
  columns: DatabaseColumn[];
}

const DynamicColumnsPanel: React.FC<DynamicColumnsPanelProps> = ({ tableName, columns }) => {
  if (!tableName) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Available Columns</h2>
          <p className="text-sm text-slate-600 mt-1">Select a table to view columns</p>
        </div>
        
        <div className="p-6">
          <div className="text-center py-8 text-slate-500">
            <Columns className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No table selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Available Columns</h2>
        <p className="text-sm text-slate-600 mt-1">
          Drag columns from <span className="font-medium">{tableName}</span> to create charts
        </p>
      </div>
      
      <div className="p-6">
        {columns.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {columns.map((column) => (
              <DraggableColumn key={column.key} column={column} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Columns className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No columns available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicColumnsPanel;