import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DynamicDataTable from "./components/DynamicDataTable";
import DynamicChartBuilder from "./components/DynamicChartBuilder";
import DynamicColumnsPanel from "./components/DynamicColumnsPanel";
import DatabaseSelector from "./components/DatabaseSelector";
import DragDropProvider from "./components/DragDropProvider";
import { DatabaseColumn } from "./services/api";
import { apiService } from "./services/api"; // Make sure this path is correct

function App() {
  const [activeTab, setActiveTab] = useState("data");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<DatabaseColumn[]>([]);
  const [tables, setTables] = useState<string[]>([]);

  // Add state for secondary table selection
  const [secondarySelectedTable, setSecondarySelectedTable] = useState<
    string | null
  >(null);
  const [secondaryTableColumns, setSecondaryTableColumns] = useState<
    DatabaseColumn[]
  >([]);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await apiService.getTables();
        if (response.success) {
          setTables(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch tables", err);
      }
    };
    fetchTables();
  }, []);

  const handleTableSelect = async (tableName: string) => {
    try {
      const response = await apiService.getTableColumns(tableName);
      if (response.data.success) {
        setSelectedTable(tableName);
        setTableColumns(response.data.columns);
      } else {
        console.error("Failed to get columns", response.error);
      }
    } catch (err) {
      console.error("Failed to fetch columns", err);
    }
  };

  // Handler for secondary table selection
  const handleSecondaryTableSelect = async (tableName: string) => {
    try {
      const response = await apiService.getTableColumns(tableName);
      if (response.data.success) {
        setSecondarySelectedTable(tableName);
        setSecondaryTableColumns(response.data.columns);
      } else {
        console.error(
          "Failed to get columns for secondary table",
          response.error
        );
      }
    } catch (err) {
      console.error("Failed to fetch columns for secondary table", err);
    }
  };

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
        return (
          <DragDropProvider>
            <div className="grid grid-cols-1 xl:grid-cols-6 gap-4">
              <div className="xl:col-span-1">
                <DynamicColumnsPanel
                  tableName={selectedTable}
                  columns={tableColumns}
                  tables={tables}
                  onTableChange={handleTableSelect}
                  // Props for second table selection
                  secondaryTableName={secondarySelectedTable}
                  secondaryTables={tables} // Using the same tables list
                  onSecondaryTableChange={handleSecondaryTableSelect}
                />
              </div>
              <div className="xl:col-span-5">
                <DynamicChartBuilder
                  tableName={selectedTable || ""}
                  columns={tableColumns}
                  // Optionally pass secondary table data to chart builder
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

      <main className="flex-1 overflow-auto">
        <div className="">
          <h1 className="text-3xl font-bold text-slate-900">
            {activeTab === "trends" && "Trends Analysis"}
            {activeTab === "settings" && "Settings"}
          </h1>
          <p className="text-slate-600 mt-2">
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