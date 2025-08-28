import React, { useState, useEffect, useMemo } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { DashboardProvider } from "./components/DashboardContext";
import Sidebar from "./components/Sidebar";
import DynamicDataTable from "./components/DynamicDataTable";
import DynamicChartBuilder from "./components/DynamicChartBuilder";
import DynamicColumnsPanel from "./components/DynamicColumnsPanel";
import DatabaseSelector from "./components/DatabaseSelector";
import DragDropProvider from "./components/DragDropProvider";
import DashboardGrid from "./components/DashboardGrid";
import {
  DatabaseColumn,
  apiService,
  DatabaseTableSchema,
} from "./services/api";

// Extend column to include tableName
interface UpdatedDatabaseColumn extends DatabaseColumn {
  tableName?: string;
}

const tabTitles: Record<string, string> = {
  settings: "Settings",
};

const tabSubtitles: Record<string, string> = {
  settings: "Configure your dashboard preferences",
};

function App() {
  const [activeTab, setActiveTab] = useState("data");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<UpdatedDatabaseColumn[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [allTableSchemas, setAllTableSchemas] = useState<DatabaseTableSchema[]>(
    []
  );
  const [secondaryTableNames, setSecondaryTableNames] = useState<string[]>([]); // ✅ multiple now

  // Fetch all table names
  useEffect(() => {
    const fetchTableNames = async () => {
      try {
        const response = await apiService.getTables();
        if (response.success) {
          setTables(response.data);
          console.log("App.tsx: Fetched table names:", response.data);
        }
      } catch (err) {
        console.error("App.tsx: Failed to fetch table names", err);
      }
    };
    fetchTableNames();
  }, []);

  // Fetch all schemas (for joins, validation, etc.)
  useEffect(() => {
    if (
      activeTab === "charts" &&
      tables.length > 0 &&
      allTableSchemas.length === 0
    ) {
      const fetchAllTableSchemas = async () => {
        try {
          const schemas: DatabaseTableSchema[] = [];
          for (const table of tables) {
            const columnsResponse = await apiService.getTableColumns(table);
            if (columnsResponse.data.success) {
              schemas.push({
                tableName: table,
                columns: columnsResponse.data.columns.map(
                  (col: DatabaseColumn) => ({
                    ...col,
                    tableName: table,
                  })
                ),
              });
            }
          }
          setAllTableSchemas(schemas);
          console.log("App.tsx: Fetched all table schemas:", schemas);
        } catch (err) {
          console.error("App.tsx: Failed to fetch all table schemas", err);
        }
      };
      fetchAllTableSchemas();
    }
  }, [activeTab, tables, allTableSchemas.length]);

  // Primary table select
  const handleTableSelect = async (tableName: string) => {
    try {
      const response = await apiService.getTableColumns(tableName);
      if (response.data.success) {
        setSelectedTable(tableName);
        const fetchedColumns = response.data.columns.map(
          (col: DatabaseColumn) => ({
            ...col,
            tableName,
          })
        );
        setTableColumns(fetchedColumns);
        setSecondaryTableNames([]); // reset secondary selections
        console.log(
          `App.tsx: Columns fetched for '${tableName}':`,
          fetchedColumns
        );
      } else {
        console.error("App.tsx: Failed to get columns", response.error);
      }
    } catch (err) {
      console.error("App.tsx: Failed to fetch columns", err);
    }
  };

  // Eligible joinable tables
  const filteredSecondaryTablesForDropdown = useMemo(() => {
    if (
      !selectedTable ||
      tableColumns.length === 0 ||
      allTableSchemas.length === 0
    ) {
      return [];
    }
    const primaryColumnKeys = new Set(tableColumns.map((col) => col.key));
    const primaryColumnTypes = new Map(
      tableColumns.map((col) => [col.key, col.type])
    );

    return allTableSchemas
      .filter((s) => s.tableName !== selectedTable)
      .filter((s) =>
        s.columns.some(
          (secondaryCol) =>
            primaryColumnKeys.has(secondaryCol.key) &&
            primaryColumnTypes.get(secondaryCol.key) === secondaryCol.type
        )
      )
      .map((s) => s.tableName);
  }, [selectedTable, tableColumns, allTableSchemas]);

  // Renderer
  const renderContent = () => {
    switch (activeTab) {
      case "data":
        return (
          <div className="grid grid-cols-8 gap-2">
            <div className="col-span-2">
              <DatabaseSelector
                onTableSelect={handleTableSelect}
                selectedTable={selectedTable}
              />
            </div>
            <div className="col-span-6">
              {selectedTable && (
                <DynamicDataTable
                  tableName={selectedTable}
                  columns={tableColumns}
                />
              )}
            </div>
          </div>
        );

      case "charts":
        // ✅ merge columns (primary + selected secondary)
        const allSecondaryColumns = allTableSchemas
          .filter((s) => secondaryTableNames.includes(s.tableName))
          .flatMap((s) => s.columns);

        const allColumns = [...tableColumns, ...allSecondaryColumns];

        return (
          <DragDropProvider>
            <div className="grid grid-cols-1 xl:grid-cols-6 gap-1">
              <div className="xl:col-span-1">
                <DynamicColumnsPanel
                  tableName={selectedTable}
                  columns={allColumns}
                  tables={tables}
                  onTableChange={handleTableSelect}
                  secondaryTableNames={secondaryTableNames} // ✅ new
                  secondaryTables={filteredSecondaryTablesForDropdown}
                  onSecondaryTablesChange={setSecondaryTableNames} // ✅ new
                />
              </div>
              <div className="xl:col-span-5">
                <DynamicChartBuilder
                  tableName={selectedTable || ""}
                  columns={tableColumns}
                  secondaryTableNames={secondaryTableNames} // ✅ new
                  allTableSchemas={allTableSchemas}
                />
              </div>
            </div>
          </DragDropProvider>
        );

      case "dashboard":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <DashboardGrid />
          </div>
        );

      case "settings":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Settings</h2>
            <p className="text-slate-600">
              Dashboard configuration options coming soon...
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardProvider>
      <Router>
        <div className="flex h-screen bg-slate-100">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 overflow-auto p-0.5">{renderContent()}</main>
        </div>
      </Router>
    </DashboardProvider>
  );
}

export default App;