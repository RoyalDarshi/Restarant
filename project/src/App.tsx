// App.tsx
import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import DynamicDataTable from "./components/DynamicDataTable";
import DynamicChartBuilder from "./components/DynamicChartBuilder";
import DynamicColumnsPanel from "./components/DynamicColumnsPanel";
import DatabaseSelector from "./components/DatabaseSelector";
import DragDropProvider from "./components/DragDropProvider";
import { DatabaseColumn } from "./services/api";
import { apiService } from "./services/api"; // Make sure this path is correct

// Ensure DatabaseColumn interface includes tableName
// If this interface is in services/api.ts, you should update it there.
// For demonstration, adding it here.
interface UpdatedDatabaseColumn extends DatabaseColumn {
  tableName?: string; // Add this property
}

// Interface to hold schema for all tables
interface DatabaseTableSchema {
  tableName: string;
  columns: UpdatedDatabaseColumn[];
}

function App() {
  const [activeTab, setActiveTab] = useState("data");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<UpdatedDatabaseColumn[]>([]);
  const [tables, setTables] = useState<string[]>([]); // List of all table names
  const [allTableSchemas, setAllTableSchemas] = useState<DatabaseTableSchema[]>(
    []
  ); // All tables with their columns

  // State for secondary table selection
  const [secondarySelectedTable, setSecondarySelectedTable] = useState<
    string | null
  >(null);
  const [secondaryTableColumns, setSecondaryTableColumns] = useState<
    UpdatedDatabaseColumn[]
  >([]);

  // Effect to fetch only table names on initial load
  useEffect(() => {
    const fetchTableNames = async () => {
      try {
        const response = await apiService.getTables();
        if (response.success) {
          setTables(response.data);
          console.log("App.tsx: Fetched table names:", response.data); // Debug log
        }
      } catch (err) {
        console.error("App.tsx: Failed to fetch table names", err);
      }
    };
    fetchTableNames();
  }, []);

  // Effect to fetch all table schemas (names + columns) only when 'charts' tab is active
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
          ); // Debug log
        } catch (err) {
          console.error("App.tsx: Failed to fetch all table schemas", err);
        }
      };
      fetchAllTableSchemas();
    }
  }, [activeTab, tables, allTableSchemas.length]); // Dependencies: activeTab, tables, and allTableSchemas.length to prevent re-fetching if already loaded

  const handleTableSelect = async (tableName: string) => {
    try {
      const response = await apiService.getTableColumns(tableName);
      if (response.data.success) {
        setSelectedTable(tableName);
        // Map columns to add tableName property
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
        ); // Debug log
        // If the newly selected primary table is the same as the secondary, clear secondary
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

  // Handler for secondary table selection
  const handleSecondaryTableSelect = async (tableName: string) => {
    try {
      const response = await apiService.getTableColumns(tableName);
      if (response.data.success) {
        setSecondarySelectedTable(tableName);
        // Map columns to add tableName property
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
        ); // Debug log
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

  // Memoized function to filter secondary tables based on column matches with the primary table
  const filteredSecondaryTablesForDropdown = useMemo(() => {
    // This logic now depends on allTableSchemas being populated, which happens when 'charts' tab is active.
    if (
      !selectedTable ||
      tableColumns.length === 0 ||
      allTableSchemas.length === 0
    ) {
      return []; // No primary table selected or all schemas not loaded yet
    }

    // Create a Set of primary table column keys for efficient lookup
    const primaryColumnKeys = new Set(tableColumns.map((col) => col.key));
    // Create a Map of primary table column keys to their types for type matching
    const primaryColumnTypes = new Map(
      tableColumns.map((col) => [col.key, col.type])
    );

    const eligibleSecondaryTables: string[] = [];

    for (const schema of allTableSchemas) {
      // Exclude the primary table itself from secondary options
      if (schema.tableName === selectedTable) {
        continue;
      }

      // Check if any column in the current secondary table schema matches a column in the primary table
      const hasMatchingColumn = schema.columns.some(
        (secondaryCol) =>
          primaryColumnKeys.has(secondaryCol.key) &&
          primaryColumnTypes.get(secondaryCol.key) === secondaryCol.type // Match both key and type
      );

      if (hasMatchingColumn) {
        eligibleSecondaryTables.push(schema.tableName);
      }
    }
    return eligibleSecondaryTables;
  }, [selectedTable, tableColumns, allTableSchemas]); // Dependencies for memoization

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
        // Combine columns from both primary and secondary tables for the chart builder
        const allColumns = [...tableColumns, ...secondaryTableColumns];

        return (
          <DragDropProvider>
            <div className="grid grid-cols-1 xl:grid-cols-6 gap-4">
              <div className="xl:col-span-1">
                <DynamicColumnsPanel
                  tableName={selectedTable}
                  columns={allColumns} // Pass combined columns here
                  tables={tables} // All tables for primary selection
                  onTableChange={handleTableSelect}
                  secondaryTableName={secondarySelectedTable}
                  secondaryTables={filteredSecondaryTablesForDropdown} // Pass the newly filtered list
                  onSecondaryTableChange={handleSecondaryTableSelect}
                />
              </div>
              <div className="xl:col-span-5">
                <DynamicChartBuilder
                  tableName={selectedTable || ""}
                  columns={tableColumns}
                  secondaryTableName={secondarySelectedTable || ""}
                  secondaryColumns={secondaryTableColumns}
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

      <main className="flex-1 overflow-auto p-4">
        {" "}
        {/* Added p-4 for consistent padding */}
        <div className="mb-6">
          {" "}
          {/* Added mb-6 for spacing */}
          <h1 className="text-3xl font-bold text-slate-900">
            {activeTab === "data" && "Data Explorer"}{" "}
            {/* Added title for data tab */}
            {activeTab === "charts" && "Chart Dashboard"}{" "}
            {/* Added title for charts tab */}
            {activeTab === "trends" && "Trends Analysis"}
            {activeTab === "settings" && "Settings"}
          </h1>
          <p className="text-slate-600 mt-2">
            {activeTab === "data" && "Browse and manage your database tables"}
            {activeTab === "charts" &&
              "Visualize your data with interactive charts"}
            {activeTab === "trends" &&
              "Discover patterns and forecast future trends"}
            {activeTab === "settings" && "Configure your dashboard preferences"}
          </p>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
