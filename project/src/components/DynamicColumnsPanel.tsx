import React, { useState } from 'react';
import { DatabaseColumn } from '../services/api';
import DraggableColumn from './DraggableColumn';
import { Columns, Search, Database, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredColumns = columns.filter(column =>
    column.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    column.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div 
        className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg mr-3">
              <Database className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Data Explorer
            </h2>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-500" />
          )}
        </div>
        
        <p className="text-sm text-slate-600 mt-1 ml-11">
          Select a table and drag columns to build visualizations
        </p>
      </div>

      {isExpanded && (
        <>
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Database Table
              </label>
              <div className="relative">
                <select
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  value={tableName || ""}
                  onChange={(e) => onTableChange(e.target.value)}
                >
                  <option value="" disabled className="text-slate-400">
                    Choose a table...
                  </option>
                  {tables.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 pt-5 text-slate-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {tableName && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Columns
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search columns..."
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 pl-10 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            )}
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-350px)] p-2">
            {tableName ? (
              filteredColumns.length > 0 ? (
                <div className="space-y-2 p-2">
                  {filteredColumns.map((column) => (
                    <DraggableColumn key={column.key} column={column} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Columns className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No columns match your search</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-slate-500">
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                  <Database className="h-8 w-8 text-blue-500" />
                </div>
                <p>Select a table to view columns</p>
                <p className="text-sm mt-1">Choose from the dropdown above</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DynamicColumnsPanel;