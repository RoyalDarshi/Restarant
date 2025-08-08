// App.tsx
import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import DynamicDataTable from "./components/DynamicDataTable";
import DynamicChartBuilder from "./components/DynamicChartBuilder";
import DynamicColumnsPanel from "./components/DynamicColumnsPanel";
import DatabaseSelector from "./components/DatabaseSelector";
import DragDropProvider from "./components/DragDropProvider";
import {
  DatabaseColumn,
  apiService,
  DatabaseTableSchema,
} from "./services/api";

// Extend column to include tableName
interface UpdatedDatabaseColumn extends DatabaseColumn {
  tableName?: string;
}

// Scalable tab title/subtitle maps
const tabTitles: Record<string, string> = {
  trends: "Trends Analysis",
  settings: "Settings",
};

const tabSubtitles: Record<string, string> = {
  trends: "Discover patterns and forecast future trends",
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

  const [secondarySelectedTable, setSecondarySelectedTable] = useState<
    string | null
  >(null);
  const [secondaryTableColumns, setSecondaryTableColumns] = useState<
    UpdatedDatabaseColumn[]
  >([]);

  // Fetch table names
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

  // Fetch schemas when charts tab is active
  useEffect(() => {
    if (
      activeTab === "charts" &&
      tables.length > 0 &&
      allTableSchemas.length === 0
    ) {
      const fetchAllTableSchemas = async () => {
        try {
          const schemas: DatabaseTableSchema[] = [];
          for (const tableName of tables) {
            const columnsResponse = await apiService.getTableColumns(tableName);
            if (columnsResponse.data.success) {
              schemas.push({
                tableName: tableName,
                columns: columnsResponse.data.columns.map(
                  (col: DatabaseColumn) => ({
                    ...col,
                    tableName: tableName,
                  })
                ),
              });
            }
          }
          setAllTableSchemas(schemas);
          console.log(
            "App.tsx: Fetched all table schemas for charts tab:",
            schemas
          );
        } catch (err) {
          console.error("App.tsx: Failed to fetch all table schemas", err);
        }
      };
      fetchAllTableSchemas();
    }
  }, [activeTab, tables, allTableSchemas.length]);

  const handleTableSelect = async (tableName: string) => {
    try {
      const response = await apiService.getTableColumns(tableName);
      if (response.data.success) {
        setSelectedTable(tableName);
        const fetchedColumns = response.data.columns.map(
          (col: DatabaseColumn) => ({
            ...col,
            tableName: tableName,
          })
        );
        setTableColumns(fetchedColumns);
        console.log(
          `App.tsx: Columns fetched for primary table '${tableName}':`,
          fetchedColumns
        );
        if (secondarySelectedTable === tableName) {
          setSecondarySelectedTable(null);
          setSecondaryTableColumns([]);
        }
      } else {
        console.error("App.tsx: Failed to get columns", response.error);
      }
    } catch (err) {
      console.error("App.tsx: Failed to fetch columns", err);
    }
  };

  const handleSecondaryTableSelect = async (tableName: string) => {
    try {
      const response = await apiService.getTableColumns(tableName);
      if (response.data.success) {
        setSecondarySelectedTable(tableName);
        const fetchedSecondaryColumns = response.data.columns.map(
          (col: DatabaseColumn) => ({
            ...col,
            tableName: tableName,
          })
        );
        setSecondaryTableColumns(fetchedSecondaryColumns);
        console.log(
          `App.tsx: Columns fetched for secondary table '${tableName}':`,
          fetchedSecondaryColumns
        );
      } else {
        console.error(
          "App.tsx: Failed to get columns for secondary table",
          response.error
        );
      }
    } catch (err) {
      console.error(
        "App.tsx: Failed to fetch columns for secondary table",
        err
      );
    }
  };

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

    const eligibleSecondaryTables: string[] = [];

    for (const schema of allTableSchemas) {
      if (schema.tableName === selectedTable) continue;

      const hasMatchingColumn = schema.columns.some(
        (secondaryCol) =>
          primaryColumnKeys.has(secondaryCol.key) &&
          primaryColumnTypes.get(secondaryCol.key) === secondaryCol.type
      );

      if (hasMatchingColumn) {
        eligibleSecondaryTables.push(schema.tableName);
      }
    }

    return eligibleSecondaryTables;
  }, [selectedTable, tableColumns, allTableSchemas]);

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
        const allColumns = [...tableColumns, ...secondaryTableColumns];

        return (
          <DragDropProvider>
            <div className="grid grid-cols-1 xl:grid-cols-6 gap-1">
              <div className="xl:col-span-1">
                <DynamicColumnsPanel
                  tableName={selectedTable}
                  columns={allColumns}
                  tables={tables}
                  onTableChange={handleTableSelect}
                  secondaryTableName={secondarySelectedTable}
                  secondaryTables={filteredSecondaryTablesForDropdown}
                  onSecondaryTableChange={handleSecondaryTableSelect}
                />
              </div>
              <div className="xl:col-span-5">
                <DynamicChartBuilder
                  tableName={selectedTable || ""}
                  columns={tableColumns}
                  secondaryTableName={secondarySelectedTable || ""}
                  secondaryColumns={secondaryTableColumns}
                  allTableSchemas={allTableSchemas}
                />
              </div>
            </div>
          </DragDropProvider>
        );

      case "trends":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Trends Analysis
            </h2>
            <p className="text-slate-600">
              Advanced trends and forecasting features coming soon...
            </p>
          </div>
        );

      case "settings":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
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
    <div className="flex h-screen bg-slate-100">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-auto p-2">
        {/* Conditionally render title + subtitle only when content exists */}
        {(tabTitles[activeTab] || tabSubtitles[activeTab]) && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">
              {tabTitles[activeTab]}
            </h1>
            <p className="text-slate-600 mt-2">{tabSubtitles[activeTab]}</p>
          </div>
        )}

        {renderContent()}
      </main>
    </div>
  );
}

export default App;
