import React from 'react';
import { useDrop } from 'react-dnd';
import { Plus, X } from 'lucide-react';
// Assuming 'Column' and 'DragItem' types are defined in a types file
// For demonstration, I'll define them here.
interface Column {
  key: string;
  label: string;
  type: string; // e.g., 'number', 'string', 'date'
}

interface DragItem {
  column: Column;
  type: 'column';
}

interface ChartDropZoneProps {
  onDrop: (column: Column, axis: 'x' | 'y' | 'group') => void;
  onRemove?: (column: Column, axis: 'x' | 'y' | 'group') => void;
  axis: 'x' | 'y' | 'group';
  selectedColumns?: Column[];
  label: string;
  allowMultiple?: boolean;
}

const ChartDropZone: React.FC<ChartDropZoneProps> = ({
  onDrop,
  onRemove,
  axis,
  selectedColumns = [],
  label,
  allowMultiple = false,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "column",
    drop: (item: DragItem) => onDrop(item.column, axis),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`p-4 border-2 border-dashed rounded-lg transition-all min-h-16 flex flex-col items-center justify-center ${
        isOver
          ? "border-blue-400 bg-blue-50"
          : selectedColumns.length > 0
          ? "border-green-300 bg-green-50"
          : "border-slate-300 bg-slate-50 hover:border-slate-400"
      }`}
    >
      {selectedColumns.length > 0 ? (
        // Added max-h-48 and overflow-auto here to make the content scrollable
        <div className="w-full space-y-2 max-h-32 overflow-auto p-1 -m-1">
          {selectedColumns.map((column, index) => (
            <div
              key={`${column.key}-${index}`}
              className="flex items-center justify-between bg-white p-2 rounded border"
            >
              <div>
                <div className="font-medium text-slate-900 text-sm">
                  {column.label}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                  {column.type}
                </div>
              </div>
              {onRemove && (
                <button
                  onClick={() => onRemove(column, axis)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {allowMultiple && (
            <div className="text-center text-slate-400 text-xs border-t pt-2 sticky bottom-0 bg-green-50">
              Drop more columns to add
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-slate-500">
          <Plus className="h-6 w-6 mx-auto mb-1 opacity-50" />
          <div className="text-sm">
            Drop {label} here
            {allowMultiple && (
              <div className="text-xs mt-1">Supports multiple columns</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartDropZone;
