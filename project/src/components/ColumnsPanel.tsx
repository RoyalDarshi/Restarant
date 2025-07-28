import React from 'react';
import { columns } from '../data/sampleData';
import DraggableColumn from './DraggableColumn';

const ColumnsPanel: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Available Columns</h2>
        <p className="text-sm text-slate-600 mt-1">Drag columns to create charts</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 gap-3">
          {columns.map((column) => (
            <DraggableColumn key={column.key} column={column} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColumnsPanel;