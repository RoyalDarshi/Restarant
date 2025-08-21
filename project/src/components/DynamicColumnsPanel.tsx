import React, { useState, useMemo } from "react";
import { DatabaseColumn } from "../services/api";
import DraggableColumn from "./DraggableColumn";
import {
  Columns,
  Search,
  Database,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DynamicColumnsPanelProps {
  tableName: string | null;
  columns: DatabaseColumn[]; // This will be ALL columns from primary and secondary
  tables: string[];
  onTableChange: (tableName: string) => void;
  // Props for second table selection
  secondaryTableName: string | null;
  secondaryTables: string[];
  onSecondaryTableChange: (tableName: string) => void;
}

const DynamicColumnsPanel: React.FC<DynamicColumnsPanelProps> = ({
  tableName,
  columns, // Now contains columns from both primary and secondary
  tables,
  onTableChange,
  secondaryTableName,
  secondaryTables,
  onSecondaryTableChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  // Separate columns by their table origin
  const primaryTableColumns = useMemo(() => {
    return columns.filter((column) => column.tableName === tableName);
  }, [columns, tableName]);

  const secondaryTableColumns = useMemo(() => {
    return columns.filter((column) => column.tableName === secondaryTableName);
  }, [columns, secondaryTableName]);

  // Memoize filtered and sorted columns for primary table
  const sortedAndFilteredPrimaryColumns = useMemo(() => {
    const filtered = primaryTableColumns.filter(
      (column) =>
        column.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (column.label || column.key)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => a.label.localeCompare(b.label));
  }, [primaryTableColumns, searchTerm]);

  // Memoize filtered and sorted columns for secondary table
  const sortedAndFilteredSecondaryColumns = useMemo(() => {
    const filtered = secondaryTableColumns.filter(
      (column) =>
        column.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (column.label || column.key)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => a.label.localeCompare(b.label));
  }, [secondaryTableColumns, searchTerm]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {isExpanded && (
        <>
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Primary Database Table
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

            {/* Second table selection dropdown */}
            <div className="relative mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Secondary Database Table
              </label>
              <div className="relative">
                <select
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  value={secondaryTableName || ""}
                  onChange={(e) => onSecondaryTableChange(e.target.value)}
                >
                  <option value="" disabled className="text-slate-400">
                    Choose a table...
                  </option>
                  {secondaryTables.map((t) => (
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

            {(tableName || secondaryTableName) && ( // Show search if either table is selected
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
            {tableName || secondaryTableName ? (
              <>
                {/* Display Primary Table Columns */}
                {tableName && (
                  <>
                    <h3 className="text-md font-semibold text-slate-800 px-2 py-1 bg-slate-100 rounded-md sticky top-0 z-10">
                      {tableName} Columns
                    </h3>
                    {sortedAndFilteredPrimaryColumns.length > 0 ? (
                      <div className="space-y-2 p-2">
                        {sortedAndFilteredPrimaryColumns.map((column) => (
                          <DraggableColumn key={column.key} column={column} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500 text-sm">
                        No columns found for "{tableName}" matching search.
                      </div>
                    )}
                  </>
                )}

                {/* Display Secondary Table Columns */}
                {secondaryTableName && (
                  <>
                    <h3 className="text-md font-semibold text-slate-800 px-2 py-1 bg-slate-100 rounded-md sticky top-0 z-10 mt-4">
                      {secondaryTableName} Columns
                    </h3>
                    {sortedAndFilteredSecondaryColumns.length > 0 ? (
                      <div className="space-y-2 p-2">
                        {sortedAndFilteredSecondaryColumns.map((column) => (
                          <DraggableColumn key={column.key} column={column} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500 text-sm">
                        No columns found for "{secondaryTableName}" matching
                        search.
                      </div>
                    )}
                  </>
                )}

                {/* No columns for either table or no search results */}
                {!tableName && !secondaryTableName ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                      <Database className="h-8 w-8 text-blue-500" />
                    </div>
                    <p>Select a table to view columns</p>
                    <p className="text-sm mt-1">
                      Choose from the dropdown above
                    </p>
                  </div>
                ) : (
                  sortedAndFilteredPrimaryColumns.length === 0 &&
                  sortedAndFilteredSecondaryColumns.length === 0 &&
                  searchTerm !== "" && (
                    <div className="text-center py-8 text-slate-500">
                      <Columns className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No columns match your search</p>
                      <p className="text-sm mt-1">
                        Try a different search term
                      </p>
                    </div>
                  )
                )}
              </>
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