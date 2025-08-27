import React, { useState, useMemo } from "react";
import { DatabaseColumn } from "../services/api";
import DraggableColumn from "./DraggableColumn";
import {
  Columns,
  Search,
  Database,
  ChevronDown,
} from "lucide-react";

interface DynamicColumnsPanelProps {
  tableName: string | null;
  columns: DatabaseColumn[];
  tables: string[];
  onTableChange: (tableName: string) => void;

  // ✅ Multiple secondary tables
  secondaryTableNames: string[];
  secondaryTables: string[];
  onSecondaryTablesChange: (tables: string[]) => void;
}

const DynamicColumnsPanel: React.FC<DynamicColumnsPanelProps> = ({
  tableName,
  columns,
  tables,
  onTableChange,
  secondaryTableNames,
  secondaryTables,
  onSecondaryTablesChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const primaryTableColumns = useMemo(() => {
    return columns.filter((column) => column.tableName === tableName);
  }, [columns, tableName]);

  const secondaryTableColumns = useMemo(() => {
    return columns.filter((column) =>
      secondaryTableNames.includes(column.tableName)
    );
  }, [columns, secondaryTableNames]);

  const sortedAndFilteredPrimaryColumns = useMemo(() => {
    const filtered = primaryTableColumns.filter(
      (column) =>
        column.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (column.label || column.key).toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => a.label.localeCompare(b.label));
  }, [primaryTableColumns, searchTerm]);

  const sortedAndFilteredSecondaryColumns = useMemo(() => {
    const filtered = secondaryTableColumns.filter(
      (column) =>
        column.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (column.label || column.key).toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => a.label.localeCompare(b.label));
  }, [secondaryTableColumns, searchTerm]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {isExpanded && (
        <>
          <div className="p-4 border-b border-slate-200">
            {/* Primary */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Primary Database Table
              </label>
              <div className="relative">
                <select
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white shadow-sm"
                  value={tableName || ""}
                  onChange={(e) => onTableChange(e.target.value)}
                >
                  <option value="" disabled>
                    Choose a table...
                  </option>
                  {tables.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ✅ Secondary Multi-select (checkboxes) */}
            <div className="relative mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Secondary Database Tables
              </label>
              <div className="space-y-2 border rounded-lg p-2">
                {secondaryTables.map((t) => (
                  <label key={t} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={secondaryTableNames.includes(t)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSecondaryTablesChange([...secondaryTableNames, t]);
                        } else {
                          onSecondaryTablesChange(
                            secondaryTableNames.filter((name) => name !== t)
                          );
                        }
                      }}
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Search */}
            {(tableName || secondaryTableNames.length > 0) && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Columns
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search columns..."
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 pl-10 text-sm bg-white shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            )}
          </div>

          {/* Columns Rendering */}
          <div className="overflow-y-auto max-h-[calc(100vh-350px)] p-2">
            {tableName && (
              <>
                <h3 className="text-md font-semibold px-2 py-1 bg-slate-100 sticky top-0">
                  {tableName} Columns
                </h3>
                {sortedAndFilteredPrimaryColumns.map((column) => (
                  <DraggableColumn key={column.key} column={column} />
                ))}
              </>
            )}

            {secondaryTableNames.map((t) => (
              <div key={t}>
                <h3 className="text-md font-semibold px-2 py-1 bg-slate-100 sticky top-0 mt-3">
                  {t} Columns
                </h3>
                {sortedAndFilteredSecondaryColumns
                  .filter((c) => c.tableName === t)
                  .map((column) => (
                    <DraggableColumn key={column.key} column={column} />
                  ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DynamicColumnsPanel;